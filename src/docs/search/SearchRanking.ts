/**
 * Pure matching and ranking for the documentation search palette. Kept free of
 * any DOM so it can be unit-tested directly and reused by the palette UI.
 */

export interface SearchEntry {
  id: string;
  title: string;
  section: string;
  subsection: string | null;
  url: string;
  text: string;
  snippet: string;
}

/** Escapes a string for safe interpolation into a regular expression. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Splits a raw query into lowercased, non-empty search terms. */
export function tokenize(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

/**
 * Ranks an entry against the query terms. Returns -1 when any term is missing
 * (terms are ANDed), otherwise a score that favours title hits over body hits.
 */
export function scoreEntry(entry: SearchEntry, terms: string[]): number {
  const title = entry.title.toLowerCase();
  const section = entry.section.toLowerCase();
  const text = entry.text.toLowerCase();
  let total = 0;

  for (const term of terms) {
    let best: number;
    if (title === term) best = 100;
    else if (title.startsWith(term)) best = 80;
    else if (title.includes(term)) best = 60;
    else if (section.includes(term)) best = 30;
    else if (text.includes(term)) best = 12;
    else return -1;
    total += best;
  }
  return total;
}

/**
 * Filters and ranks the index for a query, returning at most `max` entries.
 * Ties keep their original document order so results stay stable and readable.
 */
export function rankEntries(
  entries: SearchEntry[],
  query: string,
  max: number,
): SearchEntry[] {
  const terms = tokenize(query);
  if (terms.length === 0) return [];

  const scored = entries
    .map((entry, order) => ({ entry, score: scoreEntry(entry, terms), order }))
    .filter((s) => s.score >= 0);

  scored.sort((a, b) => b.score - a.score || a.order - b.order);
  return scored.slice(0, max).map((s) => s.entry);
}
