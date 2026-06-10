/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

/**
 * Thrown when a LicenseRepository operation fails due to an error in the
 * underlying license source. Wraps the original error as `cause` so callers
 * can inspect the root failure if needed.
 */
export class LicenseRepositoryError extends Error {
  /**
   * Creates a new LicenseRepositoryError.
   *
   * @param message - A description of what went wrong.
   * @param cause - The original error thrown by the license source.
   */
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "LicenseRepositoryError";
  }
}
