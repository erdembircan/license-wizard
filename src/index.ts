import { FlagParser } from "./FlagParser.js";

const flagParser = new FlagParser({
  verify: { type: "boolean", default: false },
});

/**
 * Entry point for the license-wizard CLI application.
 */
export class LicenseWizard {
  /**
   * Creates a new LicenseWizard instance and parses the provided CLI arguments.
   *
   * @param args - The raw argument list (e.g. `process.argv.slice(2)`).
   */
  constructor(args: string[]) {
    flagParser.parse(args);
  }
}
