import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Answer } from "@cli/Answer.js";
import type { CompletionSummary } from "@cli/interfaces/IRenderer.js";
import type { Question } from "@cli/Question.js";
import { RecordingSink } from "@cli/RecordingSink.js";
import type { LicenseDetail } from "@licensing/LicenseDetail.js";
import type { LicenseIndexEntry } from "@licensing/LicenseIndexEntry.js";
import { LicenseNotFoundError } from "@licensing/errors/LicenseNotFoundError.js";
import type { WizardConfig } from "@configuration/WizardConfig.js";
import { HeaderComposer } from "@headers/HeaderComposer.js";

type GenerateCall = { licenseId: string; slotValues: Record<string, string> };

const COPYRIGHT_TEMPLATE =
  '<<var;name="copyright";original="Copyright (c) <year> <copyright holders>";match=".{0,5000}">>';

// Shared capture/control state, hoisted so the vi.mock factories can close over it.
const state = vi.hoisted(() => {
  const defaultDetail = (): LicenseDetail => ({
    licenseId: "MIT",
    name: "MIT License",
    licenseText: "PLAIN LICENSE TEXT",
    standardLicenseTemplate: "",
  });

  const defaultAnswer = (q: Question): string | boolean =>
    q.type === "confirm" ? false : q.type === "select" ? "standard" : "MIT";

  const self = {
    rendered: [] as Question[],
    config: null as WizardConfig | null,
    configTargets: [] as { id: string; label: string }[],
    writtenConfig: null as WizardConfig | null,
    saveTarget: null as string | null,
    configCleared: false,
    projectLicense: null as string | null,
    writtenProjectLicense: null as string | null,
    detail: defaultDetail(),
    // When set, the stub source rejects fetchLicense with a not-found error for
    // this id, standing in for an unrecognized SPDX identifier.
    notFoundLicenseId: null as string | null,
    suggestions: [] as LicenseIndexEntry[],
    generateCalls: [] as GenerateCall[],
    // The content the stub generator's `render` returns, used by verify to
    // stand in for the freshly re-rendered license.
    renderedContent: "RENDERED LICENSE",
    // The on-disk LICENSE the stub reader serves, or null when absent.
    licenseFile: null as string | null,
    // The declared license of each present manifest, used by verify.
    declaredLicenses: [] as { name: string; licenseId: string | null }[],
    // Targeted manifest writes captured during a verify fix.
    manifestWrites: [] as { name: string; licenseId: string }[],
    // The source files the stubbed tree walker discovers, and their contents as
    // served by the stub reader; writes are captured into `headerWrites`.
    sourceFiles: {} as Record<string, string>,
    headerWrites: [] as { path: string; content: string }[],
    // Maps a question to the answer the stub renderer returns.
    answer: defaultAnswer,
    // The summary passed to the renderer's closing `complete()` confirmation, or
    // null when it was never shown (non-interactive paths, dry runs, cancels).
    completion: null as CompletionSummary | null,
    reset() {
      self.rendered = [];
      self.config = null;
      self.configTargets = [];
      self.writtenConfig = null;
      self.saveTarget = null;
      self.configCleared = false;
      self.projectLicense = null;
      self.writtenProjectLicense = null;
      self.detail = defaultDetail();
      self.notFoundLicenseId = null;
      self.suggestions = [];
      self.generateCalls = [];
      self.renderedContent = "RENDERED LICENSE";
      self.licenseFile = null;
      self.declaredLicenses = [];
      self.manifestWrites = [];
      self.sourceFiles = {};
      self.headerWrites = [];
      self.answer = defaultAnswer;
      self.completion = null;
    },
  };

  return self;
});

// Stub the renderer: record every question and return the state-driven answer.
vi.mock("@cli/ClackRenderer.js", () => ({
  ClackRenderer: vi.fn(function (this: {
    render: (q: Question) => Promise<Answer>;
    onCancel: () => string;
    complete: (summary: CompletionSummary) => void;
  }) {
    this.render = async (question: Question): Promise<Answer> => {
      state.rendered.push(question);
      return { questionId: question.id, value: state.answer(question) };
    };
    this.onCancel = () => "";
    this.complete = (summary: CompletionSummary) => {
      state.completion = summary;
    };
  }),
}));

// Stub config reads/targets so each test controls them; writes are captured.
vi.mock("@configuration/Config.js", () => ({
  Config: vi.fn(function (this: {
    read: () => Promise<WizardConfig | null>;
    source: () => Promise<string | null>;
    targets: () => Promise<{ id: string; label: string }[]>;
    write: (config: WizardConfig, targetId: string) => Promise<void>;
    clear: () => Promise<void>;
    clearHeaders: () => Promise<void>;
  }) {
    this.read = async () => state.config;
    this.source = async () => (state.config ? "rc" : null);
    this.targets = async () => state.configTargets;
    this.write = async (config, targetId) => {
      state.writtenConfig = config;
      state.saveTarget = targetId;
    };
    this.clear = async () => {
      state.configCleared = true;
    };
    // Mirrors the real Config.clearHeaders: rewrite in place without the headers
    // preference, keeping the license id and any tokens.
    this.clearHeaders = async () => {
      if (!state.config?.headers) {
        return;
      }
      const next: WizardConfig = { licenseId: state.config.licenseId };
      if (state.config.tokens) {
        next.tokens = state.config.tokens;
      }
      state.writtenConfig = next;
      state.saveTarget = "rc";
    };
  }),
}));

// Stub the project manifests: read returns the controlled value, write captures
// it, and verify reads the controlled declared licenses / captures targeted
// writes.
vi.mock("@configuration/ProjectManifestRepository.js", () => ({
  ProjectManifestRepository: vi.fn(function (this: {
    readLicense: () => Promise<string | null>;
    writeLicense: (licenseId: string) => Promise<void>;
    assertWritable: () => Promise<void>;
    declaredLicenses: () => Promise<
      { name: string; licenseId: string | null }[]
    >;
    writeLicenseTo: (name: string, licenseId: string) => Promise<void>;
  }) {
    this.readLicense = async () => state.projectLicense;
    this.writeLicense = async (licenseId: string) => {
      state.writtenProjectLicense = licenseId;
    };
    this.assertWritable = async () => {};
    this.declaredLicenses = async () => state.declaredLicenses;
    this.writeLicenseTo = async (name: string, licenseId: string) => {
      state.manifestWrites.push({ name, licenseId });
    };
  }),
}));

