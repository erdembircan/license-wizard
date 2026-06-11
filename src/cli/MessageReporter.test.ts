/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import { describe, it, expect } from "vitest";
import { MessageReporter } from "@cli/MessageReporter.js";
import { RecordingSink } from "@cli/RecordingSink.js";
import type { TemplateSlot } from "@licensing/TemplateSlot.js";

const SLOTS: TemplateSlot[] = [
  { token: "<year>", label: "year" },
  { token: "<copyright holders>", label: "copyright holders" },
];

/**
 * These tests pin the reporter's *data surface* — the semantic OutputMessage it
 * emits for each outcome — independent of how that message is later worded. They
 * are the regression net for behavior (counts, identifiers, which surfaces
 * drifted); the prose itself is covered separately in ReportPresenter.test.ts.
 */
describe("MessageReporter", () => {
  function setup() {
    const sink = new RecordingSink();
    return { sink, reporter: new MessageReporter(sink) };
  }

  it("emits the usage message carrying the formatted options", () => {
    const { sink, reporter } = setup();
    reporter.usage("  --help  Show help.");

    expect(sink.messages).toEqual([
      { kind: "usage", channel: "out", options: "  --help  Show help." },
    ]);
  });

  it("emits the version message carrying the version string", () => {
    const { sink, reporter } = setup();
    reporter.version("1.0.0");

    expect(sink.messages).toEqual([
      { kind: "version", channel: "out", version: "1.0.0" },
    ]);
  });

  it("emits a tokens message carrying the license and its slots", () => {
    const { sink, reporter } = setup();
    reporter.tokens("MIT", SLOTS);

    expect(sink.messages).toEqual([
      { kind: "tokens", channel: "out", licenseId: "MIT", slots: SLOTS },
    ]);
  });

  it("emits a generated message with the empty save target when nothing is saved", () => {
    const { sink, reporter } = setup();
    reporter.generated("MIT", "");

    expect(sink.messages).toEqual([
      { kind: "generated", channel: "out", licenseId: "MIT", savedTo: "" },
    ]);
  });

  it("carries the save location on a generated message when persisted", () => {
    const { sink, reporter } = setup();
    reporter.generated("MIT", ".licensewizardrc.json");

    expect(sink.messages).toEqual([
      {
        kind: "generated",
        channel: "out",
        licenseId: "MIT",
        savedTo: ".licensewizardrc.json",
      },
    ]);
  });

  it("passes the dry-run report through as a dryRun message", () => {
    const { sink, reporter } = setup();
    reporter.dryRun({
      licenseId: "MIT",
      content: "RENDERED LICENSE TEXT",
      save: { action: "save", target: ".licensewizardrc.json" },
      manifests: ["package.json", "composer.json"],
    });

    expect(sink.messages).toEqual([
      {
        kind: "dryRun",
        channel: "out",
        licenseId: "MIT",
        content: "RENDERED LICENSE TEXT",
        save: { action: "save", target: ".licensewizardrc.json" },
        manifests: ["package.json", "composer.json"],
      },
    ]);
  });

  it("emits the missing-fields message on the error channel", () => {
    const { sink, reporter } = setup();
    const missing: TemplateSlot[] = [
      { token: "<copyright holders>", label: "copyright holders" },
    ];
    reporter.missingFields("MIT", missing);

    expect(sink.messages).toEqual([
      { kind: "missingFields", channel: "err", licenseId: "MIT", missing },
    ]);
  });

  it("emits the unknown-fields message with the offending and accepted fields", () => {
    const { sink, reporter } = setup();
    reporter.unknownFields("MIT", ["author"], SLOTS);

    expect(sink.messages).toEqual([
      {
        kind: "unknownFields",
        channel: "err",
        licenseId: "MIT",
        unknown: ["author"],
        slots: SLOTS,
      },
    ]);
  });

  it("emits the license-not-found message with its suggestions", () => {
    const { sink, reporter } = setup();
    const suggestions = [
      { licenseId: "Apache-2.0", name: "Apache License 2.0" },
      { licenseId: "Apache-1.1", name: "Apache Software License 1.1" },
    ];
    reporter.licenseNotFound("apache-2-0", suggestions);

    expect(sink.messages).toEqual([
      {
        kind: "licenseNotFound",
        channel: "err",
        licenseId: "apache-2-0",
        suggestions,
      },
    ]);
  });

  it("records whether manifests were checked on a verify match", () => {
    const { sink, reporter } = setup();
    reporter.verifyMatch({ licenseId: "MIT", license: "match", manifests: [] });
    reporter.verifyMatch({
      licenseId: "MIT",
      license: "match",
      manifests: [{ name: "package.json", declared: "MIT", status: "match" }],
    });

    expect(sink.messages).toEqual([
      {
        kind: "verifyMatch",
        channel: "out",
        licenseId: "MIT",
        manifestsChecked: false,
      },
      {
        kind: "verifyMatch",
        channel: "out",
        licenseId: "MIT",
        manifestsChecked: true,
      },
    ]);
  });

  it("reduces a verify fix to the regenerated license and only the reconciled manifests", () => {
    const { sink, reporter } = setup();
    reporter.verifyFixed({
      licenseId: "MIT",
      license: "fixed",
      manifests: [
        { name: "composer.json", declared: "Apache-2.0", status: "fixed" },
        { name: "package.json", declared: "MIT", status: "match" },
      ],
    });

    // The already-matching manifest is dropped; only the fixed one survives.
    expect(sink.messages).toEqual([
      {
        kind: "verifyFixed",
        channel: "out",
        licenseId: "MIT",
        licenseRegenerated: true,
        manifests: [{ name: "composer.json", was: "Apache-2.0" }],
      },
    ]);
  });

  it("reduces a verify mismatch to only the drifted surfaces, preserving a null declaration", () => {
    const { sink, reporter } = setup();
    reporter.verifyMismatch({
      licenseId: "MIT",
      license: "mismatch",
      manifests: [
        { name: "composer.json", declared: "Apache-2.0", status: "mismatch" },
        { name: "package.json", declared: null, status: "mismatch" },
      ],
    });

    expect(sink.messages).toEqual([
      {
        kind: "verifyMismatch",
        channel: "err",
        licenseId: "MIT",
        licenseMismatch: true,
        manifests: [
          { name: "composer.json", declared: "Apache-2.0" },
          { name: "package.json", declared: null },
        ],
      },
    ]);
  });

  it("emits the no-eligible-files message", () => {
    const { sink, reporter } = setup();
    reporter.headersNoFiles("MIT");

    expect(sink.messages).toEqual([
      { kind: "headersNoFiles", channel: "out", licenseId: "MIT" },
    ]);
  });

  it("passes the header write tally through as a headersGenerated message", () => {
    const { sink, reporter } = setup();
    reporter.headersGenerated({
      licenseId: "MIT",
      style: "short",
      total: 30,
      written: 25,
      unchanged: 5,
      skipped: ["c.test.ts", "page.php"],
    });

    expect(sink.messages).toEqual([
      {
        kind: "headersGenerated",
        channel: "out",
        licenseId: "MIT",
        style: "short",
        total: 30,
        written: 25,
        unchanged: 5,
        skipped: ["c.test.ts", "page.php"],
      },
    ]);
  });

  it("passes the header dry-run report through as a headersDryRun message", () => {
    const { sink, reporter } = setup();
    reporter.headersDryRun({
      licenseId: "MIT",
      style: "short",
      files: ["a.ts", "b.ts"],
      skipped: ["c.test.ts"],
      sample: "// SAMPLE HEADER",
    });

    expect(sink.messages).toEqual([
      {
        kind: "headersDryRun",
        channel: "out",
        licenseId: "MIT",
        style: "short",
        files: ["a.ts", "b.ts"],
        skipped: ["c.test.ts"],
        sample: "// SAMPLE HEADER",
      },
    ]);
  });

  it("passes a force-header outcome through as a headersForceApplied message", () => {
    const { sink, reporter } = setup();
    reporter.headersForceApplied({
      licenseId: "MIT",
      style: "short",
      file: "page.php",
      outcome: "written",
      dryRun: false,
    });

    expect(sink.messages).toEqual([
      {
        kind: "headersForceApplied",
        channel: "out",
        licenseId: "MIT",
        style: "short",
        file: "page.php",
        outcome: "written",
        dryRun: false,
      },
    ]);
  });

  it("carries the stripped files and total on a removal message", () => {
    const { sink, reporter } = setup();
    reporter.headersRemoved({ removed: ["a.ts", "b.ts"], total: 5 });

    expect(sink.messages).toEqual([
      {
        kind: "headersRemoved",
        channel: "out",
        removed: ["a.ts", "b.ts"],
        total: 5,
      },
    ]);
  });

  it("carries the would-strip files and total on a removal dry-run message", () => {
    const { sink, reporter } = setup();
    reporter.headersRemoveDryRun({ removed: ["a.ts"], total: 3 });

    expect(sink.messages).toEqual([
      {
        kind: "headersRemoveDryRun",
        channel: "out",
        removed: ["a.ts"],
        total: 3,
      },
    ]);
  });

  it("emits the header verify match with the scanned total", () => {
    const { sink, reporter } = setup();
    reporter.headersVerifyMatch({
      licenseId: "MIT",
      style: "short",
      total: 4,
      matched: ["a.ts", "b.ts", "c.ts"],
      missing: [],
      drifted: [],
      fixed: [],
      skipped: ["page.php"],
    });

    expect(sink.messages).toEqual([
      {
        kind: "headersVerifyMatch",
        channel: "out",
        licenseId: "MIT",
        style: "short",
        total: 4,
        skipped: ["page.php"],
      },
    ]);
  });

  it("derives added/rewritten counts from the missing and drifted files on a header fix", () => {
    const { sink, reporter } = setup();
    reporter.headersVerifyFixed({
      licenseId: "MIT",
      style: "short",
      total: 5,
      matched: [],
      missing: ["a.ts", "b.ts"],
      drifted: [
        { file: "c.ts", declares: null, reason: "outdated" },
        { file: "d.ts", declares: null, reason: "edited" },
        { file: "e.ts", declares: null, reason: "outdated" },
      ],
      fixed: ["a.ts", "b.ts", "c.ts", "d.ts", "e.ts"],
      skipped: [],
    });

    // added = missing.length (2); rewritten = drifted.length (3).
    expect(sink.messages).toEqual([
      {
        kind: "headersVerifyFixed",
        channel: "out",
        licenseId: "MIT",
        style: "short",
        added: 2,
        rewritten: 3,
        skipped: [],
      },
    ]);
  });

  it("reduces each drifted header to its note kind on a header mismatch", () => {
    const { sink, reporter } = setup();
    reporter.headersVerifyMismatch({
      licenseId: "MIT",
      style: "short",
      total: 4,
      matched: [],
      missing: ["a.ts"],
      drifted: [
        {
          file: "b.ts",
          declares: { licenseId: "Apache-2.0", style: "short" },
          reason: "outdated",
        },
        {
          file: "c.ts",
          declares: { licenseId: "MIT", style: "short" },
          reason: "edited",
        },
        { file: "d.ts", declares: null, reason: "unknown" },
      ],
      fixed: [],
      skipped: [],
    });

    expect(sink.messages).toEqual([
      {
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
      },
    ]);
  });

  it("emits a plain error message on the error channel", () => {
    const { sink, reporter } = setup();
    reporter.error("something went wrong");

    expect(sink.messages).toEqual([
      { kind: "error", channel: "err", message: "something went wrong" },
    ]);
  });
});
