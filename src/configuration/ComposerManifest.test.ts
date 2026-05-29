import { describe, it, expect } from "vitest";
import { ComposerManifest } from "@configuration/ComposerManifest.js";
import { FileSystemReaderError } from "@configuration/errors/FileSystemReaderError.js";
import { FileSystemWriterError } from "@configuration/errors/FileSystemWriterError.js";
import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";

const COMPOSER_JSON = "composer.json";

/**
 * In-memory fake that implements IFileSystemReader for testing.
 */
class FakeReader implements IFileSystemReader {
  readonly #files: Map<string, string>;

  constructor(files: Record<string, string> = {}) {
    this.#files = new Map(Object.entries(files));
  }

  async read(path: string): Promise<string> {
    const content = this.#files.get(path);
    if (content === undefined) {
      throw new Error(`File not found: ${path}`);
    }
    return content;
  }

  async exists(path: string): Promise<boolean> {
    return this.#files.has(path);
  }
}

/**
 * A fake reader that reports a file exists but throws when read.
 */
class ThrowingReader implements IFileSystemReader {
  readonly #cause: unknown;

  constructor(cause: unknown) {
    this.#cause = cause;
  }

  async read(): Promise<string> {
    throw this.#cause;
  }

  async exists(): Promise<boolean> {
    return true;
  }
}

/**
 * In-memory fake that implements IFileSystemWriter for testing.
 */
class FakeWriter implements IFileSystemWriter {
  readonly written: Map<string, string> = new Map();

  async write(path: string, content: string): Promise<void> {
    this.written.set(path, content);
  }
}

/**
 * A fake writer that throws on any write, used to test error wrapping.
 */
class ThrowingWriter implements IFileSystemWriter {
  readonly #cause: unknown;

  constructor(cause: unknown) {
    this.#cause = cause;
  }

  async write(): Promise<void> {
    throw this.#cause;
  }
}

const makeManifest = (
  reader: IFileSystemReader,
  writer: IFileSystemWriter = new FakeWriter(),
): ComposerManifest => new ComposerManifest(reader, writer);

describe("ComposerManifest", () => {
  describe("exists", () => {
    it("reflects whether composer.json is present", async () => {
      expect(
        await makeManifest(new FakeReader({ [COMPOSER_JSON]: "{}" })).exists(),
      ).toBe(true);
      expect(await makeManifest(new FakeReader()).exists()).toBe(false);
    });
  });

  describe("readLicense", () => {
    it("returns a string license", async () => {
      const reader = new FakeReader({
        [COMPOSER_JSON]: JSON.stringify({ name: "vendor/pkg", license: "MIT" }),
      });

      expect(await makeManifest(reader).readLicense()).toBe("MIT");
    });

    it("returns the first entry of an array license", async () => {
      const reader = new FakeReader({
        [COMPOSER_JSON]: JSON.stringify({
          license: ["GPL-3.0-only", "MIT"],
        }),
      });

      expect(await makeManifest(reader).readLicense()).toBe("GPL-3.0-only");
    });

    it("returns null for an empty array license", async () => {
      const reader = new FakeReader({
        [COMPOSER_JSON]: JSON.stringify({ license: [] }),
      });

      expect(await makeManifest(reader).readLicense()).toBeNull();
    });

    it("returns null when composer.json does not exist", async () => {
      expect(await makeManifest(new FakeReader()).readLicense()).toBeNull();
    });

    it("returns null when there is no license field", async () => {
      const reader = new FakeReader({
        [COMPOSER_JSON]: JSON.stringify({ name: "vendor/pkg" }),
      });

      expect(await makeManifest(reader).readLicense()).toBeNull();
    });

    it("throws FileSystemReaderError when the read fails", async () => {
      const manifest = makeManifest(new ThrowingReader(new Error("disk")));

      await expect(manifest.readLicense()).rejects.toThrow(
        FileSystemReaderError,
      );
    });
  });

  describe("writeLicense", () => {
    it("adds the license field when there is none", async () => {
      const writer = new FakeWriter();
      const reader = new FakeReader({
        [COMPOSER_JSON]: JSON.stringify({ name: "vendor/pkg" }),
      });

      await new ComposerManifest(reader, writer).writeLicense("MIT");

      expect(JSON.parse(writer.written.get(COMPOSER_JSON)!).license).toBe(
        "MIT",
      );
    });

    it("overwrites an array license with the single selected string", async () => {
      const writer = new FakeWriter();
      const reader = new FakeReader({
        [COMPOSER_JSON]: JSON.stringify({
          name: "vendor/pkg",
          license: ["GPL-3.0-only", "MIT"],
        }),
      });

      await new ComposerManifest(reader, writer).writeLicense("Apache-2.0");

      expect(JSON.parse(writer.written.get(COMPOSER_JSON)!).license).toBe(
        "Apache-2.0",
      );
    });

    it("preserves other top-level fields", async () => {
      const writer = new FakeWriter();
      const reader = new FakeReader({
        [COMPOSER_JSON]: JSON.stringify({
          name: "vendor/pkg",
          type: "library",
          license: "ISC",
        }),
      });

      await new ComposerManifest(reader, writer).writeLicense("MIT");

      expect(JSON.parse(writer.written.get(COMPOSER_JSON)!)).toEqual({
        name: "vendor/pkg",
        type: "library",
        license: "MIT",
      });
    });

    it("does not write when composer.json does not exist", async () => {
      const writer = new FakeWriter();

      await new ComposerManifest(new FakeReader(), writer).writeLicense("MIT");

      expect(writer.written.has(COMPOSER_JSON)).toBe(false);
    });

    it("throws FileSystemWriterError when the write fails", async () => {
      const reader = new FakeReader({
        [COMPOSER_JSON]: JSON.stringify({ name: "vendor/pkg" }),
      });
      const manifest = new ComposerManifest(
        reader,
        new ThrowingWriter(new Error("write")),
      );

      await expect(manifest.writeLicense("MIT")).rejects.toThrow(
        FileSystemWriterError,
      );
    });
  });
});
