import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";
import type { WizardConfig } from "@configuration/WizardConfig.js";
import { FileSystemReaderError } from "@configuration/errors/FileSystemReaderError.js";
import { FileSystemWriterError } from "@configuration/errors/FileSystemWriterError.js";

const RC_FILE = ".licensewizardrc.json";
const PACKAGE_JSON = "package.json";
const PACKAGE_JSON_FIELD = "license-wizard";
const PACKAGE_JSON_LICENSE_FIELD = "license";

/**
 * Reads and writes the wizard configuration. Checks `.licensewizardrc.json`
 * first; falls back to the `"license-wizard"` field in `package.json`. Writes
 * always go to `.licensewizardrc.json`.
 *
 * Also reads and writes the standard top-level `"license"` field of
 * `package.json` — a source distinct from the wizard config that participates
 * in license-default resolution and is kept in sync with the user's selection.
 */
export class Config {
  readonly #reader: IFileSystemReader;
  readonly #writer: IFileSystemWriter;

  /**
   * Creates a new Config backed by the given reader and writer.
   *
   * @param reader - Used to check for and read configuration files.
   * @param writer - Used to persist configuration changes.
   */
  constructor(reader: IFileSystemReader, writer: IFileSystemWriter) {
    this.#reader = reader;
    this.#writer = writer;
  }

  /**
   * Reads the wizard configuration. Checks `.licensewizardrc.json` first,
   * then falls back to the `"license-wizard"` field in `package.json`.
   * Returns `null` when neither source provides configuration.
   *
   * @throws {FileSystemReaderError} When a file system read operation fails.
   */
  async read(): Promise<WizardConfig | null> {
    try {
      const rcExists = await this.#reader.exists(RC_FILE);
      if (rcExists) {
        const raw = await this.#reader.read(RC_FILE);
        return JSON.parse(raw) as WizardConfig;
      }

      const pkgExists = await this.#reader.exists(PACKAGE_JSON);
      if (pkgExists) {
        const raw = await this.#reader.read(PACKAGE_JSON);
        const pkg = JSON.parse(raw) as Record<string, unknown>;
        const field = pkg[PACKAGE_JSON_FIELD];
        if (field !== undefined) {
          return field as WizardConfig;
        }
      }

      return null;
    } catch (cause) {
      if (cause instanceof FileSystemReaderError) {
        throw cause;
      }
      throw new FileSystemReaderError(
        "Failed to read wizard configuration",
        cause,
      );
    }
  }

  /**
   * Persists the given configuration to `.licensewizardrc.json`.
   *
   * @param config - The configuration to write.
   * @throws {FileSystemWriterError} When the write operation fails.
   */
  async write(config: WizardConfig): Promise<void> {
    try {
      await this.#writer.write(RC_FILE, JSON.stringify(config, null, 2));
    } catch (cause) {
      if (cause instanceof FileSystemWriterError) {
        throw cause;
      }
      throw new FileSystemWriterError(
        "Failed to write wizard configuration",
        cause,
      );
    }
  }

  /**
   * Reads the standard top-level `"license"` field from `package.json`.
   * Returns the SPDX identifier string when present, or `null` when there is
   * no `package.json`, no `"license"` field, or the field is not a string
   * (e.g. the deprecated object form).
   *
   * @throws {FileSystemReaderError} When a file system read operation fails.
   */
  async readPackageLicense(): Promise<string | null> {
    try {
      const pkgExists = await this.#reader.exists(PACKAGE_JSON);
      if (!pkgExists) {
        return null;
      }

      const raw = await this.#reader.read(PACKAGE_JSON);
      const pkg = JSON.parse(raw) as Record<string, unknown>;
      const license = pkg[PACKAGE_JSON_LICENSE_FIELD];
      return typeof license === "string" ? license : null;
    } catch (cause) {
      if (cause instanceof FileSystemReaderError) {
        throw cause;
      }
      throw new FileSystemReaderError(
        "Failed to read package.json license field",
        cause,
      );
    }
  }

  /**
   * Writes the given license identifier to the top-level `"license"` field of
   * `package.json`, creating the field when absent and overwriting it when
   * present. All other fields are preserved. Does nothing when `package.json`
   * does not exist.
   *
   * @param licenseId - The SPDX identifier to record.
   * @throws {FileSystemWriterError} When the read or write operation fails.
   */
  async writePackageLicense(licenseId: string): Promise<void> {
    try {
      const pkgExists = await this.#reader.exists(PACKAGE_JSON);
      if (!pkgExists) {
        return;
      }

      const raw = await this.#reader.read(PACKAGE_JSON);
      const pkg = JSON.parse(raw) as Record<string, unknown>;
      pkg[PACKAGE_JSON_LICENSE_FIELD] = licenseId;
      await this.#writer.write(
        PACKAGE_JSON,
        `${JSON.stringify(pkg, null, 2)}\n`,
      );
    } catch (cause) {
      if (cause instanceof FileSystemWriterError) {
        throw cause;
      }
      throw new FileSystemWriterError(
        "Failed to write package.json license field",
        cause,
      );
    }
  }
}
