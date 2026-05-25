import type { ILicenseSource } from "./ILicenseSource.js";
import type { LicenseDetail } from "./LicenseDetail.js";
import type { LicenseIndexEntry } from "./LicenseIndexEntry.js";

/**
 * Facade over a license source, providing search and retrieval capabilities
 * to the rest of the application.
 */
export class LicenseRepository {
  readonly #source: ILicenseSource;

  /**
   * Creates a new LicenseRepository backed by the given source.
   *
   * @param source - The license source to use for all data operations.
   */
  constructor(source: ILicenseSource) {
    this.#source = source;
  }

  /**
   * Searches for licenses matching the given query string.
   *
   * @param query - The search term to match against license identifiers and names.
   */
  async search(query: string): Promise<LicenseIndexEntry[]> {
    return this.#source.search(query);
  }

  /**
   * Returns the full license detail for the given SPDX identifier.
   *
   * @param licenseId - The SPDX identifier of the license to retrieve.
   */
  async getLicense(licenseId: string): Promise<LicenseDetail> {
    return this.#source.fetchLicense(licenseId);
  }
}
