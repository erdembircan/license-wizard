import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";
import type { IProjectManifest } from "@configuration/interfaces/IProjectManifest.js";

/**
 * Coordinates license resolution across the project manifests present in the
 * working directory. Reads honour the manifests' priority order; writes fan
 * out to every manifest that exists, so a directory that is both a Composer
 * and an npm project has both files kept in sync.
 *
 * The repository owns the file system reader and writer and hands each manifest
 * only the capability an operation needs, so no manifest holds ambient file
 * system access.
 */
export class ProjectManifestRepository {
  readonly #manifests: readonly IProjectManifest[];
  readonly #reader: IFileSystemReader;
  readonly #writer: IFileSystemWriter;

  /**
   * Creates a new ProjectManifestRepository.
   *
   * @param manifests - The manifests to coordinate, in read-priority order
   *   (the first manifest to declare a license wins).
   * @param reader - Handed to manifests for read operations.
   * @param writer - Handed to manifests for write operations.
   */
  constructor(
    manifests: readonly IProjectManifest[],
    reader: IFileSystemReader,
    writer: IFileSystemWriter,
  ) {
    this.#manifests = manifests;
    this.#reader = reader;
    this.#writer = writer;
  }

  /**
   * Returns the license declared by the highest-priority manifest that has
   * one, or `null` when no present manifest declares a license.
   */
  async readLicense(): Promise<string | null> {
    for (const manifest of this.#manifests) {
      const license = await manifest.readLicense(this.#reader);
      if (license) {
        return license;
      }
    }
    return null;
  }

  /**
   * Records the given license identifier in every manifest present in the
   * working directory. Manifests that do not exist are skipped.
   *
   * @param licenseId - The SPDX identifier to record.
   */
  async writeLicense(licenseId: string): Promise<void> {
    for (const manifest of this.#manifests) {
      await manifest.writeLicense(this.#reader, this.#writer, licenseId);
    }
  }
}
