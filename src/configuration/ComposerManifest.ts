/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import { JsonManifest } from "@configuration/abstracts/JsonManifest.js";

const COMPOSER_JSON = "composer.json";

/**
 * The Composer `composer.json` manifest. Its `"license"` field holds either a
 * single SPDX identifier/expression string or an array of strings (disjunctive
 * licensing); the first entry is treated as the primary license.
 */
export class ComposerManifest extends JsonManifest {
  /**
   * Creates a new ComposerManifest.
   */
  constructor() {
    super(COMPOSER_JSON);
  }

  protected extractLicenseId(value: unknown): string | null {
    if (typeof value === "string") {
      return value;
    }
    if (Array.isArray(value)) {
      const first = value.find((entry) => typeof entry === "string");
      return typeof first === "string" ? first : null;
    }
    return null;
  }
}
