import * as esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, "../src");

await esbuild.build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  minify: true,
  platform: "node",
  format: "esm",
  outfile: "dist/index.js",
  alias: {
    "@cli": path.join(srcDir, "cli"),
    "@licensing": path.join(srcDir, "licensing"),
    "@configuration": path.join(srcDir, "configuration"),
  },
});
