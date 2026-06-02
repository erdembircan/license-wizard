import { createHash } from "node:crypto";
import type { Config } from "@configuration/Config.js";
import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import { LICENSE_FILENAME } from "@licensing/LicenseFilename.js";
import type { LicenseGenerator } from "@licensing/LicenseGenerator.js";

export type VerifyOptions = {
  /**
   * When the on-disk `LICENSE` does not match the saved configuration, rewrite
   * it (`true`, the default behaviour) or report the mismatch without touching
   * the file (`false`, the strict/CI mode).
   */
  fix: boolean;
};

export type VerifyOutcome =
  | { kind: "match"; licenseId: string }
  | { kind: "fixed"; licenseId: string }
  | { kind: "mismatch"; licenseId: string }
  | { kind: "missing-license" }
  | { kind: "missing-config" };

/**
 * Verifies that the project's `LICENSE` file still matches the license its
 * saved configuration describes. Verification is the inverse of generation: it
 * re-renders the license from the configuration (the single source of truth,
 * read by store priority — the `.licensewizardrc.json` dot-file first, then the
 * project manifests) and compares that against the file currently on disk.
 *
 * Both a `LICENSE` file and a saved configuration are required; either one
 * missing is reported as its own outcome rather than treated as a match. When
 * the two differ the verifier either rewrites the file to match (the default)
 * or leaves it untouched and reports the mismatch (strict mode), so the same
 * check can either self-heal or gate a CI pipeline.
 */
export class LicenseVerifier {
  readonly #config: Config;
  readonly #generator: LicenseGenerator;
  readonly #reader: IFileSystemReader;

  /**
   * Creates a new LicenseVerifier.
   *
   * @param config - Reads the saved configuration that is verified against.
   * @param generator - Re-renders (and, when fixing, rewrites) the license.
   * @param reader - Reads the existing `LICENSE` file from disk.
   */
  constructor(
    config: Config,
    generator: LicenseGenerator,
    reader: IFileSystemReader,
  ) {
    this.#config = config;
    this.#generator = generator;
    this.#reader = reader;
  }

  /**
   * Compares the on-disk `LICENSE` against the license re-rendered from the
   * saved configuration and reports the result.
   *
   * Returns `missing-license` when no `LICENSE` file exists and `missing-config`
   * when no configuration is saved — both are required for verification to be
   * meaningful. Otherwise returns `match` when the file already matches, `fixed`
   * when it differed and was rewritten (the default), or `mismatch` when it
   * differed and was left untouched because `fix` was disabled.
   *
   * @param options - Whether a mismatch should rewrite the file or be reported.
   */
  async verify(options: VerifyOptions): Promise<VerifyOutcome> {
    if (!(await this.#reader.exists(LICENSE_FILENAME))) {
      return { kind: "missing-license" };
    }

    const config = await this.#config.read();
    if (config === null) {
      return { kind: "missing-config" };
    }

    const existing = await this.#reader.read(LICENSE_FILENAME);
    const expected = await this.#generator.render(
      config.licenseId,
      config.tokens ?? {},
    );

    if (this.#digest(existing) === this.#digest(expected)) {
      return { kind: "match", licenseId: config.licenseId };
    }

    if (!options.fix) {
      return { kind: "mismatch", licenseId: config.licenseId };
    }

    await this.#generator.generate(config.licenseId, config.tokens ?? {});
    return { kind: "fixed", licenseId: config.licenseId };
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
