/**
 * Shared documentation rendering. Both the production prerender
 * (scripts/prerender-docs.mjs) and the dev-server plugin
 * (scripts/vite-docs-plugin.mjs) render pages through here, so the built site
 * and `pnpm dev` are byte-for-byte the same layout — only the asset tags in
 * the head differ (a built stylesheet vs. dev module scripts).
 */
import { marked } from "marked";
import { parseDocumentation, slugify } from "./parse-docs.mjs";

// Give every heading a slug id so the search palette can deep-link straight to
// a subsection (e.g. /docs/source-file-headers/#two-styles). The slug logic is
// shared with the search-index builder, so anchors and ids always agree.
marked.use({
  renderer: {
    heading({ tokens, depth, text }) {
      const inner = this.parser.parseInline(tokens);
      return `<h${depth} id="${slugify(text)}">${inner}</h${depth}>\n`;
    },
  },
});

export const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap";

/** Parses the documentation source into its ordered sections. */
export function getSections(source) {
  return parseDocumentation(source).sections;
}

function sidebar(sections, activeId, base) {
  const items = sections
    .map((s) => {
      const active = s.id === activeId;
      return `<li><a href="${base}docs/${s.id}/" class="docs-side-link${
        active ? " is-active" : ""
      }"${active ? ' aria-current="page"' : ""}>${s.title}</a></li>`;
    })
    .join("");
  return `<nav class="docs-side" aria-label="Documentation sections">
    <p class="docs-side-title">Documentation</p>
    <ul class="docs-side-list">${items}</ul>
  </nav>`;
}

function pager(sections, index, base) {
  const prev = index > 0 ? sections[index - 1] : null;
  const next = index < sections.length - 1 ? sections[index + 1] : null;
  const prevHtml = prev
    ? `<a href="${base}docs/${prev.id}/" class="docs-pager-link"><span class="docs-pager-dir">← Previous</span><span class="docs-pager-title">${prev.title}</span></a>`
    : "<span></span>";
  const nextHtml = next
    ? `<a href="${base}docs/${next.id}/" class="docs-pager-link docs-pager-next"><span class="docs-pager-dir">Next →</span><span class="docs-pager-title">${next.title}</span></a>`
    : "<span></span>";
  return `<nav class="docs-pager" aria-label="Section pagination">${prevHtml}${nextHtml}</nav>`;
}

/**
 * Builds the topbar search trigger. It is a faux input that the search palette
 * (DocsSearch) progressively enhances; without JS it is simply an inert button,
 * so the docs still work. `data-base`/`data-search-index` tell the client where
 * the (base-relative) index lives.
 */
function searchTrigger(base) {
  return `<button type="button" id="docs-search-trigger" class="docs-search-trigger"
            aria-label="Search documentation"
            aria-keyshortcuts="Meta+K Control+K"
            data-base="${base}" data-search-index="${base}search-index.json">
            <svg class="docs-search-trigger-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            <span class="docs-search-trigger-label">Search docs</span>
            <kbd class="docs-search-kbd"><span class="docs-search-kbd-cmd">⌘</span>K</kbd>
          </button>`;
}

/**
 * Renders one documentation section to a full HTML document. `assetTags` is the
 * head markup that loads styles — a built `<link>` in production, a dev module
 * script under `pnpm dev`. `scriptTags` is the matching end-of-body script that
 * loads the search palette (a built bundle in production, a dev module).
 */
export function renderPage({
  section,
  sections,
  index,
  base,
  assetTags,
  scriptTags = "",
}) {
  const content = marked.parse(section.markdown);
  const rawMdPath = `${base}documentation.md`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="${base}favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${section.title} — License Wizard docs</title>
    <meta name="description" content="License Wizard documentation: ${section.title}." />
    <meta name="theme-color" content="#f6f8fc" />
    <!-- Plain-Markdown version of the full documentation, for agents and scripts. -->
    <link rel="alternate" type="text/markdown" href="${rawMdPath}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="${FONT_HREF}" rel="stylesheet" />
    ${assetTags}
  </head>
  <body class="page-canvas">
    <header class="docs-topbar">
      <div class="docs-topbar-inner">
        <div class="docs-brand">
          <a href="${base}" class="docs-brand-link" aria-label="License Wizard home">
            <img src="${base}logo-mark.png" alt="" class="docs-brand-logo" />
            <span class="docs-brand-name">license <span class="t-brand">wizard</span></span>
          </a>
          <span class="docs-brand-badge">Docs</span>
        </div>
        <div class="docs-topbar-links">
          ${searchTrigger(base)}
          <a href="${base}" class="nav-link">Home</a>
          <a href="https://www.npmjs.com/package/license-wizard" class="nav-link" target="_blank" rel="noopener">npm</a>
          <a href="https://github.com/erdembircan/license-wizard" class="btn-ghost docs-star" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="16" height="16"><path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 23.5 12C23.5 5.7 18.3.5 12 .5Z" /></svg>
            Star
          </a>
        </div>
      </div>
    </header>
    <div class="docs-shell">
      ${sidebar(sections, section.id, base)}
      <main class="docs-main">
        <article class="doc-prose">${content}</article>
        ${pager(sections, index, base)}
      </main>
    </div>
    ${scriptTags}
  </body>
</html>
`;
}