// Stub the SPDX source so the license `onAnswer` resolves a template without
// touching the network. When `notFoundLicenseId` matches the request, it
// rejects with a not-found error so the unknown-license path can be exercised.
vi.mock("@licensing/SpdxLicenseSource.js", () => ({
  SpdxLicenseSource: vi.fn(function (this: {
    search: () => Promise<[]>;
    suggest: () => Promise<LicenseIndexEntry[]>;
    fetchLicense: (licenseId: string) => Promise<LicenseDetail>;
  }) {
    this.search = async () => [];
    this.suggest = async () => state.suggestions;
    this.fetchLicense = async (licenseId: string) => {
      if (state.notFoundLicenseId === licenseId) {
        throw new LicenseNotFoundError(licenseId);
      }
      return state.detail;
    };
  }),
}));

// Stub license generation: capture the arguments instead of writing files, and
// serve the state-controlled rendered content for verify comparisons.
vi.mock("@licensing/LicenseGenerator.js", () => ({
  LicenseGenerator: vi.fn(function (this: {
    generate: (
      licenseId: string,
      slotValues?: Record<string, string>,
    ) => Promise<void>;
    render: (
      licenseId: string,
      slotValues?: Record<string, string>,
    ) => Promise<string>;
  }) {
    this.generate = async (licenseId, slotValues = {}) => {
      state.generateCalls.push({ licenseId, slotValues });
    };
    this.render = async () => state.renderedContent;
  }),
}));

// Stub the file-system reader so verify can control whether a LICENSE file
// exists and what it contains, without touching the real working directory.
vi.mock("@configuration/NodeFileSystemReader.js", () => ({
  NodeFileSystemReader: vi.fn(function (this: {
    exists: (path: string) => Promise<boolean>;
    read: (path: string) => Promise<string>;
    realPath: (path: string) => Promise<string>;
  }) {
    this.exists = async (path: string) =>
      path === "LICENSE"
        ? state.licenseFile !== null
        : path in state.sourceFiles;
    this.read = async (path: string) => {
      if (path === "LICENSE" && state.licenseFile !== null) {
        return state.licenseFile;
      }
      if (path in state.sourceFiles) {
        return state.sourceFiles[path];
      }
      throw new Error(`no such file: ${path}`);
    };
    // No symlinks in the controlled tree: every path resolves under one fixed
    // project root, so force-header's containment check passes for in-project
    // paths (absolute/`..` paths are rejected lexically before reaching here).
    this.realPath = async (p: string) =>
      p === "." ? "/project" : `/project/${p}`;
  }),
}));

// Stub the file-system writer so header writes are captured instead of touching
// the real working directory. (Config, manifests, and the generator are stubbed
// at a higher level, so only the header installer reaches this writer.)
vi.mock("@configuration/NodeFileSystemWriter.js", () => ({
  NodeFileSystemWriter: vi.fn(function (this: {
    write: (path: string, content: string) => Promise<void>;
    delete: (path: string) => Promise<void>;
  }) {
    this.write = async (path: string, content: string) => {
      state.headerWrites.push({ path, content });
    };
    this.delete = async () => {};
  }),
}));

// Stub the tree walker so the source-file scan returns a controlled list instead
// of walking the real working directory.
vi.mock("@headers/NodeFileTreeWalker.js", () => ({
  NodeFileTreeWalker: vi.fn(function (this: { walk: () => Promise<string[]> }) {
    this.walk = async () => Object.keys(state.sourceFiles);
  }),
}));

// Holds the per-test recording sink so the CliReporter stub below and the test
// body share one instance. Set fresh in `beforeEach`.
const recorder = vi.hoisted(() => ({ sink: null as RecordingSink | null }));

// The wizard builds its own terminal reporter (`CliReporter`); stand it in with
// the real `MessageReporter` wired to the recording sink, so tests assert
// against the view-model messages the reporter emits rather than parsing
// terminal prose. The production terminal wiring is covered by the CLI unit
// tests (`CliReporter.test.ts`, `StreamSink.test.ts`).
vi.mock("@cli/CliReporter.js", async () => {
  const { MessageReporter } = await vi.importActual<
    typeof import("@cli/MessageReporter.js")
  >("@cli/MessageReporter.js");
  return {
    CliReporter: class extends MessageReporter {
      constructor() {
        super(recorder.sink as RecordingSink);
      }
    },
  };
});

const { LicenseWizard } = await import("./LicenseWizard.js");

// Every test reads its emitted output through `sink`, the recording sink the
// stubbed CliReporter (see the mock above) writes into. A fresh sink per test
// keeps the captured messages isolated.
let sink: RecordingSink;

beforeEach(() => {
  sink = new RecordingSink();
  recorder.sink = sink;
});

const lw = (args: string[]): InstanceType<typeof LicenseWizard> =>
  new LicenseWizard(args);

/**
 * Runs the wizard with the given args and returns the defaultValue the renderer
 * received for the license question.
 */
async function licenseDefaultFor(args: string[]): Promise<string | undefined> {
  await lw(args).run();
  const licenseQuestion = state.rendered.find((q) => q.id === "license");
  return licenseQuestion?.defaultValue as string | undefined;
}

describe("LicenseWizard license default injection", () => {
  beforeEach(() => {
    state.reset();
  });

  it("uses the project manifest license over the saved config when no flag is given", async () => {
    state.projectLicense = "ISC";
    state.config = { licenseId: "Apache-2.0" };

    expect(await licenseDefaultFor([])).toBe("ISC");
  });

  it("falls back to the saved config value when no flag or manifest license exists", async () => {
    state.config = { licenseId: "Apache-2.0" };

    expect(await licenseDefaultFor([])).toBe("Apache-2.0");
  });

  it("leaves the default unset when no flag, manifest license, or config exists", async () => {
    expect(await licenseDefaultFor([])).toBeUndefined();
  });
});

