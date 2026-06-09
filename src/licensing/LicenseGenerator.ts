import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";
import type { LicenseDetail } from "@licensing/LicenseDetail.js";
import { LICENSE_FILENAME } from "@licensing/LicenseFilename.js";
import { LicenseTemplate } from "@licensing/LicenseTemplate.js";
import type { LicenseRepository } from "@licensing/LicenseRepository.js";
import { wrapText } from "@licensing/TextWrapper.js";

/**
 * Generates a license file by fetching the selected license's text and
 * writing it to the root of the working directory.
 *
 * When slot values are supplied they are substituted into the canonical license
 * text — the authoritative, display-ready form, which for parameterized licenses
 * already carries the placeholder tokens — falling back to the SPDX template only
 * for the few licenses whose canonical text cannot be parameterized in place. In
 * every case the text is hard-wrapped to a conventional column width before being
 * written, since SPDX stores each paragraph as a single unwrapped line.
 */
export class LicenseGenerator {
  readonly #repository: LicenseRepository;
  readonly #writer: IFileSystemWriter;

  /**
   * Creates a new LicenseGenerator.
   *
   * @param repository - The repository used to fetch license details.
   * @param writer - The writer used to persist the license file.
   */
  constructor(repository: LicenseRepository, writer: IFileSystemWriter) {
    this.#repository = repository;
    this.#writer = writer;
  }

  /**
   * Fetches the license for the given SPDX identifier and writes it to a
   * `LICENSE` file in the working directory, overwriting any existing file.
   *
   * When `slotValues` contains entries they are filled into the canonical text
   * (see {@link render}); otherwise the canonical text is written unchanged. The
   * resulting text is hard-wrapped to a conventional column width before writing.
   *
   * @param licenseId - The SPDX identifier of the license to generate.
   * @param slotValues - Copyright slot values keyed by token (e.g. `{ "<year>": "2026" }`).
   */
  async generate(
    licenseId: string,
    slotValues: Record<string, string> = {},
  ): Promise<void> {
    await this.#writer.write(
      LICENSE_FILENAME,
      await this.render(licenseId, slotValues),
    );
  }

  /**
   * Produces the exact `LICENSE` file content for the given selection without
   * writing it, so callers that need to compare against an existing file (such
   * as verification) and the `generate` path that writes it share one source of
   * truth for how a license is rendered.
   *
   * When `slotValues` contains entries they are filled into the canonical text
   * (see {@link LicenseGenerator}); otherwise the canonical text is used
   * unchanged. The resulting text is hard-wrapped to a conventional column width.
   *
   * @param licenseId - The SPDX identifier of the license to render.
   * @param slotValues - Copyright slot values keyed by token (e.g. `{ "<year>": "2026" }`).
   */
  async render(
    licenseId: string,
    slotValues: Record<string, string> = {},
  ): Promise<string> {
    const detail = await this.#repository.getLicense(licenseId);

    return wrapText(this.#fill(detail, slotValues));
  }

  /**
   * Produces the license body with the supplied copyright values filled in. The
   * canonical `licenseText` is the source of truth: for every parameterized
   * license (MIT, the BSD family, Apache, NCSA, …) it carries the very
   * placeholder tokens the template exposes, so substituting the values straight
   * into it yields output that is byte-faithful to the canonical text — no stray
   * matchable whitespace, no optional clauses, no dropped blank lines.
   *
   * The SPDX `standardLicenseTemplate` is a *matching* grammar, not a rendering
   * source, so it is used only as a fallback for the few licenses whose canonical
   * text cannot be parameterized in place: one that ships a pre-filled example
   * instead of placeholders (ISC), or one whose canonical text has no copyright
   * line at all (Zlib). With no `--set` values, the canonical text is returned
   * unchanged.
   *
   * @param detail - The fetched license detail.
   * @param slotValues - Copyright slot values keyed by token (e.g. `{ "<year>": "2026" }`).
   */
  #fill(detail: LicenseDetail, slotValues: Record<string, string>): string {
    const tokens = Object.keys(slotValues);
    if (tokens.length === 0) {
      return detail.licenseText;
    }

    if (tokens.every((token) => detail.licenseText.includes(token))) {
      return tokens.reduce(
        (text, token) => text.split(token).join(slotValues[token]),
        detail.licenseText,
      );
    }

    return detail.standardLicenseTemplate
      ? this.#tidyTemplateOutput(
          new LicenseTemplate(detail.standardLicenseTemplate).render(
            slotValues,
          ),
        )
      : detail.licenseText;
  }

  /**
   * Cleans the stray whitespace the SPDX matching-template leaves when rendered
   * as display text: the padding spaces a variable's `original` carries at the
   * end of a line, and the single leading space a stripped optional marker leaves
   * before the copyright. Real indentation — two or more leading spaces, such as
   * a license's numbered conditions — is preserved. Only the template-fallback
   * path needs this; the canonical-text path is already clean.
   *
   * @param text - The template-rendered license body.
   */
  #tidyTemplateOutput(text: string): string {
    return text
      .split("\n")
      .map((line) => line.replace(/[ \t]+$/, "").replace(/^ (?=\S)/, ""))
      .join("\n");
  }
}
