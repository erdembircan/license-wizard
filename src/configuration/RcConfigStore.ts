import type { IConfigStore } from "@configuration/interfaces/IConfigStore.js";
import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";
import type { WizardConfig } from "@configuration/WizardConfig.js";
import { FileSystemReaderError } from "@configuration/errors/FileSystemReaderError.js";
import { FileSystemWriterError } from "@configuration/errors/FileSystemWriterError.js";

const RC_FILE = ".licensewizardrc.json";

/**
 * Stores the wizard configuration in the standalone `.licensewizardrc.json`
 * dot-file. Always an available save target; the entire file body is the
 * serialized configuration, so clearing it deletes the file outright.
 */
export class RcConfigStore implements IConfigStore {
  readonly id = RC_FILE;
  readonly label = RC_FILE;
  readonly #reader: IFileSystemReader;
  readonly #writer: IFileSystemWriter;

  /**
   * Creates a new RcConfigStore.
   *
   * @param reader - Used to check for and read the dot-file.
   * @param writer - Used to persist and delete the dot-file.
   */
  constructor(reader: IFileSystemReader, writer: IFileSystemWriter) {
    this.#reader = reader;
    this.#writer = writer;
  }

  /**
   * The dot-file is always an eligible save target, regardless of which
   * project manifests are present.
   */
  async available(): Promise<boolean> {
    return true;
  }

  /**
   * Reads the configuration from `.licensewizardrc.json`, or `null` when the
   * file is absent.
   *
   * @throws {FileSystemReaderError} When a file system read operation fails.
   */
  async read(): Promise<WizardConfig | null> {
    try {
      if (!(await this.#reader.exists(RC_FILE))) {
        return null;
      }
      const raw = await this.#reader.read(RC_FILE);
      return JSON.parse(raw) as WizardConfig;
    } catch (cause) {
      if (cause instanceof FileSystemReaderError) {
        throw cause;
      }
      throw new FileSystemReaderError(`Failed to read ${RC_FILE}`, cause);
    }
  }

  /**
   * Writes the configuration to `.licensewizardrc.json`, replacing the file.
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
      throw new FileSystemWriterError(`Failed to write ${RC_FILE}`, cause);
    }
  }

  /**
   * Deletes `.licensewizardrc.json` when it exists.
   *
   * @throws {FileSystemWriterError} When the read or delete operation fails.
   */
  async clear(): Promise<void> {
    try {
      if (await this.#reader.exists(RC_FILE)) {
        await this.#writer.delete(RC_FILE);
      }
    } catch (cause) {
      if (cause instanceof FileSystemWriterError) {
        throw cause;
      }
      throw new FileSystemWriterError(`Failed to clear ${RC_FILE}`, cause);
    }
  }
}
