/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";
import type { IProjectManifest } from "@configuration/interfaces/IProjectManifest.js";
import { JsonManifestDocument } from "@configuration/JsonManifestDocument.js";
import { FileSystemReaderError } from "@configuration/errors/FileSystemReaderError.js";
import { FileSystemWriterError } from "@configuration/errors/FileSystemWriterError.js";

const LICENSE_FIELD = "license";

/**
 * Base for project manifests stored as JSON with a top-level `"license"`
 * field. Handles existence checks, reading, and writing; subclasses define the
 * file name and how a raw `license` value is coerced to a single identifier.
 *
 * The manifest holds no file system access of its own — callers hand a reader
 * or writer to each operation that needs one.
 */
export abstract class JsonManifest implements IProjectManifest {
  readonly #fileName: string;

  /**
   * Creates a new JsonManifest for the given manifest file.
   *
   * @param fileName - The manifest file name (e.g. `package.json`).
   */
  constructor(fileName: string) {
    this.#fileName = fileName;
  }

  /**
   * The manifest's file name (e.g. `package.json`).
   */
  get name(): string {
    return this.#fileName;
  }

  /**
   * Returns whether the manifest file exists in the working directory.
   *
   * @param reader - Used to check for the manifest file.
   */
  async exists(reader: IFileSystemReader): Promise<boolean> {
    return reader.exists(this.#fileName);
  }

  /**
   * Reads the declared license identifier from the manifest. Returns `null`
   * when the manifest is absent or declares no usable license.
   *
   * @param reader - Used to check for and read the manifest.
   * @throws {FileSystemReaderError} When a file system read operation fails.
   */
  async readLicense(reader: IFileSystemReader): Promise<string | null> {
    try {
      if (!(await this.exists(reader))) {
        return null;
      }

      // A pure read that never reserializes, so it needs no object-guard: a
      // manifest whose top level is not an object simply exposes no `license`
      // field and yields null, rather than failing as it would for a write.
      const manifest = JSON.parse(await reader.read(this.#fileName)) as Record<
        string,
        unknown
      >;
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
   * @param reader - Used to read the existing manifest so other fields survive.
   * @param writer - Used to persist the updated manifest.
   * @param licenseId - The SPDX identifier to record.
   * @throws {FileSystemWriterError} When the read or write operation fails.
   */
  async writeLicense(
    reader: IFileSystemReader,
    writer: IFileSystemWriter,
    licenseId: string,
  ): Promise<void> {
    try {
      if (!(await this.exists(reader))) {
        return;
      }

      const document = JsonManifestDocument.read(
        await reader.read(this.#fileName),
        this.#fileName,
      );
      document.set(LICENSE_FIELD, licenseId);
      await writer.write(this.#fileName, document.serialize());
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
   * Verifies the manifest can be updated without corrupting it, throwing when it
   * exists but cannot be parsed as a JSON object. Callers run this before any
   * write so a malformed or non-object manifest aborts the whole operation up
   * front — rather than after the `LICENSE` file has already been written, which
   * would leave the declared license and the file on disk disagreeing. An absent
   * manifest is fine: it is simply skipped at write time.
   *
   * @param reader - Used to check for and read the manifest.
   * @throws {FileSystemWriterError} When the manifest exists but is not a JSON object.
   */
  async assertWritable(reader: IFileSystemReader): Promise<void> {
    if (!(await this.exists(reader))) {
      return;
    }
    JsonManifestDocument.read(
      await reader.read(this.#fileName),
      this.#fileName,
    );
  }

  /**
   * Coerces a raw `"license"` field value into a single license identifier, or
   * `null` when it declares no usable license.
   *
   * @param value - The raw value of the manifest's `"license"` field.
   */
  protected abstract extractLicenseId(value: unknown): string | null;
}
