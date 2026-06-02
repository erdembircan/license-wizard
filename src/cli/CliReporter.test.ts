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

  it("lists the suggested licenses with a --license hint on an unknown id", () => {
    new CliReporter("license-wizard").licenseNotFound("apache-2-0", [
      { licenseId: "Apache-2.0", name: "Apache License 2.0" },
      { licenseId: "Apache-1.1", name: "Apache Software License 1.1" },
    ]);

    expect(stderr).toContain('No license matches "apache-2-0".');
    expect(stderr).toContain("Did you mean one of these?");
    expect(stderr).toContain("Apache-2.0");
    expect(stderr).toContain("Apache License 2.0");
    expect(stderr).toContain("Apache-1.1");
    expect(stderr).toContain("license-wizard --license Apache-2.0");
    expect(stdout).toBe("");
  });

  it("points at the interactive search when nothing resembles the unknown id", () => {
    new CliReporter("license-wizard").licenseNotFound("zzzz", []);

    expect(stderr).toContain('No license matches "zzzz".');
    expect(stderr).not.toContain("Did you mean");
    expect(stderr).toContain("license-wizard with no flags");
    expect(stdout).toBe("");
  });
});

describe("CliReporter color handling", () => {
  const ESC = "[";

  /**
   * Builds a fake output stream that records writes and reports the given TTY
   * status, standing in for process.stdout/stderr.
   */
  function fakeStream(isTTY: boolean) {
    const stream = {
      isTTY,
      text: "",
      write(chunk: string): boolean {
        stream.text += chunk;
        return true;
      },
    };
    return stream;
  }

  let savedTerm: string | undefined;
  let savedNoColor: string | undefined;

  beforeEach(() => {
    savedTerm = process.env.TERM;
    savedNoColor = process.env.NO_COLOR;
  });

  afterEach(() => {
    if (savedTerm === undefined) delete process.env.TERM;
    else process.env.TERM = savedTerm;
    if (savedNoColor === undefined) delete process.env.NO_COLOR;
    else process.env.NO_COLOR = savedNoColor;
  });

  it("emits no ANSI codes when the stream is not a TTY (agent/pipe usage)", () => {
    const stream = fakeStream(false);
    new CliReporter("license-wizard", stream, stream).generated("MIT", "");

    expect(stream.text).not.toContain(ESC);
    expect(stream.text).toBe(
      "Wrote LICENSE (MIT) and recorded it in the project manifests.\n",
    );
  });

  it("emits ANSI codes on an interactive terminal", () => {
    process.env.TERM = "xterm";
    delete process.env.NO_COLOR;
    const stream = fakeStream(true);

    new CliReporter("license-wizard", stream, stream).generated(
      "MIT",
      ".licensewizardrc.json",
    );

    expect(stream.text).toContain(ESC);
    // The underlying message text is still present alongside the codes.
    expect(stream.text).toContain("Wrote LICENSE");
    expect(stream.text).toContain(".licensewizardrc.json");
  });

  it("stays plain on a TTY when NO_COLOR is set", () => {
    process.env.TERM = "xterm";
    process.env.NO_COLOR = "1";
    const stream = fakeStream(true);

    new CliReporter("license-wizard", stream, stream).error("boom");

    expect(stream.text).toBe("boom\n");
  });

  it("stays plain on a dumb terminal", () => {
    process.env.TERM = "dumb";
    delete process.env.NO_COLOR;
    const stream = fakeStream(true);

    new CliReporter("license-wizard", stream, stream).tokens("MIT", [
      { token: "<year>", label: "year" },
    ]);

    expect(stream.text).not.toContain(ESC);
  });
});
