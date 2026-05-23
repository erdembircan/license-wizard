import { parseArgs } from "node:util";

type FlagDefinitions = Record<string, { default: boolean }>;
type ParsedFlags = Record<string, boolean>;

export class FlagParser {
  readonly #flags: FlagDefinitions;

  constructor(flags: FlagDefinitions) {
    this.#flags = flags;
  }

  parse(args: string[]): ParsedFlags {
    const options: Record<string, { type: "boolean"; default: boolean }> = {};
    const definedNames = new Set(Object.keys(this.#flags));

    for (const [name, config] of Object.entries(this.#flags)) {
      options[name] = { type: "boolean", default: config.default };
    }

    const { values } = parseArgs({
      args,
      options,
      allowPositionals: false,
    });

    const result: ParsedFlags = {};
    for (const name of definedNames) {
      result[name] =
        (values[name] as boolean | undefined) ?? this.#flags[name].default;
    }

    return result;
  }
}
