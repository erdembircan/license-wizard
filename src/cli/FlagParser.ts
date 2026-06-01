import { parseArgs } from "node:util";

type FlagType = "boolean" | "string" | "list";

type FlagValueType<T extends FlagType> = T extends "boolean"
  ? boolean
  : T extends "list"
    ? string[]
    : string;

type FlagDefinition<T extends FlagType = FlagType> = {
  type: T;
  default: FlagValueType<T>;
  description: string;
  /**
   * Placeholder shown after a value-accepting flag in the help listing
   * (e.g. `<spdx-id>`). Ignored for boolean flags, which take no value. For
   * `list` flags the placeholder is suffixed with `...` to signal repeatability.
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
      {
        type: "boolean" | "string";
        multiple?: boolean;
        default: boolean | string | string[];
      }
    > = {};
    const definedNames = Object.keys(this.#flags);

    for (const [name, config] of Object.entries(this.#flags)) {
      // A `list` flag is a repeatable string option; node collects every
      // occurrence into an array when `multiple` is set.
      options[name] =
        config.type === "list"
          ? { type: "string", multiple: true, default: config.default }
          : { type: config.type, default: config.default };
    }

    const { values } = parseArgs({
      args,
      options,
      allowPositionals: true,
      strict: false,
    });

    const result = {} as ParsedFlags<T>;
    for (const name of definedNames) {
      (result as Record<string, boolean | string | string[]>)[name] =
        (values[name] as boolean | string | string[] | undefined) ??
        this.#flags[name].default;
    }

    return result;
  }

  /**
   * Renders an aligned listing of every defined flag, its accepted value (for
   * string and list flags) and its description, suitable for a `--help` screen.
   * List flags append `...` after their placeholder to signal that they may be
   * passed more than once.
   */
  formatHelp(): string {
    const entries = Object.entries(this.#flags).map(([name, config]) => {
      const placeholder = config.placeholder ?? "<value>";
      const value =
        config.type === "string"
          ? ` ${placeholder}`
          : config.type === "list"
            ? ` ${placeholder}...`
            : "";
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
