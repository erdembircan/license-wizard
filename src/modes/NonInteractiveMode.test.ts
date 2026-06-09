import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { IReporter } from "@cli/interfaces/IReporter.js";
import type { Config } from "@configuration/Config.js";
import type { ProjectManifestRepository } from "@configuration/ProjectManifestRepository.js";
import type { LicenseDetail } from "@licensing/LicenseDetail.js";
import type { LicenseGenerator } from "@licensing/LicenseGenerator.js";
import type { LicenseRepository } from "@licensing/LicenseRepository.js";
import type { HeaderApplier } from "../HeaderApplier.js";
import type { LicenseInstaller } from "../LicenseInstaller.js";
import type { WizardFlags } from "./WizardFlags.js";
import { NonInteractiveMode } from "./NonInteractiveMode.js";

function makeReporter() {
  const calls: { method: string; arg: unknown }[] = [];
  const reporter = new Proxy(
    {},
    {
      get:
        (_t, prop: string) =>
        (arg?: unknown): void => {
          calls.push({ method: prop, arg });
        },
    },
  ) as unknown as IReporter;
  return { reporter, calls };
}

const flags = (over: Partial<WizardFlags> = {}): WizardFlags => ({
  help: false,
  verify: false,
  strict: false,
  "apply-config": false,
  license: "",
  set: [],
  "save-rc": false,
  "save-npm": false,
  "save-composer": false,
  "get-tokens": false,
  headers: "",
  "headers-ignore": [],
  "remove-headers": false,
  "dry-run": false,
  ...over,
});

const MIT: LicenseDetail = {
  licenseId: "MIT",
  name: "MIT License",
  licenseText: "x",
  standardLicenseTemplate: "",
};

const SAVE_TARGET_BY_FLAG = {
  "save-rc": "rc",
  "save-npm": "package.json",
  "save-composer": "composer.json",
};

type Deps = {
  licenses: LicenseRepository;
  config: Config;
  manifests: ProjectManifestRepository;
  installer: { install: ReturnType<typeof vi.fn> };
  generator: LicenseGenerator;
  headers: {
    apply: ReturnType<typeof vi.fn>;
    preview: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    previewRemoval: ReturnType<typeof vi.fn>;
  };
  config_: {
    read: ReturnType<typeof vi.fn>;
    targets: ReturnType<typeof vi.fn>;
    clearHeaders: ReturnType<typeof vi.fn>;
  };
};

function makeDeps(over: { savedConfig?: unknown } = {}): Deps {
  const installer = { install: vi.fn(async () => {}) };
  const config_ = {
    read: vi.fn(async () => over.savedConfig ?? null),
    targets: vi.fn(async () => [{ id: "rc", label: "rc" }]),
    clearHeaders: vi.fn(async () => {}),
  };
  const headers = {
    apply: vi.fn(async () => ({
      licenseId: "MIT",
      style: "short",
      total: 1,
      written: 1,
      unchanged: 0,
    })),
    preview: vi.fn(async () => ({ files: ["a.ts"], sample: "SAMPLE" })),
    remove: vi.fn(async () => ({ removed: ["a.ts"], total: 1 })),
    previewRemoval: vi.fn(async () => ({ removed: ["a.ts"], total: 1 })),
  };
  return {
    licenses: {
      getLicense: async () => MIT,
      suggest: async () => [],
    } as unknown as LicenseRepository,
    config: config_ as unknown as Config,
    manifests: {
      declaredLicenses: async () => [],
    } as unknown as ProjectManifestRepository,
    installer,
    generator: {
      render: async () => "RENDERED",
    } as unknown as LicenseGenerator,
    headers,
    config_,
  };
}

const build = (d: Deps, f: WizardFlags): NonInteractiveMode =>
  new NonInteractiveMode(
    d.licenses,
    d.config,
    d.manifests,
    d.installer as unknown as LicenseInstaller,
    d.generator,
    d.headers as unknown as HeaderApplier,
    makeReporterFor(d),
    f,
    SAVE_TARGET_BY_FLAG,
  );

// Each Deps carries its own reporter so the routing assertions can read it back.
const reporters = new WeakMap<Deps, ReturnType<typeof makeReporter>>();
function makeReporterFor(d: Deps): IReporter {
  const r = makeReporter();
  reporters.set(d, r);
  return r.reporter;
}
const callsOf = (d: Deps): string[] =>
  (reporters.get(d)?.calls ?? []).map((c) => c.method);

