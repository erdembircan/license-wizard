import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { IReporter } from "@cli/interfaces/IReporter.js";
import type { Config } from "@configuration/Config.js";
import type { WizardConfig } from "@configuration/WizardConfig.js";
import type {
  HeaderVerifier,
  HeaderVerifyOutcome,
} from "@headers/HeaderVerifier.js";
import type { LicenseVerifier, VerifyOutcome } from "../LicenseVerifier.js";
import { VerifyMode } from "./VerifyMode.js";

/**
 * Records every reporter call so tests can assert which confirmation or error
 * the mode rendered, without depending on the real terminal reporter.
 */
function makeReporter() {
  const calls: { method: string; arg: unknown }[] = [];
  const record =
    (method: string) =>
    (arg?: unknown): void => {
      calls.push({ method, arg });
    };
  const reporter = new Proxy(
    {},
    {
      get: (_target, prop: string) => record(prop),
    },
  ) as unknown as IReporter;
  return { reporter, calls };
}

const licenseVerifier = (outcome: VerifyOutcome): LicenseVerifier =>
  ({ verify: async () => outcome }) as unknown as LicenseVerifier;

const headerVerifier = (
  outcome: HeaderVerifyOutcome,
): { verifier: HeaderVerifier; verifyCalls: number } => {
  let verifyCalls = 0;
  const verifier = {
    verify: async () => {
      verifyCalls += 1;
      return outcome;
    },
  } as unknown as HeaderVerifier;
  return {
    verifier,
    get verifyCalls() {
      return verifyCalls;
    },
  };
};

const configReturning = (config: WizardConfig | null): Config =>
  ({ read: async () => config }) as unknown as Config;

const matchReport: VerifyOutcome = {
  kind: "match",
  licenseId: "MIT",
  license: "match",
  manifests: [],
};

describe("VerifyMode", () => {
  const originalExitCode = process.exitCode;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it("reports a match and leaves the exit code untouched", async () => {
    const { reporter, calls } = makeReporter();
    const { verifier: headers } = headerVerifier({ kind: "disabled" });
    const mode = new VerifyMode(
      licenseVerifier(matchReport),
      headers,
      configReturning({ licenseId: "MIT" }),
      reporter,
      false,
    );

    await mode.run();

    expect(calls.map((c) => c.method)).toContain("verifyMatch");
    expect(process.exitCode).toBe(originalExitCode);
  });

  it("reports a reconciliation when drift was fixed", async () => {
    const { reporter, calls } = makeReporter();
    const { verifier: headers } = headerVerifier({ kind: "disabled" });
    const mode = new VerifyMode(
      licenseVerifier({
        kind: "fixed",
        licenseId: "MIT",
        license: "fixed",
        manifests: [],
      }),
      headers,
      configReturning({ licenseId: "MIT" }),
      reporter,
      false,
    );

    await mode.run();

    expect(calls.map((c) => c.method)).toContain("verifyFixed");
  });

  it("reports a mismatch and sets a non-zero exit code under strict", async () => {
    const { reporter, calls } = makeReporter();
    const { verifier: headers } = headerVerifier({ kind: "disabled" });
    const mode = new VerifyMode(
      licenseVerifier({
        kind: "mismatch",
        licenseId: "MIT",
        license: "mismatch",
        manifests: [],
      }),
      headers,
      configReturning({ licenseId: "MIT" }),
      reporter,
      true,
    );

    await mode.run();

    expect(calls.map((c) => c.method)).toContain("verifyMismatch");
    expect(process.exitCode).toBe(1);
  });

  it("fails with an error and skips header verification when no LICENSE exists", async () => {
    const { reporter, calls } = makeReporter();
    const headers = headerVerifier({ kind: "disabled" });
    const mode = new VerifyMode(
      licenseVerifier({ kind: "missing-license" }),
      headers.verifier,
      configReturning({ licenseId: "MIT" }),
      reporter,
      false,
    );

    await mode.run();

    expect(calls.map((c) => c.method)).toContain("error");
    expect(process.exitCode).toBe(1);
    expect(headers.verifyCalls).toBe(0);
  });

  it("fails with an error when no saved configuration exists", async () => {
    const { reporter, calls } = makeReporter();
    const headers = headerVerifier({ kind: "disabled" });
    const mode = new VerifyMode(
      licenseVerifier({ kind: "missing-config" }),
      headers.verifier,
      configReturning(null),
      reporter,
      false,
    );

    await mode.run();

    expect(calls.map((c) => c.method)).toContain("error");
    expect(process.exitCode).toBe(1);
    expect(headers.verifyCalls).toBe(0);
  });

  it("verifies the header surface when the configuration opts into headers", async () => {
    const { reporter, calls } = makeReporter();
    const headers = headerVerifier({
      kind: "match",
      licenseId: "MIT",
      style: "short",
      total: 1,
      matched: ["a.ts"],
      missing: [],
      drifted: [],
      fixed: [],
    });
    const mode = new VerifyMode(
      licenseVerifier(matchReport),
      headers.verifier,
      configReturning({ licenseId: "MIT", headers: { style: "short" } }),
      reporter,
      false,
    );

    await mode.run();

    expect(headers.verifyCalls).toBe(1);
    expect(calls.map((c) => c.method)).toContain("headersVerifyMatch");
  });

  it("fails on drifted headers under strict", async () => {
    const { reporter, calls } = makeReporter();
    const headers = headerVerifier({
      kind: "mismatch",
      licenseId: "MIT",
      style: "short",
      total: 1,
      matched: [],
      missing: ["a.ts"],
      drifted: [],
      fixed: [],
    });
    const mode = new VerifyMode(
      licenseVerifier(matchReport),
      headers.verifier,
      configReturning({ licenseId: "MIT", headers: { style: "short" } }),
      reporter,
      true,
    );

    await mode.run();

    expect(calls.map((c) => c.method)).toContain("headersVerifyMismatch");
    expect(process.exitCode).toBe(1);
  });
});
