/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import type { ILicenseSource } from "@licensing/interfaces/ILicenseSource.js";
import type { LicenseDetail } from "@licensing/LicenseDetail.js";
import type { LicenseIndexEntry } from "@licensing/LicenseIndexEntry.js";
import { LicenseNotFoundError } from "@licensing/errors/LicenseNotFoundError.js";
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
   * Returns the licenses whose identifier or name most closely resembles the
   * query, ranked best-first, for recovering from a mistyped identifier.
   *
   * @param query - The (possibly mistyped) term to find close matches for.
   * @param limit - The maximum number of suggestions to return.
   * @throws {LicenseRepositoryError} When the underlying source fails to produce suggestions.
   */
  async suggest(query: string, limit: number): Promise<LicenseIndexEntry[]> {
    try {
      return await this.#source.suggest(query, limit);
    } catch (cause) {
      throw new LicenseRepositoryError(
        `Failed to suggest licenses for query "${query}"`,
        cause,
      );
    }
  }

  /**
   * Returns the full license detail for the given SPDX identifier. A missing
   * identifier surfaces as a {@link LicenseNotFoundError} so callers can offer
   * suggestions; any other source failure is wrapped as a
   * {@link LicenseRepositoryError}.
   *
   * @param licenseId - The SPDX identifier of the license to retrieve.
   * @throws {LicenseNotFoundError} When no license with the given identifier exists.
   * @throws {LicenseRepositoryError} When the underlying source fails to fetch the license.
   */
  async getLicense(licenseId: string): Promise<LicenseDetail> {
    try {
      return await this.#source.fetchLicense(licenseId);
    } catch (cause) {
      if (cause instanceof LicenseNotFoundError) {
        throw cause;
      }
      throw new LicenseRepositoryError(
        `Failed to fetch license "${licenseId}"`,
        cause,
      );
    }
  }
}
