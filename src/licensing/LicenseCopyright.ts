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
    const seen = new Set<string>();
    const merged: TemplateSlot[] = [];
    for (const slot of [...this.#body.slots(), ...this.#header.slots()]) {
      if (!seen.has(slot.token)) {
        seen.add(slot.token);
        merged.push(slot);
      }
    }
    return merged;
  }

  /**
   * Matches supplied field/value entries against the combined slots, returning
   * the values keyed by token, the slots still awaiting a value, and any fields
   * matching no slot.
   *
   * @param entries - The supplied fields keyed as typed, mapped to their values.
   */
  resolve(entries: Map<string, string>): SlotResolution {
    return resolveSlotEntries(this.slots(), entries);
  }
}
