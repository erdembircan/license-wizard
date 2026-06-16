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
 * Which comment delimiter wraps the header block — a presentation choice that is
 * orthogonal to the header's `style` (what the body says) and changes only how
 * the block opens, never its SPDX content. SPDX and REUSE recognise the tag in
 * either form, so both are equally valid carriers.
 *
 * - `block` — a plain C-style block comment opened with two characters. The
 *   REUSE-conventional default.
 * - `docblock` — a documentation comment opened with three characters, written
 *   tight against the preamble (no blank line after a `<?php` open tag or
 *   shebang). This is what
 *   PHPDoc/WordPress Coding Standards expect of a file's first comment, so a
 *   managed header stops tripping the WPCS file-comment sniffs
 *   (`Squiz.Commenting.FileComment.WrongStyle` and
 *   `Squiz.Commenting.BlockComment.HasEmptyLineBefore`).
 */
export type HeaderComment = "block" | "docblock";

export const HEADER_COMMENT_BLOCK: HeaderComment = "block";
export const HEADER_COMMENT_DOCBLOCK: HeaderComment = "docblock";

export const HEADER_COMMENTS: readonly HeaderComment[] = [
  HEADER_COMMENT_BLOCK,
  HEADER_COMMENT_DOCBLOCK,
];

/**
 * Everything needed to render the header for a selection: the license detail
 * (its identifier, standard header, and header template), the chosen style, the
 * comment delimiter that wraps the block, and the copyright token values
 * inherited from the license-text customization (keyed by slot token, e.g.
 * `{ "[yyyy]": "2026" }`).
 */
export type HeaderPlan = {
  detail: LicenseDetail;
  style: HeaderStyle;
  comment: HeaderComment;
  tokens: Record<string, string>;
};
