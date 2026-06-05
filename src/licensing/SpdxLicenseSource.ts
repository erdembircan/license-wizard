import type { ILicenseSource } from "@licensing/interfaces/ILicenseSource.js";
import type { LicenseDetail } from "@licensing/LicenseDetail.js";
import type { LicenseIndexEntry } from "@licensing/LicenseIndexEntry.js";
import { LicenseNotFoundError } from "@licensing/errors/LicenseNotFoundError.js";

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
  standardLicenseHeader?: string;
  standardLicenseHeaderTemplate?: string;
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
   * Ranks every indexed license by how closely its identifier resembles the
   * query and returns the closest `limit` entries, best match first. Comparison
   * ignores case and separators (so `apache-2-0` finds `Apache-2.0`), falling
   * back to edit distance so near-misses still surface.
   *
   * @param query - The (possibly mistyped) term to find close matches for.
   * @param limit - The maximum number of suggestions to return.
   */
  async suggest(query: string, limit: number): Promise<LicenseIndexEntry[]> {
    const index = await this.#loadIndex();
    const normalizedQuery = this.#normalize(query);

    return index
      .map((entry) => ({
        entry,
        score: this.#similarityScore(normalizedQuery, entry),
      }))
      .sort(
        (a, b) =>
          a.score - b.score ||
          a.entry.licenseId.localeCompare(b.entry.licenseId),
      )
      .slice(0, Math.max(0, limit))
      .map(({ entry: { licenseId, name } }) => ({ licenseId, name }));
  }

  /**
   * Scores how far an index entry is from the normalized query — lower is a
   * closer match. An exact normalized identifier match scores 0; a query that
   * appears within the identifier or name scores near-best; otherwise the score
   * is the edit distance between the query and the entry's identifier.
   */
  #similarityScore(normalizedQuery: string, entry: SpdxIndexItem): number {
    const normalizedId = this.#normalize(entry.licenseId);
    const normalizedName = this.#normalize(entry.name);
    const distance = this.#editDistance(normalizedQuery, normalizedId);

    if (
      normalizedId.includes(normalizedQuery) ||
      normalizedName.includes(normalizedQuery)
    ) {
      return Math.min(distance, 1);
    }

    return distance;
  }

  /**
   * Lower-cases the text and strips every non-alphanumeric character so that
   * separator and case differences (e.g. `apache-2-0` vs `Apache-2.0`) do not
   * count against a match.
   */
  #normalize(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  /**
   * Computes the Levenshtein edit distance between two strings — the minimum
   * number of single-character insertions, deletions, or substitutions that
   * turn one into the other.
   */
  #editDistance(a: string, b: string): number {
    let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

    for (let i = 1; i <= a.length; i++) {
      const current = [i];
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        current[j] = Math.min(
          current[j - 1] + 1,
          previous[j] + 1,
          previous[j - 1] + cost,
        );
      }
      previous = current;
    }

    return previous[b.length];
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
      throw new LicenseNotFoundError(licenseId);
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
      standardLicenseHeader: data.standardLicenseHeader,
      standardLicenseHeaderTemplate: data.standardLicenseHeaderTemplate,
    };

    this.#detailCache.set(key, { data: detail, cachedAt: Date.now() });

    return detail;
  }
}
