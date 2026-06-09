import type { Config } from "@configuration/Config.js";
import type { HeaderConfig } from "@configuration/WizardConfig.js";
import type { ProjectManifestRepository } from "@configuration/ProjectManifestRepository.js";
import type { WizardConfig } from "@configuration/WizardConfig.js";
import type { LicenseGenerator } from "@licensing/LicenseGenerator.js";

export type ConfigSave =
  | { action: "save"; target: string }
  | { action: "clear" }
  | { action: "none" };

export type LicenseSelection = {
  licenseId: string;
  tokens: Record<string, string>;
  save: ConfigSave;
  /**
   * The source-file header preference to persist alongside the license, when the
   * selection opted into headers. Writing the header files themselves is a
   * separate, progress-reported step; only the preference is persisted here so
   * verification later knows to check the header surface.
   */
  headers?: HeaderConfig;
};

/**
 * Core application service that applies a resolved license selection to the
 * project: it persists the wizard configuration as instructed, writes the
 * `LICENSE` file, and records the selected identifier in every project manifest
 * present. Both the interactive and non-interactive entry points build a
 * `LicenseSelection` and delegate the actual work here, so the project-mutating
 * steps live in exactly one place.
 */
export class LicenseInstaller {
  readonly #config: Config;
  readonly #manifests: ProjectManifestRepository;
  readonly #generator: LicenseGenerator;

  /**
   * Creates a new LicenseInstaller.
   *
   * @param config - Coordinates persisting/clearing the wizard configuration.
   * @param manifests - Records the selected license in project manifests.
   * @param generator - Writes the `LICENSE` file.
   */
  constructor(
    config: Config,
    manifests: ProjectManifestRepository,
    generator: LicenseGenerator,
  ) {
    this.#config = config;
    this.#manifests = manifests;
    this.#generator = generator;
  }

  /**
   * Applies the selection: persists the configuration per its save instruction,
   * writes the `LICENSE` file (standard text when no tokens are supplied, or a
   * customized copyright otherwise), and records the identifier in every present
   * manifest.
   *
   * Every present manifest is validated before anything is written, so a
   * malformed or non-object manifest aborts the run before the `LICENSE` file is
   * created — leaving the project untouched rather than half-updated, with the
   * declared license and the file on disk in agreement either way.
   *
   * @param selection - The resolved license, copyright tokens, and save instruction.
   */
  async install(selection: LicenseSelection): Promise<void> {
    await this.#manifests.assertWritable();
    await this.#persist(selection);
    await this.#generator.generate(selection.licenseId, selection.tokens);
    await this.#manifests.writeLicense(selection.licenseId);
  }

  /**
   * Persists the configuration according to the selection's save instruction:
   * writing it to the chosen location (clearing the rest), clearing every
   * location, or leaving the configuration untouched.
   */
  async #persist(selection: LicenseSelection): Promise<void> {
    const { save } = selection;

    if (save.action === "save") {
      const config: WizardConfig = { licenseId: selection.licenseId };
      if (Object.keys(selection.tokens).length > 0) {
        config.tokens = selection.tokens;
      }
      if (selection.headers) {
        config.headers = selection.headers;
      }
      await this.#config.write(config, save.target);
    } else if (save.action === "clear") {
      await this.#config.clear();
    }
  }
}
