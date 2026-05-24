// src/FlagParser.ts
import { parseArgs } from "node:util";
var FlagParser = class {
  #flags;
  /**
   * Creates a new FlagParser with the given flag definitions.
   *
   * @param flags - A map of flag names to their type and default value.
   */
  constructor(flags) {
    this.#flags = flags;
  }
  /**
   * Parses the provided argument list and returns the resolved flag values.
   *
   * @param args - The raw argument list to parse (e.g. `process.argv.slice(2)`).
   */
  parse(args) {
    const options = {};
    const definedNames = Object.keys(this.#flags);
    for (const [name, config] of Object.entries(this.#flags)) {
      options[name] = { type: config.type, default: config.default };
    }
    const { values } = parseArgs({
      args,
      options,
      allowPositionals: true,
      strict: false
    });
    const result = {};
    for (const name of definedNames) {
      result[name] = values[name] ?? this.#flags[name].default;
    }
    return result;
  }
};

// src/index.ts
var flagParser = new FlagParser({
  verify: { type: "boolean", default: false }
});
var LicenseWizard = class {
  /**
   * Creates a new LicenseWizard instance and parses the provided CLI arguments.
   *
   * @param args - The raw argument list (e.g. `process.argv.slice(2)`).
   */
  constructor(args) {
    flagParser.parse(args);
  }
};
export {
  LicenseWizard
};
