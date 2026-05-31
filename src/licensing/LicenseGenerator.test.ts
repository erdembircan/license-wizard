import { describe, it, expect, vi } from "vitest";
import { LicenseGenerator } from "@licensing/LicenseGenerator.js";
import { LicenseRepository } from "@licensing/LicenseRepository.js";
import { LicenseRepositoryError } from "@licensing/errors/LicenseRepositoryError.js";
import type { ILicenseSource } from "@licensing/interfaces/ILicenseSource.js";
import type { LicenseDetail } from "@licensing/LicenseDetail.js";
import type { LicenseIndexEntry } from "@licensing/LicenseIndexEntry.js";
import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";
import { FileSystemWriterError } from "@configuration/errors/FileSystemWriterError.js";

const makeSource = (): ILicenseSource => ({
  search: vi.fn(async (): Promise<LicenseIndexEntry[]> => []),
  fetchLicense: vi.fn(
    async (): Promise<LicenseDetail> => ({
      licenseId: "MIT",
      name: "MIT License",
      licenseText: "Permission is hereby granted...",
      standardLicenseTemplate: "",
    }),
  ),
});

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
 * A fake writer that throws on any write, used to test error propagation.
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

describe("LicenseGenerator", () => {
  it("writes the fetched license text to a LICENSE file", async () => {
    const detail: LicenseDetail = {
      licenseId: "MIT",
      name: "MIT License",
      licenseText: "MIT License\n\nPermission is hereby granted...",
      standardLicenseTemplate: "",
    };
    const source = makeSource();
    vi.mocked(source.fetchLicense).mockResolvedValueOnce(detail);
    const writer = new FakeWriter();
    const generator = new LicenseGenerator(
      new LicenseRepository(source),
      writer,
    );

    await generator.generate("MIT");

    expect(writer.written.get("LICENSE")).toBe(detail.licenseText);
  });

  it("fetches the license for the given identifier", async () => {
    const source = makeSource();
    const generator = new LicenseGenerator(
      new LicenseRepository(source),
      new FakeWriter(),
    );

    await generator.generate("Apache-2.0");

    expect(source.fetchLicense).toHaveBeenCalledWith("Apache-2.0");
  });

  it("propagates errors from the repository", async () => {
    const source = makeSource();
    vi.mocked(source.fetchLicense).mockRejectedValueOnce(
      new Error("License not found: FAKE-LICENSE"),
    );
    const generator = new LicenseGenerator(
      new LicenseRepository(source),
      new FakeWriter(),
    );

    await expect(generator.generate("FAKE-LICENSE")).rejects.toThrow(
      LicenseRepositoryError,
    );
  });

  it("propagates errors from the writer", async () => {
    const source = makeSource();
    const cause = new Error("disk full");
    const generator = new LicenseGenerator(
      new LicenseRepository(source),
      new ThrowingWriter(new FileSystemWriterError("Failed to write", cause)),
    );

    await expect(generator.generate("MIT")).rejects.toThrow(
      FileSystemWriterError,
    );
  });

  it("renders the template with the given slot values when customizing", async () => {
    const detail: LicenseDetail = {
      licenseId: "MIT",
      name: "MIT License",
      licenseText: "Copyright (c) <year> <copyright holders>",
      standardLicenseTemplate:
        '<<var;name="copyright";original="Copyright (c) <year> <copyright holders>";match=".{0,5000}">>',
    };
    const source = makeSource();
    vi.mocked(source.fetchLicense).mockResolvedValueOnce(detail);
    const writer = new FakeWriter();
    const generator = new LicenseGenerator(
      new LicenseRepository(source),
      writer,
    );

    await generator.generate("MIT", {
      "<year>": "2026",
      "<copyright holders>": "Erdem Bircan",
    });

    expect(writer.written.get("LICENSE")).toBe(
      "Copyright (c) 2026 Erdem Bircan",
    );
  });

  it("writes the standard license text when no slot values are provided", async () => {
    const detail: LicenseDetail = {
      licenseId: "MIT",
      name: "MIT License",
      licenseText: "Copyright (c) <year> <copyright holders>",
      standardLicenseTemplate:
        '<<var;name="copyright";original="Copyright (c) <year> <copyright holders>";match=".{0,5000}">>',
    };
    const source = makeSource();
    vi.mocked(source.fetchLicense).mockResolvedValueOnce(detail);
    const writer = new FakeWriter();
    const generator = new LicenseGenerator(
      new LicenseRepository(source),
      writer,
    );

    await generator.generate("MIT", {});

    expect(writer.written.get("LICENSE")).toBe(detail.licenseText);
  });

  it("writes the standard license text when the license has no template, even with slot values", async () => {
    const detail: LicenseDetail = {
      licenseId: "Unlicense",
      name: "The Unlicense",
      licenseText: "This is free and unencumbered software...",
      standardLicenseTemplate: "",
    };
    const source = makeSource();
    vi.mocked(source.fetchLicense).mockResolvedValueOnce(detail);
    const writer = new FakeWriter();
    const generator = new LicenseGenerator(
      new LicenseRepository(source),
      writer,
    );

    await generator.generate("Unlicense", { "<year>": "2026" });

    expect(writer.written.get("LICENSE")).toBe(detail.licenseText);
  });
});
