import type { ILicenseSource } from "./ILicenseSource.js";
import type { LicenseDetail } from "./LicenseDetail.js";
import type { LicenseIndexEntry } from "./LicenseIndexEntry.js";

const INDEX_URL =
  "https://raw.githubusercontent.com/spdx/license-list-data/main/json/licenses.json";

type SpdxIndexItem = {
  licenseId: string;
  name: string;
  detailsUrl: string;
  isDeprecatedLicenseId: boolean;
};

type SpdxIndex = {
  licenses: SpdxIndexItem[];
};

type SpdxDetailResponse = {
  licenseId: string;
  name: string;
  licenseText: string;
};

/**
 * Fetches license data from the SPDX License List Data repository.
 *
 * Uses the master index to discover available licenses and fetches
 * individual license details on demand. The index is fetched once
 * per instance and cached in memory for the lifetime of the object.
 */
export class SpdxLicenseSource implements ILicenseSource {
  #index: SpdxIndexItem[] | null = null;

  /**
   * Loads the SPDX license index if it has not already been loaded.
   */
  async #loadIndex(): Promise<SpdxIndexItem[]> {
    if (this.#index !== null) {
      return this.#index;
    }

    const response = await fetch(INDEX_URL);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch SPDX license index: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as SpdxIndex;
    this.#index = data.licenses.filter((l) => !l.isDeprecatedLicenseId);
    return this.#index;
  }

  /**
   * Searches the SPDX license index for entries matching the query.
   *
   * @param query - The search term to match against license IDs and names (case-insensitive).
   */
  async search(query: string): Promise<LicenseIndexEntry[]> {
    const index = await this.#loadIndex();
    const lower = query.toLowerCase();

    return index
      .filter(
        (entry) =>
          entry.licenseId.toLowerCase().includes(lower) ||
          entry.name.toLowerCase().includes(lower),
      )
      .map(({ licenseId, name }) => ({ licenseId, name }));
  }

  /**
   * Fetches the full license text and metadata for the given SPDX identifier.
   *
   * @param licenseId - The SPDX identifier of the license to fetch.
   */
  async fetchLicense(licenseId: string): Promise<LicenseDetail> {
    const index = await this.#loadIndex();
    const entry = index.find(
      (e) => e.licenseId.toLowerCase() === licenseId.toLowerCase(),
    );

    if (!entry) {
      throw new Error(`License not found: ${licenseId}`);
    }

    const response = await fetch(entry.detailsUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch license details for ${licenseId}: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as SpdxDetailResponse;

    return {
      licenseId: data.licenseId,
      name: data.name,
      licenseText: data.licenseText,
    };
  }
}
