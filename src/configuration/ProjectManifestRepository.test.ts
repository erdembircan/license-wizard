import { describe, it, expect } from "vitest";
import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";
import type { IProjectManifest } from "@configuration/interfaces/IProjectManifest.js";
import { ProjectManifestRepository } from "@configuration/ProjectManifestRepository.js";

/**
 * No-op reader/writer. The fake manifests ignore them entirely; the repository
 * only needs something to forward to its manifests.
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

const makeRepository = (
  manifests: IProjectManifest[],
): ProjectManifestRepository =>
  new ProjectManifestRepository(manifests, reader, writer);

/**
 * Configurable in-memory manifest. Reports a license on read and, mirroring a
 * real manifest, only records a write-back when it exists.
 */
class FakeManifest implements IProjectManifest {
  written: string | null = null;
  readonly #present: boolean;
  readonly #license: string | null;

  constructor(present: boolean, license: string | null = null) {
    this.#present = present;
    this.#license = license;
  }

  async exists(): Promise<boolean> {
    return this.#present;
  }

  async readLicense(): Promise<string | null> {
    return this.#present ? this.#license : null;
  }

  async writeLicense(
    _reader: IFileSystemReader,
    _writer: IFileSystemWriter,
    licenseId: string,
  ): Promise<void> {
    if (this.#present) {
      this.written = licenseId;
    }
  }
}

describe("ProjectManifestRepository", () => {
  describe("readLicense", () => {
    it("returns the license from the highest-priority manifest that has one", async () => {
      const repository = makeRepository([
        new FakeManifest(true, "GPL-3.0-only"),
        new FakeManifest(true, "MIT"),
      ]);

      expect(await repository.readLicense()).toBe("GPL-3.0-only");
    });

    it("falls back to the next manifest when the first declares no license", async () => {
      const repository = makeRepository([
        new FakeManifest(true, null),
        new FakeManifest(true, "MIT"),
      ]);

      expect(await repository.readLicense()).toBe("MIT");
    });

    it("returns null when no manifest declares a license", async () => {
      const repository = makeRepository([
        new FakeManifest(false),
        new FakeManifest(true, null),
      ]);

      expect(await repository.readLicense()).toBeNull();
    });
  });

  describe("writeLicense", () => {
    it("writes to every manifest that exists", async () => {
      const composer = new FakeManifest(true, "MIT");
      const pkg = new FakeManifest(true, "ISC");
      const repository = makeRepository([composer, pkg]);

      await repository.writeLicense("Apache-2.0");

      expect(composer.written).toBe("Apache-2.0");
      expect(pkg.written).toBe("Apache-2.0");
    });

    it("writes only to manifests that exist", async () => {
      const composer = new FakeManifest(false);
      const pkg = new FakeManifest(true, "ISC");
      const repository = makeRepository([composer, pkg]);

      await repository.writeLicense("MIT");

      expect(composer.written).toBeNull();
      expect(pkg.written).toBe("MIT");
    });

    it("does nothing when no manifest exists", async () => {
      const composer = new FakeManifest(false);
      const pkg = new FakeManifest(false);
      const repository = makeRepository([composer, pkg]);

      await repository.writeLicense("MIT");

      expect(composer.written).toBeNull();
      expect(pkg.written).toBeNull();
    });
  });
});
