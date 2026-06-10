import type { LicenseDetail } from "@licensing/LicenseDetail.js";
import { LicenseTemplate } from "@licensing/LicenseTemplate.js";
import { resolveSlotEntries } from "@licensing/SpdxTemplate.js";
import type { SlotResolution, TemplateSlot } from "@licensing/TemplateSlot.js";

/**
 * The customizable copyright of a license across both surfaces that can carry
 * it: the LICENSE body (`standardLicenseTemplate`) and the source-file header
 * notice (`standardLicenseHeaderTemplate`). Some licenses expose fillable
 * copyright fields in one but not the other — the GPL family, for instance, has
 * none in its body yet `<year>` / `<name of author>` in its header — so neither
 * template alone is the full picture.
 *
 * This unions the copyright slots of both templates and resolves supplied values
 * against that union, so the wizard asks for (and `--get-tokens` lists, and
 * `--set` accepts) every field either surface needs — and a full header can be
 * filled even when the body has no copyright of its own. Both templates share
 * the identical SPDX markup, so each is parsed with {@link LicenseTemplate};
 * a supplied value keyed by token then fills whichever surface uses that token.
 */
export class LicenseCopyright {
  readonly #body: LicenseTemplate;
  readonly #header: LicenseTemplate;

  /**
   * Builds the copyright view of a resolved license from its body and header
   * templates.
   *
   * @param detail - The resolved license detail.
   */
  static fromDetail(detail: LicenseDetail): LicenseCopyright {
    return new LicenseCopyright(
      detail.standardLicenseTemplate ?? "",
      detail.standardLicenseHeaderTemplate ?? "",
    );
  }

  /**
   * Creates a LicenseCopyright over the raw body and header template strings.
   *
   * @param bodyTemplate - The license body template markup.
   * @param headerTemplate - The license header template markup.
   */
  constructor(bodyTemplate: string, headerTemplate: string) {
    this.#body = new LicenseTemplate(bodyTemplate);
    this.#header = new LicenseTemplate(headerTemplate);
  }

  /**
   * The customizable copyright slots from the body and the header combined, in
   * document order (body first) with duplicates removed, so a token shared by
   * both surfaces is asked for once.
   */
  slots(): TemplateSlot[] {
    return dedupe([...this.#body.slots(), ...this.#header.slots()]);
  }

  /**
   * The copyright slots that must be filled for the surfaces a run actually
   * generates: always the LICENSE body's, plus the header's only when a `full`
   * header is requested. A `short` header needs no copyright to be valid and an
   * absent one needs none at all, so neither adds a required field. Discovery
   * (`--get-tokens`, the interactive Customize prompts) still uses the complete
   * {@link slots} union; this narrower set is what generation validates against,
   * so customizing the LICENSE alone is never forced to supply header-only
   * fields it won't use.
   *
   * @param fullHeader - Whether a `full` header is being written this run.
   */
  requiredSlots(fullHeader: boolean): TemplateSlot[] {
    return fullHeader ? this.slots() : dedupe(this.#body.slots());
  }

  /**
   * Matches supplied field/value entries against the slots required for the
   * surfaces being generated (see {@link requiredSlots}), returning the values
   * keyed by token, the slots still awaiting a value, and any fields matching no
   * required slot.
   *
   * @param entries - The supplied fields keyed as typed, mapped to their values.
   * @param fullHeader - Whether a `full` header is being written this run.
   */
  resolveFor(
    entries: Map<string, string>,
    fullHeader: boolean,
  ): SlotResolution {
    return resolveSlotEntries(this.requiredSlots(fullHeader), entries);
  }
}

/**
 * Returns the slots in order with duplicate tokens removed, so a token shared by
 * the body and the header is represented once.
 */
function dedupe(slots: TemplateSlot[]): TemplateSlot[] {
  const seen = new Set<string>();
  const unique: TemplateSlot[] = [];
  for (const slot of slots) {
    if (!seen.has(slot.token)) {
      seen.add(slot.token);
      unique.push(slot);
    }
  }
  return unique;
}
