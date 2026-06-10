/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import type { LicenseDetail } from "@licensing/LicenseDetail.js";
import type { LicenseIndexEntry } from "@licensing/LicenseIndexEntry.js";

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
   * Returns the licenses whose identifier or name most closely resembles the
   * given query, ranked best-first. Unlike `search`, this never returns an empty
   * result for a non-empty index — it always offers the nearest candidates, so
   * it is suited to recovering from a mistyped identifier.
   *
   * @param query - The (possibly mistyped) term to find close matches for.
   * @param limit - The maximum number of suggestions to return.
   */
  suggest(query: string, limit: number): Promise<LicenseIndexEntry[]>;

  /**
   * Fetches the full license detail for the given SPDX license identifier.
   *
   * @param licenseId - The SPDX identifier of the license to fetch.
   */
  fetchLicense(licenseId: string): Promise<LicenseDetail>;
}
