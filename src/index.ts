import { FlagParser } from "./flag-parser.js";

const flagParser = new FlagParser({
  verify: { type: "boolean", default: false },
});

export class LicenseWizard {
  constructor(args: string[]) {
    flagParser.parse(args);
  }
}
