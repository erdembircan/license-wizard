import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";
import { JsonManifest } from "@configuration/JsonManifest.js";

const PACKAGE_JSON = "package.json";

/**
 * The npm `package.json` manifest. Its `"license"` field holds a single SPDX
 * identifier or expression string.
 */
export class PackageJsonManifest extends JsonManifest {
  /**
   * Creates a new PackageJsonManifest.
   *
   * @param reader - Used to check for and read `package.json`.
   * @param writer - Used to persist changes to `package.json`.
   */
  constructor(reader: IFileSystemReader, writer: IFileSystemWriter) {
    super(reader, writer, PACKAGE_JSON);
  }

  protected extractLicenseId(value: unknown): string | null {
    return typeof value === "string" ? value : null;
  }
}
