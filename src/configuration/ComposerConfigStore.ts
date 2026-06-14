/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import { ManifestConfigStore } from "@configuration/abstracts/ManifestConfigStore.js";

const COMPOSER_JSON = "composer.json";

/**
 * Stores the wizard configuration in the Composer `composer.json` manifest's
 * `"license-wizard"` field.
 */
export class ComposerConfigStore extends ManifestConfigStore {
  /**
   * Creates a new ComposerConfigStore.
   */
  constructor() {
    super(COMPOSER_JSON);
  }
}
