import { createHash } from "node:crypto";
import type { HeaderStyle } from "@headers/HeaderPlan.js";

// The sentinel phrase that identifies a header block as one the wizard wrote.
// Its presence is what lets verification own a block — recognising, re-checking,
// and rewriting it — while leaving hand-written notices that lack it untouched.
// It is deliberately distinctive so it never collides with real source content.
const MARKER_TOKEN = "license-wizard managed-header";

// The marker format version. Bumped only if the marker line's own shape
// changes, so a future wizard can recognise and migrate older blocks.
const MARKER_VERSION = 1;

// How many hex characters of the body digest the marker carries. Enough to make
// an accidental collision negligible while keeping the line short and readable.
const HASH_LENGTH = 12;

export type ParsedMarker = {
  version: number;
  licenseId: string;
  style: string;
  hash: string;
};

/**
 * Returns the sentinel phrase that marks a header block as the wizard's, for
 * callers that need to test a file for one of our blocks.
 */
export function markerToken(): string {
  return MARKER_TOKEN;
}

/**
 * Reports whether the given text contains a wizard-written header marker.
 *
 * @param text - The file (or block) content to test.
 */
export function hasMarker(text: string): boolean {
  return text.includes(MARKER_TOKEN);
}

/**
 * Returns the short, stable digest of a header body used to fingerprint it in
 * the marker line. The body is hashed before it is wrapped in comments, so the
 * same notice fingerprints identically across every language.
 *
 * @param body - The rendered header body text.
 */
export function digestBody(body: string): string {
  return createHash("sha256").update(body).digest("hex").slice(0, HASH_LENGTH);
}

/**
 * Builds the marker line embedded at the foot of a header block. It encodes the
 * format version, the license identifier, the header style, and the body digest
 * — enough for verification to identify the block as ours and to report what it
 * carries — but is not itself part of the hashed body.
 *
 * @param licenseId - The SPDX identifier the header was written for.
 * @param style - The header style (`short` or `full`).
 * @param hash - The body digest from `digestBody`.
 */
export function buildMarker(
  licenseId: string,
  style: HeaderStyle,
  hash: string,
): string {
  return `${MARKER_TOKEN} v${MARKER_VERSION} ${licenseId} ${style} ${hash}`;
}

/**
 * Parses a marker line back into its fields, or returns null when the line is
 * not a recognisable wizard marker. Used for reporting what an out-of-date block
 * currently declares.
 *
 * @param line - The marker line to parse.
 */
export function parseMarker(line: string): ParsedMarker | null {
  const start = line.indexOf(MARKER_TOKEN);
  if (start === -1) {
    return null;
  }

  const rest = line
    .slice(start + MARKER_TOKEN.length)
    .trim()
    .split(/\s+/);
  const [versionTag, licenseId, style, hash] = rest;
  if (!versionTag?.startsWith("v") || !licenseId || !style || !hash) {
    return null;
  }

  return {
    version: Number.parseInt(versionTag.slice(1), 10),
    licenseId,
    style,
    hash,
  };
}
