import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";
import type { WizardConfig } from "@configuration/WizardConfig.js";
import { FileSystemReaderError } from "@configuration/errors/FileSystemReaderError.js";
import { FileSystemWriterError } from "@configuration/errors/FileSystemWriterError.js";

const RC_FILE = ".licensewizardrc.json";
const PACKAGE_JSON = "package.json";
const PACKAGE_JSON_FIELD = "license-wizard";

/**
 * Reads and writes the wizard configuration. Checks `.licensewizardrc.json`
 * first; falls back to the `"license-wizard"` field in `package.json`. Writes
 * always go to `.licensewizardrc.json`.
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
}
