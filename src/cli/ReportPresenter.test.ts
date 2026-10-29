/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

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

  it("renders the version line", () => {
    expect(present({ kind: "version", channel: "out", version: "1.0.0" }))
      .toMatchInlineSnapshot(`
      "license-wizard 1.0.0
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

  it("does not claim a license has no fields when only the license text lacks them", () => {
    // Empty `slots` here means the generated surface (the license body) has no
    // fields; the message must not contradict `--get-tokens`, which may still
    // list header-only ones.
    expect(
      present({
        kind: "unknownFields",
        channel: "err",
        licenseId: "GPL-3.0-only",
        unknown: ["nope"],
        slots: [],
      }),
    ).toMatchInlineSnapshot(`
      "Unknown copyright field(s) for GPL-3.0-only: nope.
      GPL-3.0-only's license text has no customizable copyright fields. Run with --get-tokens to see every field, including any used only by a --headers full notice.
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
        note: null,
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
        difference: null,
        note: null,
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
        skipped: [],
      }),
    ).toMatchInlineSnapshot(`
      "Inscribed the MIT short header across 25 of 30 source file(s). 5 already bore the mark.
      "
    `);
  });

  it("lists files skipped because the header could not be safely written, with a force-header example", () => {
    expect(
      present({
        kind: "headersGenerated",
        channel: "out",
        licenseId: "MIT",
        style: "short",
        total: 30,
        written: 23,
        unchanged: 5,
        skipped: ["test/fixture.ts", "page.php"],
      }),
    ).toMatchInlineSnapshot(`
      "Inscribed the MIT short header across 23 of 30 source file(s). 5 already bore the mark.

      Skipped 2 file(s) the header couldn't be safely written into:
        test/fixture.ts
        page.php

      If one is safe to head, force it in (non-interactive):
        license-wizard --force-header "test/fixture.ts"
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
        skipped: [],
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
        skipped: [],
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

  it("lists the would-be-skipped files in a header dry-run preview", () => {
    expect(
      present({
        kind: "headersDryRun",
        channel: "out",
        licenseId: "MIT",
        style: "short",
        files: ["a.ts"],
        skipped: ["test/fixture.ts", "page.php"],
        sample: "// SAMPLE HEADER",
      }),
    ).toMatchInlineSnapshot(`
      "Dry run — no source file was touched.

      Would inscribe the MIT short header into 1 file(s):

      // SAMPLE HEADER

        a.ts

      Would skip 2 file(s) the header can't be safely written into:
        test/fixture.ts
        page.php

      If one is safe to head, force it in (non-interactive):
        license-wizard --force-header "test/fixture.ts"
      "
    `);
  });

  it("renders a force-header confirmation", () => {
    expect(
      present({
        kind: "headersForceApplied",
        channel: "out",
        licenseId: "MIT",
        style: "short",
        file: "page.php",
        outcome: "written",
        dryRun: false,
      }),
    ).toMatchInlineSnapshot(`
      "Forced the MIT short header into page.php.
      "
    `);
  });

  it("renders a force-header dry-run", () => {
    expect(
      present({
        kind: "headersForceApplied",
        channel: "out",
        licenseId: "MIT",
        style: "short",
        file: "page.php",
        outcome: "written",
        dryRun: true,
      }),
    ).toMatchInlineSnapshot(`
      "Dry run — no source file was touched. Would force the MIT short header into page.php.
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
        skipped: [],
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
        skipped: [],
      }),
    ).toMatchInlineSnapshot(`
      "Realigned the MIT short header: 2 added, 3 rewritten.
      "
    `);
  });

  it("lists files skipped during a header verify match and counts only those that bear it", () => {
    expect(
      present({
        kind: "headersVerifyMatch",
        channel: "out",
        licenseId: "MIT",
        style: "short",
        total: 4,
        skipped: ["test/fixture.ts", "page.php"],
      }),
    ).toMatchInlineSnapshot(`
      "All 2 source file(s) bear the expected MIT short header.

      Skipped 2 file(s) the header couldn't be safely written into:
        test/fixture.ts
        page.php

      If one is safe to head, force it in (non-interactive):
        license-wizard --force-header "test/fixture.ts"
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

const ISSUE_TY_COON =
  "<signature of Ty Coon>, 1 April 1989 Ty Coon, President of Vice";
const ISSUE_TY_COON_SPACED =
  "<signature of Ty Coon>, 1 April 1989 Ty Coon , President of Vice";
const RECONCILE_LINE =
  "Run license-wizard --verify to reconcile, or update the configuration to match.";

// These cases pin exact strings rather than inline snapshots: the caret's column
// and the made-visible whitespace are the behaviour under test, and spelling
// them out with `.repeat(n)` keeps that legible.
describe("ReportPresenter verify explanations (plain text)", () => {
  const strictMismatch = (
    licenseId: string,
    difference: Extract<
      OutputMessage,
      { kind: "verifyMismatch" }
    >["difference"],
    note: Extract<OutputMessage, { kind: "verifyMismatch" }>["note"],
  ): string =>
    present({
      kind: "verifyMismatch",
      channel: "err",
      licenseId,
      licenseMismatch: true,
      manifests: [],
      difference,
      note,
    });

  it("explains a template-built LICENSE in strict mode, offering to remove the tokens", () => {
    expect(
      strictMismatch(
        "GPL-2.0-or-later",
        {
          line: 290,
          column: 45,
          found: ISSUE_TY_COON,
          expected: ISSUE_TY_COON_SPACED,
        },
        {
          kind: "templateBuilt",
          tokens: ["<yyyy>", "<name of author>"],
          configFile: ".licensewizardrc.json",
          offerRemoval: true,
        },
      ),
    ).toBe(
      [
        "Project is out of sync with your saved GPL-2.0-or-later enchantment:",
        "  LICENSE does not match — first difference at line 290, column 45:",
        `    found:    ${ISSUE_TY_COON}`,
        `    expected: ${ISSUE_TY_COON_SPACED}`,
        " ".repeat(58) + "^",
        "",
        `With your saved tokens (<yyyy>, <name of author>), license-wizard builds GPL-2.0-or-later's LICENSE from SPDX's matching template rather than its plain text. SPDX revises that template between releases, so LICENSE can drift even when nothing in your project changed. If you don't need those fields filled in, remove "tokens" from your saved config (.licensewizardrc.json) to build from the plain text instead.`,
        "",
        RECONCILE_LINE,
        "",
      ].join("\n"),
    );
  });

  it("names one unrecognized token, the license's fields and the config edit", () => {
    expect(
      present({
        kind: "unknownSavedTokens",
        channel: "err",
        command: { kind: "verify" },
        licenseId: "ISC",
        tokens: ["<copyright notice>"],
        fields: ["<YEAR>", "<OWNER>"],
        configFile: ".licensewizardrc.json",
      }),
    ).toBe(
      [
        "Cannot verify your saved ISC enchantment — this saved token is not a copyright field of ISC:",
        "  <copyright notice>",
        "ISC accepts <YEAR>, <OWNER>. It may be left over from an earlier license, or SPDX may have renamed the field. license-wizard can't fill it in, so nothing was checked or changed.",
        'Update "tokens" in your saved config (.licensewizardrc.json), then run license-wizard --verify again.',
        "",
      ].join("\n"),
    );
  });

  it("lists several unrecognized tokens in plural wording", () => {
    expect(
      present({
        kind: "unknownSavedTokens",
        channel: "err",
        command: { kind: "verify" },
        licenseId: "GPL-2.0-or-later",
        tokens: ["[yyyy]", "[name of copyright owner]"],
        fields: ["<yyyy>", "<name of author>"],
        configFile: ".licensewizardrc.json",
      }),
    ).toBe(
      [
        "Cannot verify your saved GPL-2.0-or-later enchantment — these saved tokens are not copyright fields of GPL-2.0-or-later:",
        "  [yyyy]",
        "  [name of copyright owner]",
        "GPL-2.0-or-later accepts <yyyy>, <name of author>. They may be left over from an earlier license, or SPDX may have renamed the fields. license-wizard can't fill them in, so nothing was checked or changed.",
        'Update "tokens" in your saved config (.licensewizardrc.json), then run license-wizard --verify again.',
        "",
      ].join("\n"),
    );
  });

  it("says to remove the tokens when the license has no copyright fields and the config file is unknown", () => {
    expect(
      present({
        kind: "unknownSavedTokens",
        channel: "err",
        command: { kind: "verify" },
        licenseId: "MPL-2.0",
        tokens: ["<year>"],
        fields: [],
        configFile: null,
      }),
    ).toBe(
      [
        "Cannot verify your saved MPL-2.0 enchantment — this saved token is not a copyright field of MPL-2.0:",
        "  <year>",
        "MPL-2.0 has no copyright fields. It may be left over from an earlier license, or SPDX may have renamed the field. license-wizard can't fill it in, so nothing was checked or changed.",
        'Remove "tokens" from your saved config, then run license-wizard --verify again.',
        "",
      ].join("\n"),
    );
  });

  it("words the unrecognized-token error for --apply-config", () => {
    expect(
      present({
        kind: "unknownSavedTokens",
        channel: "err",
        licenseId: "ISC",
        command: { kind: "apply-config" },
        tokens: ["<copyright notice>"],
        fields: ["<YEAR>", "<OWNER>"],
        configFile: ".licensewizardrc.json",
      }),
    ).toBe(
      [
        "Cannot apply your saved ISC enchantment — this saved token is not a copyright field of ISC:",
        "  <copyright notice>",
        "ISC accepts <YEAR>, <OWNER>. It may be left over from an earlier license, or SPDX may have renamed the field. license-wizard can't fill it in, so nothing was written.",
        'Update "tokens" in your saved config (.licensewizardrc.json), then run license-wizard --apply-config again.',
        "",
      ].join("\n"),
    );
  });

  it("words the unrecognized-token error for --force-header, naming the file", () => {
    expect(
      present({
        kind: "unknownSavedTokens",
        channel: "err",
        licenseId: "GPL-2.0-or-later",
        command: { kind: "force-header", file: "src/page.php" },
        tokens: ["[yyyy]", "[name of copyright owner]"],
        fields: ["<yyyy>", "<name of author>"],
        configFile: ".licensewizardrc.json",
      }),
    ).toBe(
      [
        'Cannot force a header into "src/page.php" — these saved tokens are not copyright fields of GPL-2.0-or-later:',
        "  [yyyy]",
        "  [name of copyright owner]",
        "GPL-2.0-or-later accepts <yyyy>, <name of author>. They may be left over from an earlier license, or SPDX may have renamed the fields. license-wizard can't fill them in, so nothing was written.",
        'Update "tokens" in your saved config (.licensewizardrc.json), then run license-wizard --force-header "src/page.php" again.',
        "",
      ].join("\n"),
    );
  });

  it("explains a template-built LICENSE after a fix, without offering removal when full headers need the token", () => {
    expect(
      present({
        kind: "verifyFixed",
        channel: "out",
        licenseId: "GPL-2.0-or-later",
        licenseRegenerated: true,
        manifests: [],
        note: {
          kind: "templateBuilt",
          tokens: ["<yyyy>"],
          configFile: "package.json",
          offerRemoval: false,
        },
      }),
    ).toBe(
      [
        "Realigned the project with your saved GPL-2.0-or-later enchantment:",
        "  LICENSE regenerated",
        "",
        "With your saved token (<yyyy>), license-wizard builds GPL-2.0-or-later's LICENSE from SPDX's matching template rather than its plain text. SPDX revises that template between releases, so LICENSE can drift even when nothing in your project changed.",
        "",
      ].join("\n"),
    );
  });

  it("offers removal in singular wording, without a file name when the config file is unknown", () => {
    const text = present({
      kind: "verifyFixed",
      channel: "out",
      licenseId: "GPL-2.0-or-later",
      licenseRegenerated: true,
      manifests: [],
      note: {
        kind: "templateBuilt",
        tokens: ["<yyyy>"],
        configFile: null,
        offerRemoval: true,
      },
    });

    expect(text.split("\n")[3]).toMatch(
      / If you don't need that field filled in, remove "tokens" from your saved config to build from the plain text instead\.$/,
    );
  });

  describe("first difference display", () => {
    const plain = (...lines: string[]): string =>
      [
        "Project is out of sync with your saved MIT enchantment:",
        ...lines,
        RECONCILE_LINE,
        "",
      ].join("\n");

    it("shows a missing line as the end of the file, without a caret", () => {
      expect(
        strictMismatch(
          "MIT",
          { line: 4, column: 1, found: null, expected: "Copyright" },
          null,
        ),
      ).toBe(
        plain(
          "  LICENSE does not match — first difference at line 4, column 1:",
          "    found:    (end of file)",
          "    expected: Copyright",
        ),
      );
    });

    it("shows an empty line as a blank line, without a caret", () => {
      expect(
        strictMismatch(
          "MIT",
          { line: 2, column: 1, found: "", expected: "x" },
          null,
        ),
      ).toBe(
        plain(
          "  LICENSE does not match — first difference at line 2, column 1:",
          "    found:    (blank line)",
          "    expected: x",
        ),
      );
    });

    it("makes a carriage return visible", () => {
      expect(
        strictMismatch(
          "MIT",
          {
            line: 1,
            column: 12,
            found: "MIT License\r",
            expected: "MIT License",
          },
          null,
        ),
      ).toBe(
        plain(
          "  LICENSE does not match — first difference at line 1, column 12:",
          "    found:    MIT License␍",
          "    expected: MIT License",
          " ".repeat(25) + "^",
        ),
      );
    });

    it("makes trailing spaces visible", () => {
      expect(
        strictMismatch(
          "MIT",
          {
            line: 1,
            column: 12,
            found: "MIT License  ",
            expected: "MIT License",
          },
          null,
        ),
      ).toBe(
        plain(
          "  LICENSE does not match — first difference at line 1, column 12:",
          "    found:    MIT License··",
          "    expected: MIT License",
          " ".repeat(25) + "^",
        ),
      );
    });

    it("makes trailing spaces visible before a carriage return", () => {
      expect(
        strictMismatch(
          "MIT",
          {
            line: 1,
            column: 12,
            found: "MIT License  \r",
            expected: "MIT License",
          },
          null,
        ),
      ).toBe(
        plain(
          "  LICENSE does not match — first difference at line 1, column 12:",
          "    found:    MIT License··␍",
          "    expected: MIT License",
          " ".repeat(25) + "^",
        ),
      );
    });

    it("makes a tab visible", () => {
      expect(
        strictMismatch(
          "MIT",
          {
            line: 1,
            column: 4,
            found: "MIT\tLicense",
            expected: "MIT License",
          },
          null,
        ),
      ).toBe(
        plain(
          "  LICENSE does not match — first difference at line 1, column 4:",
          "    found:    MIT␉License",
          "    expected: MIT License",
          " ".repeat(17) + "^",
        ),
      );
    });

    it("clips long lines at both ends through one shared window", () => {
      expect(
        strictMismatch(
          "MIT",
          {
            line: 7,
            column: 101,
            found: "x".repeat(100) + "A" + "y".repeat(100),
            expected: "x".repeat(100) + "B" + "y".repeat(100),
          },
          null,
        ),
      ).toBe(
        plain(
          "  LICENSE does not match — first difference at line 7, column 101:",
          "    found:    " + "…" + "x".repeat(20) + "A" + "y".repeat(59) + "…",
          "    expected: " + "…" + "x".repeat(20) + "B" + "y".repeat(59) + "…",
          " ".repeat(35) + "^",
        ),
      );
    });

    it("clips only the end when the difference is near the start", () => {
      expect(
        strictMismatch(
          "MIT",
          {
            line: 1,
            column: 1,
            found: "A" + "y".repeat(100),
            expected: "B" + "y".repeat(100),
          },
          null,
        ),
      ).toBe(
        plain(
          "  LICENSE does not match — first difference at line 1, column 1:",
          "    found:    " + "A" + "y".repeat(79) + "…",
          "    expected: " + "B" + "y".repeat(79) + "…",
          " ".repeat(14) + "^",
        ),
      );
    });

    it("renders the bare entry when no difference is known", () => {
      expect(strictMismatch("MIT", null, null)).toBe(
        plain("  LICENSE does not match"),
      );
    });
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