describe("LicenseWizard customization flow", () => {
  beforeEach(() => {
    state.reset();
  });

  it("does not offer Standard/Customize when the license has no customizable slots", async () => {
    // Default detail has an empty template, so there are no slots.
    await lw([]).run();

    expect(state.rendered.some((q) => q.id === "generationMode")).toBe(false);
    expect(state.generateCalls).toEqual([{ licenseId: "MIT", slotValues: {} }]);
  });

  it("offers the choice but generates plain text when Standard is chosen", async () => {
    state.detail = {
      licenseId: "MIT",
      name: "MIT License",
      licenseText: "PLAIN LICENSE TEXT",
      standardLicenseTemplate: COPYRIGHT_TEMPLATE,
    };
    // The default answer for a select is "standard".

    await lw([]).run();

    expect(state.rendered.some((q) => q.id === "generationMode")).toBe(true);
    // No slot text questions are asked on the standard path.
    expect(state.rendered.some((q) => q.id === "<year>")).toBe(false);
    expect(state.generateCalls).toEqual([{ licenseId: "MIT", slotValues: {} }]);
  });

  it("asks one question per slot and passes the entered values when Customize is chosen", async () => {
    state.detail = {
      licenseId: "MIT",
      name: "MIT License",
      licenseText: "PLAIN LICENSE TEXT",
      standardLicenseTemplate: COPYRIGHT_TEMPLATE,
    };
    state.answer = (q: Question): string | boolean => {
      if (q.id === "generationMode") return "customize";
      if (q.id === "<year>") return "2026";
      if (q.id === "<copyright holders>") return "Erdem Bircan";
      if (q.type === "confirm") return false;
      return "MIT";
    };

    await lw([]).run();

    const slotQuestions = state.rendered.filter(
      (q) => q.id === "<year>" || q.id === "<copyright holders>",
    );
    expect(slotQuestions.map((q) => ({ id: q.id, text: q.text }))).toEqual([
      { id: "<year>", text: "year" },
      { id: "<copyright holders>", text: "copyright holders" },
    ]);
    expect(state.generateCalls).toEqual([
      {
        licenseId: "MIT",
        slotValues: {
          "<year>": "2026",
          "<copyright holders>": "Erdem Bircan",
        },
      },
    ]);
  });

  it("pre-fills slot questions with token values saved in the config", async () => {
    state.detail = {
      licenseId: "MIT",
      name: "MIT License",
      licenseText: "PLAIN LICENSE TEXT",
      standardLicenseTemplate: COPYRIGHT_TEMPLATE,
    };
    state.config = {
      licenseId: "MIT",
      tokens: {
        "<year>": "2024",
        "<copyright holders>": "Saved Holder",
      },
    };
    state.answer = (q: Question): string | boolean => {
      if (q.id === "generationMode") return "customize";
      if (q.type === "confirm") return false;
      return "MIT";
    };

    await lw([]).run();

    const slotQuestions = state.rendered.filter(
      (q) => q.id === "<year>" || q.id === "<copyright holders>",
    );
    expect(
      slotQuestions.map((q) => ({ id: q.id, defaultValue: q.defaultValue })),
    ).toEqual([
      { id: "<year>", defaultValue: "2024" },
      { id: "<copyright holders>", defaultValue: "Saved Holder" },
    ]);
  });
});

describe("LicenseWizard config write-back", () => {
  beforeEach(() => {
    state.reset();
  });

  it("persists the collected token values under `tokens` on the customize path", async () => {
    state.detail = {
      licenseId: "MIT",
      name: "MIT License",
      licenseText: "PLAIN LICENSE TEXT",
      standardLicenseTemplate: COPYRIGHT_TEMPLATE,
    };
    state.answer = (q: Question): string | boolean => {
      if (q.id === "generationMode") return "customize";
      if (q.id === "<year>") return "2026";
      if (q.id === "<copyright holders>") return "Erdem Bircan";
      if (q.id === "saveConfig") return ".licensewizardrc.json";
      if (q.type === "confirm") return false;
      return "MIT";
    };

    await lw([]).run();

    expect(state.writtenConfig).toEqual({
      licenseId: "MIT",
      tokens: {
        "<year>": "2026",
        "<copyright holders>": "Erdem Bircan",
      },
    });
  });

  it("omits `tokens` when the standard path collects no slot values", async () => {
    state.detail = {
      licenseId: "MIT",
      name: "MIT License",
      licenseText: "PLAIN LICENSE TEXT",
      standardLicenseTemplate: COPYRIGHT_TEMPLATE,
    };
    state.answer = (q: Question): string | boolean => {
      if (q.id === "generationMode") return "standard";
      if (q.id === "saveConfig") return ".licensewizardrc.json";
      if (q.type === "confirm") return false;
      return "MIT";
    };

    await lw([]).run();

    expect(state.writtenConfig).toEqual({ licenseId: "MIT" });
  });

  it("clears the config without writing when the user skips saving", async () => {
    state.answer = (q: Question): string | boolean => {
      if (q.id === "saveConfig") return "skip";
      if (q.type === "confirm") return false;
      return "MIT";
    };

    await lw([]).run();

    expect(state.writtenConfig).toBeNull();
    expect(state.configCleared).toBe(true);
  });
});

describe("LicenseWizard project manifest license write-back", () => {
  beforeEach(() => {
    state.reset();
  });

  it("records the selected license in the project manifests at the end of the run", async () => {
    await lw([]).run();

    expect(state.writtenProjectLicense).toBe("MIT");
  });

  it("shows the closing completion summary after an interactive install", async () => {
    state.declaredLicenses = [{ name: "package.json", licenseId: "MIT" }];
    state.answer = (q: Question): string | boolean => {
      if (q.id === "saveConfig") return "skip";
      if (q.type === "select") return "standard";
      return "MIT";
    };

    await lw([]).run();

    expect(state.completion).toEqual({
      licenseId: "MIT",
      customized: false,
      savedTo: "",
      manifests: ["package.json"],
    });
  });
});

describe("LicenseWizard config save", () => {
  beforeEach(() => {
    state.reset();
  });

  it("offers every available config target plus a skip option", async () => {
    state.configTargets = [
      { id: ".licensewizardrc.json", label: ".licensewizardrc.json" },
      { id: "package.json", label: "package.json" },
    ];

    await lw([]).run();

    const saveQuestion = state.rendered.find((q) => q.id === "saveConfig");
    expect(saveQuestion?.type).toBe("select");
    expect(
      saveQuestion?.type === "select"
        ? saveQuestion.options.map((o) => o.value)
        : [],
    ).toEqual([".licensewizardrc.json", "package.json", "skip"]);
  });

  it("writes the config to the chosen target", async () => {
    state.configTargets = [{ id: "package.json", label: "package.json" }];
    state.answer = (q: Question): string | boolean => {
      if (q.id === "saveConfig") return "package.json";
      if (q.type === "select") return "standard";
      return "MIT";
    };

    await lw([]).run();

    expect(state.saveTarget).toBe("package.json");
    expect(state.writtenConfig).toEqual({ licenseId: "MIT" });
  });

  it("saves nowhere but clears every location when skip is chosen", async () => {
    state.configTargets = [{ id: "package.json", label: "package.json" }];
    state.answer = (q: Question): string | boolean => {
      if (q.id === "saveConfig") return "skip";
      if (q.type === "select") return "standard";
      return "MIT";
    };

    await lw([]).run();

    expect(state.saveTarget).toBeNull();
    expect(state.writtenConfig).toBeNull();
    expect(state.configCleared).toBe(true);
  });
});

