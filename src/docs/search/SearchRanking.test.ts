import { describe, expect, it } from "vitest";
import {
  escapeRegExp,
  rankEntries,
  tokenize,
  type SearchEntry,
} from "./SearchRanking";

function entry(partial: Partial<SearchEntry> & { title: string }): SearchEntry {
  return {
    id: partial.id ?? partial.title.toLowerCase(),
    title: partial.title,
    section: partial.section ?? partial.title,
    subsection: partial.subsection ?? null,
    url: partial.url ?? `docs/${partial.title.toLowerCase()}/`,
    text: partial.text ?? "",
    snippet: partial.snippet ?? "",
  };
}

const corpus: SearchEntry[] = [
  entry({ title: "Getting started", text: "install and run the wizard" }),
  entry({ title: "Source-file headers", text: "spdx tag lines per file" }),
  entry({
    title: "Two styles",
    section: "Source-file headers",
    subsection: "Two styles",
    text: "short and full headers",
  }),
  entry({ title: "Flags reference", text: "every command line flag listed" }),
];

describe("tokenize", () => {
  it("lowercases and splits on whitespace, dropping blanks", () => {
    expect(tokenize("  Source   FILE ")).toEqual(["source", "file"]);
    expect(tokenize("   ")).toEqual([]);
  });
});

describe("rankEntries", () => {
  it("returns nothing for an empty query", () => {
    expect(rankEntries(corpus, "   ", 8)).toEqual([]);
  });

  it("ranks title matches above body-only matches", () => {
    const results = rankEntries(corpus, "headers", 8);
    expect(results[0]?.title).toBe("Source-file headers");
  });

  it("ANDs terms — every term must appear somewhere", () => {
    expect(rankEntries(corpus, "headers spdx", 8).map((e) => e.title)).toEqual([
      "Source-file headers",
    ]);
    expect(rankEntries(corpus, "headers nonexistentword", 8)).toEqual([]);
  });

  it("matches against body text when the title does not", () => {
    expect(rankEntries(corpus, "install", 8).map((e) => e.title)).toEqual([
      "Getting started",
    ]);
  });

  it("caps the number of results", () => {
    expect(rankEntries(corpus, "e", 2)).toHaveLength(2);
  });
});

describe("escapeRegExp", () => {
  it("escapes characters that would otherwise be regex syntax", () => {
    const safe = escapeRegExp("a.b*c+");
    expect(new RegExp(safe).test("a.b*c+")).toBe(true);
    expect(new RegExp(safe).test("axbxc")).toBe(false);
  });
});
