import { describe, it, expect } from "vitest";
import { FileSystemReaderError } from "@configuration/errors/FileSystemReaderError.js";
import { FileSystemWriterError } from "@configuration/errors/FileSystemWriterError.js";
import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";
import { NpmManifest } from "@configuration/NpmManifest.js";

const PACKAGE_JSON = "package.json";

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
): NpmManifest => new NpmManifest(reader, writer);

describe("NpmManifest", () => {
  describe("exists", () => {
    it("reflects whether package.json is present", async () => {
      expect(
        await makeManifest(new FakeReader({ [PACKAGE_JSON]: "{}" })).exists(),
      ).toBe(true);
      expect(await makeManifest(new FakeReader()).exists()).toBe(false);
    });
  });

  describe("readLicense", () => {
    it("returns the license string", async () => {
      const reader = new FakeReader({
        [PACKAGE_JSON]: JSON.stringify({ name: "my-app", license: "MIT" }),
      });

      expect(await makeManifest(reader).readLicense()).toBe("MIT");
    });

    it("returns null when package.json does not exist", async () => {
      expect(await makeManifest(new FakeReader()).readLicense()).toBeNull();
    });

    it("returns null when there is no license field", async () => {
      const reader = new FakeReader({
        [PACKAGE_JSON]: JSON.stringify({ name: "my-app" }),
      });

      expect(await makeManifest(reader).readLicense()).toBeNull();
    });

    it("returns null when the license field is not a string", async () => {
      const reader = new FakeReader({
        [PACKAGE_JSON]: JSON.stringify({
          license: { type: "MIT", url: "https://example.com" },
        }),
      });

      expect(await makeManifest(reader).readLicense()).toBeNull();
    });

    it("throws FileSystemReaderError when the read fails", async () => {
      const manifest = makeManifest(new ThrowingReader(new Error("disk")));

      await expect(manifest.readLicense()).rejects.toThrow(
        FileSystemReaderError,
      );
    });

    it("preserves the original error as cause on read failure", async () => {
      const cause = new Error("disk");
      const manifest = makeManifest(new ThrowingReader(cause));

      const error = await manifest.readLicense().catch((e) => e);

      expect(error.cause).toBe(cause);
    });
  });

  describe("writeLicense", () => {
    it("adds the license field when there is none", async () => {
      const writer = new FakeWriter();
      const reader = new FakeReader({
        [PACKAGE_JSON]: JSON.stringify({ name: "my-app" }),
      });

      await new NpmManifest(reader, writer).writeLicense("MIT");

      expect(JSON.parse(writer.written.get(PACKAGE_JSON)!).license).toBe("MIT");
    });

    it("overwrites an existing license field", async () => {
      const writer = new FakeWriter();
      const reader = new FakeReader({
        [PACKAGE_JSON]: JSON.stringify({ name: "my-app", license: "ISC" }),
      });

      await new NpmManifest(reader, writer).writeLicense("Apache-2.0");

      expect(JSON.parse(writer.written.get(PACKAGE_JSON)!).license).toBe(
        "Apache-2.0",
      );
    });

    it("preserves other top-level fields", async () => {
      const writer = new FakeWriter();
      const reader = new FakeReader({
        [PACKAGE_JSON]: JSON.stringify({
          name: "my-app",
          version: "1.2.3",
          license: "ISC",
        }),
      });

      await new NpmManifest(reader, writer).writeLicense("MIT");

      expect(JSON.parse(writer.written.get(PACKAGE_JSON)!)).toEqual({
        name: "my-app",
        version: "1.2.3",
        license: "MIT",
      });
    });

    it("does not write when package.json does not exist", async () => {
      const writer = new FakeWriter();

      await new NpmManifest(new FakeReader(), writer).writeLicense("MIT");

      expect(writer.written.has(PACKAGE_JSON)).toBe(false);
    });

    it("throws FileSystemWriterError when the write fails", async () => {
      const reader = new FakeReader({
        [PACKAGE_JSON]: JSON.stringify({ name: "my-app" }),
      });
      const manifest = new NpmManifest(
        reader,
        new ThrowingWriter(new Error("write")),
      );

      await expect(manifest.writeLicense("MIT")).rejects.toThrow(
        FileSystemWriterError,
      );
    });

    it("preserves the original error as cause on write failure", async () => {
      const reader = new FakeReader({
        [PACKAGE_JSON]: JSON.stringify({ name: "my-app" }),
      });
      const cause = new Error("write");
      const manifest = new NpmManifest(reader, new ThrowingWriter(cause));

      const error = await manifest.writeLicense("MIT").catch((e) => e);

      expect(error.cause).toBe(cause);
    });
  });
});
