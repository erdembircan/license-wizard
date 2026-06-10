import { describe, it, expect } from "vitest";
import { RcConfigStore } from "@configuration/RcConfigStore.js";
import { FileSystemReaderError } from "@configuration/errors/FileSystemReaderError.js";
import { FileSystemWriterError } from "@configuration/errors/FileSystemWriterError.js";
import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";
import type { WizardConfig } from "@configuration/WizardConfig.js";

const RC_FILE = ".licensewizardrc.json";

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
 * A fake reader that throws on any operation, used to test error wrapping.
 */
class ThrowingReader implements IFileSystemReader {
  constructor(private readonly cause: unknown) {}

  async read(): Promise<string> {
    throw this.cause;
  }

  async exists(): Promise<boolean> {
    throw this.cause;
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
 * A fake writer that throws on any operation, used to test error wrapping.
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

describe("RcConfigStore", () => {
  describe("available", () => {
    it("is always available", async () => {
      const store = new RcConfigStore();

      expect(await store.available()).toBe(true);
    });
  });

  describe("read", () => {
    it("returns the parsed config when the dot-file exists", async () => {
      const config: WizardConfig = { licenseId: "MIT" };
      const store = new RcConfigStore();

      expect(
        await store.read(new FakeReader({ [RC_FILE]: JSON.stringify(config) })),
      ).toEqual(config);
    });

    it("returns null when the dot-file is absent", async () => {
      const store = new RcConfigStore();

      expect(await store.read(new FakeReader())).toBeNull();
    });

    it("wraps reader failures in FileSystemReaderError", async () => {
      const cause = new Error("disk error");
      const store = new RcConfigStore();

      const error = await store.read(new ThrowingReader(cause)).catch((e) => e);

      expect(error).toBeInstanceOf(FileSystemReaderError);
      expect(error.cause).toBe(cause);
    });

    it("rejects an empty object instead of masking a valid config elsewhere", async () => {
      const store = new RcConfigStore();

      const error = await store
        .read(new FakeReader({ [RC_FILE]: "{}" }))
        .catch((e) => e);

      expect(error).toBeInstanceOf(FileSystemReaderError);
      expect(error.message).toContain(RC_FILE);
    });

    it("rejects a non-string token value, naming the file", async () => {
      const store = new RcConfigStore();

      const error = await store
        .read(
          new FakeReader({
            [RC_FILE]: '{"licenseId":"MIT","tokens":{"<year>":2026}}',
          }),
        )
        .catch((e) => e);

      expect(error).toBeInstanceOf(FileSystemReaderError);
      expect(error.message).toContain("tokens");
    });

    it("rejects an unknown header style", async () => {
      const store = new RcConfigStore();

      const error = await store
        .read(
          new FakeReader({
            [RC_FILE]: '{"licenseId":"MIT","headers":{"style":"medium"}}',
          }),
        )
        .catch((e) => e);

      expect(error).toBeInstanceOf(FileSystemReaderError);
      expect(error.message).toContain("headers.style");
    });
  });

  describe("write", () => {
    it("serializes the config to the dot-file", async () => {
      const writer = new FakeWriter();
      const store = new RcConfigStore();

      await store.write(new FakeReader(), writer, { licenseId: "MIT" });

      expect(JSON.parse(writer.written.get(RC_FILE)!)).toEqual({
        licenseId: "MIT",
      });
    });

    it("ends the dot-file with a trailing newline, like the manifests", async () => {
      const writer = new FakeWriter();
      const store = new RcConfigStore();

      await store.write(new FakeReader(), writer, { licenseId: "MIT" });

      expect(writer.written.get(RC_FILE)!.endsWith("\n")).toBe(true);
    });

    it("serializes token values so they survive a write/read round-trip", async () => {
      const writer = new FakeWriter();
      const config: WizardConfig = {
        licenseId: "MIT",
        tokens: { "<year>": "2026", "<copyright holders>": "Erdem Bircan" },
      };
      const store = new RcConfigStore();

      await store.write(new FakeReader({ [RC_FILE]: "" }), writer, config);
      const reread = new RcConfigStore();

      expect(
        await reread.read(
          new FakeReader({ [RC_FILE]: writer.written.get(RC_FILE)! }),
        ),
      ).toEqual(config);
    });

    it("wraps writer failures in FileSystemWriterError", async () => {
      const cause = new Error("write error");
      const store = new RcConfigStore();

      const error = await store
        .write(new FakeReader(), new ThrowingWriter(cause), {
          licenseId: "MIT",
        })
        .catch((e) => e);

      expect(error).toBeInstanceOf(FileSystemWriterError);
      expect(error.cause).toBe(cause);
    });
  });

  describe("clear", () => {
    it("deletes the dot-file when it exists", async () => {
      const writer = new FakeWriter();
      const store = new RcConfigStore();

      await store.clear(new FakeReader({ [RC_FILE]: "{}" }), writer);

      expect(writer.deleted).toContain(RC_FILE);
    });

    it("does nothing when the dot-file is absent", async () => {
      const writer = new FakeWriter();
      const store = new RcConfigStore();

      await store.clear(new FakeReader(), writer);

      expect(writer.deleted).toEqual([]);
    });
  });
});
