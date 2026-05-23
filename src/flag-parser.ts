import { parseArgs } from "node:util";

type FlagType = "boolean" | "string";

type FlagValueType<T extends FlagType> = T extends "boolean" ? boolean : string;

type FlagDefinition<T extends FlagType = FlagType> = {
  type: T;
  default: FlagValueType<T>;
};

type FlagDefinitions = Record<string, FlagDefinition>;

type ParsedFlags<T extends FlagDefinitions> = {
  [K in keyof T]: FlagValueType<T[K]["type"]>;
};

export class FlagParser<T extends FlagDefinitions> {
  readonly #flags: T;

  constructor(flags: T) {
    this.#flags = flags;
  }

  parse(args: string[]): ParsedFlags<T> {
    const options: Record<
      string,
      { type: "boolean" | "string"; default: boolean | string }
    > = {};
    const definedNames = Object.keys(this.#flags);
    const definedSet = new Set(definedNames);

    for (const [name, config] of Object.entries(this.#flags)) {
      options[name] = { type: config.type, default: config.default };
    }

    const filteredArgs = this.#stripUnknownFlags(args, definedSet);

    const { values } = parseArgs({
      args: filteredArgs,
      options,
      allowPositionals: false,
    });

    const result = {} as ParsedFlags<T>;
    for (const name of definedNames) {
      (result as Record<string, boolean | string>)[name] =
        (values[name] as boolean | string | undefined) ??
        this.#flags[name].default;
    }

    return result;
  }

  #stripUnknownFlags(args: string[], defined: Set<string>): string[] {
    const filtered: string[] = [];
    let i = 0;

    while (i < args.length) {
      const arg = args[i];

      if (arg.startsWith("--")) {
        const eqIndex = arg.indexOf("=");
        const name = eqIndex !== -1 ? arg.slice(2, eqIndex) : arg.slice(2);

        if (!defined.has(name)) {
          // Unknown flag — skip it. If it's a string-style flag with a
          // separate value token (no "="), also skip the next token.
          i++;
          if (
            eqIndex === -1 &&
            i < args.length &&
            !args[i].startsWith("--")
          ) {
            i++;
          }
          continue;
        }
      }

      filtered.push(arg);
      i++;
    }

    return filtered;
  }
}
