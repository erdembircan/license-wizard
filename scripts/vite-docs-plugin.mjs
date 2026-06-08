/**
 * Dev-server plugin: serves the documentation on the fly under `pnpm dev`, so
 * the same `vite` command runs the whole site — no separate build/preview step
 * to see the docs. Pages render through the shared renderer (identical to the
 * production prerender), styles load via a dev module so HMR works, and editing
 * `documentation.md` triggers a full reload.
 *
 * In production the docs are prerendered to static files instead (see
 * scripts/prerender-docs.mjs); this plugin only applies while serving.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getSections, renderPage } from "./lib/render-docs.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE = resolve(here, "..", "src", "content", "documentation.md");

// In dev, styles come from a module so Vite injects them with HMR (there is no
// built stylesheet yet). transformIndexHtml() also adds the Vite HMR client.
const DEV_ASSET_TAGS =
  '<script type="module" src="/src/docs/docsStyles.ts"></script>';

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
      // Reload open docs pages when the single source changes.
      server.watcher.add(SOURCE);
      server.watcher.on("change", (file) => {
        if (resolve(file) === SOURCE) {
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

        if (rel === "/documentation.md") {
          res.setHeader("Content-Type", "text/markdown; charset=utf-8");
          res.end(readFileSync(SOURCE, "utf8"));
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
          assetTags: DEV_ASSET_TAGS,
        });
        res.setHeader("Content-Type", "text/html");
        res.end(await server.transformIndexHtml(req.url || "/", html));
      });
    },
  };
}
