/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

/**
 * Thrown when a requested SPDX license identifier does not exist in the license
 * index. Unlike a generic source failure, this signals a recoverable user
 * mistake — a mistyped or unknown id — so callers can respond with suggestions
 * rather than treating it as an unexpected error.
 */
export class LicenseNotFoundError extends Error {
  readonly licenseId: string;

  /**
   * Creates a new LicenseNotFoundError.
   *
   * @param licenseId - The SPDX identifier that could not be found.
   */
  constructor(licenseId: string) {
    super(`License not found: ${licenseId}`);
    this.name = "LicenseNotFoundError";
    this.licenseId = licenseId;
  }
}
