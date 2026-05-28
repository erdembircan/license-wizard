import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Answer } from "@cli/Answer.js";
import type { Question } from "@cli/Question.js";
import type { WizardConfig } from "@configuration/WizardConfig.js";

// Shared capture/control state, hoisted so the vi.mock factories can close over it.
const state = vi.hoisted(() => ({
  rendered: [] as Question[],
  config: null as WizardConfig | null,
  packageLicense: null as string | null,
  writtenPackageLicense: null as string | null,
}));

// Stub the renderer (the consumer of the built questions): record every question
// it is asked to render and return a canned answer so `run()` completes.
vi.mock("@cli/ClackRenderer.js", () => ({
  ClackRenderer: vi.fn(function (this: {
    render: (q: Question) => Promise<Answer>;
    onCancel: () => string;
  }) {
    this.render = async (question: Question): Promise<Answer> => {
      state.rendered.push(question);
      return question.type === "confirm"
        ? { questionId: question.id, value: false }
        : { questionId: question.id, value: "MIT" };
    };
    this.onCancel = () => "";
  }),
}));

// Stub config reads so each test controls the saved value; writes are no-ops.
vi.mock("@configuration/Config.js", () => ({
  Config: vi.fn(function (this: {
    read: () => Promise<WizardConfig | null>;
    write: () => Promise<void>;
    readPackageLicense: () => Promise<string | null>;
    writePackageLicense: (licenseId: string) => Promise<void>;
  }) {
    this.read = async () => state.config;
    this.write = async () => {};
    this.readPackageLicense = async () => state.packageLicense;
    this.writePackageLicense = async (licenseId: string) => {
      state.writtenPackageLicense = licenseId;
    };
  }),
}));

// Stub license generation so `run()` does not touch the network or filesystem.
vi.mock("@licensing/LicenseGenerator.js", () => ({
  LicenseGenerator: vi.fn(function (this: { generate: () => Promise<void> }) {
    this.generate = async () => {};
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
    state.rendered = [];
    state.config = null;
    state.packageLicense = null;
    state.writtenPackageLicense = null;
  });

  it("uses the --license flag value over the package.json license and config", async () => {
    state.packageLicense = "ISC";
    state.config = { licenseId: "Apache-2.0" };

    expect(await licenseDefaultFor(["--license", "MIT"])).toBe("MIT");
  });

  it("uses the --license flag value when no config is saved", async () => {
    expect(await licenseDefaultFor(["--license", "MIT"])).toBe("MIT");
  });

  it("uses the package.json license over the saved config when no flag is given", async () => {
    state.packageLicense = "ISC";
    state.config = { licenseId: "Apache-2.0" };

    expect(await licenseDefaultFor([])).toBe("ISC");
  });

  it("falls back to the saved config value when no flag or package.json license exists", async () => {
    state.config = { licenseId: "Apache-2.0" };

    expect(await licenseDefaultFor([])).toBe("Apache-2.0");
  });

  it("leaves the default unset when no flag, package.json license, or config exists", async () => {
    expect(await licenseDefaultFor([])).toBeUndefined();
  });
});

describe("LicenseWizard package.json license write-back", () => {
  beforeEach(() => {
    state.rendered = [];
    state.config = null;
    state.packageLicense = null;
    state.writtenPackageLicense = null;
  });

  it("records the selected license in package.json at the end of the run", async () => {
    await new LicenseWizard([]).run();

    expect(state.writtenPackageLicense).toBe("MIT");
  });
});
