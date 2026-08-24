import { describe, expect, it } from "vitest";
import { renderPage } from "../../scripts/lib/render-docs.mjs";

const baseArgs = {
  index: 0,
  base: "/license-wizard/",
  assetTags: "",
  scriptTags: "",
};

function render(
  markdown: string,
  id = "flags-reference",
  title = "Flags reference",
): string {
  const section = { id, title, markdown };
  return renderPage({ ...baseArgs, section, sections: [section] });
}

const withSubs = `## Flags reference

Intro paragraph above the first subsection.

### How flags combine

Body.

### Priority when flags are combined

Body.`;

describe("docs 'On this page' navigation", () => {
  it("prepends a section-top link before the subsection links", () => {
    const html = render(withSubs);
    const topIdx = html.indexOf(
      '<a href="#flags-reference" class="docs-toc-link docs-toc-top" data-toc-target="flags-reference">Flags reference</a>',
    );
    const firstSubIdx = html.indexOf('data-toc-target="how-flags-combine"');
    expect(topIdx).toBeGreaterThan(-1);
    expect(firstSubIdx).toBeGreaterThan(-1);
    expect(topIdx).toBeLessThan(firstSubIdx);
  });

  it("targets the section heading id so it lands on the section start", () => {
    const html = render(withSubs);
    expect(html).toContain('<h2 id="flags-reference">Flags reference</h2>');
    expect(html).toContain('href="#flags-reference"');
  });

  it("omits the navigation entirely for sections without subsections", () => {
    const html = render(`## Interactive wizard

Just prose, no subsections.`);
    expect(html).not.toContain("docs-toc");
    expect(html).not.toContain("docs-toc-top");
  });
});
