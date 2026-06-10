/**
 * Dev-server plugin: serves the documentation on the fly under `pnpm dev`, so
 * the same `vite` command runs the whole site — no separate build/preview step
 * to see the docs. Pages render through the shared renderer (identical to the
 * production prerender), and editing `documentation.md` (or the stylesheet)
 * triggers a full reload.
 *
 * Styles are served as a real render-blocking <link> (a compiled-CSS endpoint),
 * not injected by JS — otherwise every full-page navigation between sections
 * would flash unstyled content before the CSS loaded.
 *
 * In production the docs are prerendered to static files instead (see
 * scripts/prerender-docs.mjs); this plugin only applies while serving.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getSections, renderPage } from "./lib/render-docs.mjs";
import { buildSearchIndex } from "./lib/build-search-index.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE = resolve(here, "..", "src", "content", "documentation.md");
const STYLESHEET = resolve(here, "..", "src", "style.css");

// Path (after the base) of the dev-only compiled-CSS endpoint.
const CSS_ROUTE = "/__docs.css";

// Source module for the search palette; Vite serves and transforms it on the
// fly in dev, mirroring the hashed bundle injected by the production prerender.
const SEARCH_MODULE = "/src/docs/search/DocsSearch.ts";

/** @returns {import("vite").Plugin} */
export function docsDevPlugin() {
  let base = "/";
  return {
    name: "license-wizard-docs-dev",
    apply: "serve",
    configResolved(config) {
      base = config.base;
    },
    configureServer(server) {
      // Reload open docs pages when the source or the stylesheet changes.
      server.watcher.add([SOURCE, STYLESHEET]);
      server.watcher.on("change", (file) => {
        const changed = resolve(file);
        if (changed === SOURCE || changed === STYLESHEET) {
          server.ws.send({ type: "full-reload", path: "*" });
        }
      });

      // Added directly (not via a returned post hook) so it runs before Vite's
      // own HTML/static middleware — otherwise the stale `docs/` build output
      // would be served instead.
      server.middlewares.use(async (req, res, next) => {
        const path = (req.url || "/").split("?")[0];
        const rel = path.startsWith(base)
          ? "/" + path.slice(base.length)
          : path;

        // Compiled stylesheet, served render-blocking to avoid a flash of
        // unstyled content on navigation. `?direct` returns the processed CSS
        // text rather than Vite's JS style-injection wrapper.
        if (rel === CSS_ROUTE) {
          const result = await server.transformRequest("/src/style.css?direct");
          res.setHeader("Content-Type", "text/css");
          res.end(result?.code ?? "");
          return;
        }

        if (rel === "/documentation.md") {
          res.setHeader("Content-Type", "text/markdown; charset=utf-8");
          res.end(readFileSync(SOURCE, "utf8"));
          return;
        }

        // Search index the palette fetches at runtime (built on the fly here).
        if (rel === "/search-index.json") {
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(
            JSON.stringify(buildSearchIndex(readFileSync(SOURCE, "utf8"))),
          );
          return;
        }

        const match = rel.match(/^\/docs(?:\/([^/]+))?\/?$/);
        if (!match) return next();

        const sections = getSections(readFileSync(SOURCE, "utf8"));
        const id = match[1] ?? sections[0]?.id;
        const index = sections.findIndex((s) => s.id === id);
        if (index === -1) return next();

        const html = renderPage({
          section: sections[index],
          sections,
          index,
          base,
          // Base-less href/src: transformIndexHtml() prepends the configured
          // base (and wires HMR for the module).
          assetTags: `<link rel="stylesheet" href="${CSS_ROUTE}" />`,
          scriptTags: `<script type="module" src="${SEARCH_MODULE}"></script>`,
        });
        res.setHeader("Content-Type", "text/html");
        res.end(await server.transformIndexHtml(req.url || "/", html));
      });
    },
  };
}
