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

    for (const [name, config] of Object.entries(this.#flags)) {
      options[name] = { type: config.type, default: config.default };
    }

    const { values } = parseArgs({
      args,
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
}
