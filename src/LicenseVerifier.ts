import { createHash } from "node:crypto";
import type { Config } from "@configuration/Config.js";
import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import type { ProjectManifestRepository } from "@configuration/ProjectManifestRepository.js";
import type { WizardConfig } from "@configuration/WizardConfig.js";
import { LICENSE_FILENAME } from "@licensing/LicenseFilename.js";
import type { LicenseGenerator } from "@licensing/LicenseGenerator.js";

export type VerifyOptions = {
  /**
   * When something is out of sync with the saved configuration, reconcile it
   * (`true`, the default behaviour) — rewriting the `LICENSE` file and updating
   * any drifted manifest license field — or leave everything untouched and just
   * report the drift (`false`, the strict/CI mode).
   */
  fix: boolean;
};

export type DriftStatus = "match" | "fixed" | "mismatch";

export type ManifestCheck = {
  name: string;
  declared: string | null;
  status: DriftStatus;
};

export type VerifyReport = {
  licenseId: string;
  license: DriftStatus;
  manifests: ManifestCheck[];
};

export type VerifyOutcome =
  | { kind: "missing-license" }
  | { kind: "missing-config" }
  | ({ kind: DriftStatus } & VerifyReport);

/**
 * Verifies that the project still matches the license its saved configuration
 * describes, across two surfaces: the `LICENSE` file at the project root and
 * the `"license"` field of every project manifest present. Verification is the
 * inverse of generation — it re-renders the license from the configuration (the
 * single source of truth, read by store priority: the `.licensewizardrc.json`
 * dot-file first, then the project manifests) and compares it against what is on
 * disk, the file by content hash and each manifest by its declared identifier.
 *
 * Both a `LICENSE` file and a saved configuration are required; either one
 * missing is reported as its own outcome rather than treated as a match. Where
 * anything has drifted the verifier either reconciles it to match (the default
 * — rewriting the file and updating the drifted manifests) or leaves everything
 * untouched and reports the drift (strict mode), so the same check can either
 * self-heal or gate a CI pipeline.
 */
export class LicenseVerifier {
  readonly #config: Config;
  readonly #manifests: ProjectManifestRepository;
  readonly #generator: LicenseGenerator;
  readonly #reader: IFileSystemReader;

  /**
   * Creates a new LicenseVerifier.
   *
   * @param config - Reads the saved configuration that is verified against.
   * @param manifests - Reads each manifest's declared license and, when fixing,
   *   updates the drifted ones.
   * @param generator - Re-renders (and, when fixing, rewrites) the license.
   * @param reader - Reads the existing `LICENSE` file from disk.
   */
  constructor(
    config: Config,
    manifests: ProjectManifestRepository,
    generator: LicenseGenerator,
    reader: IFileSystemReader,
  ) {
    this.#config = config;
    this.#manifests = manifests;
    this.#generator = generator;
    this.#reader = reader;
  }

  /**
   * Checks the on-disk `LICENSE` and every present manifest's declared license
   * against the license described by the saved configuration, and reports the
   * result.
   *
   * Returns `missing-license` when no `LICENSE` file exists and `missing-config`
   * when no configuration is saved — both are required for verification to be
   * meaningful. Otherwise returns a report whose `kind` aggregates the two
   * surfaces: `match` when everything was already in sync, `fixed` when drift
   * was found and reconciled (the default), or `mismatch` when drift was found
   * and left untouched because `fix` was disabled.
   *
   * @param options - Whether drift should be reconciled or only reported.
   */
  async verify(options: VerifyOptions): Promise<VerifyOutcome> {
    if (!(await this.#reader.exists(LICENSE_FILENAME))) {
      return { kind: "missing-license" };
    }

    const config = await this.#config.read();
    if (config === null) {
      return { kind: "missing-config" };
    }

    const license = await this.#verifyLicenseFile(config, options.fix);
    const manifests = await this.#verifyManifests(config, options.fix);
    const kind = this.#aggregate(license, manifests);

    return { kind, licenseId: config.licenseId, license, manifests };
  }

  /**
   * Compares the on-disk `LICENSE` against the license re-rendered from the
   * configuration, returning `match` when they are identical, `fixed` after
   * rewriting the file when they differ and fixing is enabled, or `mismatch`
   * when they differ and the file is left untouched.
   */
  async #verifyLicenseFile(
    config: WizardConfig,
    fix: boolean,
  ): Promise<DriftStatus> {
    const existing = await this.#reader.read(LICENSE_FILENAME);
    const expected = await this.#generator.render(
      config.licenseId,
      config.tokens ?? {},
    );

    if (this.#digest(existing) === this.#digest(expected)) {
      return "match";
    }
    if (!fix) {
      return "mismatch";
    }

    await this.#generator.generate(config.licenseId, config.tokens ?? {});
    return "fixed";
  }

  /**
   * Compares each present manifest's declared license against the configured
   * identifier, returning a per-manifest result. A manifest whose declaration
   * differs (including one that declares no license) becomes `fixed` after the
   * manifest is updated when fixing is enabled, or `mismatch` when it is left
   * untouched.
   */
  async #verifyManifests(
    config: WizardConfig,
    fix: boolean,
  ): Promise<ManifestCheck[]> {
    const declared = await this.#manifests.declaredLicenses();
    const checks: ManifestCheck[] = [];

    for (const { name, licenseId } of declared) {
      if (licenseId === config.licenseId) {
        checks.push({ name, declared: licenseId, status: "match" });
        continue;
      }
      if (!fix) {
        checks.push({ name, declared: licenseId, status: "mismatch" });
        continue;
      }

      await this.#manifests.writeLicenseTo(name, config.licenseId);
      checks.push({ name, declared: licenseId, status: "fixed" });
    }

    return checks;
  }

  /**
   * Reduces the LICENSE-file result and the per-manifest results to a single
   * status: any outstanding `mismatch` wins (strict mode found drift), otherwise
   * any `fixed` wins (drift was reconciled), otherwise everything matched.
   */
  #aggregate(license: DriftStatus, manifests: ManifestCheck[]): DriftStatus {
    const statuses = [license, ...manifests.map((manifest) => manifest.status)];
    if (statuses.includes("mismatch")) {
      return "mismatch";
    }
    if (statuses.includes("fixed")) {
      return "fixed";
    }
    return "match";
  }

  /**
   * Returns the SHA-256 hex digest of the given text. Comparing digests rather
   * than the full strings keeps the equality check cheap and is what callers
   * reach for when diffing generated files.
   */
  #digest(text: string): string {
    return createHash("sha256").update(text).digest("hex");
  }
}
