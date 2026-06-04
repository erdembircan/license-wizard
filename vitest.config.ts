import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@cli": path.resolve(__dirname, "src/cli"),
      "@licensing": path.resolve(__dirname, "src/licensing"),
      "@configuration": path.resolve(__dirname, "src/configuration"),
      "@headers": path.resolve(__dirname, "src/headers"),
    },
  },
});
