/**
 * Builds the documentation search index from the single Markdown source. The
 * index is what powers the Cmd-K search palette on the docs pages: a flat,
 * ordered list of entries at section (`##`) and subsection (`###`) granularity,
 * each carrying enough plain text to match against and a short snippet to show.
 *
 * URLs are stored base-relative (e.g. `docs/getting-started/`) so the same
 * index serves both `pnpm dev` (base `/`) and the published site
 * (base `/license-wizard/`) — the client prepends the active base. This shares
 * the parser and slug logic with the page renderer, so anchors here always line
 * up with the heading ids emitted into the HTML.
 */
import { parseDocumentation, slugify } from "./parse-docs.mjs";

const SNIPPET_LENGTH = 160;

/** Strips Markdown down to readable plain text for matching and snippets. */
function toPlainText(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ") // fenced code blocks
    .replace(/`([^`]+)`/g, "$1") // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links -> link text
    .replace(/^\s{0,3}#{1,6}\s+/gm, "") // heading markers
    .replace(/^\s*>\s?/gm, "") // blockquote markers
    .replace(/^\s*[-*+]\s+/gm, "") // list bullets
    .replace(/^\s*\|.*$/gm, (row) => row.replace(/\|/g, " ")) // table pipes
    .replace(/\*\*([^*]+)\*\*/g, "$1") // bold
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1$2") // italics
    .replace(/\s+/g, " ")
    .trim();
}

/** Truncates plain text to a snippet, breaking on a word boundary. */
function toSnippet(text) {
  if (text.length <= SNIPPET_LENGTH) return text;
  const clipped = text.slice(0, SNIPPET_LENGTH);
  const lastSpace = clipped.lastIndexOf(" ");
  return `${(lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped).trim()}…`;
}

/**
 * Splits a section's Markdown into its lead (the body directly under the `##`
 * heading, before any `###`) and one block per `###` subsection.
 */
function splitSubsections(markdown) {
  const lines = markdown.split("\n");
  const leadLines = [];
  const subsections = [];
  let current = null;

  for (const line of lines) {
    if (/^## .+$/.test(line)) continue; // the section heading itself
    const h3 = line.match(/^### (.+)$/);
    if (h3) {
      current = { title: h3[1].trim(), lines: [] };
      subsections.push(current);
      continue;
    }
    (current ? current.lines : leadLines).push(line);
  }

  return {
    lead: leadLines.join("\n").trim(),
    subsections: subsections.map((s) => ({
      title: s.title,
      body: s.lines.join("\n").trim(),
    })),
  };
}

/**
 * Turns the documentation Markdown into the ordered search index. Each section
 * yields one entry for its lead plus one entry per subsection; entries with no
 * matchable text (e.g. an empty lead above the first subsection) are skipped.
 */
export function buildSearchIndex(source) {
  const { sections } = parseDocumentation(source);
  const entries = [];

  for (const section of sections) {
    const url = `docs/${section.id}/`;
    const { lead, subsections } = splitSubsections(section.markdown);

    const leadText = toPlainText(lead);
    if (leadText) {
      entries.push({
        id: section.id,
        title: section.title,
        section: section.title,
        subsection: null,
        url,
        text: leadText,
        snippet: toSnippet(leadText),
      });
    }

    for (const sub of subsections) {
      const anchor = slugify(sub.title);
      const text = toPlainText(sub.body);
      entries.push({
        id: `${section.id}#${anchor}`,
        title: sub.title,
        section: section.title,
        subsection: sub.title,
        url: `${url}#${anchor}`,
        text,
        snippet: toSnippet(text),
      });
    }
  }

  return entries;
}
