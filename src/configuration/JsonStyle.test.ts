/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import { describe, it, expect } from "vitest";
import { JsonStyle } from "@configuration/JsonStyle.js";

describe("JsonStyle", () => {
  describe("detect", () => {
    it("reproduces four-space indentation", () => {
      const raw = '{\n    "name": "pkg",\n    "license": "MIT"\n}\n';
      const out = JsonStyle.detect(raw).serialize({
        name: "pkg",
        license: "Apache-2.0",
      });
      expect(out).toBe(
        '{\n    "name": "pkg",\n    "license": "Apache-2.0"\n}\n',
      );
    });

    it("reproduces two-space indentation", () => {
      const raw = '{\n  "name": "pkg"\n}\n';
      const out = JsonStyle.detect(raw).serialize({ name: "pkg" });
      expect(out).toBe('{\n  "name": "pkg"\n}\n');
    });

    it("reproduces tab indentation", () => {
      const raw = '{\n\t"name": "pkg"\n}\n';
      const out = JsonStyle.detect(raw).serialize({ name: "pkg" });
      expect(out).toBe('{\n\t"name": "pkg"\n}\n');
    });

    it("reproduces a minified document compactly", () => {
      const raw = '{"name":"pkg","license":"MIT"}';
      const out = JsonStyle.detect(raw).serialize({
        name: "pkg",
        license: "Apache-2.0",
      });
      expect(out).toBe('{"name":"pkg","license":"Apache-2.0"}');
    });

    it("preserves the absence of a trailing newline", () => {
      const raw = '{\n  "name": "pkg"\n}';
      const out = JsonStyle.detect(raw).serialize({ name: "pkg" });
      expect(out).toBe('{\n  "name": "pkg"\n}');
    });

    it("preserves a CRLF trailing newline", () => {
      const raw = '{\n  "name": "pkg"\n}\r\n';
      const out = JsonStyle.detect(raw).serialize({ name: "pkg" });
      expect(out.endsWith("}\r\n")).toBe(true);
    });

    it("preserves CRLF internal separators throughout a CRLF document", () => {
      const raw =
        '{\r\n  "name": "a",\r\n  "version": "1.0.0",\r\n  "license": "ISC"\r\n}\r\n';
      const out = JsonStyle.detect(raw).serialize({
        name: "a",
        version: "1.0.0",
        license: "MIT",
      });
      expect(out).toBe(
        '{\r\n  "name": "a",\r\n  "version": "1.0.0",\r\n  "license": "MIT"\r\n}\r\n',
      );
      // No bare LF survives — the output must not be mixed-ending (issue #155).
      expect(out.replace(/\r\n/g, "")).not.toContain("\n");
    });

    it("keeps LF internal separators when only the trailing newline is CRLF", () => {
      const raw = '{\n  "name": "pkg"\n}\r\n';
      const out = JsonStyle.detect(raw).serialize({ name: "pkg" });
      expect(out).toBe('{\n  "name": "pkg"\n}\r\n');
    });

    it("does not mistake escaped newlines inside strings for layout", () => {
      const raw = '{"description":"line1\\nline2"}';
      const out = JsonStyle.detect(raw).serialize({
        description: "line1\nline2",
      });
      expect(out).toBe('{"description":"line1\\nline2"}');
    });
  });

  describe("default", () => {
    it("uses two-space indentation and a trailing newline", () => {
      const out = JsonStyle.default().serialize({ name: "pkg" });
      expect(out).toBe('{\n  "name": "pkg"\n}\n');
    });
  });
});
