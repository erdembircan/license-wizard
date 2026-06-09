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

  async delete(path: string): Promise<void> {
    this.written.delete(path);
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

  async delete(): Promise<void> {
    throw this.#cause;
  }
}

const makeManifest = (): NpmManifest => new NpmManifest();

describe("NpmManifest", () => {
  describe("exists", () => {
    it("reflects whether package.json is present", async () => {
      expect(
        await makeManifest().exists(new FakeReader({ [PACKAGE_JSON]: "{}" })),
      ).toBe(true);
      expect(await makeManifest().exists(new FakeReader())).toBe(false);
    });
  });

  describe("readLicense", () => {
    it("returns the license string", async () => {
      const reader = new FakeReader({
        [PACKAGE_JSON]: JSON.stringify({ name: "my-app", license: "MIT" }),
      });

      expect(await makeManifest().readLicense(reader)).toBe("MIT");
    });

    it("returns null when package.json does not exist", async () => {
      expect(await makeManifest().readLicense(new FakeReader())).toBeNull();
    });

    it("returns null when there is no license field", async () => {
      const reader = new FakeReader({
        [PACKAGE_JSON]: JSON.stringify({ name: "my-app" }),
      });

      expect(await makeManifest().readLicense(reader)).toBeNull();
    });

    it("returns null when the license field is not a string", async () => {
      const reader = new FakeReader({
        [PACKAGE_JSON]: JSON.stringify({
          license: { type: "MIT", url: "https://example.com" },
        }),
      });

      expect(await makeManifest().readLicense(reader)).toBeNull();
    });

    it("throws FileSystemReaderError when the read fails", async () => {
      const reader = new ThrowingReader(new Error("disk"));

      await expect(makeManifest().readLicense(reader)).rejects.toThrow(
        FileSystemReaderError,
      );
    });

    it("preserves the original error as cause on read failure", async () => {
      const cause = new Error("disk");
      const reader = new ThrowingReader(cause);

      const error = await makeManifest()
        .readLicense(reader)
        .catch((e) => e);

      expect(error.cause).toBe(cause);
    });
  });

  describe("writeLicense", () => {
    it("adds the license field when there is none", async () => {
      const writer = new FakeWriter();
      const reader = new FakeReader({
        [PACKAGE_JSON]: JSON.stringify({ name: "my-app" }),
      });

      await new NpmManifest().writeLicense(reader, writer, "MIT");

      expect(JSON.parse(writer.written.get(PACKAGE_JSON)!).license).toBe("MIT");
    });

    it("overwrites an existing license field", async () => {
      const writer = new FakeWriter();
      const reader = new FakeReader({
        [PACKAGE_JSON]: JSON.stringify({ name: "my-app", license: "ISC" }),
      });

      await new NpmManifest().writeLicense(reader, writer, "Apache-2.0");

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

      await new NpmManifest().writeLicense(reader, writer, "MIT");

      expect(JSON.parse(writer.written.get(PACKAGE_JSON)!)).toEqual({
        name: "my-app",
        version: "1.2.3",
        license: "MIT",
      });
    });

    it("does not write when package.json does not exist", async () => {
      const writer = new FakeWriter();

      await new NpmManifest().writeLicense(new FakeReader(), writer, "MIT");

      expect(writer.written.has(PACKAGE_JSON)).toBe(false);
    });

    it("throws FileSystemWriterError when the write fails", async () => {
      const reader = new FakeReader({
        [PACKAGE_JSON]: JSON.stringify({ name: "my-app" }),
      });
      const writer = new ThrowingWriter(new Error("write"));

      await expect(
        new NpmManifest().writeLicense(reader, writer, "MIT"),
      ).rejects.toThrow(FileSystemWriterError);
    });

    it("preserves the original error as cause on write failure", async () => {
      const reader = new FakeReader({
        [PACKAGE_JSON]: JSON.stringify({ name: "my-app" }),
      });
      const cause = new Error("write");
      const writer = new ThrowingWriter(cause);

      const error = await new NpmManifest()
        .writeLicense(reader, writer, "MIT")
        .catch((e) => e);

      expect(error.cause).toBe(cause);
    });

    it("rejects a non-object manifest instead of silently dropping the field", async () => {
      const reader = new FakeReader({
        [PACKAGE_JSON]: '["not","an","object"]',
      });
      const writer = new FakeWriter();

      await expect(
        new NpmManifest().writeLicense(reader, writer, "MIT"),
      ).rejects.toThrow(FileSystemWriterError);
      expect(writer.written.has(PACKAGE_JSON)).toBe(false);
    });
  });

  describe("assertWritable", () => {
    it("passes for a present JSON-object manifest", async () => {
      const reader = new FakeReader({
        [PACKAGE_JSON]: JSON.stringify({ name: "my-app" }),
      });

      await expect(
        new NpmManifest().assertWritable(reader),
      ).resolves.toBeUndefined();
    });

    it("passes when the manifest is absent", async () => {
      await expect(
        new NpmManifest().assertWritable(new FakeReader()),
      ).resolves.toBeUndefined();
    });

    it("throws when the manifest is malformed JSON", async () => {
      const reader = new FakeReader({ [PACKAGE_JSON]: "{ invalid" });

      await expect(new NpmManifest().assertWritable(reader)).rejects.toThrow(
        FileSystemWriterError,
      );
    });

    it("throws when the manifest is a JSON array", async () => {
      const reader = new FakeReader({ [PACKAGE_JSON]: "[1, 2, 3]" });

      await expect(new NpmManifest().assertWritable(reader)).rejects.toThrow(
        FileSystemWriterError,
      );
    });
  });
});
