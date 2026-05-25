import type { LicenseDetail } from "./LicenseDetail.js";
import type { LicenseIndexEntry } from "./LicenseIndexEntry.js";

/**
 * Contract for a source that provides license data.
 */
export interface ILicenseSource {
  /**
   * Searches for licenses matching the given query string.
   *
   * @param query - The search term to match against license identifiers and names.
   */
  search(query: string): Promise<LicenseIndexEntry[]>;

  /**
   * Fetches the full license detail for the given SPDX license identifier.
   *
   * @param licenseId - The SPDX identifier of the license to fetch.
   */
  fetchLicense(licenseId: string): Promise<LicenseDetail>;
}
