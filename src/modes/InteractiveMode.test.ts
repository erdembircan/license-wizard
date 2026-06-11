/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Answer } from "@cli/Answer.js";
import type {
  CompletionSummary,
  IRenderer,
} from "@cli/interfaces/IRenderer.js";
import type { IReporter } from "@cli/interfaces/IReporter.js";
import type {
  AutocompleteQuestion,
  Question,
  TextQuestion,
} from "@cli/Question.js";
import type { Config } from "@configuration/Config.js";
import type { WizardConfig } from "@configuration/WizardConfig.js";
import type { LicenseDetail } from "@licensing/LicenseDetail.js";
import type { LicenseGenerator } from "@licensing/LicenseGenerator.js";
import type { LicenseRepository } from "@licensing/LicenseRepository.js";
import type { ProjectManifestRepository } from "@configuration/ProjectManifestRepository.js";
import type { HeaderApplier } from "@application/HeaderApplier.js";
import type { LicenseInstaller } from "@application/LicenseInstaller.js";
import type { WizardFlags } from "./WizardFlags.js";
import { InteractiveMode } from "./InteractiveMode.js";

const MIT: LicenseDetail = {
  licenseId: "MIT",
  name: "MIT License",
  licenseText: "x",
  standardLicenseTemplate: "",
};

// A license exposing customizable copyright slots in its body template.
const MIT_CUSTOM: LicenseDetail = {
  licenseId: "MIT",
  name: "MIT License",
  licenseText: "x",
  standardLicenseTemplate:
    '<<var;name="copyright";original="Copyright (c) <year> <holders>";match=".*">>',
};

// GPL-style: publishes a full notice with its own copyright placeholders, but
// exposes no body copyright slots, so the user is never asked for values — the
// `full` header could never be filled.
const GPL: LicenseDetail = {
  licenseId: "GPL-3.0-only",
  name: "GNU General Public License v3.0 only",
  licenseText: "x",
  standardLicenseTemplate: "",
  standardLicenseHeader: "Copyright (C) <year> <name of author>",
  standardLicenseHeaderTemplate:
    'Copyright (C) <<var;name="copyright";original="<year> <name of author>";match=".+">>',
};

// Apache-style: exposes body copyright slots and a full header template, so a
// customized selection can fill the `full` notice.
const APACHE: LicenseDetail = {
  licenseId: "Apache-2.0",
  name: "Apache License 2.0",
  licenseText: "x",
  standardLicenseTemplate:
    '<<var;name="copyright";original="[yyyy] [name of copyright owner]";match=".+">>',
  standardLicenseHeader: "Copyright [yyyy] [name of copyright owner]",
  standardLicenseHeaderTemplate:
    'Copyright <<var;name="copyright";original="[yyyy] [name of copyright owner]";match=".+">>',
};

const withLicense = (
  d: ReturnType<typeof makeDeps>,
  detail: LicenseDetail,
): void => {
  d.licenses = {
    search: async () => [],
    getLicense: async () => detail,
  } as unknown as LicenseRepository;
};

/**
 * Fake renderer driven by an answer function, recording the questions it was
 * shown and the closing completion summary — the interactive seam, supplied
 * directly without any module mocking.
 */
class FakeRenderer implements IRenderer {
  rendered: Question[] = [];
  completion: CompletionSummary | null = null;

  constructor(private answer: (q: Question) => string | boolean) {}

  async render(question: Question): Promise<Answer> {
    this.rendered.push(question);
    return { questionId: question.id, value: this.answer(question) };
  }

  onCancel(): string {
    return "";
  }

  complete(summary: CompletionSummary): void {
    this.completion = summary;
  }
}

