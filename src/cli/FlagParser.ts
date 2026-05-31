import { parseArgs } from "node:util";

type FlagType = "boolean" | "string";

type FlagValueType<T extends FlagType> = T extends "boolean" ? boolean : string;

type FlagDefinition<T extends FlagType = FlagType> = {
  type: T;
  default: FlagValueType<T>;
  description: string;
  /**
   * Placeholder shown after a value-accepting flag in the help listing
   * (e.g. `<spdx-id>`). Ignored for boolean flags, which take no value.
   */
  placeholder?: string;
};

type FlagDefinitions = Record<string, FlagDefinition>;

type ParsedFlags<T extends FlagDefinitions> = {
  [K in keyof T]: FlagValueType<T[K]["type"]>;
};

/**
 * Parses CLI flags according to a typed flag definition map.
 */
export class FlagParser<T extends FlagDefinitions> {
  readonly #flags: T;

  /**
   * Creates a new FlagParser with the given flag definitions.
   *
   * @param flags - A map of flag names to their type and default value.
   */
  constructor(flags: T) {
    this.#flags = flags;
  }

  /**
   * Parses the provided argument list and returns the resolved flag values.
   *
   * @param args - The raw argument list to parse (e.g. `process.argv.slice(2)`).
   */
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
      allowPositionals: true,
      strict: false,
    });

    const result = {} as ParsedFlags<T>;
    for (const name of definedNames) {
      (result as Record<string, boolean | string>)[name] =
        (values[name] as boolean | string | undefined) ??
        this.#flags[name].default;
    }

    return result;
  }

  /**
   * Renders an aligned listing of every defined flag, its accepted value (for
   * string flags) and its description, suitable for a `--help` screen.
   */
  formatHelp(): string {
    const entries = Object.entries(this.#flags).map(([name, config]) => {
      const value =
        config.type === "string" ? ` ${config.placeholder ?? "<value>"}` : "";
      return {
        invocation: `--${name}${value}`,
        description: config.description,
      };
    });

    const width = Math.max(...entries.map((entry) => entry.invocation.length));

    return entries
      .map(
        (entry) => `  ${entry.invocation.padEnd(width)}  ${entry.description}`,
      )
      .join("\n");
  }
}
