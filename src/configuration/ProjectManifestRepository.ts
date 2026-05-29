import type { IProjectManifest } from "@configuration/interfaces/IProjectManifest.js";

/**
 * Coordinates license resolution across the project manifests present in the
 * working directory. Reads honour the manifests' priority order; writes fan
 * out to every manifest that exists, so a directory that is both a Composer
 * and an npm project has both files kept in sync.
 */
export class ProjectManifestRepository {
  readonly #manifests: readonly IProjectManifest[];

  /**
   * Creates a new ProjectManifestRepository.
   *
   * @param manifests - The manifests to coordinate, in read-priority order
   *   (the first manifest to declare a license wins).
   */
  constructor(manifests: readonly IProjectManifest[]) {
    this.#manifests = manifests;
  }

  /**
   * Returns the license declared by the highest-priority manifest that has
   * one, or `null` when no present manifest declares a license.
   */
  async readLicense(): Promise<string | null> {
    for (const manifest of this.#manifests) {
      const license = await manifest.readLicense();
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
      await manifest.writeLicense(licenseId);
    }
  }
}
