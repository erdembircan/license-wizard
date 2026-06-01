import { describe, it, expect, beforeEach } from "vitest";
import { LicenseInstaller } from "./LicenseInstaller.js";
import type { Config } from "@configuration/Config.js";
import type { ProjectManifestRepository } from "@configuration/ProjectManifestRepository.js";
import type { WizardConfig } from "@configuration/WizardConfig.js";
import type { LicenseGenerator } from "@licensing/LicenseGenerator.js";

type WriteCall = { config: WizardConfig; target: string };
type GenerateCall = { licenseId: string; tokens: Record<string, string> };

class FakeConfig {
  writes: WriteCall[] = [];
  clears = 0;
  log: string[] = [];

  async write(config: WizardConfig, target: string): Promise<void> {
    this.writes.push({ config, target });
    this.log.push("write");
  }

  async clear(): Promise<void> {
    this.clears += 1;
    this.log.push("clear");
  }
}

class FakeManifests {
  written: string[] = [];

  async writeLicense(licenseId: string): Promise<void> {
    this.written.push(licenseId);
  }
}

class FakeGenerator {
  calls: GenerateCall[] = [];
  log: string[] = [];

  async generate(
    licenseId: string,
    tokens: Record<string, string>,
  ): Promise<void> {
    this.calls.push({ licenseId, tokens });
    this.log.push("generate");
  }
}

describe("LicenseInstaller", () => {
  let config: FakeConfig;
  let manifests: FakeManifests;
  let generator: FakeGenerator;
  let installer: LicenseInstaller;

  beforeEach(() => {
    config = new FakeConfig();
    manifests = new FakeManifests();
    generator = new FakeGenerator();
    installer = new LicenseInstaller(
      config as unknown as Config,
      manifests as unknown as ProjectManifestRepository,
      generator as unknown as LicenseGenerator,
    );
  });

  it("generates the license and records it in the manifests", async () => {
    await installer.install({
      licenseId: "MIT",
      tokens: {},
      save: { action: "none" },
    });

    expect(generator.calls).toEqual([{ licenseId: "MIT", tokens: {} }]);
    expect(manifests.written).toEqual(["MIT"]);
  });

  it("leaves the configuration untouched for the 'none' save action", async () => {
    await installer.install({
      licenseId: "MIT",
      tokens: {},
      save: { action: "none" },
    });

    expect(config.writes).toEqual([]);
    expect(config.clears).toBe(0);
  });

  it("writes the configuration to the target for the 'save' action", async () => {
    await installer.install({
      licenseId: "MIT",
      tokens: {},
      save: { action: "save", target: "package.json" },
    });

    expect(config.writes).toEqual([
      { config: { licenseId: "MIT" }, target: "package.json" },
    ]);
    expect(config.clears).toBe(0);
  });

  it("includes the tokens in the saved config when customizing", async () => {
    await installer.install({
      licenseId: "MIT",
      tokens: { "<year>": "2026" },
      save: { action: "save", target: ".licensewizardrc.json" },
    });

    expect(config.writes[0]?.config).toEqual({
      licenseId: "MIT",
      tokens: { "<year>": "2026" },
    });
  });

  it("clears every location for the 'clear' save action", async () => {
    await installer.install({
      licenseId: "MIT",
      tokens: {},
      save: { action: "clear" },
    });

    expect(config.clears).toBe(1);
    expect(config.writes).toEqual([]);
  });

  it("persists the configuration before generating the license", async () => {
    await installer.install({
      licenseId: "MIT",
      tokens: {},
      save: { action: "save", target: "package.json" },
    });

    expect(config.log[0]).toBe("write");
    expect(generator.log[0]).toBe("generate");
    // The write must have happened before generation began.
    expect(config.writes).toHaveLength(1);
    expect(generator.calls).toHaveLength(1);
  });
});
