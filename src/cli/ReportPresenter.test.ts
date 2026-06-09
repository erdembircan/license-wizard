import { describe, it, expect } from "vitest";
import type { OutputMessage } from "@cli/OutputMessage.js";
import { ReportPresenter } from "@cli/ReportPresenter.js";

const present = (message: OutputMessage, color = false): string =>
  new ReportPresenter("license-wizard").present(message, { color });

/**
 * These tests pin the *wording* — the prose the presenter renders for each
 * message. They are the one place coupled to phrasing on purpose, kept as inline
 * snapshots so an intentional rewording updates in a single reviewed step
 * (`vitest -u`) rather than failing scattered behavioral tests. The plain
 * (color off) text is snapshotted; ANSI styling is asserted separately.
 */
describe("ReportPresenter wording (plain text)", () => {
  it("renders the usage screen", () => {
    expect(
      present({
        kind: "usage",
        channel: "out",
        options: "  --help  Show help.",
      }),
    ).toMatchInlineSnapshot(`
      "Usage: license-wizard [options]

      Options:
        --help  Show help.
      "
    `);
  });

  it("renders the token listing with a --set example", () => {
    expect(
      present({
        kind: "tokens",
        channel: "out",
        licenseId: "MIT",
        slots: [
          { token: "<year>", label: "year" },
          { token: "<copyright holders>", label: "copyright holders" },
        ],
      }),
    ).toMatchInlineSnapshot(`
      "MIT accepts the following copyright field(s):

        year
        copyright holders

      Generate a customized license by supplying every field, e.g.:

        license-wizard --license MIT --set "year=<value>" --set "copyright holders=<value>"

      Omit --set to write the official text unchanged.
      "
    `);
  });

  it("renders the no-fields token listing", () => {
    expect(
      present({
        kind: "tokens",
        channel: "out",
        licenseId: "Apache-2.0",
        slots: [],
      }),
    ).toMatchInlineSnapshot(`
      "Apache-2.0 has no customizable copyright fields; it is generated as official text unchanged.
      "
    `);
  });

  it("renders a generation with no save note", () => {
    expect(
      present({
        kind: "generated",
        channel: "out",
        licenseId: "MIT",
        savedTo: "",
      }),
    ).toMatchInlineSnapshot(`
      "Conjured your LICENSE (MIT) and inscribed it across the project manifests.
      "
    `);
  });

  it("renders a generation with a save note", () => {
    expect(
      present({
        kind: "generated",
        channel: "out",
        licenseId: "MIT",
        savedTo: ".licensewizardrc.json",
      }),
    ).toMatchInlineSnapshot(`
      "Conjured your LICENSE (MIT) and inscribed it across the project manifests. Spellbook saved to .licensewizardrc.json.
      "
    `);
  });

  it("renders a dry run that saves config and lists manifests", () => {
    expect(
      present({
        kind: "dryRun",
        channel: "out",
        licenseId: "MIT",
        content: "RENDERED LICENSE TEXT",
        save: { action: "save", target: ".licensewizardrc.json" },
        manifests: ["package.json", "composer.json"],
      }),
    ).toMatchInlineSnapshot(`
      "Dry run — the spell was only rehearsed; no files were written.

      Would conjure LICENSE (MIT):

      RENDERED LICENSE TEXT

      The spell would also:
        Inscribe MIT in manifests: package.json, composer.json
        Save your spellbook to .licensewizardrc.json
      "
    `);
  });

  it("renders a dry run that clears config with no manifests present", () => {
    expect(
      present({
        kind: "dryRun",
        channel: "out",
        licenseId: "MIT",
        content: "RENDERED LICENSE TEXT",
        save: { action: "clear" },
        manifests: [],
      }),
    ).toMatchInlineSnapshot(`
      "Dry run — the spell was only rehearsed; no files were written.

      Would conjure LICENSE (MIT):

      RENDERED LICENSE TEXT

      The spell would also:
        Inscribe MIT in manifests: none present
        Banish the spellbook from every location
      "
    `);
  });

  it("renders a dry run that saves nothing", () => {
    expect(
      present({
        kind: "dryRun",
        channel: "out",
        licenseId: "MIT",
        content: "RENDERED LICENSE TEXT",
        save: { action: "none" },
        manifests: ["package.json"],
      }),
    ).toMatchInlineSnapshot(`
      "Dry run — the spell was only rehearsed; no files were written.

      Would conjure LICENSE (MIT):

      RENDERED LICENSE TEXT

      The spell would also:
        Inscribe MIT in manifests: package.json
      "
    `);
  });

  it("renders the missing-fields error", () => {
    expect(
      present({
        kind: "missingFields",
        channel: "err",
        licenseId: "MIT",
        missing: [{ token: "<copyright holders>", label: "copyright holders" }],
      }),
    ).toMatchInlineSnapshot(`
      "Cannot conjure a customized MIT license — missing required field(s):

        copyright holders

      Supply every field (e.g. --set "copyright holders=<value>"), or run with --get-tokens to list them all.
      "
    `);
  });

  it("renders the unknown-fields error", () => {
    expect(
      present({
        kind: "unknownFields",
        channel: "err",
        licenseId: "MIT",
        unknown: ["author"],
        slots: [
          { token: "<year>", label: "year" },
          { token: "<copyright holders>", label: "copyright holders" },
        ],
      }),
    ).toMatchInlineSnapshot(`
      "Unknown copyright field(s) for MIT: author.
      MIT accepts: year, copyright holders.
      Run with --get-tokens to list them.
      "
    `);
  });

  it("renders the license-not-found error with suggestions", () => {
    expect(
      present({
        kind: "licenseNotFound",
        channel: "err",
        licenseId: "apache-2-0",
        suggestions: [
          { licenseId: "Apache-2.0", name: "Apache License 2.0" },
          { licenseId: "Apache-1.1", name: "Apache Software License 1.1" },
        ],
      }),
    ).toMatchInlineSnapshot(`
      "No license matches "apache-2-0". Did you mean one of these?

        Apache-2.0  Apache License 2.0
        Apache-1.1  Apache Software License 1.1

      Re-run with the exact identifier, e.g.:

        license-wizard --license Apache-2.0
      "
    `);
  });

  it("renders the license-not-found error with no suggestions", () => {
    expect(
      present({
        kind: "licenseNotFound",
        channel: "err",
        licenseId: "zzzz",
        suggestions: [],
      }),
    ).toMatchInlineSnapshot(`
      "No license matches "zzzz".
      Run license-wizard with no flags to search the full list interactively.
      "
    `);
  });

  it("renders the verify match for LICENSE only", () => {
    expect(
      present({
        kind: "verifyMatch",
        channel: "out",
        licenseId: "MIT",
        manifestsChecked: false,
      }),
    ).toMatchInlineSnapshot(`
      "LICENSE is up to date, in harmony with your saved MIT enchantment.
      "
    `);
  });

  it("renders the verify match including manifests", () => {
    expect(
      present({
        kind: "verifyMatch",
        channel: "out",
        licenseId: "MIT",
        manifestsChecked: true,
      }),
    ).toMatchInlineSnapshot(`
      "LICENSE and project manifests are up to date, in harmony with your saved MIT enchantment.
      "
    `);
  });

  it("renders the verify fix listing reconciled surfaces", () => {
    expect(
      present({
        kind: "verifyFixed",
        channel: "out",
        licenseId: "MIT",
        licenseRegenerated: true,
        manifests: [{ name: "composer.json", was: "Apache-2.0" }],
      }),
    ).toMatchInlineSnapshot(`
      "Realigned the project with your saved MIT enchantment:
        LICENSE regenerated
        composer.json license updated to MIT (was Apache-2.0)
      "
    `);
  });

  it("renders the verify mismatch listing drifted surfaces", () => {
    expect(
      present({
        kind: "verifyMismatch",
        channel: "err",
        licenseId: "MIT",
        licenseMismatch: true,
        manifests: [
          { name: "composer.json", declared: "Apache-2.0" },
          { name: "package.json", declared: null },
        ],
      }),
    ).toMatchInlineSnapshot(`
      "Project is out of sync with your saved MIT enchantment:
        LICENSE does not match
        composer.json license declares Apache-2.0 (expected MIT)
        package.json license declares no license (expected MIT)
      Run license-wizard --verify to reconcile, or update the configuration to match.
      "
    `);
  });

  it("renders the no-eligible-files notice", () => {
    expect(
      present({ kind: "headersNoFiles", channel: "out", licenseId: "MIT" }),
    ).toMatchInlineSnapshot(`
      "No source files to inscribe with the MIT header — the scan found nothing eligible.
      "
    `);
  });

  it("renders the header write tally, noting already-marked files", () => {
    expect(
      present({
        kind: "headersGenerated",
        channel: "out",
        licenseId: "MIT",
        style: "short",
        total: 30,
        written: 25,
        unchanged: 5,
        skipped: 0,
      }),
    ).toMatchInlineSnapshot(`
      "Inscribed the MIT short header across 25 of 30 source file(s). 5 already bore the mark.
      "
    `);
  });

  it("notes files skipped for already declaring a license", () => {
    expect(
      present({
        kind: "headersGenerated",
        channel: "out",
        licenseId: "MIT",
        style: "short",
        total: 30,
        written: 23,
        unchanged: 5,
        skipped: 2,
      }),
    ).toMatchInlineSnapshot(`
      "Inscribed the MIT short header across 23 of 30 source file(s). 5 already bore the mark. Skipped 2 that already declare a license.
      "
    `);
  });

  it("renders the header write tally without an already-marked note", () => {
    expect(
      present({
        kind: "headersGenerated",
        channel: "out",
        licenseId: "MIT",
        style: "short",
        total: 25,
        written: 25,
        unchanged: 0,
        skipped: 0,
      }),
    ).toMatchInlineSnapshot(`
      "Inscribed the MIT short header across 25 of 25 source file(s).
      "
    `);
  });

  it("renders the header dry-run preview", () => {
    expect(
      present({
        kind: "headersDryRun",
        channel: "out",
        licenseId: "MIT",
        style: "short",
        files: ["a.ts", "b.ts"],
        sample: "// SAMPLE HEADER",
      }),
    ).toMatchInlineSnapshot(`
      "Dry run — no source file was touched.

      Would inscribe the MIT short header into 2 file(s):

      // SAMPLE HEADER

        a.ts
        b.ts
      "
    `);
  });

  it("renders the header removal tally", () => {
    expect(
      present({
        kind: "headersRemoved",
        channel: "out",
        removed: ["a.ts", "b.ts"],
        total: 5,
      }),
    ).toMatchInlineSnapshot(`
      "Stripped the license header from 2 source file(s).
      "
    `);
  });

  it("renders the header removal no-headers notice", () => {
    expect(
      present({
        kind: "headersRemoved",
        channel: "out",
        removed: [],
        total: 5,
      }),
    ).toMatchInlineSnapshot(`
      "No wizard-written headers found across 5 source file(s).
      "
    `);
  });

  it("renders the header removal dry-run preview", () => {
    expect(
      present({
        kind: "headersRemoveDryRun",
        channel: "out",
        removed: ["a.ts"],
        total: 3,
      }),
    ).toMatchInlineSnapshot(`
      "Dry run — no source file was touched.

      Would strip the license header from 1 source file(s):

        a.ts
      "
    `);
  });

  it("renders the header removal dry-run no-headers notice", () => {
    expect(
      present({
        kind: "headersRemoveDryRun",
        channel: "out",
        removed: [],
        total: 3,
      }),
    ).toMatchInlineSnapshot(`
      "Dry run — no source file was touched.

      No wizard-written headers found across 3 source file(s).
      "
    `);
  });

  it("renders the header verify match", () => {
    expect(
      present({
        kind: "headersVerifyMatch",
        channel: "out",
        licenseId: "MIT",
        style: "short",
        total: 4,
      }),
    ).toMatchInlineSnapshot(`
      "All 4 source file(s) bear the expected MIT short header.
      "
    `);
  });

  it("renders the header verify fix tally", () => {
    expect(
      present({
        kind: "headersVerifyFixed",
        channel: "out",
        licenseId: "MIT",
        style: "short",
        added: 2,
        rewritten: 3,
      }),
    ).toMatchInlineSnapshot(`
      "Realigned the MIT short header: 2 added, 3 rewritten.
      "
    `);
  });

  it("renders the header verify mismatch, explaining each file's drift", () => {
    expect(
      present({
        kind: "headersVerifyMismatch",
        channel: "err",
        licenseId: "MIT",
        style: "short",
        missing: ["a.ts"],
        drifted: [
          {
            file: "b.ts",
            kind: "declares",
            licenseId: "Apache-2.0",
            style: "short",
          },
          { file: "c.ts", kind: "edited" },
          { file: "d.ts", kind: "drifted" },
        ],
      }),
    ).toMatchInlineSnapshot(`
      "Source files are out of sync with your saved MIT short header:
        a.ts is missing the header
        b.ts header has drifted (declares Apache-2.0 short)
        c.ts header was edited by hand
        d.ts header has drifted
      Run license-wizard --verify to inscribe and reconcile them.
      "
    `);
  });

  it("renders a plain error", () => {
    expect(present({ kind: "error", channel: "err", message: "boom" }))
      .toMatchInlineSnapshot(`
      "boom
      "
    `);
  });
});

describe("ReportPresenter styling", () => {
  const ESC = "[";
  const message = {
    kind: "generated",
    channel: "out",
    licenseId: "MIT",
    savedTo: "",
  } as const;

  // The rendered wording is pinned by the plain-text snapshots above; these two
  // only assert that color toggles ANSI codes on and off.
  it("emits ANSI codes when color is enabled", () => {
    expect(present(message, true)).toContain(ESC);
  });

  it("emits no ANSI codes when color is disabled", () => {
    expect(present(message, false)).not.toContain(ESC);
  });
});
