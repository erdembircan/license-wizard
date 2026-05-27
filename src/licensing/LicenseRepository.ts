import type { ILicenseSource } from "@licensing/interfaces/ILicenseSource.js";
import type { LicenseDetail } from "@licensing/LicenseDetail.js";
import type { LicenseIndexEntry } from "@licensing/LicenseIndexEntry.js";
import { LicenseRepositoryError } from "@licensing/errors/LicenseRepositoryError.js";

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
   * @throws {LicenseRepositoryError} When the underlying source fails to perform the search.
   */
  async search(query: string): Promise<LicenseIndexEntry[]> {
    try {
      return await this.#source.search(query);
    } catch (cause) {
      throw new LicenseRepositoryError(
        `Failed to search licenses for query "${query}"`,
        cause,
      );
    }
  }

  /**
   * Returns the full license detail for the given SPDX identifier.
   *
   * @param licenseId - The SPDX identifier of the license to retrieve.
   * @throws {LicenseRepositoryError} When the underlying source fails to fetch the license.
   */
  async getLicense(licenseId: string): Promise<LicenseDetail> {
    try {
      return await this.#source.fetchLicense(licenseId);
    } catch (cause) {
      throw new LicenseRepositoryError(
        `Failed to fetch license "${licenseId}"`,
        cause,
      );
    }
  }
}
