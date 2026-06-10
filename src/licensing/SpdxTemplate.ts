import type { SlotResolution, TemplateSlot } from "@licensing/TemplateSlot.js";

const VAR_TAG =
  /<<var;\s*name="([^"]*)";\s*original="([^"]*)";\s*match="([^"]*)">>/g;

const TOKEN = /<[^<>]+>|\[[^[\]]+\]/g;

const COPYRIGHT_VAR_NAME = "copyright";

/**
 * Base for the SPDX template surfaces — the license body
 * (`standardLicenseTemplate`) and the source-file header
 * (`standardLicenseHeaderTemplate`). Both use the identical `<<var;...>>` and
 * `<<beginOptional>>` / `<<endOptional>>` markup, so the parsing, slot
 * discovery, and substitution live here once and the two domain subclasses
 * ({@link LicenseTemplate} and {@link HeaderTemplate}) inherit them unchanged.
 *
 * Only the `copyright` variable is treated as user-customizable: the year,
 * holder, and owner placeholders embedded in its `original` text (e.g.
 * `<year>`, `<copyright holders>`, `[name of copyright owner]`) are the slots a
 * project author fills in. Every other variable keeps its standardized
 * `original` value.
 */
export abstract class SpdxTemplate {
  readonly #template: string;

  /**
   * Creates a new template from raw SPDX template markup.
   *
   * @param template - The raw SPDX template string.
   */
  constructor(template: string) {
    this.#template = template;
  }

  /**
   * Returns the customizable copyright slots, in document order with duplicates
   * removed. Each slot's `token` is the exact bracket text to replace and its
   * `label` is the human-readable inner text shown to the user. Returns an empty
   * array when the template has no `copyright` variable or no embedded slots.
   */
  slots(): TemplateSlot[] {
    const original = this.#copyrightOriginal();
    if (original === null) {
      return [];
    }

    const seen = new Set<string>();
    const slots: TemplateSlot[] = [];

    for (const match of original.matchAll(TOKEN)) {
      const token = match[0];
      if (seen.has(token) || !isFillableSlot(token)) {
        continue;
      }
      seen.add(token);
      slots.push({ token, label: token.slice(1, -1) });
    }

    return slots;
  }

  /**
   * Matches supplied field/value entries against this template's copyright slots
   * and partitions the outcome. A field matches a slot by its label
   * (case-insensitively, e.g. `year`) or by its exact bracket token (e.g.
   * `<year>`). A field whose value is empty or whitespace-only is treated as
   * unfilled and reported among the missing slots. Returns the resolved values
   * keyed by token, the slots still awaiting a value, and any supplied fields
   * that match no slot.
   *
   * @param entries - The supplied fields keyed as typed, mapped to their values.
   */
  resolveSlots(entries: Map<string, string>): SlotResolution {
    const slots = this.slots();
    const values: Record<string, string> = {};
    const unknown: string[] = [];

    for (const [field, value] of entries) {
      const slot = this.#matchSlot(slots, field);
      if (!slot) {
        unknown.push(field);
        continue;
      }
      // An empty or whitespace-only value is not a value: leaving it out keeps
      // the slot in `missing`, so a customized license is never written with a
      // blank copyright line that silently passed the "field is present" check.
      if (value.trim() !== "") {
        values[slot.token] = value;
      }
    }

    const missing = slots.filter((slot) => !(slot.token in values));

    return { values, missing, unknown };
  }

  /**
   * Renders the template into final text. The `copyright` variable is replaced
   * by its `original` with each slot token substituted by the matching entry in
   * `values` (missing values leave the token unchanged); every other variable is
   * replaced by its `original`. Optional-section markers are removed, keeping
   * their enclosed content.
   *
   * @param values - Slot values keyed by token (e.g. `{ "<year>": "2026" }`).
   */
  render(values: Record<string, string>): string {
    return this.#template
      .replace(VAR_TAG, (_full, name: string, original: string) =>
        name === COPYRIGHT_VAR_NAME
          ? this.#applyValues(original, values)
          : original,
      )
      .replace(/<<beginOptional>>/g, "")
      .replace(/<<endOptional>>/g, "");
  }

  /**
   * Finds the slot a supplied field refers to, matching either its label
   * (case-insensitively) or its exact bracket token. Returns undefined when no
   * slot matches.
   */
  #matchSlot(slots: TemplateSlot[], field: string): TemplateSlot | undefined {
    const normalized = field.toLowerCase();
    return slots.find(
      (slot) => slot.token === field || slot.label.toLowerCase() === normalized,
    );
  }

  /**
   * Returns the `original` text of the `copyright` variable, or null when the
   * template has no such variable.
   */
  #copyrightOriginal(): string | null {
    for (const match of this.#template.matchAll(VAR_TAG)) {
      if (match[1] === COPYRIGHT_VAR_NAME) {
        return match[2];
      }
    }
    return null;
  }

  /**
   * Substitutes each bracket token in the given text with its value, leaving
   * tokens without a provided value unchanged.
   */
  #applyValues(text: string, values: Record<string, string>): string {
    return text.replace(TOKEN, (token) =>
      isFillableSlot(token) ? (values[token] ?? token) : token,
    );
  }
}

/**
 * Reports whether a bracket token is a fillable copyright field rather than a
 * concrete piece of the notice. The `original` of a copyright variable can carry
 * angle-bracketed URLs or emails that are literal content — the GFDL family's
 * `<http://fsf.org/>`, curl's `<daniel@haxx.se>` — which must never be offered
 * as a field to fill or be overwritten by a supplied value. Anything that reads
 * like a URL or email is excluded; the year/holder/owner placeholders remain.
 *
 * @param token - The exact bracket text discovered by {@link TOKEN}.
 */
function isFillableSlot(token: string): boolean {
  const inner = token.slice(1, -1);
  return !/:\/\/|@|^www\./i.test(inner);
}