describe("LicenseWizard interactive header flow", () => {
  const APACHE = {
    licenseId: "Apache-2.0",
    name: "Apache License 2.0",
    licenseText: "PLAIN LICENSE TEXT",
    standardLicenseTemplate: "",
    standardLicenseHeader:
      'Copyright [yyyy] [name of copyright owner]\n\nLicensed under the Apache License, Version 2.0 (the "License").\n\n',
  };

  beforeEach(() => {
    state.reset();
  });

  it("asks whether to add headers and, when declined, writes none", async () => {
    state.sourceFiles = { "src/a.ts": "export const x = 1;\n" };
    state.answer = (q: Question) => {
      if (q.id === "saveConfig") return "skip";
      if (q.type === "confirm") return false; // decline addHeaders
      return "MIT";
    };

    await lw([]).run();

    expect(state.rendered.some((q) => q.id === "addHeaders")).toBe(true);
    expect(state.rendered.some((q) => q.id === "headerStyle")).toBe(false);
    expect(state.headerWrites).toEqual([]);
    expect(state.completion?.headers).toBeUndefined();
  });

  it("writes the short header without asking a style for a license with no standard header", async () => {
    state.sourceFiles = { "src/a.ts": "export const x = 1;\n" };
    state.answer = (q: Question) => {
      if (q.id === "addHeaders") return true;
      if (q.id === "saveConfig") return "skip";
      if (q.type === "confirm") return false;
      return "MIT";
    };

    await lw([]).run();

    // MIT publishes no standard header, so the short/full choice is skipped.
    expect(state.rendered.some((q) => q.id === "headerStyle")).toBe(false);
    expect(state.headerWrites).toHaveLength(1);
    expect(state.headerWrites[0].path).toBe("src/a.ts");
    expect(state.headerWrites[0].content).toContain(
      "SPDX-License-Identifier: MIT",
    );
    expect(state.headerWrites[0].content).toContain("license-wizard");
    expect(state.completion?.headers).toEqual({
      style: "short",
      written: 1,
      total: 1,
      skipped: [],
    });
  });

  it("offers the style choice and writes the full notice for a license that has one", async () => {
    state.detail = APACHE;
    state.sourceFiles = { "src/a.ts": "export const x = 1;\n" };
    state.answer = (q: Question) => {
      if (q.id === "addHeaders") return true;
      if (q.id === "headerStyle") return "full";
      if (q.id === "saveConfig") return "skip";
      if (q.type === "confirm") return false;
      return "Apache-2.0";
    };

    await lw([]).run();

    expect(state.rendered.some((q) => q.id === "headerStyle")).toBe(true);
    expect(state.headerWrites).toHaveLength(1);
    expect(state.headerWrites[0].content).toContain(
      "Licensed under the Apache License",
    );
    expect(state.completion?.headers?.style).toBe("full");
  });
});

