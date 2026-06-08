/**
 * Build step (runs after `vite build`). Reads the single documentation source,
 * splits it into sections, and writes one static, styled HTML page per section
 * under the build output — content baked in, no client JS. Also publishes the
 * raw Markdown so agents and scripts can fetch the docs as plain text.
 *
 * Rendering is shared with the dev server (scripts/vite-docs-plugin.mjs) via
 * scripts/lib/render-docs.mjs, so `pnpm dev` and the built site stay identical.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getSections, renderPage } from "./lib/render-docs.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const outDir = join(root, "docs"); // Vite build output (also the Pages root)

// Must match `base` in vite.config.ts.
const BASE = "/license-wizard/";
const SOURCE = join(root, "src", "content", "documentation.md");

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

function main() {
  const source = readFileSync(SOURCE, "utf8");
  const sections = getSections(source);
  if (sections.length === 0)
    throw new Error("No sections parsed from documentation.md");

  const assetTags = `<link rel="stylesheet" href="${findStylesheet()}" />`;
  const render = (section, index) =>
    renderPage({ section, sections, index, base: BASE, assetTags });

  // One static page per section, at /docs/<id>/.
  sections.forEach((section, index) => {
    const dir = join(outDir, "docs", section.id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), render(section, index));
  });

  // /docs/ lands on the first section.
  writeFileSync(join(outDir, "docs", "index.html"), render(sections[0], 0));

  // Publish the raw Markdown at /documentation.md.
  writeFileSync(join(outDir, "documentation.md"), source);

  console.log(
    `Prerendered ${sections.length} docs pages + /docs/ index, and published documentation.md`,
  );
}

main();
