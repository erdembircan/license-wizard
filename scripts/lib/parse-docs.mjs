/**
 * Parses the single documentation Markdown file into an ordered list of
 * sections. Each top-level (`##`) heading begins a section whose id is derived
 * from its text; everything above the first `##` is the page intro.
 *
 * This is the single source of truth: the styled pages, the sidebar, and the
 * raw `documentation.md` all derive from the same file parsed here.
 */

/** Turns a heading into a URL-safe slug, e.g. "Verify & CI" -> "verify-ci". */
export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Splits the documentation Markdown into `{ title, intro, sections }`, where
 * each section is `{ id, title, markdown }` and `markdown` includes the
 * section's own `##` heading line.
 */
export function parseDocumentation(source) {
  const lines = source.split("\n");

  let title = "Documentation";
  const introLines = [];
  const sections = [];
  let current = null;

  for (const line of lines) {
    const h1 = line.match(/^# (.+)$/);
    const h2 = line.match(/^## (.+)$/);

    if (h2) {
      const heading = h2[1].trim();
      current = { id: slugify(heading), title: heading, lines: [line] };
      sections.push(current);
      continue;
    }

    if (current) {
      current.lines.push(line);
      continue;
    }

    if (h1 && title === "Documentation") {
      title = h1[1].trim();
    }
    introLines.push(line);
  }

  return {
    title,
    intro: introLines.join("\n").trim(),
    sections: sections.map(({ id, title, lines }) => ({
      id,
      title,
      markdown: lines.join("\n").trim(),
    })),
  };
}
