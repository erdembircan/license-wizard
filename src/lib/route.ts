/**
 * Hash-based routing for the site. GitHub Pages serves a single static
 * `index.html` and never rewrites unknown paths, so the documentation lives
 * behind a hash route (`#/docs/...`) that the browser resolves entirely
 * client-side — no server config, no 404 fallback needed.
 *
 * The convention: any hash beginning with `#/` is an app route; every other
 * hash (e.g. `#features`) is a same-page anchor on the landing page and is left
 * to the browser's native scrolling.
 */

export type Route =
  | { name: "landing" }
  | { name: "docs"; section: DocsSectionId };

/** Section ids, in the order they appear in the docs sidebar. */
export const DOCS_SECTION_IDS = [
  "getting-started",
  "interactive",
  "one-shot",
  "headers",
  "verify",
  "apply-config",
  "configuration",
  "agents",
  "flags",
] as const;

export type DocsSectionId = (typeof DOCS_SECTION_IDS)[number];

/** The section shown when the docs are opened without a specific section. */
export const DEFAULT_DOCS_SECTION: DocsSectionId = "getting-started";

function isDocsSection(value: string): value is DocsSectionId {
  return (DOCS_SECTION_IDS as readonly string[]).includes(value);
}

/**
 * Parses a `window.location.hash` value into a route. Anything under `#/docs`
 * resolves to the docs page (defaulting to the first section when none, or an
 * unknown one, is given); everything else is the landing page.
 */
export function parseRoute(hash: string): Route {
  const normalized = hash.replace(/^#/, "");
  if (!normalized.startsWith("/docs")) return { name: "landing" };

  const rest = normalized.slice("/docs".length).replace(/^\//, "");
  const section = rest.split("/")[0] ?? "";
  return {
    name: "docs",
    section: isDocsSection(section) ? section : DEFAULT_DOCS_SECTION,
  };
}

/** Builds the hash for a docs section, for use in `href` attributes. */
export function docsHref(section: DocsSectionId): string {
  return `#/docs/${section}`;
}
