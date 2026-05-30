import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Answer } from "@cli/Answer.js";
import type { Question } from "@cli/Question.js";
import type { LicenseDetail } from "@licensing/LicenseDetail.js";
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
    writtenConfig: null as WizardConfig | null,
    projectLicense: null as string | null,
    writtenProjectLicense: null as string | null,
    detail: defaultDetail(),
    generateCalls: [] as GenerateCall[],
    // Maps a question to the answer the stub renderer returns.
    answer: defaultAnswer,
    reset() {
      self.rendered = [];
      self.config = null;
      self.writtenConfig = null;
      self.projectLicense = null;
      self.writtenProjectLicense = null;
      self.detail = defaultDetail();
      self.generateCalls = [];
      self.answer = defaultAnswer;
    },
  };

  return self;
});

// Stub the renderer: record every question and return the state-driven answer.
vi.mock("@cli/ClackRenderer.js", () => ({
  ClackRenderer: vi.fn(function (this: {
    render: (q: Question) => Promise<Answer>;
    onCancel: () => string;
  }) {
    this.render = async (question: Question): Promise<Answer> => {
      state.rendered.push(question);
      return { questionId: question.id, value: state.answer(question) };
    };
    this.onCancel = () => "";
  }),
}));

// Stub config reads so each test controls the saved value; writes are captured.
vi.mock("@configuration/Config.js", () => ({
  Config: vi.fn(function (this: {
    read: () => Promise<WizardConfig | null>;
    write: (config: WizardConfig) => Promise<void>;
  }) {
    this.read = async () => state.config;
    this.write = async (config: WizardConfig) => {
      state.writtenConfig = config;
    };
  }),
}));

// Stub the project manifests: read returns the controlled value, write captures it.
vi.mock("@configuration/ProjectManifestRepository.js", () => ({
  ProjectManifestRepository: vi.fn(function (this: {
    readLicense: () => Promise<string | null>;
    writeLicense: (licenseId: string) => Promise<void>;
  }) {
    this.readLicense = async () => state.projectLicense;
    this.writeLicense = async (licenseId: string) => {
      state.writtenProjectLicense = licenseId;
    };
  }),
}));

// Stub the SPDX source so the license `onAnswer` resolves a template without
// touching the network.
vi.mock("@licensing/SpdxLicenseSource.js", () => ({
  SpdxLicenseSource: vi.fn(function (this: {
    search: () => Promise<[]>;
    fetchLicense: () => Promise<LicenseDetail>;
  }) {
    this.search = async () => [];
    this.fetchLicense = async () => state.detail;
  }),
}));

// Stub license generation: capture the arguments instead of writing files.
vi.mock("@licensing/LicenseGenerator.js", () => ({
  LicenseGenerator: vi.fn(function (this: {
    generate: (
      licenseId: string,
      slotValues?: Record<string, string>,
    ) => Promise<void>;
  }) {
    this.generate = async (licenseId, slotValues = {}) => {
      state.generateCalls.push({ licenseId, slotValues });
    };
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

  it("uses the --license flag value over the project manifest license and config", async () => {
    state.projectLicense = "ISC";
    state.config = { licenseId: "Apache-2.0" };

    expect(await licenseDefaultFor(["--license", "MIT"])).toBe("MIT");
  });

  it("uses the --license flag value when no config is saved", async () => {
    expect(await licenseDefaultFor(["--license", "MIT"])).toBe("MIT");
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
      if (q.id === "saveConfig") return true;
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
      if (q.id === "saveConfig") return true;
      if (q.type === "confirm") return false;
      return "MIT";
    };

    await new LicenseWizard([]).run();

    expect(state.writtenConfig).toEqual({ licenseId: "MIT" });
  });

  it("does not write config when the user declines to save", async () => {
    state.answer = (q: Question): string | boolean => {
      if (q.type === "confirm") return false;
      return "MIT";
    };

    await new LicenseWizard([]).run();

    expect(state.writtenConfig).toBeNull();
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
});
