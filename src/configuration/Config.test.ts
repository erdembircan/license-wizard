import { describe, it, expect } from "vitest";
import { Config } from "@configuration/Config.js";
import { FileSystemWriterError } from "@configuration/errors/FileSystemWriterError.js";
import type { IConfigStore } from "@configuration/interfaces/IConfigStore.js";
import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";
import type { WizardConfig } from "@configuration/WizardConfig.js";

/**
 * No-op reader/writer. The fake stores ignore them entirely; Config only needs
 * something to forward to its stores.
 */
const reader: IFileSystemReader = {
  async read(): Promise<string> {
    throw new Error("not used");
  },
  async exists(): Promise<boolean> {
    return false;
  },
};

const writer: IFileSystemWriter = {
  async write(): Promise<void> {},
  async delete(): Promise<void> {},
};

const makeConfig = (stores: IConfigStore[]): Config =>
  new Config(stores, reader, writer);

/**
 * In-memory fake store that records writes and clears, used to verify how
 * Config coordinates across stores.
 */
class FakeStore implements IConfigStore {
  written: WizardConfig | null = null;
  cleared = false;

  constructor(
    readonly id: string,
    readonly label: string,
    private isAvailable: boolean,
    private held: WizardConfig | null = null,
  ) {}

  async available(): Promise<boolean> {
    return this.isAvailable;
  }

  async read(): Promise<WizardConfig | null> {
    return this.held;
  }

  async write(
    _reader: IFileSystemReader,
    _writer: IFileSystemWriter,
    config: WizardConfig,
  ): Promise<void> {
    this.written = config;
    this.held = config;
  }

  async clear(): Promise<void> {
    this.cleared = true;
    this.held = null;
  }
}

describe("Config", () => {
  describe("read", () => {
    it("returns the config from the highest-priority store that holds one", async () => {
      const config = makeConfig([
        new FakeStore("rc", "rc", true, null),
        new FakeStore("package.json", "package.json", true, {
          licenseId: "MIT",
        }),
        new FakeStore("composer.json", "composer.json", true, {
          licenseId: "Apache-2.0",
        }),
      ]);

      expect(await config.read()).toEqual({ licenseId: "MIT" });
    });

    it("prefers an earlier store over a later one when both hold a config", async () => {
      const config = makeConfig([
        new FakeStore("rc", "rc", true, { licenseId: "MIT" }),
        new FakeStore("package.json", "package.json", true, {
          licenseId: "Apache-2.0",
        }),
      ]);

      expect(await config.read()).toEqual({ licenseId: "MIT" });
    });

    it("returns null when no store holds a config", async () => {
      const config = makeConfig([
        new FakeStore("rc", "rc", true, null),
        new FakeStore("package.json", "package.json", false, null),
      ]);

      expect(await config.read()).toBeNull();
    });
  });

  describe("targets", () => {
    it("returns only available stores, in order", async () => {
      const config = makeConfig([
        new FakeStore("rc", ".licensewizardrc.json", true),
        new FakeStore("package.json", "package.json", false),
        new FakeStore("composer.json", "composer.json", true),
      ]);

      expect(await config.targets()).toEqual([
        { id: "rc", label: ".licensewizardrc.json" },
        { id: "composer.json", label: "composer.json" },
      ]);
    });
  });

  describe("write", () => {
    it("writes the config to the chosen store", async () => {
      const rc = new FakeStore("rc", "rc", true);
      const config = makeConfig([rc]);

      await config.write({ licenseId: "MIT" }, "rc");

      expect(rc.written).toEqual({ licenseId: "MIT" });
    });

    it("clears the config from every other store", async () => {
      const rc = new FakeStore("rc", "rc", true);
      const pkg = new FakeStore("package.json", "package.json", true);
      const composer = new FakeStore("composer.json", "composer.json", true);
      const config = makeConfig([rc, pkg, composer]);

      await config.write({ licenseId: "MIT" }, "package.json");

      expect(pkg.written).toEqual({ licenseId: "MIT" });
      expect(rc.cleared).toBe(true);
      expect(composer.cleared).toBe(true);
    });

    it("does not clear the store it just wrote to", async () => {
      const rc = new FakeStore("rc", "rc", true);
      const config = makeConfig([rc]);

      await config.write({ licenseId: "MIT" }, "rc");

      expect(rc.cleared).toBe(false);
    });

    it("throws FileSystemWriterError when the target is unknown", async () => {
      const config = makeConfig([new FakeStore("rc", "rc", true)]);

      await expect(config.write({ licenseId: "MIT" }, "nope")).rejects.toThrow(
        FileSystemWriterError,
      );
    });

    it("clears available and unavailable stores alike", async () => {
      const rc = new FakeStore("rc", "rc", true);
      const composer = new FakeStore("composer.json", "composer.json", false);
      const config = makeConfig([rc, composer]);

      await config.write({ licenseId: "MIT" }, "rc");

      expect(composer.cleared).toBe(true);
    });
  });

  describe("clear", () => {
    it("clears the config from every store", async () => {
      const rc = new FakeStore("rc", "rc", true, { licenseId: "MIT" });
      const pkg = new FakeStore("package.json", "package.json", true, {
        licenseId: "MIT",
      });
      const composer = new FakeStore("composer.json", "composer.json", false, {
        licenseId: "MIT",
      });
      const config = makeConfig([rc, pkg, composer]);

      await config.clear();

      expect(rc.cleared).toBe(true);
      expect(pkg.cleared).toBe(true);
      expect(composer.cleared).toBe(true);
      expect(await config.read()).toBeNull();
    });
  });
});
