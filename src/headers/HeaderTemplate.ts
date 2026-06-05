import { SpdxTemplate } from "@licensing/SpdxTemplate.js";

/**
 * Parses an SPDX `standardLicenseHeaderTemplate` and renders it into a
 * source-file header notice. The template markup and substitution rules are
 * shared with the license body and live in {@link SpdxTemplate}; this subclass
 * marks the header domain and is the type the header renderer constructs.
 */
export class HeaderTemplate extends SpdxTemplate {}
