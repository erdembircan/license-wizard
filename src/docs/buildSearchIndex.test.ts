import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
// Plain ESM, shared verbatim with the prerender script and dev plugin.
import { buildSearchIndex } from "../../scripts/lib/build-search-index.mjs";
import { slugify } from "../../scripts/lib/parse-docs.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const docSource = readFileSync(
  join(here, "..", "content", "documentation.md"),
  "utf8",
);

describe("buildSearchIndex", () => {
  it("emits a section entry and a subsection entry per heading", () => {
    const index = buildSearchIndex(
      "# T\n\n## Alpha\n\nLead body.\n\n### Sub one\n\nSub body.",
    );
    expect(index).toEqual([
      {
        id: "alpha",
        title: "Alpha",
        section: "Alpha",
        subsection: null,
        url: "docs/alpha/",
        text: "Lead body.",
        snippet: "Lead body.",
      },
      {
        id: "alpha#sub-one",
        title: "Sub one",
        section: "Alpha",
        subsection: "Sub one",
        url: "docs/alpha/#sub-one",
        text: "Sub body.",
        snippet: "Sub body.",
      },
    ]);
  });

  it("skips a section whose lead has no matchable text", () => {
    const index = buildSearchIndex("# T\n\n## Alpha\n\n### Only sub\n\nBody.");
    expect(index.map((e) => e.id)).toEqual(["alpha#only-sub"]);
  });

  it("stores base-relative URLs so any deploy base can be prepended", () => {
    const index = buildSearchIndex(docSource);
    expect(index.every((e) => e.url.startsWith("docs/"))).toBe(true);
    expect(index.some((e) => e.url.includes("#"))).toBe(true);
  });

  it("derives subsection anchors with the same slugify the renderer uses", () => {
    const index = buildSearchIndex(docSource);
    const sub = index.find((e) => e.subsection)!;
    expect(sub.url.endsWith(`#${slugify(sub.subsection)}`)).toBe(true);
  });

  it("strips Markdown syntax out of the matchable text and snippets", () => {
    const index = buildSearchIndex(
      "# T\n\n## Code\n\nRun `npx license-wizard` to **start**.\n\n```bash\nnpm i\n```",
    );
    const entry = index[0]!;
    expect(entry.text).toBe("Run npx license-wizard to start.");
    expect(entry.text).not.toContain("`");
    expect(entry.text).not.toContain("npm i");
  });

  it("truncates long bodies into a word-boundary snippet", () => {
    const long = "word ".repeat(80).trim();
    const index = buildSearchIndex(`# T\n\n## Long\n\n${long}`);
    const { snippet } = index[0]!;
    expect(snippet.length).toBeLessThanOrEqual(161);
    expect(snippet.endsWith("…")).toBe(true);
    expect(snippet).not.toContain(" …");
  });

  it("indexes every section of the real documentation", () => {
    const index = buildSearchIndex(docSource);
    const sectionRoots = index.filter((e) => !e.subsection).map((e) => e.id);
    expect(sectionRoots).toEqual([
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
});
