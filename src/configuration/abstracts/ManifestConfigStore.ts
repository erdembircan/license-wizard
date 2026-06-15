/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import type { IConfigStore } from "@configuration/interfaces/IConfigStore.js";
import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";
import {
  parseWizardConfig,
  type WizardConfig,
} from "@configuration/WizardConfig.js";
import { JsonManifestDocument } from "@configuration/JsonManifestDocument.js";
import { FileSystemReaderError } from "@configuration/errors/FileSystemReaderError.js";
import { FileSystemWriterError } from "@configuration/errors/FileSystemWriterError.js";

const CONFIG_FIELD = "license-wizard";

/**
 * Base for wizard configuration stored inside a project manifest's
 * `"license-wizard"` field (e.g. `package.json`, `composer.json`). Available
 * only when the manifest file exists; writing and clearing preserve every other
 * field in the file. Subclasses fix the manifest file name.
 *
 * The store holds no file system access of its own — callers hand a reader or
 * writer to each operation that needs one.
 */
export abstract class ManifestConfigStore implements IConfigStore {
  readonly id: string;
  readonly label: string;
  readonly #fileName: string;

  /**
   * Creates a new ManifestConfigStore for the given manifest file.
   *
   * @param fileName - The manifest file name (e.g. `package.json`).
   */
  constructor(fileName: string) {
    this.#fileName = fileName;
    this.id = fileName;
    this.label = fileName;
  }

  /**
   * A manifest is an eligible save target only when its file exists in the
   * working directory.
   *
   * @param reader - Used to check for the manifest file.
   */
  async available(reader: IFileSystemReader): Promise<boolean> {
    return reader.exists(this.#fileName);
  }

  /**
   * Reads the configuration from the manifest's `"license-wizard"` field, or
   * `null` when the manifest is absent or has no such field.
   *
   * @param reader - Used to check for and read the manifest.
   * @throws {FileSystemReaderError} When a file system read operation fails.
   */
  async read(reader: IFileSystemReader): Promise<WizardConfig | null> {
    try {
      if (!(await reader.exists(this.#fileName))) {
        return null;
      }
      const document = JsonManifestDocument.read(
        await reader.read(this.#fileName),
        this.#fileName,
      );
      return document.has(CONFIG_FIELD)
        ? parseWizardConfig(document.get(CONFIG_FIELD), this.#fileName)
        : null;
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
   * @param reader - Used to read the existing manifest so other fields survive.
   * @param writer - Used to persist the updated manifest.
   * @param config - The configuration to write.
   * @throws {FileSystemWriterError} When the read or write operation fails.
   */
  async write(
    reader: IFileSystemReader,
    writer: IFileSystemWriter,
    config: WizardConfig,
  ): Promise<void> {
    try {
      const document = (await reader.exists(this.#fileName))
        ? JsonManifestDocument.read(
            await reader.read(this.#fileName),
            this.#fileName,
          )
        : JsonManifestDocument.empty();
      document.set(CONFIG_FIELD, config);
      await writer.write(this.#fileName, document.serialize());
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
   * @param reader - Used to check for and read the existing manifest.
   * @param writer - Used to persist the updated manifest.
   * @throws {FileSystemWriterError} When the read or write operation fails.
   */
  async clear(
    reader: IFileSystemReader,
    writer: IFileSystemWriter,
  ): Promise<void> {
    try {
      if (!(await reader.exists(this.#fileName))) {
        return;
      }
      const document = JsonManifestDocument.read(
        await reader.read(this.#fileName),
        this.#fileName,
      );
      if (!document.has(CONFIG_FIELD)) {
        return;
      }
      document.delete(CONFIG_FIELD);
      await writer.write(this.#fileName, document.serialize());
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
}
