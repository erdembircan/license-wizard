/**
 * Build step (runs after `vite build`). Reads the single documentation source,
 * splits it into sections, and writes one static, styled HTML page per section
 * under the build output — content baked in, no client JS. Also publishes the
 * raw Markdown so agents and scripts can fetch the docs as plain text.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import { parseDocumentation } from "./lib/parse-docs.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const outDir = join(root, "docs"); // Vite build output (also the Pages root)

// Must match `base` in vite.config.ts.
const BASE = "/license-wizard/";
const RAW_MD_PATH = `${BASE}documentation.md`;

const SOURCE = join(root, "src", "content", "documentation.md");
const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap";

/** Locates the hashed CSS asset emitted by the client build. */
function findStylesheet() {
  const assets = readdirSync(join(outDir, "assets"));
  const css = assets.find((f) => f.endsWith(".css"));
  if (!css)
    throw new Error(
      "No built CSS found in docs/assets — run vite build first.",
    );
  return `${BASE}assets/${css}`;
}

function sidebar(sections, activeId) {
  const items = sections
    .map((s) => {
      const active = s.id === activeId;
      return `<li><a href="${BASE}docs/${s.id}/" class="docs-side-link${
        active ? " is-active" : ""
      }"${active ? ' aria-current="page"' : ""}>${s.title}</a></li>`;
    })
    .join("");
  return `<nav class="docs-side" aria-label="Documentation sections">
    <p class="docs-side-title">Documentation</p>
    <ul class="docs-side-list">${items}</ul>
  </nav>`;
}

function pager(sections, index) {
  const prev = index > 0 ? sections[index - 1] : null;
  const next = index < sections.length - 1 ? sections[index + 1] : null;
  const prevHtml = prev
    ? `<a href="${BASE}docs/${prev.id}/" class="docs-pager-link"><span class="docs-pager-dir">← Previous</span><span class="docs-pager-title">${prev.title}</span></a>`
    : "<span></span>";
  const nextHtml = next
    ? `<a href="${BASE}docs/${next.id}/" class="docs-pager-link docs-pager-next"><span class="docs-pager-dir">Next →</span><span class="docs-pager-title">${next.title}</span></a>`
    : "<span></span>";
  return `<nav class="docs-pager" aria-label="Section pagination">${prevHtml}${nextHtml}</nav>`;
}

function page({ section, sections, index, cssHref }) {
  const content = marked.parse(section.markdown);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="${BASE}favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${section.title} — License Wizard docs</title>
    <meta name="description" content="License Wizard documentation: ${section.title}." />
    <meta name="theme-color" content="#f6f8fc" />
    <!-- Plain-Markdown version of the full documentation, for agents and scripts. -->
    <link rel="alternate" type="text/markdown" href="${RAW_MD_PATH}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="${FONT_HREF}" rel="stylesheet" />
    <link rel="stylesheet" href="${cssHref}" />
  </head>
  <body class="page-canvas">
    <header class="docs-topbar">
      <div class="docs-topbar-inner">
        <div class="docs-brand">
          <a href="${BASE}" class="docs-brand-link" aria-label="License Wizard home">
            <img src="${BASE}logo-mark.png" alt="" class="docs-brand-logo" />
            <span class="docs-brand-name">license <span class="t-brand">wizard</span></span>
          </a>
          <span class="docs-brand-badge">Docs</span>
        </div>
        <div class="docs-topbar-links">
          <a href="${BASE}" class="nav-link">Home</a>
          <a href="https://www.npmjs.com/package/license-wizard" class="nav-link" target="_blank" rel="noopener">npm</a>
          <a href="https://github.com/erdembircan/license-wizard" class="btn-ghost docs-star" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="16" height="16"><path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 23.5 12C23.5 5.7 18.3.5 12 .5Z" /></svg>
            Star
          </a>
        </div>
      </div>
    </header>
    <div class="docs-shell">
      ${sidebar(sections, section.id)}
      <main class="docs-main">
        <article class="doc-prose">${content}</article>
        ${pager(sections, index)}
      </main>
    </div>
  </body>
</html>
`;
}

function main() {
  const source = readFileSync(SOURCE, "utf8");
  const { sections } = parseDocumentation(source);
  if (sections.length === 0)
    throw new Error("No sections parsed from documentation.md");

  const cssHref = findStylesheet();

  // One static page per section, at /docs/<id>/.
  sections.forEach((section, index) => {
    const html = page({ section, sections, index, cssHref });
    const dir = join(outDir, "docs", section.id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), html);
  });

  // /docs/ lands on the first section.
  const indexHtml = page({ section: sections[0], sections, index: 0, cssHref });
  mkdirSync(join(outDir, "docs"), { recursive: true });
  writeFileSync(join(outDir, "docs", "index.html"), indexHtml);

  // Publish the raw Markdown at /documentation.md.
  writeFileSync(join(outDir, "documentation.md"), source);

  console.log(
    `Prerendered ${sections.length} docs pages + /docs/ index, and published documentation.md`,
  );
}

main();
