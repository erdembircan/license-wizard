import type { SlotResolution, TemplateSlot } from "@licensing/TemplateSlot.js";

const VAR_TAG =
  /<<var;\s*name="([^"]*)";\s*original="([^"]*)";\s*match="([^"]*)">>/g;

const TOKEN = /<[^<>]+>|\[[^[\]]+\]/g;

const COPYRIGHT_VAR_NAME = "copyright";

/**
 * Parses an SPDX `standardLicenseTemplate` and renders it into final license
 * text.
 *
 * The template marks replaceable sections with `<<var;...>>` tags and optional
 * sections with `<<beginOptional>>` / `<<endOptional>>` markers. Only the
 * `copyright` variable is treated as user-customizable: the year, holder, and
 * owner placeholders embedded in its `original` text (e.g. `<year>`,
 * `<copyright holders>`, `[name of copyright owner]`) are the slots a project
 * author fills in. Every other variable keeps its standardized `original` value.
 */
export class LicenseTemplate {
  readonly #template: string;

  /**
   * Creates a new LicenseTemplate.
   *
   * @param template - The raw SPDX `standardLicenseTemplate` string.
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
      if (seen.has(token)) {
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
   * `<year>`). Returns the resolved values keyed by token, the slots still
   * awaiting a value, and any supplied fields that match no slot.
   *
   * @param entries - The supplied fields keyed as typed, mapped to their values.
   */
  resolveSlots(entries: Map<string, string>): SlotResolution {
    const slots = this.slots();
    const values: Record<string, string> = {};
    const unknown: string[] = [];

    for (const [field, value] of entries) {
      const slot = this.#matchSlot(slots, field);
      if (slot) {
        values[slot.token] = value;
      } else {
        unknown.push(field);
      }
    }

    const missing = slots.filter((slot) => !(slot.token in values));

    return { values, missing, unknown };
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
   * Renders the template into final license text. The `copyright` variable is
   * replaced by its `original` with each slot token substituted by the matching
   * entry in `values` (missing values leave the token unchanged); every other
   * variable is replaced by its `original`. Optional-section markers are removed,
   * keeping their enclosed content.
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
    return text.replace(TOKEN, (token) => values[token] ?? token);
  }
}
