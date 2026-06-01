import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CliReporter } from "@cli/CliReporter.js";
import type { TemplateSlot } from "@licensing/TemplateSlot.js";

const SLOTS: TemplateSlot[] = [
  { token: "<year>", label: "year" },
  { token: "<copyright holders>", label: "copyright holders" },
];

describe("CliReporter", () => {
  let stdout: string;
  let stderr: string;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
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
  });

  it("writes the usage screen to stdout", () => {
    new CliReporter("license-wizard").usage("  --help  Show help.");

    expect(stdout).toBe(
      "Usage: license-wizard [options]\n\nOptions:\n  --help  Show help.\n",
    );
    expect(stderr).toBe("");
  });

  it("lists copyright fields with a --set example to stdout", () => {
    new CliReporter("license-wizard").tokens("MIT", SLOTS);

    expect(stdout).toContain("MIT accepts the following copyright field(s):");
    expect(stdout).toContain("year");
    expect(stdout).toContain("copyright holders");
    expect(stdout).toContain(
      'license-wizard --license MIT --set "year=<value>" --set "copyright holders=<value>"',
    );
  });

  it("reports a license with no customizable fields to stdout", () => {
    new CliReporter("license-wizard").tokens("Apache-2.0", []);

    expect(stdout).toContain("no customizable copyright fields");
    expect(stderr).toBe("");
  });

  it("confirms a generation without a save note when nothing is saved", () => {
    new CliReporter("license-wizard").generated("MIT", "");

    expect(stdout).toBe(
      "Wrote LICENSE (MIT) and recorded it in the project manifests.\n",
    );
  });

  it("notes the save location when the selection was persisted", () => {
    new CliReporter("license-wizard").generated("MIT", ".licensewizardrc.json");

    expect(stdout).toContain("Saved config to .licensewizardrc.json.");
  });

  it("writes the missing-fields error to stderr", () => {
    new CliReporter("license-wizard").missingFields("MIT", [
      { token: "<copyright holders>", label: "copyright holders" },
    ]);

    expect(stderr).toContain("missing required field");
    expect(stderr).toContain("copyright holders");
    expect(stdout).toBe("");
  });

  it("writes the unknown-fields error to stderr, listing accepted fields", () => {
    new CliReporter("license-wizard").unknownFields("MIT", ["author"], SLOTS);

    expect(stderr).toContain("Unknown copyright field(s) for MIT: author.");
    expect(stderr).toContain("MIT accepts: year, copyright holders.");
  });

  it("writes a plain error message to stderr", () => {
    new CliReporter("license-wizard").error("something went wrong");

    expect(stderr).toBe("something went wrong\n");
    expect(stdout).toBe("");
  });
});
