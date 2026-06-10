/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

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
        this.#coerce(this.#flags[name], values[name]);
    }

    return result;
  }

  /**
   * Coerces a raw parsed value to the type its flag declares, falling back to
   * the flag's default when the raw value is the wrong shape. A value-accepting
   * flag given with no value parses (in non-strict mode) as the boolean `true`,
   * and a `list` flag can collect such a `true` among its strings; dropping those
   * here keeps the resolved flags well-typed, so a bare `--license` or `--set`
   * can never reach the application as a non-string and crash. The mistake itself
   * is surfaced to the user by {@link validate}.
   *
   * @param def - The definition of the flag being coerced.
   * @param raw - The raw value the parser produced for it.
   */
  #coerce(def: FlagDefinition, raw: unknown): boolean | string | string[] {
    if (def.type === "boolean") {
      return typeof raw === "boolean" ? raw : (def.default as boolean);
    }
    if (def.type === "list") {
      return Array.isArray(raw)
        ? raw.filter((value): value is string => typeof value === "string")
        : (def.default as string[]);
    }
    return typeof raw === "string" ? raw : (def.default as string);
  }

  /**
   * Inspects the raw arguments and returns the usage errors they contain, empty
   * when they are well-formed. Catches two mistakes the permissive parser would
   * otherwise swallow: an unrecognized flag (a typo that must not silently fall
   * through to the interactive prompt), and a value-accepting flag given with no
   * value — at the end of the line, or immediately followed by another `--flag`,
   * which the parser would otherwise consume as the value.
   *
   * @param args - The raw argument list to validate (e.g. `process.argv.slice(2)`).
   */
  validate(args: string[]): string[] {
    const options: Record<
      string,
      { type: "boolean" | "string"; multiple?: boolean }
    > = {};
    for (const [name, config] of Object.entries(this.#flags)) {
      options[name] =
        config.type === "list"
          ? { type: "string", multiple: true }
          : { type: config.type };
    }

    const { tokens } = parseArgs({
      args,
      options,
      allowPositionals: true,
      strict: false,
      tokens: true,
    });

    const errors: string[] = [];
    const reportedUnknown = new Set<string>();

    for (const token of tokens) {
      if (token.kind !== "option") {
        continue;
      }

      const def = this.#flags[token.name];
      if (def === undefined) {
        if (!reportedUnknown.has(token.name)) {
          reportedUnknown.add(token.name);
          errors.push(
            `Unknown flag: --${token.name}. Run --help to see the available flags.`,
          );
        }
        continue;
      }

      if (def.type === "boolean") {
        continue;
      }

      if (token.value === undefined || token.value.trim() === "") {
        // A missing value *or* an explicit empty one (`--license=`, e.g. from an
        // unset `--license=$VAR` in CI) is rejected the same way: an empty string
        // equals the flag's default, so it would otherwise pass validation, fail
        // the non-interactive check, and drop a non-TTY run into the interactive
        // prompt — hanging CI instead of failing fast.
        errors.push(`The --${token.name} flag requires a value.`);
      } else if (token.value.startsWith("--")) {
        errors.push(
          `The --${token.name} flag requires a value, but got "${token.value}", which looks like another flag.`,
        );
      }
    }

    return errors;
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
