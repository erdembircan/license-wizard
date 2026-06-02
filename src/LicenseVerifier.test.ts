import { describe, it, expect, beforeEach } from "vitest";
import { LicenseVerifier } from "./LicenseVerifier.js";
import type { Config } from "@configuration/Config.js";
import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import type { WizardConfig } from "@configuration/WizardConfig.js";
import type { LicenseGenerator } from "@licensing/LicenseGenerator.js";

const LICENSE = "LICENSE";

type RenderCall = { licenseId: string; slotValues: Record<string, string> };

/**
 * In-memory fake config whose saved value each test controls.
 */
class FakeConfig {
  config: WizardConfig | null = null;

  async read(): Promise<WizardConfig | null> {
    return this.config;
  }
}

/**
 * In-memory fake reader backed by a path→content map.
 */
class FakeReader implements IFileSystemReader {
  readonly files: Map<string, string> = new Map();

  async exists(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  async read(path: string): Promise<string> {
    const content = this.files.get(path);
    if (content === undefined) {
      throw new Error(`no such file: ${path}`);
    }
    return content;
  }
}

/**
 * Fake generator that renders a controllable string and records both render and
 * generate calls so tests can assert what the verifier asked for and whether it
 * rewrote the file.
 */
class FakeGenerator {
  rendered = "";
  readonly renderCalls: RenderCall[] = [];
  readonly generateCalls: RenderCall[] = [];

  async render(
    licenseId: string,
    slotValues: Record<string, string> = {},
  ): Promise<string> {
    this.renderCalls.push({ licenseId, slotValues });
    return this.rendered;
  }

  async generate(
    licenseId: string,
    slotValues: Record<string, string> = {},
  ): Promise<void> {
    this.generateCalls.push({ licenseId, slotValues });
  }
}

describe("LicenseVerifier", () => {
  let config: FakeConfig;
  let reader: FakeReader;
  let generator: FakeGenerator;
  let verifier: LicenseVerifier;

  beforeEach(() => {
    config = new FakeConfig();
    reader = new FakeReader();
    generator = new FakeGenerator();
    verifier = new LicenseVerifier(
      config as unknown as Config,
      generator as unknown as LicenseGenerator,
      reader,
    );
  });

  it("reports a match when the LICENSE equals the re-rendered license", async () => {
    config.config = { licenseId: "MIT" };
    reader.files.set(LICENSE, "MIT LICENSE TEXT");
    generator.rendered = "MIT LICENSE TEXT";

    const outcome = await verifier.verify({ fix: true });

    expect(outcome).toEqual({ kind: "match", licenseId: "MIT" });
    expect(generator.generateCalls).toEqual([]);
  });

  it("rewrites the LICENSE and reports fixed when it differs and fixing is enabled", async () => {
    config.config = { licenseId: "MIT", tokens: { "<year>": "2026" } };
    reader.files.set(LICENSE, "STALE TEXT");
    generator.rendered = "FRESH TEXT";

    const outcome = await verifier.verify({ fix: true });

    expect(outcome).toEqual({ kind: "fixed", licenseId: "MIT" });
    expect(generator.generateCalls).toEqual([
      { licenseId: "MIT", slotValues: { "<year>": "2026" } },
    ]);
  });

  it("reports a mismatch without rewriting when fixing is disabled", async () => {
    config.config = { licenseId: "MIT" };
    reader.files.set(LICENSE, "STALE TEXT");
    generator.rendered = "FRESH TEXT";

    const outcome = await verifier.verify({ fix: false });

    expect(outcome).toEqual({ kind: "mismatch", licenseId: "MIT" });
    expect(generator.generateCalls).toEqual([]);
  });

  it("reports a missing license when no LICENSE file exists", async () => {
    config.config = { licenseId: "MIT" };
    // No LICENSE file registered in the reader.

    const outcome = await verifier.verify({ fix: true });

    expect(outcome).toEqual({ kind: "missing-license" });
    expect(generator.renderCalls).toEqual([]);
  });

  it("reports a missing config when no configuration is saved", async () => {
    reader.files.set(LICENSE, "SOME TEXT");
    config.config = null;

    const outcome = await verifier.verify({ fix: true });

    expect(outcome).toEqual({ kind: "missing-config" });
    expect(generator.renderCalls).toEqual([]);
  });

  it("requires the license before the config, so a missing license wins when both are absent", async () => {
    // Neither a LICENSE file nor a saved config exists.
    const outcome = await verifier.verify({ fix: true });

    expect(outcome).toEqual({ kind: "missing-license" });
  });

  it("renders with the saved tokens, defaulting to none when the config has no tokens", async () => {
    config.config = { licenseId: "Apache-2.0" };
    reader.files.set(LICENSE, "anything");
    generator.rendered = "anything";

    await verifier.verify({ fix: true });

    expect(generator.renderCalls).toEqual([
      { licenseId: "Apache-2.0", slotValues: {} },
    ]);
  });
});