const flags = (over: Partial<WizardFlags> = {}): WizardFlags => ({
  help: false,
  version: false,
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

function makeDeps(savedConfig: WizardConfig | null = null) {
  const installer: { install: ReturnType<typeof vi.fn> } = {
    install: vi.fn(async () => {}),
  };
  const config = {
    read: vi.fn(async () => savedConfig),
    targets: vi.fn(async () => [] as { id: string; label: string }[]),
    clearHeaders: vi.fn(async () => {}),
  };
  const headers = {
    apply: vi.fn(async () => ({
      licenseId: "MIT",
      style: "short" as const,
      total: 1,
      written: 1,
      unchanged: 0,
    })),
    preview: vi.fn(async () => ({ files: ["a.ts"], sample: "SAMPLE" })),
    remove: vi.fn(async () => ({ removed: ["a.ts"], total: 1 })),
    previewRemoval: vi.fn(async () => ({ removed: [], total: 0 })),
  };
  const calls: string[] = [];
  const reporter = new Proxy(
    {},
    {
      get: (_t, prop: string) => (): void => {
        calls.push(prop);
      },
    },
  ) as unknown as IReporter;
  return {
    installer,
    config,
    headers,
    reporter,
    reporterCalls: calls,
    licenses: {
      search: async () => [],
      getLicense: async () => MIT,
    } as unknown as LicenseRepository,
    manifests: {
      readLicense: async () => null,
      declaredLicenses: async () => [],
    } as unknown as ProjectManifestRepository,
    generator: {
      render: async () => "RENDERED",
    } as unknown as LicenseGenerator,
  };
}

const build = (
  d: ReturnType<typeof makeDeps>,
  renderer: IRenderer,
  f: WizardFlags,
): InteractiveMode =>
  new InteractiveMode(
    d.licenses,
    d.config as unknown as Config,
    d.manifests,
    d.installer as unknown as LicenseInstaller,
    d.generator,
    d.headers as unknown as HeaderApplier,
    renderer,
    d.reporter,
    f,
  );

describe("InteractiveMode", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("installs the chosen license and shows the completion summary", async () => {
    const d = makeDeps();
    const renderer = new FakeRenderer((q) =>
      q.id === "saveConfig" ? "skip" : q.type === "confirm" ? false : "MIT",
    );

    await build(d, renderer, flags()).run();

    expect(d.installer.install).toHaveBeenCalledOnce();
    expect(d.installer.install.mock.calls[0][0]).toMatchObject({
      licenseId: "MIT",
      save: { action: "clear" },
    });
    expect(renderer.completion).toMatchObject({
      licenseId: "MIT",
      customized: false,
      savedTo: "",
    });
  });

  it("previews under --dry-run without installing", async () => {
    const d = makeDeps();
    const renderer = new FakeRenderer((q) =>
      q.id === "saveConfig" ? "skip" : q.type === "confirm" ? false : "MIT",
    );

    await build(d, renderer, flags({ "dry-run": true })).run();

    expect(d.installer.install).not.toHaveBeenCalled();
    expect(d.reporterCalls).toContain("dryRun");
    expect(renderer.completion).toBeNull();
  });

  it("opens with the setup/remove choice and strips headers when remove is chosen", async () => {
    const d = makeDeps({ licenseId: "MIT", headers: { style: "short" } });
    const renderer = new FakeRenderer((q) => {
      if (q.id === "mode") return "remove";
      if (q.id === "removeHeaders") return true;
      return q.type === "confirm" ? false : "MIT";
    });

    const answers = await build(d, renderer, flags()).run();

    expect(renderer.rendered.some((q) => q.id === "mode")).toBe(true);
    expect(d.headers.remove).toHaveBeenCalledOnce();
    expect(d.config.clearHeaders).toHaveBeenCalledOnce();
    expect(d.installer.install).not.toHaveBeenCalled();
    expect(answers.map((a) => a.questionId)).toEqual(["mode", "removeHeaders"]);
  });

  it("does not show the mode prompt when the saved config has no headers", async () => {
    const d = makeDeps({ licenseId: "MIT" });
    const renderer = new FakeRenderer((q) =>
      q.id === "saveConfig" ? "skip" : q.type === "confirm" ? false : "MIT",
    );

    await build(d, renderer, flags()).run();

    expect(renderer.rendered.some((q) => q.id === "mode")).toBe(false);
    expect(renderer.rendered.some((q) => q.id === "license")).toBe(true);
  });

  it("marks the license prompt required so an empty answer can't slip through", async () => {
    const d = makeDeps();
    const renderer = new FakeRenderer((q) =>
      q.id === "saveConfig" ? "skip" : q.type === "confirm" ? false : "MIT",
    );

    await build(d, renderer, flags()).run();

    const license = renderer.rendered.find((q) => q.id === "license");
    expect((license as AutocompleteQuestion).required).toBe(true);
  });

  it("marks copyright slot prompts required so a blank value is re-asked", async () => {
    const d = makeDeps();
    withLicense(d, MIT_CUSTOM);
    const renderer = new FakeRenderer((q) => {
      if (q.id === "license") return "MIT";
      if (q.id === "generationMode") return "customize";
      if (q.id === "saveConfig") return "skip";
      if (q.type === "text") return "2026";
      return q.type === "confirm" ? false : "MIT";
    });

    await build(d, renderer, flags()).run();

    const slots = renderer.rendered.filter(
      (q): q is TextQuestion => q.type === "text",
    );
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.every((q) => q.required === true)).toBe(true);
  });

  it("offers customization for a license whose copyright lives only in its header", async () => {
    const d = makeDeps();
    withLicense(d, GPL);
    const renderer = new FakeRenderer((q) => {
      if (q.id === "license") return "GPL-3.0-only";
      if (q.id === "generationMode") return "standard";
      if (q.id === "addHeaders") return false;
      if (q.id === "saveConfig") return "skip";
      return q.type === "confirm" ? false : "GPL-3.0-only";
    });

    await build(d, renderer, flags()).run();

    // GPL has no body copyright, but its header does — so the Customize choice
    // must still be offered (it was not, before tokens were unioned).
    expect(renderer.rendered.some((q) => q.id === "generationMode")).toBe(true);
  });

  it("does not offer the Full header style when copyright was left standard", async () => {
    const d = makeDeps();
    withLicense(d, GPL);
    const renderer = new FakeRenderer((q) => {
      if (q.id === "license") return "GPL-3.0-only";
      if (q.id === "generationMode") return "standard";
      if (q.id === "addHeaders") return true;
      if (q.id === "saveConfig") return "skip";
      return q.type === "confirm" ? false : "GPL-3.0-only";
    });

    await build(d, renderer, flags()).run();

    // Standard (no copyright supplied) → the header can't be filled → no Full.
    expect(renderer.rendered.some((q) => q.id === "headerStyle")).toBe(false);
  });

  it("fills the Full header from header-only copyright once customized (GPL)", async () => {
    const d = makeDeps();
    withLicense(d, GPL);
    const renderer = new FakeRenderer((q) => {
      if (q.id === "license") return "GPL-3.0-only";
      if (q.id === "generationMode") return "customize";
      if (q.id === "addHeaders") return true;
      if (q.id === "headerStyle") return "full";
      if (q.id === "saveConfig") return "skip";
      if (q.type === "text") return "2026";
      return q.type === "confirm" ? false : "GPL-3.0-only";
    });

    await build(d, renderer, flags()).run();

    // The Full option is now offered (the header can be filled)...
    expect(renderer.rendered.some((q) => q.id === "headerStyle")).toBe(true);
    // ...and the header is applied as `full` with the supplied copyright tokens.
    expect(d.headers.apply).toHaveBeenCalledOnce();
    const call = d.headers.apply.mock.calls[0] as unknown as [
      string,
      string,
      Record<string, string>,
      string[],
    ];
    expect(call[1]).toBe("full");
    expect(Object.values(call[2])).toContain("2026");
  });

  it("offers the Full header style once the copyright is customized (Apache)", async () => {
    const d = makeDeps();
    withLicense(d, APACHE);
    const renderer = new FakeRenderer((q) => {
      if (q.id === "license") return "Apache-2.0";
      if (q.id === "generationMode") return "customize";
      if (q.id === "addHeaders") return true;
      if (q.id === "headerStyle") return "full";
      if (q.id === "saveConfig") return "skip";
      if (q.type === "text") return "2026";
      return q.type === "confirm" ? false : "Apache-2.0";
    });

    await build(d, renderer, flags()).run();

    expect(renderer.rendered.some((q) => q.id === "headerStyle")).toBe(true);
  });
});
