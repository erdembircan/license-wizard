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

    // Collect explicit negations from --no-<flag> args, then filter them out
    const negated = new Set<string>();
    const filteredArgs: string[] = [];

    for (const arg of args) {
      if (arg.startsWith("--no-")) {
        const name = arg.slice(5);
        if (definedNames.has(name)) {
          negated.add(name);
        } else {
          // Pass through so parseArgs can report it as an unknown option
          filteredArgs.push(arg);
        }
      } else {
        filteredArgs.push(arg);
      }
    }

    for (const [name, config] of Object.entries(this.#flags)) {
      options[name] = { type: "boolean", default: config.default };
    }

    const { values } = parseArgs({
      args: filteredArgs,
      options,
      allowPositionals: false,
    });

    const result: ParsedFlags = {};
    for (const name of definedNames) {
      if (negated.has(name)) {
        result[name] = false;
      } else {
        result[name] =
          (values[name] as boolean | undefined) ?? this.#flags[name].default;
      }
    }

    return result;
  }
}
