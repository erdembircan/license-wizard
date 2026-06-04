import { describe, it, expect } from "vitest";
import {
  extensionOf,
  isSupportedSource,
  preambleLength,
} from "@headers/SourceFile.js";

describe("SourceFile", () => {
  describe("extensionOf", () => {
    it("returns the lowercased extension with its dot", () => {
      expect(extensionOf("src/App.TS")).toBe(".ts");
      expect(extensionOf("a/b/c.php")).toBe(".php");
    });

    it("returns empty for a dotfile or extensionless name", () => {
      expect(extensionOf(".gitignore")).toBe("");
      expect(extensionOf("Makefile")).toBe("");
    });
  });

  describe("isSupportedSource", () => {
    it("accepts the JS/TS family and PHP", () => {
      for (const path of [
        "a.js",
        "a.jsx",
        "a.mjs",
        "a.cjs",
        "a.ts",
        "a.tsx",
        "a.php",
      ]) {
        expect(isSupportedSource(path)).toBe(true);
      }
    });

    it("rejects JSON, stylesheets, and markup", () => {
      for (const path of [
        "package.json",
        "a.css",
        "a.scss",
        "a.md",
        "a.html",
      ]) {
        expect(isSupportedSource(path)).toBe(false);
      }
    });
  });

  describe("preambleLength", () => {
    it("is zero for an ordinary JS/TS file", () => {
      expect(preambleLength(["export const x = 1;"], ".ts")).toBe(0);
    });

    it("counts a leading shebang", () => {
      expect(preambleLength(["#!/usr/bin/env node", "x()"], ".js")).toBe(1);
    });

    it("counts the PHP open tag", () => {
      expect(preambleLength(["<?php", "echo 1;"], ".php")).toBe(1);
    });

    it("counts a shebang then a PHP open tag", () => {
      expect(
        preambleLength(["#!/usr/bin/env php", "<?php", "echo 1;"], ".php"),
      ).toBe(2);
    });

    it("does not claim a PHP preamble when there is no open tag", () => {
      expect(preambleLength(["echo 1;"], ".php")).toBe(0);
    });
  });
});