describe("NonInteractiveMode routing", () => {
  const originalExitCode = process.exitCode;

  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it("routes to header removal first when --remove-headers is set", async () => {
    const d = makeDeps();
    await build(d, flags({ "remove-headers": true })).run();

    expect(d.headers.remove).toHaveBeenCalledOnce();
    expect(d.config_.clearHeaders).toHaveBeenCalledOnce();
    expect(d.installer.install).not.toHaveBeenCalled();
    expect(callsOf(d)).toContain("headersRemoved");
  });

  it("previews removal without clearing config under --dry-run", async () => {
    const d = makeDeps();
    await build(d, flags({ "remove-headers": true, "dry-run": true })).run();

    expect(d.headers.previewRemoval).toHaveBeenCalledOnce();
    expect(d.headers.remove).not.toHaveBeenCalled();
    expect(d.config_.clearHeaders).not.toHaveBeenCalled();
    expect(callsOf(d)).toContain("headersRemoveDryRun");
  });

  it("routes to apply-config, installing from the saved config", async () => {
    const d = makeDeps({ savedConfig: { licenseId: "MIT" } });
    await build(d, flags({ "apply-config": true })).run();

    expect(d.installer.install).toHaveBeenCalledOnce();
    expect(d.installer.install.mock.calls[0][0]).toMatchObject({
      licenseId: "MIT",
      save: { action: "none" },
    });
    expect(callsOf(d)).toContain("generated");
  });

  it("fails apply-config when no saved config exists", async () => {
    const d = makeDeps({ savedConfig: null });
    await build(d, flags({ "apply-config": true })).run();

    expect(d.installer.install).not.toHaveBeenCalled();
    expect(callsOf(d)).toContain("error");
    expect(process.exitCode).toBe(1);
  });

  it("routes to flag-driven generation for --license", async () => {
    const d = makeDeps();
    await build(d, flags({ license: "MIT" })).run();

    expect(d.installer.install).toHaveBeenCalledOnce();
    expect(d.installer.install.mock.calls[0][0]).toMatchObject({
      licenseId: "MIT",
    });
    expect(callsOf(d)).toContain("generated");
  });

  it("requires --license when only a save flag is given", async () => {
    const d = makeDeps();
    await build(d, flags({ "save-rc": true })).run();

    expect(d.installer.install).not.toHaveBeenCalled();
    expect(callsOf(d)).toContain("error");
    expect(process.exitCode).toBe(1);
  });

  it("lists tokens and skips generation for --get-tokens", async () => {
    const d = makeDeps();
    await build(d, flags({ license: "MIT", "get-tokens": true })).run();

    expect(d.installer.install).not.toHaveBeenCalled();
    expect(callsOf(d)).toContain("tokens");
  });

  it("records the canonical SPDX id even when the flag casing differs", async () => {
    const d = makeDeps();
    // The flag is lowercase, but the source resolves canonical MIT; the canonical
    // id is what gets installed and persisted, not the typed casing.
    await build(d, flags({ license: "mit" })).run();

    expect(d.installer.install.mock.calls[0][0]).toMatchObject({
      licenseId: "MIT",
    });
  });

  it("refuses --headers full when the notice has placeholders no field can fill", async () => {
    const d = makeDeps();
    const gpl: LicenseDetail = {
      licenseId: "GPL-3.0-only",
      name: "GNU GPL v3.0 only",
      licenseText: "GPL text",
      standardLicenseTemplate: "",
      standardLicenseHeader: "Copyright (C) <year> <name of author>\nThis...",
      standardLicenseHeaderTemplate:
        '<<var;name="copyright";original="Copyright (C) <year> <name of author>";match=".+">>\nThis...',
    };
    d.licenses = {
      getLicense: async () => gpl,
      suggest: async () => [],
    } as unknown as LicenseRepository;

    await build(d, flags({ license: "GPL-3.0-only", headers: "full" })).run();

    expect(d.installer.install).not.toHaveBeenCalled();
    expect(callsOf(d)).toContain("error");
    expect(process.exitCode).toBe(1);
  });
});
