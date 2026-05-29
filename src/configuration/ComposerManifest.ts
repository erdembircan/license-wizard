import { JsonManifest } from "@configuration/abstracts/JsonManifest.js";
import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";

const COMPOSER_JSON = "composer.json";

/**
 * The Composer `composer.json` manifest. Its `"license"` field holds either a
 * single SPDX identifier/expression string or an array of strings (disjunctive
 * licensing); the first entry is treated as the primary license.
 */
export class ComposerManifest extends JsonManifest {
  /**
   * Creates a new ComposerManifest.
   *
   * @param reader - Used to check for and read `composer.json`.
   * @param writer - Used to persist changes to `composer.json`.
   */
  constructor(reader: IFileSystemReader, writer: IFileSystemWriter) {
    super(reader, writer, COMPOSER_JSON);
  }

  protected extractLicenseId(value: unknown): string | null {
    if (typeof value === "string") {
      return value;
    }
    if (Array.isArray(value)) {
      const first = value.find((entry) => typeof entry === "string");
      return typeof first === "string" ? first : null;
    }
    return null;
  }
}
