import type { IConfigStore } from "@configuration/interfaces/IConfigStore.js";
import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";
import type { WizardConfig } from "@configuration/WizardConfig.js";
import { FileSystemReaderError } from "@configuration/errors/FileSystemReaderError.js";
import { FileSystemWriterError } from "@configuration/errors/FileSystemWriterError.js";

const CONFIG_FIELD = "license-wizard";

/**
 * Stores the wizard configuration inside a project manifest's
 * `"license-wizard"` field (e.g. `package.json`, `composer.json`). Available
 * only when the manifest file exists; writing and clearing preserve every other
 * field in the file.
 */
export class ManifestConfigStore implements IConfigStore {
  readonly id: string;
  readonly label: string;
  readonly #reader: IFileSystemReader;
  readonly #writer: IFileSystemWriter;
  readonly #fileName: string;

  /**
   * Creates a new ManifestConfigStore for the given manifest file.
   *
   * @param reader - Used to check for and read the manifest.
   * @param writer - Used to persist changes to the manifest.
   * @param fileName - The manifest file name (e.g. `package.json`).
   */
  constructor(
    reader: IFileSystemReader,
    writer: IFileSystemWriter,
    fileName: string,
  ) {
    this.#reader = reader;
    this.#writer = writer;
    this.#fileName = fileName;
    this.id = fileName;
    this.label = fileName;
  }

  /**
   * A manifest is an eligible save target only when its file exists in the
   * working directory.
   */
  async available(): Promise<boolean> {
    return this.#reader.exists(this.#fileName);
  }

  /**
   * Reads the configuration from the manifest's `"license-wizard"` field, or
   * `null` when the manifest is absent or has no such field.
   *
   * @throws {FileSystemReaderError} When a file system read operation fails.
   */
  async read(): Promise<WizardConfig | null> {
    try {
      if (!(await this.#reader.exists(this.#fileName))) {
        return null;
      }
      const manifest = await this.#readManifest();
      const field = manifest[CONFIG_FIELD];
      return field === undefined ? null : (field as WizardConfig);
    } catch (cause) {
      if (cause instanceof FileSystemReaderError) {
        throw cause;
      }
      throw new FileSystemReaderError(
        `Failed to read ${CONFIG_FIELD} field from ${this.#fileName}`,
        cause,
      );
    }
  }

  /**
   * Records the configuration in the manifest's `"license-wizard"` field,
   * creating the field when absent and overwriting it when present while
   * preserving all other fields.
   *
   * @param config - The configuration to write.
   * @throws {FileSystemWriterError} When the read or write operation fails.
   */
  async write(config: WizardConfig): Promise<void> {
    try {
      const manifest = (await this.#reader.exists(this.#fileName))
        ? await this.#readManifest()
        : {};
      manifest[CONFIG_FIELD] = config;
      await this.#writeManifest(manifest);
    } catch (cause) {
      if (cause instanceof FileSystemWriterError) {
        throw cause;
      }
      throw new FileSystemWriterError(
        `Failed to write ${CONFIG_FIELD} field to ${this.#fileName}`,
        cause,
      );
    }
  }

  /**
   * Removes the manifest's `"license-wizard"` field when present, leaving every
   * other field intact. Does nothing when the manifest is absent or has no such
   * field.
   *
   * @throws {FileSystemWriterError} When the read or write operation fails.
   */
  async clear(): Promise<void> {
    try {
      if (!(await this.#reader.exists(this.#fileName))) {
        return;
      }
      const manifest = await this.#readManifest();
      if (!(CONFIG_FIELD in manifest)) {
        return;
      }
      delete manifest[CONFIG_FIELD];
      await this.#writeManifest(manifest);
    } catch (cause) {
      if (cause instanceof FileSystemWriterError) {
        throw cause;
      }
      throw new FileSystemWriterError(
        `Failed to clear ${CONFIG_FIELD} field from ${this.#fileName}`,
        cause,
      );
    }
  }

  async #readManifest(): Promise<Record<string, unknown>> {
    const raw = await this.#reader.read(this.#fileName);
    return JSON.parse(raw) as Record<string, unknown>;
  }

  async #writeManifest(manifest: Record<string, unknown>): Promise<void> {
    await this.#writer.write(
      this.#fileName,
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
  }
}