describe("LicenseWizard non-interactive mode", () => {
  const TEMPLATE_DETAIL: LicenseDetail = {
    licenseId: "MIT",
    name: "MIT License",
    licenseText: "PLAIN LICENSE TEXT",
    standardLicenseTemplate: COPYRIGHT_TEMPLATE,
  };

  const originalExitCode = process.exitCode;

  beforeEach(() => {
    state.reset();
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it("generates the standard license without rendering any prompt for --license", async () => {
    await lw(["--license", "MIT"]).run();

    expect(state.rendered).toEqual([]);
    expect(state.generateCalls).toEqual([{ licenseId: "MIT", slotValues: {} }]);
    expect(state.writtenProjectLicense).toBe("MIT");
    expect(sink.messages).toContainEqual(
      expect.objectContaining({ kind: "generated", licenseId: "MIT" }),
    );
  });

  it("uses the flag's license directly, ignoring manifest and saved config", async () => {
    state.projectLicense = "ISC";
    state.config = { licenseId: "Apache-2.0" };

    await lw(["--license", "MIT"]).run();

    expect(state.generateCalls).toEqual([{ licenseId: "MIT", slotValues: {} }]);
  });

  it("generates standard text when the license has fields but no --set is given", async () => {
    state.detail = TEMPLATE_DETAIL;

    await lw(["--license", "MIT"]).run();

    expect(state.rendered).toEqual([]);
    expect(state.generateCalls).toEqual([{ licenseId: "MIT", slotValues: {} }]);
  });

  it("generates a customized license when every field is supplied via --set", async () => {
    state.detail = TEMPLATE_DETAIL;

    await lw([
      "--license",
      "MIT",
      "--set",
      "year=2026",
      "--set",
      "copyright holders=Erdem Bircan",
    ]).run();

    expect(state.generateCalls).toEqual([
      {
        licenseId: "MIT",
        slotValues: {
          "<year>": "2026",
          "<copyright holders>": "Erdem Bircan",
        },
      },
    ]);
    expect(state.writtenProjectLicense).toBe("MIT");
  });

  it("matches supplied fields case-insensitively and by bracket token", async () => {
    state.detail = TEMPLATE_DETAIL;

    await lw([
      "--license",
      "MIT",
      "--set",
      "YEAR=2026",
      "--set",
      "<copyright holders>=Erdem Bircan",
    ]).run();

    expect(state.generateCalls).toEqual([
      {
        licenseId: "MIT",
        slotValues: {
          "<year>": "2026",
          "<copyright holders>": "Erdem Bircan",
        },
      },
    ]);
  });

  it("preserves '=' characters in a field value", async () => {
    state.detail = TEMPLATE_DETAIL;

    await lw([
      "--license",
      "MIT",
      "--set",
      "year=2026",
      "--set",
      "copyright holders=a=b",
    ]).run();

    expect(state.generateCalls[0]?.slotValues["<copyright holders>"]).toBe(
      "a=b",
    );
  });

  it("lists the required fields and does not generate when --set is incomplete", async () => {
    state.detail = TEMPLATE_DETAIL;

    await lw(["--license", "MIT", "--set", "year=2026"]).run();

    expect(state.generateCalls).toEqual([]);
    expect(state.writtenProjectLicense).toBeNull();
    expect(sink.messages).toContainEqual(
      expect.objectContaining({
        kind: "missingFields",
        licenseId: "MIT",
        missing: [expect.objectContaining({ label: "copyright holders" })],
      }),
    );
    expect(process.exitCode).toBe(1);
  });

  it("reports unknown fields and does not generate", async () => {
    state.detail = TEMPLATE_DETAIL;

    await lw(["--license", "MIT", "--set", "author=x"]).run();

    expect(state.generateCalls).toEqual([]);
    expect(sink.messages).toContainEqual(
      expect.objectContaining({
        kind: "unknownFields",
        licenseId: "MIT",
        unknown: ["author"],
      }),
    );
    expect(process.exitCode).toBe(1);
  });

  it("rejects a malformed --set value lacking '='", async () => {
    state.detail = TEMPLATE_DETAIL;

    await lw(["--license", "MIT", "--set", "year"]).run();

    expect(state.generateCalls).toEqual([]);
    expect(sink.messages).toContainEqual(
      expect.objectContaining({
        kind: "error",
        message: expect.stringContaining("Invalid --set"),
      }),
    );
    expect(process.exitCode).toBe(1);
  });

  it("--get-tokens lists the fields and does not generate", async () => {
    state.detail = TEMPLATE_DETAIL;

    await lw(["--license", "MIT", "--get-tokens"]).run();

    expect(state.generateCalls).toEqual([]);
    expect(sink.messages).toContainEqual(
      expect.objectContaining({
        kind: "tokens",
        licenseId: "MIT",
        slots: expect.arrayContaining([
          expect.objectContaining({ label: "year" }),
          expect.objectContaining({ label: "copyright holders" }),
        ]),
      }),
    );
  });

  it("--get-tokens reports no fields for a license without customizable copyright", async () => {
    await lw(["--license", "MIT", "--get-tokens"]).run();

    expect(state.generateCalls).toEqual([]);
    expect(sink.messages).toContainEqual(
      expect.objectContaining({ kind: "tokens", licenseId: "MIT", slots: [] }),
    );
  });

  it("errors when --set is given without --license", async () => {
    await lw(["--set", "year=2026"]).run();

    expect(state.generateCalls).toEqual([]);
    expect(sink.messages).toContainEqual(
      expect.objectContaining({
        kind: "error",
        message: expect.stringContaining("--license"),
      }),
    );
    expect(process.exitCode).toBe(1);
  });

  it("errors when --get-tokens is given without --license", async () => {
    await lw(["--get-tokens"]).run();

    expect(sink.messages).toContainEqual(
      expect.objectContaining({
        kind: "error",
        message: expect.stringContaining("--license"),
      }),
    );
    expect(process.exitCode).toBe(1);
  });

  it("does not write any config when no --save-* flag is given", async () => {
    state.configTargets = [
      { id: ".licensewizardrc.json", label: ".licensewizardrc.json" },
    ];

    await lw(["--license", "MIT"]).run();

    expect(state.generateCalls).toEqual([{ licenseId: "MIT", slotValues: {} }]);
    expect(state.writtenConfig).toBeNull();
    expect(state.saveTarget).toBeNull();
  });

  it("saves the config to the rc file with --save-rc", async () => {
    state.configTargets = [
      { id: ".licensewizardrc.json", label: ".licensewizardrc.json" },
    ];

    await lw(["--license", "MIT", "--save-rc"]).run();

    expect(state.saveTarget).toBe(".licensewizardrc.json");
    expect(state.writtenConfig).toEqual({ licenseId: "MIT" });
    expect(state.generateCalls).toEqual([{ licenseId: "MIT", slotValues: {} }]);
    expect(sink.messages).toContainEqual(
      expect.objectContaining({
        kind: "generated",
        licenseId: "MIT",
        savedTo: ".licensewizardrc.json",
      }),
    );
  });

  it("persists collected tokens when saving a customized license", async () => {
    state.detail = TEMPLATE_DETAIL;
    state.configTargets = [{ id: "package.json", label: "package.json" }];

    await lw([
      "--license",
      "MIT",
      "--set",
      "year=2026",
      "--set",
      "copyright holders=Erdem Bircan",
      "--save-npm",
    ]).run();

    expect(state.saveTarget).toBe("package.json");
    expect(state.writtenConfig).toEqual({
      licenseId: "MIT",
      tokens: {
        "<year>": "2026",
        "<copyright holders>": "Erdem Bircan",
      },
    });
  });

  it("errors and does not generate when the save location is not present", async () => {
    // composer.json is not among the available targets.
    state.configTargets = [
      { id: ".licensewizardrc.json", label: ".licensewizardrc.json" },
    ];

    await lw(["--license", "MIT", "--save-composer"]).run();

    expect(state.generateCalls).toEqual([]);
    expect(state.writtenConfig).toBeNull();
    expect(sink.messages).toContainEqual(
      expect.objectContaining({
        kind: "error",
        message: expect.stringContaining("composer.json"),
      }),
    );
    expect(process.exitCode).toBe(1);
  });

  it("errors when more than one save location is requested", async () => {
    state.configTargets = [
      { id: ".licensewizardrc.json", label: ".licensewizardrc.json" },
      { id: "package.json", label: "package.json" },
    ];

    await lw(["--license", "MIT", "--save-rc", "--save-npm"]).run();

    expect(state.generateCalls).toEqual([]);
    expect(state.writtenConfig).toBeNull();
    expect(sink.messages).toContainEqual(
      expect.objectContaining({
        kind: "error",
        message: expect.stringContaining("at most one"),
      }),
    );
    expect(process.exitCode).toBe(1);
  });

  it("errors when a --save-* flag is given without --license", async () => {
    await lw(["--save-rc"]).run();

    expect(state.generateCalls).toEqual([]);
    expect(sink.messages).toContainEqual(
      expect.objectContaining({
        kind: "error",
        message: expect.stringContaining("--license"),
      }),
    );
    expect(process.exitCode).toBe(1);
  });

  it("reports the closest matches instead of crashing on an unknown license id", async () => {
    state.notFoundLicenseId = "apache-2-0";
    state.suggestions = [
      { licenseId: "Apache-2.0", name: "Apache License 2.0" },
      { licenseId: "Apache-1.1", name: "Apache Software License 1.1" },
    ];

    await lw(["--license", "apache-2-0"]).run();

    expect(state.generateCalls).toEqual([]);
    expect(state.writtenProjectLicense).toBeNull();
    expect(sink.messages).toContainEqual(
      expect.objectContaining({
        kind: "licenseNotFound",
        licenseId: "apache-2-0",
        suggestions: [
          expect.objectContaining({ licenseId: "Apache-2.0" }),
          expect.objectContaining({ licenseId: "Apache-1.1" }),
        ],
      }),
    );
    expect(process.exitCode).toBe(1);
  });

  it("still reports a clear error when nothing resembles the unknown id", async () => {
    state.notFoundLicenseId = "zzzz";
    state.suggestions = [];

    await lw(["--license", "zzzz"]).run();

    expect(state.generateCalls).toEqual([]);
    expect(sink.messages).toContainEqual(
      expect.objectContaining({
        kind: "licenseNotFound",
        licenseId: "zzzz",
        suggestions: [],
      }),
    );
    expect(process.exitCode).toBe(1);
  });
});

describe("LicenseWizard verify mode", () => {
  const originalExitCode = process.exitCode;

  beforeEach(() => {
    state.reset();
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it("confirms a match and never rewrites when LICENSE equals the rendered license", async () => {
    state.config = { licenseId: "MIT" };
    state.licenseFile = "RENDERED LICENSE";
    state.renderedContent = "RENDERED LICENSE";

    await lw(["--verify"]).run();

    expect(sink.messages).toContainEqual(
      expect.objectContaining({
        kind: "verifyMatch",
        licenseId: "MIT",
        manifestsChecked: false,
      }),
    );
    expect(state.generateCalls).toEqual([]);
    expect(process.exitCode).toBe(originalExitCode);
  });

  it("rewrites the LICENSE by default when it differs from the saved config", async () => {
    state.config = { licenseId: "MIT", tokens: { "<year>": "2026" } };
    state.licenseFile = "STALE LICENSE";
    state.renderedContent = "FRESH LICENSE";

    await lw(["--verify"]).run();

    expect(sink.messages).toContainEqual(
      expect.objectContaining({
        kind: "verifyFixed",
        licenseId: "MIT",
        licenseRegenerated: true,
      }),
    );
    expect(state.generateCalls).toEqual([
      { licenseId: "MIT", slotValues: { "<year>": "2026" } },
    ]);
  });

  it("fails without rewriting under --strict when LICENSE differs", async () => {
    state.config = { licenseId: "MIT" };
    state.licenseFile = "STALE LICENSE";
    state.renderedContent = "FRESH LICENSE";

    await lw(["--verify", "--strict"]).run();

    expect(sink.messages).toContainEqual(
      expect.objectContaining({ kind: "verifyMismatch", licenseId: "MIT" }),
    );
    expect(state.generateCalls).toEqual([]);
    expect(process.exitCode).toBe(1);
  });

  it("fails when there is no LICENSE file to verify", async () => {
    state.config = { licenseId: "MIT" };
    state.licenseFile = null;

    await lw(["--verify"]).run();

    expect(sink.messages).toContainEqual(
      expect.objectContaining({
        kind: "error",
        message: expect.stringContaining("no LICENSE file"),
      }),
    );
    expect(state.generateCalls).toEqual([]);
    expect(process.exitCode).toBe(1);
  });

  it("fails when there is no saved configuration to verify against", async () => {
    state.config = null;
    state.licenseFile = "SOME LICENSE";

    await lw(["--verify"]).run();

    expect(sink.messages).toContainEqual(
      expect.objectContaining({
        kind: "error",
        message: expect.stringContaining("no saved configuration"),
      }),
    );
    expect(state.generateCalls).toEqual([]);
    expect(process.exitCode).toBe(1);
  });

  it("ignores other selection flags when --verify is supplied", async () => {
    state.config = { licenseId: "MIT" };
    state.licenseFile = "RENDERED LICENSE";
    state.renderedContent = "RENDERED LICENSE";

    await lw(["--verify", "--license", "Apache-2.0", "--save-rc"]).run();

    // No prompts, no non-interactive generation — just the verify confirmation.
    expect(state.rendered).toEqual([]);
    expect(sink.messages).toContainEqual(
      expect.objectContaining({
        kind: "verifyMatch",
        licenseId: "MIT",
        manifestsChecked: false,
      }),
    );
    expect(state.writtenConfig).toBeNull();
  });

  it("confirms LICENSE and manifests together when both are in sync", async () => {
    state.config = { licenseId: "MIT" };
    state.licenseFile = "RENDERED LICENSE";
    state.renderedContent = "RENDERED LICENSE";
    state.declaredLicenses = [{ name: "package.json", licenseId: "MIT" }];

    await lw(["--verify"]).run();

    expect(sink.messages).toContainEqual(
      expect.objectContaining({
        kind: "verifyMatch",
        licenseId: "MIT",
        manifestsChecked: true,
      }),
    );
    expect(state.manifestWrites).toEqual([]);
    expect(process.exitCode).toBe(originalExitCode);
  });

  it("updates a drifted manifest license by default and exits zero", async () => {
    state.config = { licenseId: "MIT" };
    state.licenseFile = "RENDERED LICENSE";
    state.renderedContent = "RENDERED LICENSE";
    state.declaredLicenses = [
      { name: "package.json", licenseId: "Apache-2.0" },
    ];

    await lw(["--verify"]).run();

    expect(sink.messages).toContainEqual(
      expect.objectContaining({
        kind: "verifyFixed",
        licenseId: "MIT",
        manifests: [{ name: "package.json", was: "Apache-2.0" }],
      }),
    );
    expect(state.manifestWrites).toEqual([
      { name: "package.json", licenseId: "MIT" },
    ]);
    // The LICENSE file matched, so it is not regenerated.
    expect(state.generateCalls).toEqual([]);
    expect(process.exitCode).toBe(originalExitCode);
  });

  it("fails on a drifted manifest under --strict without writing", async () => {
    state.config = { licenseId: "MIT" };
    state.licenseFile = "RENDERED LICENSE";
    state.renderedContent = "RENDERED LICENSE";
    state.declaredLicenses = [
      { name: "package.json", licenseId: "Apache-2.0" },
    ];

    await lw(["--verify", "--strict"]).run();

    expect(sink.messages).toContainEqual(
      expect.objectContaining({
        kind: "verifyMismatch",
        licenseId: "MIT",
        manifests: [{ name: "package.json", declared: "Apache-2.0" }],
      }),
    );
    expect(state.manifestWrites).toEqual([]);
    expect(process.exitCode).toBe(1);
  });
});

describe("LicenseWizard dry-run mode", () => {
  const TEMPLATE_DETAIL: LicenseDetail = {
    licenseId: "MIT",
    name: "MIT License",
    licenseText: "PLAIN LICENSE TEXT",
    standardLicenseTemplate: COPYRIGHT_TEMPLATE,
  };

  const originalExitCode = process.exitCode;

  beforeEach(() => {
    state.reset();
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it("prints the rendered license and writes nothing for a non-interactive dry run", async () => {
    state.declaredLicenses = [{ name: "package.json", licenseId: null }];

    await lw(["--license", "MIT", "--dry-run"]).run();

    expect(sink.messages).toContainEqual(
      expect.objectContaining({
        kind: "dryRun",
        licenseId: "MIT",
        content: expect.stringContaining("RENDERED LICENSE"),
        manifests: ["package.json"],
      }),
    );
    // No write of any kind happened.
    expect(state.generateCalls).toEqual([]);
    expect(state.writtenProjectLicense).toBeNull();
    expect(state.writtenConfig).toBeNull();
    expect(state.configCleared).toBe(false);
    expect(process.exitCode).toBe(originalExitCode);
  });

  it("renders the customized license under --dry-run without writing", async () => {
    state.detail = TEMPLATE_DETAIL;

    await lw([
      "--license",
      "MIT",
      "--set",
      "year=2026",
      "--set",
      "copyright holders=Erdem Bircan",
      "--dry-run",
    ]).run();

    expect(sink.messages).toContainEqual(
      expect.objectContaining({
        kind: "dryRun",
        content: expect.stringContaining("RENDERED LICENSE"),
      }),
    );
    expect(state.generateCalls).toEqual([]);
    expect(state.writtenProjectLicense).toBeNull();
  });

  it("previews the save location but does not persist config under --dry-run", async () => {
    state.configTargets = [
      { id: ".licensewizardrc.json", label: ".licensewizardrc.json" },
    ];

    await lw(["--license", "MIT", "--save-rc", "--dry-run"]).run();

    expect(sink.messages).toContainEqual(
      expect.objectContaining({
        kind: "dryRun",
        save: { action: "save", target: ".licensewizardrc.json" },
      }),
    );
    expect(state.writtenConfig).toBeNull();
    expect(state.saveTarget).toBeNull();
    expect(state.generateCalls).toEqual([]);
  });

  it("still reports incomplete --set fields under --dry-run without rendering", async () => {
    state.detail = TEMPLATE_DETAIL;

    await lw(["--license", "MIT", "--set", "year=2026", "--dry-run"]).run();

    expect(sink.messages).not.toContainEqual(
      expect.objectContaining({ kind: "dryRun" }),
    );
    expect(sink.messages).toContainEqual(
      expect.objectContaining({ kind: "missingFields" }),
    );
    expect(process.exitCode).toBe(1);
  });

  it("runs the interactive prompts then previews without writing under --dry-run", async () => {
    state.answer = (q: Question): string | boolean => {
      if (q.id === "saveConfig") return "skip";
      if (q.type === "select") return "standard";
      return "MIT";
    };

    await lw(["--dry-run"]).run();

    // The prompt flow still ran.
    expect(state.rendered.some((q) => q.id === "license")).toBe(true);
    expect(sink.messages).toContainEqual(
      expect.objectContaining({
        kind: "dryRun",
        content: expect.stringContaining("RENDERED LICENSE"),
      }),
    );
    // Nothing was written or cleared.
    expect(state.generateCalls).toEqual([]);
    expect(state.writtenProjectLicense).toBeNull();
    expect(state.writtenConfig).toBeNull();
    expect(state.configCleared).toBe(false);
  });
});

describe("LicenseWizard header removal", () => {
  beforeEach(() => {
    state.reset();
  });

  const headed = (source: string, path: string): string =>
    new HeaderComposer({
      detail: { licenseId: "MIT", name: "MIT License", licenseText: "x" },
      style: "short",
      tokens: {},
    }).apply(source, path);

  it("strips headers and clears the saved preference with --remove-headers", async () => {
    state.config = { licenseId: "MIT", headers: { style: "short" } };
    state.sourceFiles = {
      "a.ts": headed("export const a = 1;\n", "a.ts"),
      "b.ts": "export const b = 2;\n",
    };

    await lw(["--remove-headers"]).run();

    // The headed file was rewritten without its header; the bare file was not.
    const write = state.headerWrites.find((w) => w.path === "a.ts");
    expect(write?.content).toBe("export const a = 1;\n");
    expect(state.headerWrites.some((w) => w.path === "b.ts")).toBe(false);
    // The headers preference is dropped, license id and tokens kept.
    expect(state.writtenConfig).toEqual({ licenseId: "MIT" });
  });

  it("takes priority over --headers (removes rather than writes)", async () => {
    state.config = { licenseId: "MIT", headers: { style: "short" } };
    state.sourceFiles = { "a.ts": headed("export const a = 1;\n", "a.ts") };

    await lw(["--remove-headers", "--headers", "full"]).run();

    expect(state.headerWrites[0]?.content).toBe("export const a = 1;\n");
    expect(state.generateCalls).toEqual([]);
  });

  it("offers the remove option interactively only when the config has headers", async () => {
    state.config = { licenseId: "MIT", headers: { style: "short" } };
    state.sourceFiles = { "a.ts": headed("export const a = 1;\n", "a.ts") };
    state.answer = (q: Question) => {
      if (q.id === "mode") return "remove";
      if (q.id === "removeHeaders") return true;
      return q.type === "confirm" ? false : "MIT";
    };

    await lw([]).run();

    // The mode prompt was shown, removal ran, and the preference was cleared.
    expect(state.rendered.some((q) => q.id === "mode")).toBe(true);
    expect(state.headerWrites[0]?.content).toBe("export const a = 1;\n");
    expect(state.writtenConfig).toEqual({ licenseId: "MIT" });
  });

  it("does not show the mode prompt when no headers are configured", async () => {
    state.config = { licenseId: "MIT" };

    await lw([]).run();

    expect(state.rendered.some((q) => q.id === "mode")).toBe(false);
    expect(state.rendered.some((q) => q.id === "license")).toBe(true);
  });
});

describe("LicenseWizard force-header mode", () => {
  const originalExitCode = process.exitCode;

  beforeEach(() => {
    state.reset();
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  // A file the safety guard would skip on a normal run: it already carries a
  // foreign license notice.
  const FOREIGN =
    "// SPDX-License-Identifier: GPL-3.0-only\nexport const a = 1;\n";

  it("forces the configured header into a file the guard would skip", async () => {
    state.config = { licenseId: "MIT", headers: { style: "short" } };
    state.sourceFiles = { "foreign.ts": FOREIGN };

    await lw(["--force-header", "foreign.ts"]).run();

    const write = state.headerWrites.find((w) => w.path === "foreign.ts");
    expect(write?.content).toContain("SPDX-License-Identifier: MIT");
    expect(sink.messages).toContainEqual(
      expect.objectContaining({
        kind: "headersForceApplied",
        file: "foreign.ts",
      }),
    );
  });

  it("silently disregards the request when headers are not enabled in config", async () => {
    state.config = { licenseId: "MIT" };
    state.sourceFiles = { "foreign.ts": FOREIGN };

    await lw(["--force-header", "foreign.ts"]).run();

    expect(state.headerWrites).toEqual([]);
    expect(sink.messages).toEqual([]);
    expect(process.exitCode).not.toBe(1);
  });

  it("refuses an absolute path and writes nothing", async () => {
    state.config = { licenseId: "MIT", headers: { style: "short" } };
    state.sourceFiles = { "foreign.ts": FOREIGN };

    await lw(["--force-header", "/etc/passwd"]).run();

    expect(state.headerWrites).toEqual([]);
    expect(sink.messages).toContainEqual(
      expect.objectContaining({ kind: "error" }),
    );
    expect(process.exitCode).toBe(1);
  });

  it("refuses a path that climbs out of the project and writes nothing", async () => {
    state.config = { licenseId: "MIT", headers: { style: "short" } };
    state.sourceFiles = { "foreign.ts": FOREIGN };

    await lw(["--force-header", "../escape.ts"]).run();

    expect(state.headerWrites).toEqual([]);
    expect(sink.messages).toContainEqual(
      expect.objectContaining({ kind: "error" }),
    );
    expect(process.exitCode).toBe(1);
  });

  it("previews without writing under --dry-run", async () => {
    state.config = { licenseId: "MIT", headers: { style: "short" } };
    state.sourceFiles = { "foreign.ts": FOREIGN };

    await lw(["--force-header", "foreign.ts", "--dry-run"]).run();

    expect(state.headerWrites).toEqual([]);
    expect(sink.messages).toContainEqual(
      expect.objectContaining({ kind: "headersForceApplied", dryRun: true }),
    );
  });
});

describe("LicenseWizard apply-config mode", () => {
  const originalExitCode = process.exitCode;

  beforeEach(() => {
    state.reset();
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it("generates from the saved config without rendering any prompt", async () => {
    state.config = { licenseId: "MIT", tokens: { "<year>": "2026" } };

    await lw(["--apply-config"]).run();

    expect(state.rendered).toEqual([]);
    expect(state.generateCalls).toEqual([
      { licenseId: "MIT", slotValues: { "<year>": "2026" } },
    ]);
    expect(state.writtenProjectLicense).toBe("MIT");
    expect(sink.messages).toContainEqual(
      expect.objectContaining({ kind: "generated", licenseId: "MIT" }),
    );
  });

  it("leaves the saved config in place, persisting nowhere new", async () => {
    state.config = { licenseId: "MIT" };

    await lw(["--apply-config"]).run();

    // The config is the source of truth, not a write target: nothing is saved
    // or cleared.
    expect(state.writtenConfig).toBeNull();
    expect(state.saveTarget).toBeNull();
    expect(state.configCleared).toBe(false);
  });

  it("re-stamps source-file headers when the saved config opted into them", async () => {
    state.config = { licenseId: "MIT", headers: { style: "short" } };
    state.sourceFiles = { "src/a.ts": "export const x = 1;\n" };

    await lw(["--apply-config"]).run();

    expect(state.headerWrites).toHaveLength(1);
    expect(state.headerWrites[0].path).toBe("src/a.ts");
    expect(state.headerWrites[0].content).toContain("SPDX-License-Identifier");
  });

  it("writes no headers when the saved config did not opt into them", async () => {
    state.config = { licenseId: "MIT" };
    state.sourceFiles = { "src/a.ts": "export const x = 1;\n" };

    await lw(["--apply-config"]).run();

    expect(state.headerWrites).toEqual([]);
  });

  it("fails when no saved configuration exists to apply", async () => {
    state.config = null;

    await lw(["--apply-config"]).run();

    expect(sink.messages).toContainEqual(
      expect.objectContaining({
        kind: "error",
        message: expect.stringContaining("no saved configuration found"),
      }),
    );
    expect(state.generateCalls).toEqual([]);
    expect(state.writtenProjectLicense).toBeNull();
    expect(process.exitCode).toBe(1);
  });

  it("takes priority over the selection flags, applying the saved config instead", async () => {
    state.config = { licenseId: "MIT" };

    await lw([
      "--apply-config",
      "--license",
      "Apache-2.0",
      "--set",
      "year=2026",
      "--save-rc",
    ]).run();

    // The saved MIT config wins over the Apache-2.0 selection, and --save-rc is
    // ignored — the config is left where it lives.
    expect(state.rendered).toEqual([]);
    expect(state.generateCalls).toEqual([{ licenseId: "MIT", slotValues: {} }]);
    expect(state.writtenConfig).toBeNull();
    expect(state.saveTarget).toBeNull();
  });

  it("previews from the saved config but writes nothing under --dry-run", async () => {
    state.config = { licenseId: "MIT" };
    state.declaredLicenses = [{ name: "package.json", licenseId: null }];

    await lw(["--apply-config", "--dry-run"]).run();

    expect(sink.messages).toContainEqual(
      expect.objectContaining({ kind: "dryRun", licenseId: "MIT" }),
    );
    expect(state.generateCalls).toEqual([]);
    expect(state.writtenProjectLicense).toBeNull();
    expect(state.writtenConfig).toBeNull();
    expect(process.exitCode).toBe(originalExitCode);
  });

  it("reports the closest matches when the saved config names an unknown license", async () => {
    state.config = { licenseId: "apache-2-0" };
    state.notFoundLicenseId = "apache-2-0";
    state.suggestions = [
      { licenseId: "Apache-2.0", name: "Apache License 2.0" },
    ];

    await lw(["--apply-config"]).run();

    expect(state.generateCalls).toEqual([]);
    expect(sink.messages).toContainEqual(
      expect.objectContaining({
        kind: "licenseNotFound",
        licenseId: "apache-2-0",
        suggestions: [expect.objectContaining({ licenseId: "Apache-2.0" })],
      }),
    );
    expect(process.exitCode).toBe(1);
  });
});

describe("LicenseWizard argument validation", () => {
  const originalExitCode = process.exitCode;

  beforeEach(() => {
    state.reset();
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it("rejects an unknown flag with an error instead of falling through to the prompt", async () => {
    await lw(["--licens", "MIT"]).run();

    expect(sink.messages).toContainEqual(
      expect.objectContaining({
        kind: "error",
        message: expect.stringContaining("Unknown flag: --licens"),
      }),
    );
    expect(state.rendered).toEqual([]);
    expect(state.generateCalls).toEqual([]);
    expect(process.exitCode).toBe(1);
  });

  it("rejects a value-accepting flag given with no value", async () => {
    await lw(["--license"]).run();

    expect(sink.messages).toContainEqual(
      expect.objectContaining({
        kind: "error",
        message: expect.stringContaining("--license flag requires a value"),
      }),
    );
    expect(state.generateCalls).toEqual([]);
    expect(process.exitCode).toBe(1);
  });

  it("still shows help even alongside an unknown flag", async () => {
    await lw(["--help", "--bogus"]).run();

    expect(sink.messages).toContainEqual(
      expect.objectContaining({ kind: "usage" }),
    );
  });
});
