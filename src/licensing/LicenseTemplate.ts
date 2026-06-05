import { SpdxTemplate } from "@licensing/SpdxTemplate.js";

/**
 * Parses an SPDX `standardLicenseTemplate` and renders it into final
 * `LICENSE`-file text. The template markup and substitution rules are shared
 * with the header surface and live in {@link SpdxTemplate}; this subclass marks
 * the license-body domain and is the type the licensing path constructs.
 */
export class LicenseTemplate extends SpdxTemplate {}
