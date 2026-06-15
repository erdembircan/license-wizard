/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import { describe, it, expect } from "vitest";
import { JsonManifestDocument } from "@configuration/JsonManifestDocument.js";
import { FileSystemWriterError } from "@configuration/errors/FileSystemWriterError.js";

const FILE_NAME = "package.json";

describe("JsonManifestDocument", () => {
  describe("read", () => {
    it("parses a JSON object and exposes its fields", () => {
      const document = JsonManifestDocument.read(
        JSON.stringify({ name: "my-app", license: "MIT" }),
        FILE_NAME,
      );

      expect(document.has("name")).toBe(true);
      expect(document.get("name")).toBe("my-app");
      expect(document.get("license")).toBe("MIT");
    });

    it("throws FileSystemWriterError when the source is not valid JSON", () => {
      expect(() => JsonManifestDocument.read("{ invalid", FILE_NAME)).toThrow(
        FileSystemWriterError,
      );
    });

    it("names the file and preserves the cause on a parse failure", () => {
      const error = (() => {
        try {
          JsonManifestDocument.read("{ invalid", FILE_NAME);
          return null;
        } catch (caught) {
          return caught as FileSystemWriterError;
        }
      })();

      expect(error?.message).toContain(FILE_NAME);
      expect(error?.message).toContain("not valid JSON");
      expect(error?.cause).toBeInstanceOf(SyntaxError);
    });

    it("rejects a top-level array as not a JSON object", () => {
      const error = (() => {
        try {
          JsonManifestDocument.read("[1, 2, 3]", FILE_NAME);
          return null;
        } catch (caught) {
          return caught as FileSystemWriterError;
        }
      })();

      expect(error).toBeInstanceOf(FileSystemWriterError);
      expect(error?.message).toContain("not a JSON object");
    });

    it("rejects a top-level string, number, and null", () => {
      for (const raw of ['"a string"', "42", "null"]) {
        expect(() => JsonManifestDocument.read(raw, FILE_NAME)).toThrow(
          /not a JSON object/,
        );
      }
    });
  });

  describe("empty", () => {
    it("starts with no fields", () => {
      const document = JsonManifestDocument.empty();

      expect(document.has("name")).toBe(false);
      expect(document.get("name")).toBeUndefined();
    });

    it("serializes with two-space indentation and a trailing newline", () => {
      const document = JsonManifestDocument.empty();
      document.set("name", "my-app");

      expect(document.serialize()).toBe('{\n  "name": "my-app"\n}\n');
    });
  });

  describe("has", () => {
    it("distinguishes present from absent fields", () => {
      const document = JsonManifestDocument.read(
        JSON.stringify({ name: "my-app" }),
        FILE_NAME,
      );

      expect(document.has("name")).toBe(true);
      expect(document.has("license")).toBe(false);
    });

    it("reports a field present even when its value is null", () => {
      const document = JsonManifestDocument.read(
        JSON.stringify({ license: null }),
        FILE_NAME,
      );

      expect(document.has("license")).toBe(true);
      expect(document.get("license")).toBeNull();
    });
  });

  describe("get", () => {
    it("returns undefined for an absent field", () => {
      const document = JsonManifestDocument.read("{}", FILE_NAME);

      expect(document.get("license")).toBeUndefined();
    });
  });

  describe("set", () => {
    it("adds a new field while preserving the others", () => {
      const document = JsonManifestDocument.read(
        JSON.stringify({ name: "my-app" }),
        FILE_NAME,
      );

      document.set("license", "MIT");

      expect(JSON.parse(document.serialize())).toEqual({
        name: "my-app",
        license: "MIT",
      });
    });

    it("overwrites an existing field", () => {
      const document = JsonManifestDocument.read(
        JSON.stringify({ license: "ISC" }),
        FILE_NAME,
      );

      document.set("license", "Apache-2.0");

      expect(document.get("license")).toBe("Apache-2.0");
    });
  });

  describe("delete", () => {
    it("removes a field while preserving the others", () => {
      const document = JsonManifestDocument.read(
        JSON.stringify({ name: "my-app", license: "MIT" }),
        FILE_NAME,
      );

      document.delete("license");

      expect(JSON.parse(document.serialize())).toEqual({ name: "my-app" });
    });

    it("does nothing when the field is absent", () => {
      const document = JsonManifestDocument.read(
        JSON.stringify({ name: "my-app" }),
        FILE_NAME,
      );

      document.delete("license");

      expect(JSON.parse(document.serialize())).toEqual({ name: "my-app" });
    });
  });

  describe("serialize", () => {
    it("preserves the source's four-space indentation", () => {
      const document = JsonManifestDocument.read(
        '{\n    "name": "pkg",\n    "license": "ISC"\n}\n',
        FILE_NAME,
      );

      document.set("license", "MIT");

      expect(document.serialize()).toBe(
        '{\n    "name": "pkg",\n    "license": "MIT"\n}\n',
      );
    });

    it("reproduces a minified document compactly", () => {
      const document = JsonManifestDocument.read(
        '{"name":"pkg","license":"ISC"}',
        FILE_NAME,
      );

      document.set("license", "MIT");

      expect(document.serialize()).toBe('{"name":"pkg","license":"MIT"}');
    });

    it("preserves the absence of a trailing newline", () => {
      const document = JsonManifestDocument.read(
        '{\n  "name": "pkg"\n}',
        FILE_NAME,
      );

      expect(document.serialize()).toBe('{\n  "name": "pkg"\n}');
    });
  });
});
