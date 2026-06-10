/// <reference types="vitest/config" />
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { docsDevPlugin } from "./scripts/vite-docs-plugin.mjs";

// The site is published to https://erdembircan.github.io/license-wizard/ via
// GitHub Pages, served from the `docs/` folder of the `gh-pages` branch — so the
// build output is written there and every asset URL is prefixed with the repo
// path.
export default defineConfig({
  base: "/license-wizard/",
  plugins: [tailwindcss(), react(), docsDevPlugin()],
  build: {
    outDir: "docs",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // The marketing landing page (React).
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        // Standalone search palette for the otherwise-static docs pages; the
        // prerender step locates the hashed output and injects it per page.
        docsSearch: fileURLToPath(
          new URL("./src/docs/search/DocsSearch.ts", import.meta.url),
        ),
      },
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
  },
});
