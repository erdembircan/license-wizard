import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Answer } from "@cli/Answer.js";
import type { CompletionSummary } from "@cli/interfaces/IRenderer.js";
import type { Question } from "@cli/Question.js";
import type { LicenseDetail } from "@licensing/LicenseDetail.js";
import type { LicenseIndexEntry } from "@licensing/LicenseIndexEntry.js";
import { LicenseNotFoundError } from "@licensing/errors/LicenseNotFoundError.js";
import type { WizardConfig } from "@configuration/WizardConfig.js";

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
    targets: () => Promise<{ id: string; label: string }[]>;
    write: (config: WizardConfig, targetId: string) => Promise<void>;
    clear: () => Promise<void>;
  }) {
    this.read = async () => state.config;
    this.targets = async () => state.configTargets;
    this.write = async (config, targetId) => {
      state.writtenConfig = config;
      state.saveTarget = targetId;
    };
    this.clear = async () => {
      state.configCleared = true;
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
    declaredLicenses: () => Promise<
      { name: string; licenseId: string | null }[]
    >;
    writeLicenseTo: (name: string, licenseId: string) => Promise<void>;
  }) {
    this.readLicense = async () => state.projectLicense;
    this.writeLicense = async (licenseId: string) => {
      state.writtenProjectLicense = licenseId;
    };
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

const { LicenseWizard } = await import("./LicenseWizard.js");

/**
 * Runs the wizard with the given args and returns the defaultValue the renderer
 * received for the license question.
 */
async function licenseDefaultFor(args: string[]): Promise<string | undefined> {
  await new LicenseWizard(args).run();
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
    await new LicenseWizard([]).run();

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

    await new LicenseWizard([]).run();

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

    await new LicenseWizard([]).run();

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

    await new LicenseWizard([]).run();

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

    await new LicenseWizard([]).run();

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

    await new LicenseWizard([]).run();

    expect(state.writtenConfig).toEqual({ licenseId: "MIT" });
  });

  it("clears the config without writing when the user skips saving", async () => {
    state.answer = (q: Question): string | boolean => {
      if (q.id === "saveConfig") return "skip";
      if (q.type === "confirm") return false;
      return "MIT";
    };

    await new LicenseWizard([]).run();

    expect(state.writtenConfig).toBeNull();
    expect(state.configCleared).toBe(true);
  });
});

