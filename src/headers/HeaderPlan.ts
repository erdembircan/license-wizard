/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import type { LicenseDetail } from "@licensing/LicenseDetail.js";

/**
 * Which form of header to write into source files.
 *
 * - `short` — the machine-readable SPDX tag lines (`SPDX-License-Identifier`
 *   and, when copyright values are known, `SPDX-FileCopyrightText`). Available
 *   for every license.
 * - `full` — the license's complete `standardLicenseHeader` notice, with
 *   copyright placeholders substituted when the selection was customized.
 *   Available only for licenses that publish a standard header.
 */
export type HeaderStyle = "short" | "full";

export const HEADER_STYLES: readonly HeaderStyle[] = ["short", "full"];

/**
 * Everything needed to render the header for a selection: the license detail
 * (its identifier, standard header, and header template), the chosen style, and
 * the copyright token values inherited from the license-text customization
 * (keyed by slot token, e.g. `{ "[yyyy]": "2026" }`).
 */
export type HeaderPlan = {
  detail: LicenseDetail;
  style: HeaderStyle;
  tokens: Record<string, string>;
};
