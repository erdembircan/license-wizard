import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";

/**
 * Contract for a project manifest file (e.g. `package.json`, `composer.json`)
 * that can declare a license, participating in license-default resolution and
 * being kept in sync with the user's selection.
 *
 * A manifest owns no file system access of its own. Each operation receives
 * only the capabilities it needs from its caller — reads take a reader, and the
 * read-modify-write update takes both a reader and a writer — so no manifest
 * ever holds ambient permission to touch the file system.
 */
export interface IProjectManifest {
  /**
   * Returns whether the manifest file exists in the working directory.
   *
   * @param reader - Used to check for the manifest file.
   */
  exists(reader: IFileSystemReader): Promise<boolean>;

  /**
   * Reads the declared license identifier from the manifest, or `null` when
   * the manifest is absent or declares no usable license.
   *
   * @param reader - Used to check for and read the manifest.
   */
  readLicense(reader: IFileSystemReader): Promise<string | null>;

  /**
   * Records the given license identifier in the manifest. Does nothing when
   * the manifest does not exist.
   *
   * @param reader - Used to read existing content that must be preserved.
   * @param writer - Used to persist the updated manifest.
   * @param licenseId - The SPDX identifier to record.
   */
  writeLicense(
    reader: IFileSystemReader,
    writer: IFileSystemWriter,
    licenseId: string,
  ): Promise<void>;
}
