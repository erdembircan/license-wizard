import { JsonManifest } from "@configuration/abstracts/JsonManifest.js";

const PACKAGE_JSON = "package.json";

/**
 * The npm `package.json` manifest. Its `"license"` field holds a single SPDX
 * identifier or expression string.
 */
export class NpmManifest extends JsonManifest {
  /**
   * Creates a new NpmManifest.
   */
  constructor() {
    super(PACKAGE_JSON);
  }

  protected extractLicenseId(value: unknown): string | null {
    return typeof value === "string" ? value : null;
  }
}
