/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import type { HeaderStyle } from "@headers/HeaderPlan.js";
import type { LicenseIndexEntry } from "@licensing/LicenseIndexEntry.js";
import type { TemplateSlot } from "@licensing/TemplateSlot.js";
import type { ConfigSave } from "../LicenseInstaller.js";

/**
 * The stream a message is destined for: `out` for informational output, `err`
 * for errors. The sink uses this to pick the destination and decide coloring;
 * presentation never depends on it.
 */
export type OutputChannel = "out" | "err";

/**
 * A manifest reconciled by a verify fix, named with whatever license it
 * previously declared (`was` is null when it declared nothing).
 */
export type ReconciledManifest = {
  name: string;
  was: string | null;
};

/**
 * A manifest that drifted from the saved configuration, named with the license
 * it declares (`declared` is null when it declares nothing).
 */
export type DriftedManifest = {
  name: string;
  declared: string | null;
};

/**
 * How a source file's managed header drifted, reduced to the decision the
 * presenter needs — distinct from the raw `HeaderDrift` it is derived from:
 *
 * - `edited` — the block was altered by hand after the wizard wrote it.
 * - `declares` — the block faithfully describes an earlier selection, named here.
 * - `drifted` — the block drifted but its declared selection is unavailable.
 */
export type HeaderDriftNote =
  | { file: string; kind: "edited" }
  | { file: string; kind: "declares"; licenseId: string; style: string }
  | { file: string; kind: "drifted" };

/**
 * The view-model the reporter emits for every CLI outcome: a discriminated
 * union, keyed by `kind`, carrying only the semantic data behind a line of
 * output — counts, identifiers, file lists, and the decisions derived from a
 * report (which surfaces drifted, how many headers were added). The wording and
 * coloring that turn a message into terminal text live entirely in the
 * presenter, so tests can assert against this data surface without coupling to
 * the prose.
 */
export type OutputMessage =
  | { kind: "usage"; channel: "out"; options: string }
  | { kind: "tokens"; channel: "out"; licenseId: string; slots: TemplateSlot[] }
  | { kind: "generated"; channel: "out"; licenseId: string; savedTo: string }
  | {
      kind: "dryRun";
      channel: "out";
      licenseId: string;
      content: string;
      save: ConfigSave;
      manifests: string[];
    }
  | {
      kind: "missingFields";
      channel: "err";
      licenseId: string;
      missing: TemplateSlot[];
    }
  | {
      kind: "unknownFields";
      channel: "err";
      licenseId: string;
      unknown: string[];
      slots: TemplateSlot[];
    }
  | {
      kind: "licenseNotFound";
      channel: "err";
      licenseId: string;
      suggestions: LicenseIndexEntry[];
    }
  | {
      kind: "verifyMatch";
      channel: "out";
      licenseId: string;
      manifestsChecked: boolean;
    }
  | {
      kind: "verifyFixed";
      channel: "out";
      licenseId: string;
      licenseRegenerated: boolean;
      manifests: ReconciledManifest[];
    }
  | {
      kind: "verifyMismatch";
      channel: "err";
      licenseId: string;
      licenseMismatch: boolean;
      manifests: DriftedManifest[];
    }
  | { kind: "headersNoFiles"; channel: "out"; licenseId: string }
  | {
      kind: "headersGenerated";
      channel: "out";
      licenseId: string;
      style: HeaderStyle;
      total: number;
      written: number;
      unchanged: number;
      skipped: number;
    }
  | {
      kind: "headersDryRun";
      channel: "out";
      licenseId: string;
      style: HeaderStyle;
      files: string[];
      sample: string;
    }
  | {
      kind: "headersRemoved";
      channel: "out";
      removed: string[];
      total: number;
    }
  | {
      kind: "headersRemoveDryRun";
      channel: "out";
      removed: string[];
      total: number;
    }
  | {
      kind: "headersVerifyMatch";
      channel: "out";
      licenseId: string;
      style: HeaderStyle;
      total: number;
      skipped: number;
    }
  | {
      kind: "headersVerifyFixed";
      channel: "out";
      licenseId: string;
      style: HeaderStyle;
      added: number;
      rewritten: number;
      skipped: number;
    }
  | {
      kind: "headersVerifyMismatch";
      channel: "err";
      licenseId: string;
      style: HeaderStyle;
      missing: string[];
      drifted: HeaderDriftNote[];
    }
  | { kind: "error"; channel: "err"; message: string };
