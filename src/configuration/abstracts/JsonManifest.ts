import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";
import type { IProjectManifest } from "@configuration/interfaces/IProjectManifest.js";
import { FileSystemReaderError } from "@configuration/errors/FileSystemReaderError.js";
import { FileSystemWriterError } from "@configuration/errors/FileSystemWriterError.js";

const LICENSE_FIELD = "license";

/**
 * Base for project manifests stored as JSON with a top-level `"license"`
 * field. Handles existence checks, reading, and writing; subclasses define the
 * file name and how a raw `license` value is coerced to a single identifier.
 */
export abstract class JsonManifest implements IProjectManifest {
  readonly #reader: IFileSystemReader;
  readonly #writer: IFileSystemWriter;
  readonly #fileName: string;

  /**
   * Creates a new JsonManifest for the given manifest file.
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
  }

  /**
   * Returns whether the manifest file exists in the working directory.
   */
  async exists(): Promise<boolean> {
    return this.#reader.exists(this.#fileName);
  }

  /**
   * Reads the declared license identifier from the manifest. Returns `null`
   * when the manifest is absent or declares no usable license.
   *
   * @throws {FileSystemReaderError} When a file system read operation fails.
   */
  async readLicense(): Promise<string | null> {
    try {
      if (!(await this.exists())) {
        return null;
      }

      const raw = await this.#reader.read(this.#fileName);
      const manifest = JSON.parse(raw) as Record<string, unknown>;
      return this.extractLicenseId(manifest[LICENSE_FIELD]);
    } catch (cause) {
      if (cause instanceof FileSystemReaderError) {
        throw cause;
      }
      throw new FileSystemReaderError(
        `Failed to read license field from ${this.#fileName}`,
        cause,
      );
    }
  }

  /**
   * Records the given license identifier in the manifest's `"license"` field,
   * creating it when absent and overwriting it when present while preserving
   * all other fields. Does nothing when the manifest does not exist.
   *
   * @param licenseId - The SPDX identifier to record.
   * @throws {FileSystemWriterError} When the read or write operation fails.
   */
  async writeLicense(licenseId: string): Promise<void> {
    try {
      if (!(await this.exists())) {
        return;
      }

      const raw = await this.#reader.read(this.#fileName);
      const manifest = JSON.parse(raw) as Record<string, unknown>;
      manifest[LICENSE_FIELD] = licenseId;
      await this.#writer.write(
        this.#fileName,
        `${JSON.stringify(manifest, null, 2)}\n`,
      );
    } catch (cause) {
      if (cause instanceof FileSystemWriterError) {
        throw cause;
      }
      throw new FileSystemWriterError(
        `Failed to write license field to ${this.#fileName}`,
        cause,
      );
    }
  }

  /**
   * Coerces a raw `"license"` field value into a single license identifier, or
   * `null` when it declares no usable license.
   *
   * @param value - The raw value of the manifest's `"license"` field.
   */
  protected abstract extractLicenseId(value: unknown): string | null;
}
