/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

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
  suggest: vi.fn(async (): Promise<LicenseIndexEntry[]> => []),
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

  it("hard-wraps long license lines before writing", async () => {
    const longLine =
      "Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files, to deal in the Software without restriction.";
    const detail: LicenseDetail = {
      licenseId: "MIT",
      name: "MIT License",
      licenseText: `MIT License\n\n${longLine}`,
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

    const written = writer.written.get("LICENSE")!;
    for (const line of written.split("\n")) {
      expect(line.length).toBeLessThanOrEqual(80);
    }
    expect(written.replace(/\s+/g, " ")).toContain(longLine);
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

  it("renders the license content without writing any file", async () => {
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

    const content = await generator.render("MIT");

    expect(content).toBe(detail.licenseText);
    expect(writer.written.size).toBe(0);
  });

  it("renders the same content that generate writes", async () => {
    const longLine =
      "Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files, to deal in the Software without restriction.";
    const detail: LicenseDetail = {
      licenseId: "MIT",
      name: "MIT License",
      licenseText: `MIT License\n\n${longLine}`,
      standardLicenseTemplate: "",
    };
    const source = makeSource();
    vi.mocked(source.fetchLicense).mockResolvedValue(detail);
    const writer = new FakeWriter();
    const generator = new LicenseGenerator(
      new LicenseRepository(source),
      writer,
    );

    const rendered = await generator.render("MIT");
    await generator.generate("MIT");

    expect(writer.written.get("LICENSE")).toBe(rendered);
  });

  it("renders the customized copyright when slot values are given", async () => {
    const detail: LicenseDetail = {
      licenseId: "MIT",
      name: "MIT License",
      licenseText: "Copyright (c) <year> <copyright holders>",
      standardLicenseTemplate:
        '<<var;name="copyright";original="Copyright (c) <year> <copyright holders>";match=".{0,5000}">>',
    };
    const source = makeSource();
    vi.mocked(source.fetchLicense).mockResolvedValueOnce(detail);
    const generator = new LicenseGenerator(
      new LicenseRepository(source),
      new FakeWriter(),
    );

    const content = await generator.render("MIT", {
      "<year>": "2026",
      "<copyright holders>": "Erdem Bircan",
    });

    expect(content).toBe("Copyright (c) 2026 Erdem Bircan");
  });

  it("substitutes every occurrence of a token in the canonical text, not just the copyright line", async () => {
    // BSD-3-Clause-Clear repeats the owner placeholder in a clause body; the
    // matchable SPDX template would smear stray spaces and leave the body copy
    // unfilled, so substitution must target the canonical licenseText directly.
    const detail: LicenseDetail = {
      licenseId: "BSD-3-Clause-Clear",
      name: "The Clear BSD License",
      licenseText:
        "Copyright (c) [xxxx] [Owner Organization]\n\nNeither the name of [Owner Organization] nor the names...",
      standardLicenseTemplate:
        '<<var;name="copyright";original="Copyright (c) [xxxx] [Owner Organization]";match=".{0,5000}">>',
    };
    const source = makeSource();
    vi.mocked(source.fetchLicense).mockResolvedValueOnce(detail);
    const generator = new LicenseGenerator(
      new LicenseRepository(source),
      new FakeWriter(),
    );

    const content = await generator.render("BSD-3-Clause-Clear", {
      "[xxxx]": "2026",
      "[Owner Organization]": "Acme",
    });

    expect(content).not.toContain("[Owner Organization]");
    expect(content).toContain("Copyright (c) 2026 Acme");
    expect(content).toContain("Neither the name of Acme nor");
  });

  it("renders the SPDX template only when the canonical text lacks the tokens", async () => {
    // ISC's canonical text ships a pre-filled example, not the placeholder, so
    // the substitution path can't apply; the template fallback fills the slot.
    const detail: LicenseDetail = {
      licenseId: "ISC",
      name: "ISC License",
      licenseText: "Copyright (c) 1995 Example Author",
      standardLicenseTemplate:
        '<<var;name="copyright";original="<copyright notice>";match=".{0,5000}">>',
    };
    const source = makeSource();
    vi.mocked(source.fetchLicense).mockResolvedValueOnce(detail);
    const generator = new LicenseGenerator(
      new LicenseRepository(source),
      new FakeWriter(),
    );

    const content = await generator.render("ISC", {
      "<copyright notice>": "Copyright (c) 2026 Acme",
    });

    expect(content).toBe("Copyright (c) 2026 Acme");
  });

  it("strips the matching-template's padding spaces on the fallback path but keeps real indentation", async () => {
    // Mirrors the Zlib shape: the copyright var's `original` carries the leading
    // space a stripped optional marker leaves and the trailing padding spaces,
    // while the numbered conditions are genuinely indented and must survive.
    const detail: LicenseDetail = {
      licenseId: "Zlib",
      name: "zlib License",
      licenseText: "zlib License\n\nThis software is provided 'as-is'...",
      standardLicenseTemplate:
        '<<beginOptional>>zlib License\n\n<<endOptional>> <<var;name="copyright";original="Copyright (c) <year> <holder>  ";match=".{0,5000}">>\n   <<var;name="bullet";original="1.";match=".{0,20}">> The origin...',
    };
    const source = makeSource();
    vi.mocked(source.fetchLicense).mockResolvedValueOnce(detail);
    const generator = new LicenseGenerator(
      new LicenseRepository(source),
      new FakeWriter(),
    );

    const content = await generator.render("Zlib", {
      "<year>": "2026",
      "<holder>": "Acme",
    });

    // No leading space before the copyright and no trailing padding after it...
    expect(content).toContain("\nCopyright (c) 2026 Acme\n");
    expect(content).not.toMatch(/ Copyright/);
    expect(content).not.toMatch(/Acme +\n/);
    // ...but the numbered condition keeps its indentation.
    expect(content).toContain("   1. The origin");
  });
});
