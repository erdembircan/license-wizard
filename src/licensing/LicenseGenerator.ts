import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";
import type { LicenseRepository } from "@licensing/LicenseRepository.js";

const LICENSE_FILENAME = "LICENSE";

/**
 * Generates a license file by fetching the selected license's text and
 * writing it to the root of the working directory.
 *
 * For now this writes the plain (non-template) license text exactly as
 * retrieved, without performing any field substitution.
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
   * Fetches the license for the given SPDX identifier and writes its text to
   * a `LICENSE` file in the working directory, overwriting any existing file.
   *
   * @param licenseId - The SPDX identifier of the license to generate.
   */
  async generate(licenseId: string): Promise<void> {
    const detail = await this.#repository.getLicense(licenseId);
    await this.#writer.write(LICENSE_FILENAME, detail.licenseText);
  }
}
