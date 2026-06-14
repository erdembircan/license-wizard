/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import { ManifestConfigStore } from "@configuration/abstracts/ManifestConfigStore.js";

const PACKAGE_JSON = "package.json";

/**
 * Stores the wizard configuration in the npm `package.json` manifest's
 * `"license-wizard"` field.
 */
export class NpmConfigStore extends ManifestConfigStore {
  /**
   * Creates a new NpmConfigStore.
   */
  constructor() {
    super(PACKAGE_JSON);
  }
}
