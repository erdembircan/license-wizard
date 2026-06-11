/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import { describe, it, expect, beforeEach } from "vitest";
import { LicenseVerifier } from "./LicenseVerifier.js";
import type { Config } from "@configuration/Config.js";
import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import type {
  ManifestLicense,
  ProjectManifestRepository,
} from "@configuration/ProjectManifestRepository.js";
import type { WizardConfig } from "@configuration/WizardConfig.js";
import type { LicenseGenerator } from "@licensing/LicenseGenerator.js";

const LICENSE = "LICENSE";

type RenderCall = { licenseId: string; slotValues: Record<string, string> };
type WriteToCall = { name: string; licenseId: string };

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

/**
 * Fake manifest repository that serves controllable declared licenses and
 * records every targeted write so tests can assert which manifests the verifier
 * reconciled.
 */
class FakeManifests {
  declared: ManifestLicense[] = [];
  readonly writes: WriteToCall[] = [];

  async declaredLicenses(): Promise<ManifestLicense[]> {
    return this.declared;
  }

  async writeLicenseTo(name: string, licenseId: string): Promise<void> {
    this.writes.push({ name, licenseId });
  }
}

describe("LicenseVerifier", () => {
  let config: FakeConfig;
  let reader: FakeReader;
  let generator: FakeGenerator;
  let manifests: FakeManifests;
  let verifier: LicenseVerifier;

  beforeEach(() => {
    config = new FakeConfig();
    reader = new FakeReader();
    generator = new FakeGenerator();
    manifests = new FakeManifests();
    verifier = new LicenseVerifier(
      config as unknown as Config,
      manifests as unknown as ProjectManifestRepository,
      generator as unknown as LicenseGenerator,
      reader,
    );
  });

  describe("preconditions", () => {
    it("reports a missing license when no LICENSE file exists", async () => {
      config.config = { licenseId: "MIT" };

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
      const outcome = await verifier.verify({ fix: true });

      expect(outcome).toEqual({ kind: "missing-license" });
    });
  });

  describe("LICENSE file", () => {
    it("reports a match when the LICENSE equals the re-rendered license", async () => {
      config.config = { licenseId: "MIT" };
      reader.files.set(LICENSE, "MIT LICENSE TEXT");
      generator.rendered = "MIT LICENSE TEXT";

      const outcome = await verifier.verify({ fix: true });

      expect(outcome).toEqual({
        kind: "match",
        licenseId: "MIT",
        license: "match",
        manifests: [],
      });
      expect(generator.generateCalls).toEqual([]);
    });

    it("rewrites the LICENSE and reports fixed when it differs and fixing is enabled", async () => {
      config.config = { licenseId: "MIT", tokens: { "<year>": "2026" } };
      reader.files.set(LICENSE, "STALE TEXT");
      generator.rendered = "FRESH TEXT";

      const outcome = await verifier.verify({ fix: true });

      expect(outcome).toEqual({
        kind: "fixed",
        licenseId: "MIT",
        license: "fixed",
        manifests: [],
      });
      expect(generator.generateCalls).toEqual([
        { licenseId: "MIT", slotValues: { "<year>": "2026" } },
      ]);
    });

    it("reports a mismatch without rewriting when fixing is disabled", async () => {
      config.config = { licenseId: "MIT" };
      reader.files.set(LICENSE, "STALE TEXT");
      generator.rendered = "FRESH TEXT";

      const outcome = await verifier.verify({ fix: false });

      expect(outcome).toEqual({
        kind: "mismatch",
        licenseId: "MIT",
        license: "mismatch",
        manifests: [],
      });
      expect(generator.generateCalls).toEqual([]);
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

  describe("manifest declarations", () => {
    beforeEach(() => {
      // A matching LICENSE file isolates the manifest dimension.
      config.config = { licenseId: "MIT" };
      reader.files.set(LICENSE, "MIT TEXT");
      generator.rendered = "MIT TEXT";
    });

    it("matches when every present manifest declares the configured license", async () => {
      manifests.declared = [
        { name: "composer.json", licenseId: "MIT" },
        { name: "package.json", licenseId: "MIT" },
      ];

      const outcome = await verifier.verify({ fix: true });

      expect(outcome).toEqual({
        kind: "match",
        licenseId: "MIT",
        license: "match",
        manifests: [
          { name: "composer.json", declared: "MIT", status: "match" },
          { name: "package.json", declared: "MIT", status: "match" },
        ],
      });
      expect(manifests.writes).toEqual([]);
    });

    it("updates only the drifted manifests and reports fixed when fixing is enabled", async () => {
      manifests.declared = [
        { name: "composer.json", licenseId: "Apache-2.0" },
        { name: "package.json", licenseId: "MIT" },
      ];

      const outcome = await verifier.verify({ fix: true });

      expect(outcome).toEqual({
        kind: "fixed",
        licenseId: "MIT",
        license: "match",
        manifests: [
          { name: "composer.json", declared: "Apache-2.0", status: "fixed" },
          { name: "package.json", declared: "MIT", status: "match" },
        ],
      });
      // Only the drifted manifest is written; the matching one is left alone.
      expect(manifests.writes).toEqual([
        { name: "composer.json", licenseId: "MIT" },
      ]);
    });

    it("treats a present manifest declaring no license as drift", async () => {
      manifests.declared = [{ name: "package.json", licenseId: null }];

      const outcome = await verifier.verify({ fix: true });

      expect(outcome.kind).toBe("fixed");
      expect(outcome).toMatchObject({
        manifests: [{ name: "package.json", declared: null, status: "fixed" }],
      });
      expect(manifests.writes).toEqual([
        { name: "package.json", licenseId: "MIT" },
      ]);
    });

    it("reports manifest drift without writing when fixing is disabled", async () => {
      manifests.declared = [{ name: "package.json", licenseId: "Apache-2.0" }];

      const outcome = await verifier.verify({ fix: false });

      expect(outcome).toEqual({
        kind: "mismatch",
        licenseId: "MIT",
        license: "match",
        manifests: [
          { name: "package.json", declared: "Apache-2.0", status: "mismatch" },
        ],
      });
      expect(manifests.writes).toEqual([]);
    });
  });

  describe("aggregate kind", () => {
    beforeEach(() => {
      config.config = { licenseId: "MIT" };
    });

    it("is mismatch when the LICENSE matches but a manifest drifted in strict mode", async () => {
      reader.files.set(LICENSE, "MIT TEXT");
      generator.rendered = "MIT TEXT";
      manifests.declared = [{ name: "package.json", licenseId: "Apache-2.0" }];

      const outcome = await verifier.verify({ fix: false });

      expect(outcome.kind).toBe("mismatch");
    });

    it("is fixed when the LICENSE drifted but every manifest already matched", async () => {
      reader.files.set(LICENSE, "STALE");
      generator.rendered = "FRESH";
      manifests.declared = [{ name: "package.json", licenseId: "MIT" }];

      const outcome = await verifier.verify({ fix: true });

      expect(outcome.kind).toBe("fixed");
    });
  });
});
