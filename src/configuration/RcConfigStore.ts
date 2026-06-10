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
import { FileSystemReaderError } from "@configuration/errors/FileSystemReaderError.js";
import { FileSystemWriterError } from "@configuration/errors/FileSystemWriterError.js";

const RC_FILE = ".licensewizardrc.json";

/**
 * Stores the wizard configuration in the standalone `.licensewizardrc.json`
 * dot-file. Always an available save target; the entire file body is the
 * serialized configuration, so clearing it deletes the file outright.
 *
 * The store holds no file system access of its own — callers hand a reader or
 * writer to each operation that needs one.
 */
export class RcConfigStore implements IConfigStore {
  readonly id = RC_FILE;
  readonly label = RC_FILE;

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
   * @param reader - Used to check for and read the dot-file.
   * @throws {FileSystemReaderError} When a file system read operation fails.
   */
  async read(reader: IFileSystemReader): Promise<WizardConfig | null> {
    try {
      if (!(await reader.exists(RC_FILE))) {
        return null;
      }
      const raw = await reader.read(RC_FILE);
      return parseWizardConfig(JSON.parse(raw), RC_FILE);
    } catch (cause) {
      if (cause instanceof FileSystemReaderError) {
        throw cause;
      }
      throw new FileSystemReaderError(`Failed to read ${RC_FILE}`, cause);
    }
  }

  /**
   * Writes the configuration to `.licensewizardrc.json`, replacing the file.
   * The dot-file's whole body is the configuration, so nothing needs to be
   * read back to preserve it.
   *
   * @param writer - Used to persist the dot-file.
   * @param config - The configuration to write.
   * @throws {FileSystemWriterError} When the write operation fails.
   */
  async write(
    _reader: IFileSystemReader,
    writer: IFileSystemWriter,
    config: WizardConfig,
  ): Promise<void> {
    try {
      await writer.write(RC_FILE, `${JSON.stringify(config, null, 2)}\n`);
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
   * @param reader - Used to check whether the dot-file exists.
   * @param writer - Used to delete the dot-file.
   * @throws {FileSystemWriterError} When the read or delete operation fails.
   */
  async clear(
    reader: IFileSystemReader,
    writer: IFileSystemWriter,
  ): Promise<void> {
    try {
      if (await reader.exists(RC_FILE)) {
        await writer.delete(RC_FILE);
      }
    } catch (cause) {
      if (cause instanceof FileSystemWriterError) {
        throw cause;
      }
      throw new FileSystemWriterError(`Failed to clear ${RC_FILE}`, cause);
    }
  }
}
