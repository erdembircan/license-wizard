import { describe, it, expect } from "vitest";
import { Config } from "@configuration/Config.js";
import { FileSystemReaderError } from "@configuration/errors/FileSystemReaderError.js";
import { FileSystemWriterError } from "@configuration/errors/FileSystemWriterError.js";
import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";
import type { WizardConfig } from "@configuration/WizardConfig.js";

const RC_FILE = ".licensewizardrc.json";
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
 * A fake reader that throws on any operation, used to test error wrapping.
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
    throw this.#cause;
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

const makeConfig = (
  reader: IFileSystemReader,
  writer: IFileSystemWriter = new FakeWriter(),
): Config => new Config(reader, writer);

describe("Config", () => {
  describe("read", () => {
    it("returns config from .licensewizardrc.json when it exists", async () => {
      const wizardConfig: WizardConfig = { licenseId: "MIT" };
      const reader = new FakeReader({
        [RC_FILE]: JSON.stringify(wizardConfig),
      });
      const config = makeConfig(reader);

      const result = await config.read();

      expect(result).toEqual(wizardConfig);
    });

    it("falls back to package.json license-wizard field when rc file is absent", async () => {
      const wizardConfig: WizardConfig = { licenseId: "Apache-2.0" };
      const reader = new FakeReader({
        [PACKAGE_JSON]: JSON.stringify({ "license-wizard": wizardConfig }),
      });
      const config = makeConfig(reader);

      const result = await config.read();

      expect(result).toEqual(wizardConfig);
    });

    it("returns null when neither .licensewizardrc.json nor package.json license-wizard field exist", async () => {
      const reader = new FakeReader();
      const config = makeConfig(reader);

      const result = await config.read();

      expect(result).toBeNull();
    });

    it("returns null when package.json exists but has no license-wizard field", async () => {
      const reader = new FakeReader({
        [PACKAGE_JSON]: JSON.stringify({ name: "my-app" }),
      });
      const config = makeConfig(reader);

      const result = await config.read();

      expect(result).toBeNull();
    });

    it("prefers .licensewizardrc.json over package.json when both are present", async () => {
      const rcConfig: WizardConfig = { licenseId: "MIT" };
      const pkgConfig: WizardConfig = { licenseId: "Apache-2.0" };
      const reader = new FakeReader({
        [RC_FILE]: JSON.stringify(rcConfig),
        [PACKAGE_JSON]: JSON.stringify({ "license-wizard": pkgConfig }),
      });
      const config = makeConfig(reader);

      const result = await config.read();

      expect(result).toEqual(rcConfig);
    });

    it("throws FileSystemReaderError when the reader fails", async () => {
      const cause = new Error("disk error");
      const reader = new ThrowingReader(cause);
      const config = makeConfig(reader);

      await expect(config.read()).rejects.toThrow(FileSystemReaderError);
    });

    it("preserves the original error as cause on read failure", async () => {
      const cause = new Error("disk error");
      const reader = new ThrowingReader(cause);
      const config = makeConfig(reader);

      const error = await config.read().catch((e) => e);

      expect(error.cause).toBe(cause);
    });
  });

  describe("write", () => {
    it("writes to .licensewizardrc.json", async () => {
      const writer = new FakeWriter();
      const reader = new FakeReader();
      const config = new Config(reader, writer);
      const wizardConfig: WizardConfig = { licenseId: "MIT" };

      await config.write(wizardConfig);

      expect(writer.written.has(RC_FILE)).toBe(true);
    });

    it("serializes the config as JSON", async () => {
      const writer = new FakeWriter();
      const reader = new FakeReader();
      const config = new Config(reader, writer);
      const wizardConfig: WizardConfig = { licenseId: "MIT" };

      await config.write(wizardConfig);

      const written = JSON.parse(writer.written.get(RC_FILE)!);
      expect(written).toEqual(wizardConfig);
    });

    it("throws FileSystemWriterError when the writer fails", async () => {
      const cause = new Error("write error");
      const writer = new ThrowingWriter(cause);
      const config = new Config(new FakeReader(), writer);

      await expect(config.write({ licenseId: "MIT" })).rejects.toThrow(
        FileSystemWriterError,
      );
    });

    it("preserves the original error as cause on write failure", async () => {
      const cause = new Error("write error");
      const writer = new ThrowingWriter(cause);
      const config = new Config(new FakeReader(), writer);

      const error = await config.write({ licenseId: "MIT" }).catch((e) => e);

      expect(error.cause).toBe(cause);
    });
  });

  describe("readPackageLicense", () => {
    it("returns the top-level license string from package.json", async () => {
      const reader = new FakeReader({
        [PACKAGE_JSON]: JSON.stringify({ name: "my-app", license: "MIT" }),
      });
      const config = makeConfig(reader);

      const result = await config.readPackageLicense();

      expect(result).toBe("MIT");
    });

    it("returns null when package.json does not exist", async () => {
      const reader = new FakeReader();
      const config = makeConfig(reader);

      const result = await config.readPackageLicense();

      expect(result).toBeNull();
    });

    it("returns null when package.json has no license field", async () => {
      const reader = new FakeReader({
        [PACKAGE_JSON]: JSON.stringify({ name: "my-app" }),
      });
      const config = makeConfig(reader);

      const result = await config.readPackageLicense();

      expect(result).toBeNull();
    });

    it("returns null when the license field is not a string", async () => {
      const reader = new FakeReader({
        [PACKAGE_JSON]: JSON.stringify({
          name: "my-app",
          license: { type: "MIT", url: "https://example.com" },
        }),
      });
      const config = makeConfig(reader);

      const result = await config.readPackageLicense();

      expect(result).toBeNull();
    });

    it("throws FileSystemReaderError when the reader fails", async () => {
      const cause = new Error("disk error");
      const reader = new ThrowingReader(cause);
      const config = makeConfig(reader);

      await expect(config.readPackageLicense()).rejects.toThrow(
        FileSystemReaderError,
      );
    });

    it("preserves the original error as cause on read failure", async () => {
      const cause = new Error("disk error");
      const reader = new ThrowingReader(cause);
      const config = makeConfig(reader);

      const error = await config.readPackageLicense().catch((e) => e);

      expect(error.cause).toBe(cause);
    });
  });

  describe("writePackageLicense", () => {
    it("adds the license field when package.json has none", async () => {
      const writer = new FakeWriter();
      const reader = new FakeReader({
        [PACKAGE_JSON]: JSON.stringify({ name: "my-app" }),
      });
      const config = new Config(reader, writer);

      await config.writePackageLicense("MIT");

      const written = JSON.parse(writer.written.get(PACKAGE_JSON)!);
      expect(written.license).toBe("MIT");
    });

    it("overwrites an existing license field", async () => {
      const writer = new FakeWriter();
      const reader = new FakeReader({
        [PACKAGE_JSON]: JSON.stringify({ name: "my-app", license: "ISC" }),
      });
      const config = new Config(reader, writer);

      await config.writePackageLicense("Apache-2.0");

      const written = JSON.parse(writer.written.get(PACKAGE_JSON)!);
      expect(written.license).toBe("Apache-2.0");
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
      const config = new Config(reader, writer);

      await config.writePackageLicense("MIT");

      const written = JSON.parse(writer.written.get(PACKAGE_JSON)!);
      expect(written).toEqual({
        name: "my-app",
        version: "1.2.3",
        license: "MIT",
      });
    });

    it("does not write when package.json does not exist", async () => {
      const writer = new FakeWriter();
      const reader = new FakeReader();
      const config = new Config(reader, writer);

      await config.writePackageLicense("MIT");

      expect(writer.written.has(PACKAGE_JSON)).toBe(false);
    });

    it("throws FileSystemWriterError when the writer fails", async () => {
      const reader = new FakeReader({
        [PACKAGE_JSON]: JSON.stringify({ name: "my-app" }),
      });
      const cause = new Error("write error");
      const config = new Config(reader, new ThrowingWriter(cause));

      await expect(config.writePackageLicense("MIT")).rejects.toThrow(
        FileSystemWriterError,
      );
    });

    it("preserves the original error as cause on write failure", async () => {
      const reader = new FakeReader({
        [PACKAGE_JSON]: JSON.stringify({ name: "my-app" }),
      });
      const cause = new Error("write error");
      const config = new Config(reader, new ThrowingWriter(cause));

      const error = await config.writePackageLicense("MIT").catch((e) => e);

      expect(error.cause).toBe(cause);
    });
  });
});
