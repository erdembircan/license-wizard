import { FlagParser } from "./flag-parser.js";

const flagParser = new FlagParser({
  verify: { type: "boolean", default: false },
});

export class LicenseWizard {
  constructor(args: string[]) {
    const flags = flagParser.parse(args);
    console.log("license-wizard started with flags:", flags);
  }
}
