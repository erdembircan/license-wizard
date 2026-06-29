import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
// The parser is plain ESM so the prerender script (also plain Node) and these
// tests share exactly the same implementation.
import {
  getSubsections,
  parseDocumentation,
  slugify,
} from "../../scripts/lib/parse-docs.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const docSource = readFileSync(
  join(here, "..", "content", "documentation.md"),
  "utf8",
);

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Getting started")).toBe("getting-started");
  });

  it("collapses punctuation and symbols", () => {
    expect(slugify("Verify & CI")).toBe("verify-ci");
    expect(slugify("One-shot generation")).toBe("one-shot-generation");
  });
});

describe("parseDocumentation", () => {
  it("captures the H1 as the title and the lead as intro", () => {
    const { title, intro } = parseDocumentation(
      "# My Docs\n\nWelcome.\n\n## First\n\nBody.",
    );
    expect(title).toBe("My Docs");
    expect(intro).toContain("Welcome.");
    expect(intro).not.toContain("## First");
  });

  it("splits on ## headings, keeping each heading with its body", () => {
    const { sections } = parseDocumentation(
      "# T\n\n## Alpha\n\nA body.\n\n## Beta\n\nB body.",
    );
    expect(sections.map((s) => s.id)).toEqual(["alpha", "beta"]);
    expect(sections[0]!.title).toBe("Alpha");
    expect(sections[0]!.markdown).toContain("## Alpha");
    expect(sections[0]!.markdown).toContain("A body.");
    expect(sections[0]!.markdown).not.toContain("Beta");
  });

  it("parses the real documentation.md into the expected sections", () => {
    const { sections } = parseDocumentation(docSource);
    expect(sections.map((s) => s.id)).toEqual([
      "getting-started",
      "interactive-wizard",
      "one-shot-generation",
      "source-file-headers",
      "verify-ci",
      "apply-saved-config",
      "configuration-files",
      "scripting-agents",
      "flags-reference",
    ]);
  });

  it("keeps every cross-section link pointing at a real section", () => {
    const { sections } = parseDocumentation(docSource);
    const ids = new Set(sections.map((s) => s.id));
    const linkRe = /\/license-wizard\/docs\/([a-z0-9-]+)\//g;
    for (const section of sections) {
      for (const match of section.markdown.matchAll(linkRe)) {
        expect(ids.has(match[1]!)).toBe(true);
      }
    }
  });
});

describe("getSubsections", () => {
  it("lists each ### heading as a slugged { id, title } in order", () => {
    const md =
      "## Section\n\nIntro.\n\n### First step\n\nA.\n\n### Second step\n\nB.";
    expect(getSubsections(md)).toEqual([
      { id: "first-step", title: "First step" },
      { id: "second-step", title: "Second step" },
    ]);
  });

  it("returns an empty array when a section has no subsections", () => {
    expect(getSubsections("## Lonely\n\nJust a body, no headings.")).toEqual(
      [],
    );
  });

  it("ignores ### lines inside fenced code blocks", () => {
    const md =
      "## Shell\n\n### Real heading\n\n```bash\n### not a heading\necho hi\n```\n\n### Another";
    expect(getSubsections(md)).toEqual([
      { id: "real-heading", title: "Real heading" },
      { id: "another", title: "Another" },
    ]);
  });

  it("derives ids that match the heading anchors the renderer assigns", () => {
    const { sections } = parseDocumentation(docSource);
    const headers = sections.find((s) => s.id === "source-file-headers");
    expect(getSubsections(headers!.markdown).map((s) => s.title)).toEqual([
      "Two styles",
      "Comment style",
      "What gets a header",
      "Safe to re-run",
      "Forcing a header into a skipped file",
      "Removing headers",
    ]);
  });
});
