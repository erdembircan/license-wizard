import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Answer } from "@cli/Answer.js";
import type {
  CompletionSummary,
  IRenderer,
} from "@cli/interfaces/IRenderer.js";
import type { IReporter } from "@cli/interfaces/IReporter.js";
import type { Question } from "@cli/Question.js";
import type { Config } from "@configuration/Config.js";
import type { WizardConfig } from "@configuration/WizardConfig.js";
import type { LicenseDetail } from "@licensing/LicenseDetail.js";
import type { LicenseGenerator } from "@licensing/LicenseGenerator.js";
import type { LicenseRepository } from "@licensing/LicenseRepository.js";
import type { ProjectManifestRepository } from "@configuration/ProjectManifestRepository.js";
import type { HeaderApplier } from "../HeaderApplier.js";
import type { LicenseInstaller } from "../LicenseInstaller.js";
import type { WizardFlags } from "./WizardFlags.js";
import { InteractiveMode } from "./InteractiveMode.js";

const MIT: LicenseDetail = {
  licenseId: "MIT",
  name: "MIT License",
  licenseText: "x",
  standardLicenseTemplate: "",
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
});
