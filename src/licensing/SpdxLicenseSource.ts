import type { ILicenseSource } from "@licensing/interfaces/ILicenseSource.js";
import type { LicenseDetail } from "@licensing/LicenseDetail.js";
import type { LicenseIndexEntry } from "@licensing/LicenseIndexEntry.js";

const INDEX_URL =
  "https://raw.githubusercontent.com/spdx/license-list-data/main/json/licenses.json";

const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

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
  standardLicenseTemplate?: string;
};

type IndexCache = {
  data: SpdxIndexItem[];
  cachedAt: number;
};

type DetailCacheEntry = {
  data: LicenseDetail;
  cachedAt: number;
};

/**
 * Fetches license data from the SPDX License List Data repository.
 *
 * Uses the master index to discover available licenses and fetches
 * individual license details on demand. Both the index and individual
 * license details are cached in memory with a configurable TTL; stale
 * entries are re-fetched automatically.
 */
export class SpdxLicenseSource implements ILicenseSource {
  #cache: IndexCache | null = null;
  readonly #detailCache = new Map<string, DetailCacheEntry>();
  readonly #ttlMs: number;

  /**
   * Creates a new SpdxLicenseSource.
   *
   * @param ttlMs - How long the in-memory index cache is considered fresh, in milliseconds. Defaults to one hour.
   */
  constructor(ttlMs: number = DEFAULT_TTL_MS) {
    this.#ttlMs = ttlMs;
  }

  /**
   * Returns true when the cache exists and has not yet exceeded its TTL.
   */
  #isCacheValid(): boolean {
    if (this.#cache === null) return false;
    return Date.now() - this.#cache.cachedAt < this.#ttlMs;
  }

  /**
   * Loads the SPDX license index, using the cache when it is still fresh.
   */
  async #loadIndex(): Promise<SpdxIndexItem[]> {
    if (this.#isCacheValid()) {
      return this.#cache!.data;
    }

    const response = await fetch(INDEX_URL);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch SPDX license index: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as SpdxIndex;
    this.#cache = {
      data: data.licenses.filter((l) => !l.isDeprecatedLicenseId),
      cachedAt: Date.now(),
    };
    return this.#cache.data;
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
    const key = licenseId.toLowerCase();

    const cached = this.#detailCache.get(key);
    if (cached && Date.now() - cached.cachedAt < this.#ttlMs) {
      return cached.data;
    }

    const index = await this.#loadIndex();
    const entry = index.find((e) => e.licenseId.toLowerCase() === key);

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

    const detail: LicenseDetail = {
      licenseId: data.licenseId,
      name: data.name,
      licenseText: data.licenseText,
      standardLicenseTemplate: data.standardLicenseTemplate,
    };

    this.#detailCache.set(key, { data: detail, cachedAt: Date.now() });

    return detail;
  }
}
