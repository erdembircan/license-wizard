import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";
import { LicenseTemplate } from "@licensing/LicenseTemplate.js";
import type { LicenseRepository } from "@licensing/LicenseRepository.js";
import { wrapText } from "@licensing/TextWrapper.js";

const LICENSE_FILENAME = "LICENSE";

/**
 * Generates a license file by fetching the selected license's text and
 * writing it to the root of the working directory.
 *
 * When slot values are supplied the license's SPDX template is rendered with
 * those values substituted into the copyright line; otherwise the standard
 * (non-template) license text is used. In both cases the text is hard-wrapped
 * to a conventional column width before being written, since SPDX stores each
 * paragraph as a single unwrapped line.
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
   * When `slotValues` contains entries and the license has an SPDX template,
   * the template is rendered with those values substituted into the copyright
   * line; otherwise the standard license text is used. The resulting text is
   * hard-wrapped to a conventional column width before being written.
   *
   * @param licenseId - The SPDX identifier of the license to generate.
   * @param slotValues - Copyright slot values keyed by token (e.g. `{ "<year>": "2026" }`).
   */
  async generate(
    licenseId: string,
    slotValues: Record<string, string> = {},
  ): Promise<void> {
    const detail = await this.#repository.getLicense(licenseId);

    const content =
      Object.keys(slotValues).length > 0 && detail.standardLicenseTemplate
        ? new LicenseTemplate(detail.standardLicenseTemplate).render(slotValues)
        : detail.licenseText;

    await this.#writer.write(LICENSE_FILENAME, wrapText(content));
  }
}