describe("LicenseWizard project manifest license write-back", () => {
  beforeEach(() => {
    state.reset();
  });

  it("records the selected license in the project manifests at the end of the run", async () => {
    await new LicenseWizard([]).run();

    expect(state.writtenProjectLicense).toBe("MIT");
  });

  it("shows the closing completion summary after an interactive install", async () => {
    state.declaredLicenses = [{ name: "package.json", licenseId: "MIT" }];
    state.answer = (q: Question): string | boolean => {
      if (q.id === "saveConfig") return "skip";
      if (q.type === "select") return "standard";
      return "MIT";
    };

    await new LicenseWizard([]).run();

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

    await new LicenseWizard([]).run();

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

    await new LicenseWizard([]).run();

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

    await new LicenseWizard([]).run();

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

    await new LicenseWizard([]).run();

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

    await new LicenseWizard([]).run();

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

    await new LicenseWizard([]).run();

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
  let stdout: string;
  let stderr: string;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    state.reset();
    stdout = "";
    stderr = "";
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(((
      chunk: unknown,
    ) => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write);
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(((
      chunk: unknown,
    ) => {
      stderr += String(chunk);
      return true;
    }) as typeof process.stderr.write);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    process.exitCode = originalExitCode;
  });

  it("generates the standard license without rendering any prompt for --license", async () => {
    await new LicenseWizard(["--license", "MIT"]).run();

    expect(state.rendered).toEqual([]);
    expect(state.generateCalls).toEqual([{ licenseId: "MIT", slotValues: {} }]);
    expect(state.writtenProjectLicense).toBe("MIT");
    expect(stdout).toContain("Conjured your LICENSE (MIT)");
  });

  it("uses the flag's license directly, ignoring manifest and saved config", async () => {
    state.projectLicense = "ISC";
    state.config = { licenseId: "Apache-2.0" };

    await new LicenseWizard(["--license", "MIT"]).run();

    expect(state.generateCalls).toEqual([{ licenseId: "MIT", slotValues: {} }]);
  });

  it("generates standard text when the license has fields but no --set is given", async () => {
    state.detail = TEMPLATE_DETAIL;

    await new LicenseWizard(["--license", "MIT"]).run();

    expect(state.rendered).toEqual([]);
    expect(state.generateCalls).toEqual([{ licenseId: "MIT", slotValues: {} }]);
  });

  it("generates a customized license when every field is supplied via --set", async () => {
    state.detail = TEMPLATE_DETAIL;

    await new LicenseWizard([
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

    await new LicenseWizard([
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

    await new LicenseWizard([
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

    await new LicenseWizard(["--license", "MIT", "--set", "year=2026"]).run();

    expect(state.generateCalls).toEqual([]);
    expect(state.writtenProjectLicense).toBeNull();
    expect(stderr).toContain("missing required field");
    expect(stderr).toContain("copyright holders");
    expect(process.exitCode).toBe(1);
  });

  it("reports unknown fields and does not generate", async () => {
    state.detail = TEMPLATE_DETAIL;

    await new LicenseWizard(["--license", "MIT", "--set", "author=x"]).run();

    expect(state.generateCalls).toEqual([]);
    expect(stderr).toContain("Unknown copyright field");
    expect(stderr).toContain("author");
    expect(process.exitCode).toBe(1);
  });

  it("rejects a malformed --set value lacking '='", async () => {
    state.detail = TEMPLATE_DETAIL;

    await new LicenseWizard(["--license", "MIT", "--set", "year"]).run();

    expect(state.generateCalls).toEqual([]);
    expect(stderr).toContain("Invalid --set");
    expect(process.exitCode).toBe(1);
  });

  it("--get-tokens lists the fields and does not generate", async () => {
    state.detail = TEMPLATE_DETAIL;

    await new LicenseWizard(["--license", "MIT", "--get-tokens"]).run();

    expect(state.generateCalls).toEqual([]);
    expect(stdout).toContain("year");
    expect(stdout).toContain("copyright holders");
    expect(stdout).toContain("--set");
  });

  it("--get-tokens reports no fields for a license without customizable copyright", async () => {
    await new LicenseWizard(["--license", "MIT", "--get-tokens"]).run();

    expect(state.generateCalls).toEqual([]);
    expect(stdout).toContain("no customizable copyright fields");
  });

  it("errors when --set is given without --license", async () => {
    await new LicenseWizard(["--set", "year=2026"]).run();

    expect(state.generateCalls).toEqual([]);
    expect(stderr).toContain("--license");
    expect(process.exitCode).toBe(1);
  });

  it("errors when --get-tokens is given without --license", async () => {
    await new LicenseWizard(["--get-tokens"]).run();

    expect(stderr).toContain("--license");
    expect(process.exitCode).toBe(1);
  });

  it("does not write any config when no --save-* flag is given", async () => {
    state.configTargets = [
      { id: ".licensewizardrc.json", label: ".licensewizardrc.json" },
    ];

    await new LicenseWizard(["--license", "MIT"]).run();

    expect(state.generateCalls).toEqual([{ licenseId: "MIT", slotValues: {} }]);
    expect(state.writtenConfig).toBeNull();
    expect(state.saveTarget).toBeNull();
  });

  it("saves the config to the rc file with --save-rc", async () => {
    state.configTargets = [
      { id: ".licensewizardrc.json", label: ".licensewizardrc.json" },
    ];

    await new LicenseWizard(["--license", "MIT", "--save-rc"]).run();

    expect(state.saveTarget).toBe(".licensewizardrc.json");
    expect(state.writtenConfig).toEqual({ licenseId: "MIT" });
    expect(state.generateCalls).toEqual([{ licenseId: "MIT", slotValues: {} }]);
    expect(stdout).toContain("Spellbook saved to .licensewizardrc.json");
  });

  it("persists collected tokens when saving a customized license", async () => {
    state.detail = TEMPLATE_DETAIL;
    state.configTargets = [{ id: "package.json", label: "package.json" }];

    await new LicenseWizard([
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

    await new LicenseWizard(["--license", "MIT", "--save-composer"]).run();

    expect(state.generateCalls).toEqual([]);
    expect(state.writtenConfig).toBeNull();
    expect(stderr).toContain("composer.json");
    expect(process.exitCode).toBe(1);
  });

  it("errors when more than one save location is requested", async () => {
    state.configTargets = [
      { id: ".licensewizardrc.json", label: ".licensewizardrc.json" },
      { id: "package.json", label: "package.json" },
    ];

    await new LicenseWizard([
      "--license",
      "MIT",
      "--save-rc",
      "--save-npm",
    ]).run();

    expect(state.generateCalls).toEqual([]);
    expect(state.writtenConfig).toBeNull();
    expect(stderr).toContain("at most one");
    expect(process.exitCode).toBe(1);
  });

  it("errors when a --save-* flag is given without --license", async () => {
    await new LicenseWizard(["--save-rc"]).run();

    expect(state.generateCalls).toEqual([]);
    expect(stderr).toContain("--license");
    expect(process.exitCode).toBe(1);
  });

  it("reports the closest matches instead of crashing on an unknown license id", async () => {
    state.notFoundLicenseId = "apache-2-0";
    state.suggestions = [
      { licenseId: "Apache-2.0", name: "Apache License 2.0" },
      { licenseId: "Apache-1.1", name: "Apache Software License 1.1" },
    ];

    await new LicenseWizard(["--license", "apache-2-0"]).run();

    expect(state.generateCalls).toEqual([]);
    expect(state.writtenProjectLicense).toBeNull();
    expect(stderr).toContain('No license matches "apache-2-0"');
    expect(stderr).toContain("Apache-2.0");
    expect(stderr).toContain("Apache-1.1");
    expect(process.exitCode).toBe(1);
  });

  it("still reports a clear error when nothing resembles the unknown id", async () => {
    state.notFoundLicenseId = "zzzz";
    state.suggestions = [];

    await new LicenseWizard(["--license", "zzzz"]).run();

    expect(state.generateCalls).toEqual([]);
    expect(stderr).toContain('No license matches "zzzz"');
    expect(process.exitCode).toBe(1);
  });
});

describe("LicenseWizard verify mode", () => {
  const originalExitCode = process.exitCode;
  let stdout: string;
  let stderr: string;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    state.reset();
    stdout = "";
    stderr = "";
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(((
      chunk: unknown,
    ) => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write);
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(((
      chunk: unknown,
    ) => {
      stderr += String(chunk);
      return true;
    }) as typeof process.stderr.write);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    process.exitCode = originalExitCode;
  });

  it("confirms a match and never rewrites when LICENSE equals the rendered license", async () => {
    state.config = { licenseId: "MIT" };
    state.licenseFile = "RENDERED LICENSE";
    state.renderedContent = "RENDERED LICENSE";

    await new LicenseWizard(["--verify"]).run();

    expect(stdout).toContain("LICENSE is up to date");
    expect(state.generateCalls).toEqual([]);
    expect(process.exitCode).toBe(originalExitCode);
  });

  it("rewrites the LICENSE by default when it differs from the saved config", async () => {
    state.config = { licenseId: "MIT", tokens: { "<year>": "2026" } };
    state.licenseFile = "STALE LICENSE";
    state.renderedContent = "FRESH LICENSE";

    await new LicenseWizard(["--verify"]).run();

    expect(stdout).toContain("Realigned the project");
    expect(stdout).toContain("LICENSE regenerated");
    expect(state.generateCalls).toEqual([
      { licenseId: "MIT", slotValues: { "<year>": "2026" } },
    ]);
  });

  it("fails without rewriting under --strict when LICENSE differs", async () => {
    state.config = { licenseId: "MIT" };
    state.licenseFile = "STALE LICENSE";
    state.renderedContent = "FRESH LICENSE";

    await new LicenseWizard(["--verify", "--strict"]).run();

    expect(stderr).toContain("out of sync");
    expect(state.generateCalls).toEqual([]);
    expect(process.exitCode).toBe(1);
  });

  it("fails when there is no LICENSE file to verify", async () => {
    state.config = { licenseId: "MIT" };
    state.licenseFile = null;

    await new LicenseWizard(["--verify"]).run();

    expect(stderr).toContain("no LICENSE file");
    expect(state.generateCalls).toEqual([]);
    expect(process.exitCode).toBe(1);
  });

  it("fails when there is no saved configuration to verify against", async () => {
    state.config = null;
    state.licenseFile = "SOME LICENSE";

    await new LicenseWizard(["--verify"]).run();

    expect(stderr).toContain("no saved configuration");
    expect(state.generateCalls).toEqual([]);
    expect(process.exitCode).toBe(1);
  });

  it("ignores other selection flags when --verify is supplied", async () => {
    state.config = { licenseId: "MIT" };
    state.licenseFile = "RENDERED LICENSE";
    state.renderedContent = "RENDERED LICENSE";

    await new LicenseWizard([
      "--verify",
      "--license",
      "Apache-2.0",
      "--save-rc",
    ]).run();

    // No prompts, no non-interactive generation — just the verify confirmation.
    expect(state.rendered).toEqual([]);
    expect(stdout).toContain("LICENSE is up to date");
    expect(state.writtenConfig).toBeNull();
  });

  it("confirms LICENSE and manifests together when both are in sync", async () => {
    state.config = { licenseId: "MIT" };
    state.licenseFile = "RENDERED LICENSE";
    state.renderedContent = "RENDERED LICENSE";
    state.declaredLicenses = [{ name: "package.json", licenseId: "MIT" }];

    await new LicenseWizard(["--verify"]).run();

    expect(stdout).toContain("LICENSE and project manifests are up to date");
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

    await new LicenseWizard(["--verify"]).run();

    expect(stdout).toContain(
      "package.json license updated to MIT (was Apache-2.0)",
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

    await new LicenseWizard(["--verify", "--strict"]).run();

    expect(stderr).toContain("out of sync");
    expect(stderr).toContain(
      "package.json license declares Apache-2.0 (expected MIT)",
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
  let stdout: string;
  let stderr: string;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    state.reset();
    stdout = "";
    stderr = "";
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(((
      chunk: unknown,
    ) => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write);
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(((
      chunk: unknown,
    ) => {
      stderr += String(chunk);
      return true;
    }) as typeof process.stderr.write);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    process.exitCode = originalExitCode;
  });

  it("prints the rendered license and writes nothing for a non-interactive dry run", async () => {
    state.declaredLicenses = [{ name: "package.json", licenseId: null }];

    await new LicenseWizard(["--license", "MIT", "--dry-run"]).run();

    expect(stdout).toContain(
      "Dry run — the spell was only rehearsed; no files were written.",
    );
    expect(stdout).toContain("Would conjure LICENSE (MIT):");
    expect(stdout).toContain("RENDERED LICENSE");
    expect(stdout).toContain("Inscribe MIT in manifests: package.json");
    // No write of any kind happened.
    expect(state.generateCalls).toEqual([]);
    expect(state.writtenProjectLicense).toBeNull();
    expect(state.writtenConfig).toBeNull();
    expect(state.configCleared).toBe(false);
    expect(process.exitCode).toBe(originalExitCode);
  });

  it("renders the customized license under --dry-run without writing", async () => {
    state.detail = TEMPLATE_DETAIL;

    await new LicenseWizard([
      "--license",
      "MIT",
      "--set",
      "year=2026",
      "--set",
      "copyright holders=Erdem Bircan",
      "--dry-run",
    ]).run();

    expect(stdout).toContain("RENDERED LICENSE");
    expect(state.generateCalls).toEqual([]);
    expect(state.writtenProjectLicense).toBeNull();
  });

  it("previews the save location but does not persist config under --dry-run", async () => {
    state.configTargets = [
      { id: ".licensewizardrc.json", label: ".licensewizardrc.json" },
    ];

    await new LicenseWizard([
      "--license",
      "MIT",
      "--save-rc",
      "--dry-run",
    ]).run();

    expect(stdout).toContain("Save your spellbook to .licensewizardrc.json");
    expect(state.writtenConfig).toBeNull();
    expect(state.saveTarget).toBeNull();
    expect(state.generateCalls).toEqual([]);
  });

  it("still reports incomplete --set fields under --dry-run without rendering", async () => {
    state.detail = TEMPLATE_DETAIL;

    await new LicenseWizard([
      "--license",
      "MIT",
      "--set",
      "year=2026",
      "--dry-run",
    ]).run();

    expect(stdout).not.toContain("Dry run");
    expect(stderr).toContain("missing required field");
    expect(process.exitCode).toBe(1);
  });

  it("runs the interactive prompts then previews without writing under --dry-run", async () => {
    state.answer = (q: Question): string | boolean => {
      if (q.id === "saveConfig") return "skip";
      if (q.type === "select") return "standard";
      return "MIT";
    };

    await new LicenseWizard(["--dry-run"]).run();

    // The prompt flow still ran.
    expect(state.rendered.some((q) => q.id === "license")).toBe(true);
    expect(stdout).toContain(
      "Dry run — the spell was only rehearsed; no files were written.",
    );
    expect(stdout).toContain("RENDERED LICENSE");
    // Nothing was written or cleared.
    expect(state.generateCalls).toEqual([]);
    expect(state.writtenProjectLicense).toBeNull();
    expect(state.writtenConfig).toBeNull();
    expect(state.configCleared).toBe(false);
  });
});
