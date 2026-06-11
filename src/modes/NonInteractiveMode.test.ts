/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { IReporter } from "@cli/interfaces/IReporter.js";
import type { Config } from "@configuration/Config.js";
import type { ProjectManifestRepository } from "@configuration/ProjectManifestRepository.js";
import type { LicenseDetail } from "@licensing/LicenseDetail.js";
import type { LicenseGenerator } from "@licensing/LicenseGenerator.js";
import type { LicenseRepository } from "@licensing/LicenseRepository.js";
import type { HeaderApplier } from "@application/HeaderApplier.js";
import type { LicenseInstaller } from "@application/LicenseInstaller.js";
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
  "force-header": "",
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
    forceApply: ReturnType<typeof vi.fn>;
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
      skipped: [],
    })),
    preview: vi.fn(async () => ({
      files: ["a.ts"],
      skipped: [],
      sample: "SAMPLE",
    })),
    forceApply: vi.fn(async () => ({
      licenseId: "MIT",
      style: "short",
      file: "page.php",
      outcome: "written",
    })),
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

  it("forces a header into the named file when --force-header is set and headers are enabled", async () => {
    const d = makeDeps({
      savedConfig: { licenseId: "MIT", headers: { style: "short" } },
    });
    await build(d, flags({ "force-header": "src/skipped.ts" })).run();

    expect(d.headers.forceApply).toHaveBeenCalledOnce();
    expect(d.headers.forceApply.mock.calls[0]).toEqual([
      "MIT",
      "short",
      {},
      "src/skipped.ts",
      { dryRun: false },
    ]);
    expect(callsOf(d)).toContain("headersForceApplied");
    expect(d.installer.install).not.toHaveBeenCalled();
  });

  it("silently disregards --force-header when the config has no headers enabled", async () => {
    const d = makeDeps({ savedConfig: { licenseId: "MIT" } });
    await build(d, flags({ "force-header": "src/skipped.ts" })).run();

    expect(d.headers.forceApply).not.toHaveBeenCalled();
    expect(callsOf(d)).toEqual([]);
    expect(process.exitCode).not.toBe(1);
  });

  it("silently disregards --force-header when no config is saved", async () => {
    const d = makeDeps({ savedConfig: null });
    await build(d, flags({ "force-header": "src/skipped.ts" })).run();

    expect(d.headers.forceApply).not.toHaveBeenCalled();
    expect(callsOf(d)).toEqual([]);
  });

  it("rejects an absolute --force-header path as outside the project", async () => {
    const d = makeDeps({
      savedConfig: { licenseId: "MIT", headers: { style: "short" } },
    });
    await build(d, flags({ "force-header": "/etc/passwd" })).run();

    expect(d.headers.forceApply).not.toHaveBeenCalled();
    expect(callsOf(d)).toContain("error");
    expect(process.exitCode).toBe(1);
  });

  it("rejects a --force-header path that climbs out of the project", async () => {
    const d = makeDeps({
      savedConfig: { licenseId: "MIT", headers: { style: "short" } },
    });
    await build(d, flags({ "force-header": "../outside.ts" })).run();

    expect(d.headers.forceApply).not.toHaveBeenCalled();
    expect(callsOf(d)).toContain("error");
    expect(process.exitCode).toBe(1);
  });

  it("fails when the --force-header target does not exist", async () => {
    const d = makeDeps({
      savedConfig: { licenseId: "MIT", headers: { style: "short" } },
    });
    d.headers.forceApply.mockResolvedValueOnce({
      licenseId: "MIT",
      style: "short",
      file: "src/gone.ts",
      outcome: "missing",
    });
    await build(d, flags({ "force-header": "src/gone.ts" })).run();

    expect(callsOf(d)).toContain("error");
    expect(callsOf(d)).not.toContain("headersForceApplied");
    expect(process.exitCode).toBe(1);
  });

  it("fails when --force-header targets an unsupported file type", async () => {
    const d = makeDeps({
      savedConfig: { licenseId: "MIT", headers: { style: "short" } },
    });
    d.headers.forceApply.mockResolvedValueOnce({
      licenseId: "MIT",
      style: "short",
      file: "package.json",
      outcome: "unsupported",
    });
    await build(d, flags({ "force-header": "package.json" })).run();

    expect(callsOf(d)).toContain("error");
    expect(callsOf(d)).not.toContain("headersForceApplied");
    expect(process.exitCode).toBe(1);
  });

  it("fails when --force-header resolves outside the project", async () => {
    const d = makeDeps({
      savedConfig: { licenseId: "MIT", headers: { style: "short" } },
    });
    d.headers.forceApply.mockResolvedValueOnce({
      licenseId: "MIT",
      style: "short",
      file: "link/b.ts",
      outcome: "outside",
    });
    await build(d, flags({ "force-header": "link/b.ts" })).run();

    expect(callsOf(d)).toContain("error");
    expect(callsOf(d)).not.toContain("headersForceApplied");
    expect(process.exitCode).toBe(1);
  });

  it("previews the forced write without writing under --dry-run", async () => {
    const d = makeDeps({
      savedConfig: { licenseId: "MIT", headers: { style: "short" } },
    });
    await build(
      d,
      flags({ "force-header": "src/skipped.ts", "dry-run": true }),
    ).run();

    expect(d.headers.forceApply.mock.calls[0][4]).toEqual({ dryRun: true });
    expect(callsOf(d)).toContain("headersForceApplied");
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

  it("fills a full header from header-only copyright supplied via --set", async () => {
    const d = makeDeps();
    const gpl: LicenseDetail = {
      licenseId: "GPL-3.0-only",
      name: "GNU GPL v3.0 only",
      licenseText: "GPL text",
      // No copyright in the body, but the header carries the placeholders.
      standardLicenseTemplate: "",
      standardLicenseHeader: "Copyright (C) <year> <name of author>",
      standardLicenseHeaderTemplate:
        '<<var;name="copyright";original="Copyright (C) <year> <name of author>";match=".+">>',
    };
    d.licenses = {
      getLicense: async () => gpl,
      suggest: async () => [],
    } as unknown as LicenseRepository;

    await build(
      d,
      flags({
        license: "GPL-3.0-only",
        headers: "full",
        set: ["year=2026", "name of author=Jane Doe"],
      }),
    ).run();

    // The header tokens resolve (not rejected as unknown), so the full header is
    // written with the supplied copyright rather than refused.
    expect(callsOf(d)).not.toContain("error");
    expect(d.installer.install).toHaveBeenCalledOnce();
    expect(d.headers.apply).toHaveBeenCalledOnce();
    const [, style, tokens] = d.headers.apply.mock.calls[0];
    expect(style).toBe("full");
    expect(tokens).toMatchObject({
      "<year>": "2026",
      "<name of author>": "Jane Doe",
    });
  });

  it("lists header-only copyright fields for --get-tokens", async () => {
    const d = makeDeps();
    const gpl: LicenseDetail = {
      licenseId: "GPL-3.0-only",
      name: "GNU GPL v3.0 only",
      licenseText: "GPL text",
      standardLicenseTemplate: "",
      standardLicenseHeaderTemplate:
        '<<var;name="copyright";original="Copyright (C) <year> <name of author>";match=".+">>',
    };
    d.licenses = {
      getLicense: async () => gpl,
      suggest: async () => [],
    } as unknown as LicenseRepository;

    await build(
      d,
      flags({ license: "GPL-3.0-only", "get-tokens": true }),
    ).run();

    expect(d.installer.install).not.toHaveBeenCalled();
    expect(callsOf(d)).toContain("tokens");
  });

  it("steers a header-only --set field to --headers full instead of calling it unknown", async () => {
    const d = makeDeps();
    const gpl: LicenseDetail = {
      licenseId: "GPL-3.0-only",
      name: "GNU GPL v3.0 only",
      licenseText: "GPL text",
      // No body copyright; `year` is a header-only field.
      standardLicenseTemplate: "",
      standardLicenseHeaderTemplate:
        '<<var;name="copyright";original="Copyright (C) <year> <name of author>";match=".+">>',
    };
    d.licenses = {
      getLicense: async () => gpl,
      suggest: async () => [],
    } as unknown as LicenseRepository;

    // `--set year` without `--headers full`: the field is real (header), so it
    // must not be reported as an unknown typo.
    await build(
      d,
      flags({ license: "GPL-3.0-only", set: ["year=2026"] }),
    ).run();

    expect(d.installer.install).not.toHaveBeenCalled();
    expect(callsOf(d)).toContain("error");
    expect(callsOf(d)).not.toContain("unknownFields");
    const message = reporters.get(d)?.calls.find((c) => c.method === "error")
      ?.arg as string;
    expect(message).toContain("--headers full");
    expect(process.exitCode).toBe(1);
  });
});
