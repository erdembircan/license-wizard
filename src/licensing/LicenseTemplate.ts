/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import { SpdxTemplate } from "@licensing/SpdxTemplate.js";

/**
 * Parses an SPDX `standardLicenseTemplate` and renders it into final
 * `LICENSE`-file text. The template markup and substitution rules are shared
 * with the header surface and live in {@link SpdxTemplate}; this subclass marks
 * the license-body domain and is the type the licensing path constructs.
 */
export class LicenseTemplate extends SpdxTemplate {}
