/**
 * Contract for a project manifest file (e.g. `package.json`, `composer.json`)
 * that can declare a license, participating in license-default resolution and
 * being kept in sync with the user's selection.
 */
export interface IProjectManifest {
  /**
   * Returns whether the manifest file exists in the working directory.
   */
  exists(): Promise<boolean>;

  /**
   * Reads the declared license identifier from the manifest, or `null` when
   * the manifest is absent or declares no usable license.
   */
  readLicense(): Promise<string | null>;

  /**
   * Records the given license identifier in the manifest. Does nothing when
   * the manifest does not exist.
   *
   * @param licenseId - The SPDX identifier to record.
   */
  writeLicense(licenseId: string): Promise<void>;
}
