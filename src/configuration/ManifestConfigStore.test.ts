import { describe, it, expect } from "vitest";
import { ManifestConfigStore } from "@configuration/ManifestConfigStore.js";
import { FileSystemReaderError } from "@configuration/errors/FileSystemReaderError.js";
import { FileSystemWriterError } from "@configuration/errors/FileSystemWriterError.js";
import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";
import type { WizardConfig } from "@configuration/WizardConfig.js";

const PACKAGE_JSON = "package.json";
const CONFIG_FIELD = "license-wizard";

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
 * A fake reader that reports the file as present but throws when read, used to
 * test error wrapping.
 */
class ThrowingReader implements IFileSystemReader {
  constructor(private readonly cause: unknown) {}

  async read(): Promise<string> {
    throw this.cause;
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
  readonly deleted: string[] = [];

  async write(path: string, content: string): Promise<void> {
    this.written.set(path, content);
  }

  async delete(path: string): Promise<void> {
    this.deleted.push(path);
    this.written.delete(path);
  }
}

/**
 * A fake writer that throws on write, used to test error wrapping.
 */
class ThrowingWriter implements IFileSystemWriter {
  constructor(private readonly cause: unknown) {}

  async write(): Promise<void> {
    throw this.cause;
  }

  async delete(): Promise<void> {
    throw this.cause;
  }
}

const makeStore = (): ManifestConfigStore =>
  new ManifestConfigStore(PACKAGE_JSON);

describe("ManifestConfigStore", () => {
  describe("available", () => {
    it("is available when the manifest exists", async () => {
      const reader = new FakeReader({ [PACKAGE_JSON]: "{}" });

      expect(await makeStore().available(reader)).toBe(true);
    });

    it("is unavailable when the manifest is absent", async () => {
      const reader = new FakeReader();

      expect(await makeStore().available(reader)).toBe(false);
    });
  });

  describe("read", () => {
    it("returns the config from the license-wizard field", async () => {
      const config: WizardConfig = { licenseId: "MIT" };
      const reader = new FakeReader({
        [PACKAGE_JSON]: JSON.stringify({ [CONFIG_FIELD]: config }),
      });

      expect(await makeStore().read(reader)).toEqual(config);
    });

    it("returns null when the manifest has no license-wizard field", async () => {
      const reader = new FakeReader({
        [PACKAGE_JSON]: JSON.stringify({ name: "my-app" }),
      });

      expect(await makeStore().read(reader)).toBeNull();
    });

    it("returns null when the manifest is absent", async () => {
      const reader = new FakeReader();

      expect(await makeStore().read(reader)).toBeNull();
    });

    it("wraps reader failures in FileSystemReaderError", async () => {
      const cause = new Error("disk error");
      const reader = new ThrowingReader(cause);

      const error = await makeStore()
        .read(reader)
        .catch((e) => e);

      expect(error).toBeInstanceOf(FileSystemReaderError);
      expect(error.cause).toBe(cause);
    });
  });

  describe("write", () => {
    it("adds the license-wizard field while preserving other fields", async () => {
      const reader = new FakeReader({
        [PACKAGE_JSON]: JSON.stringify({ name: "my-app", version: "1.0.0" }),
      });
      const writer = new FakeWriter();

      await makeStore().write(reader, writer, { licenseId: "MIT" });

      expect(JSON.parse(writer.written.get(PACKAGE_JSON)!)).toEqual({
        name: "my-app",
        version: "1.0.0",
        [CONFIG_FIELD]: { licenseId: "MIT" },
      });
    });

    it("overwrites an existing license-wizard field", async () => {
      const reader = new FakeReader({
        [PACKAGE_JSON]: JSON.stringify({
          [CONFIG_FIELD]: { licenseId: "Apache-2.0" },
        }),
      });
      const writer = new FakeWriter();

      await makeStore().write(reader, writer, { licenseId: "MIT" });

      expect(JSON.parse(writer.written.get(PACKAGE_JSON)!)).toEqual({
        [CONFIG_FIELD]: { licenseId: "MIT" },
      });
    });

    it("wraps writer failures in FileSystemWriterError", async () => {
      const cause = new Error("write error");
      const reader = new FakeReader({ [PACKAGE_JSON]: "{}" });
      const writer = new ThrowingWriter(cause);

      const error = await makeStore()
        .write(reader, writer, { licenseId: "MIT" })
        .catch((e) => e);

      expect(error).toBeInstanceOf(FileSystemWriterError);
      expect(error.cause).toBe(cause);
    });
  });

  describe("clear", () => {
    it("removes the license-wizard field while preserving other fields", async () => {
      const reader = new FakeReader({
        [PACKAGE_JSON]: JSON.stringify({
          name: "my-app",
          [CONFIG_FIELD]: { licenseId: "MIT" },
        }),
      });
      const writer = new FakeWriter();

      await makeStore().clear(reader, writer);

      expect(JSON.parse(writer.written.get(PACKAGE_JSON)!)).toEqual({
        name: "my-app",
      });
    });

    it("does nothing when the manifest has no license-wizard field", async () => {
      const reader = new FakeReader({
        [PACKAGE_JSON]: JSON.stringify({ name: "my-app" }),
      });
      const writer = new FakeWriter();

      await makeStore().clear(reader, writer);

      expect(writer.written.has(PACKAGE_JSON)).toBe(false);
    });

    it("does nothing when the manifest is absent", async () => {
      const reader = new FakeReader();
      const writer = new FakeWriter();

      await makeStore().clear(reader, writer);

      expect(writer.written.has(PACKAGE_JSON)).toBe(false);
    });
  });
});
