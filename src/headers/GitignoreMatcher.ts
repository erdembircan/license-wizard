type CompiledPattern = {
  matches: (path: string, isDirectory: boolean) => boolean;
  negated: boolean;
};

/**
 * The directories the wizard always skips when scanning for source files,
 * regardless of any `.gitignore`: version control metadata and the dependency
 * trees of the npm and Composer ecosystems. Headers belong on a project's own
 * source, never on vendored or installed code.
 */
export const DEFAULT_IGNORES: readonly string[] = [
  ".git/",
  "node_modules/",
  "vendor/",
];

/**
 * Matches paths against a set of `.gitignore`-style patterns so the scanner
 * skips files and directories a project already excludes from version control,
 * alongside the wizard's own always-ignored directories.
 *
 * This implements the common, practical subset of the gitignore format: comment
 * and blank lines, `!` negation (a later match wins), a trailing `/` to match
 * directories only, anchoring to the root when a pattern contains a slash, the
 * `*`, `?`, and double-star wildcards — including the double star in its three
 * positional forms (leading, matching at any depth; trailing, matching
 * everything below; and between slashes, matching zero or more intervening
 * directories) — and `[...]` character classes (with `!` negation). Patterns are
 * evaluated in order and the last one to match decides, mirroring git's own
 * precedence.
 */
export class GitignoreMatcher {
  readonly #patterns: CompiledPattern[];

  /**
   * Creates a matcher from already-collected pattern lines.
   *
   * @param patterns - Raw gitignore pattern lines, in precedence order.
   */
  constructor(patterns: readonly string[]) {
    this.#patterns = patterns
      .map((line) => line.trim())
      .filter((line) => line !== "" && !line.startsWith("#"))
      .map((line) => this.#compile(line));
  }

  /**
   * Reports whether the given repository-relative, POSIX-style path is ignored.
   * Directory-only patterns match only when `isDirectory` is true, so the
   * scanner can ask about a directory before deciding whether to descend.
   *
   * @param path - The path relative to the scan root, using `/` separators and no leading slash.
   * @param isDirectory - Whether the path denotes a directory.
   */
  ignores(path: string, isDirectory: boolean): boolean {
    let ignored = false;

    for (const pattern of this.#patterns) {
      if (pattern.matches(path, isDirectory)) {
        ignored = !pattern.negated;
      }
    }

    return ignored;
  }

  /**
   * Compiles a single gitignore line into a matchable pattern, peeling off the
   * `!` negation and trailing-slash directory marker and translating the glob
   * into an anchored or floating regular expression.
   */
  #compile(line: string): CompiledPattern {
    let pattern = line;

    const negated = pattern.startsWith("!");
    if (negated) {
      pattern = pattern.slice(1);
    }

    const directoryOnly = pattern.endsWith("/");
    if (directoryOnly) {
      pattern = pattern.slice(0, -1);
    }

    // A leading slash anchors to the root and is not part of the path text.
    let anchored = false;
    if (pattern.startsWith("/")) {
      anchored = true;
      pattern = pattern.slice(1);
    }
    // A slash anywhere else also anchors the pattern to the root.
    if (pattern.includes("/")) {
      anchored = true;
    }

    const prefix = anchored ? "^" : "(^|/)";
    const glob = this.#glob(pattern);

    if (directoryOnly) {
      // A trailing-slash pattern matches the directory itself only when the path
      // is a directory, but matches its contents (the pattern followed by `/`)
      // regardless — so ignoring `node_modules/` also skips the files beneath it.
      const under = new RegExp(`${prefix}${glob}/`);
      const exact = new RegExp(`${prefix}${glob}$`);
      return {
        negated,
        matches: (path, isDirectory) =>
          under.test(path) || (isDirectory && exact.test(path)),
      };
    }

    // The trailing group lets a name match the path itself or any ancestor of
    // it, so ignoring `node_modules` skips `node_modules/pkg/index.js` too.
    const regex = new RegExp(`${prefix}${glob}(/|$)`);
    return { negated, matches: (path) => regex.test(path) };
  }

  /**
   * Translates a gitignore glob into a regular-expression fragment. A single `*`
   * and `?` stay within one path segment (`[^/]`); a double star is read in
   * context, so it spans directories the way git does rather than collapsing to
   * a blanket `.*`:
   *
   * - a double star followed by a slash (at the start, or after a slash) matches
   *   zero or more whole directory segments — so a leading `** /foo` matches
   *   `foo` at the root and at any depth, and `a/** /b` matches `a/b` with no
   *   directory between (slashes spaced here only to keep this comment closed).
   * - a double star at the very end, after a slash, matches everything beneath —
   *   so `a/` followed by a double star matches every path under `a/`.
   * - a double star not bordered by slashes degrades to a single-segment `*`.
   *
   * `[...]` is carried through as a regex character class (translating a leading
   * `!` to `^` negation); every other character is matched literally.
   */
  #glob(pattern: string): string {
    let regex = "";

    for (let index = 0; index < pattern.length; index += 1) {
      const char = pattern[index];

      if (char === "*" && pattern[index + 1] === "*") {
        const afterSlash = index === 0 || pattern[index - 1] === "/";
        const followingSlash = pattern[index + 2] === "/";
        if (afterSlash && followingSlash) {
          // `**/` — zero or more directory segments. Consume the trailing slash
          // too, since the group carries it.
          regex += "(?:[^/]+/)*";
          index += 2;
        } else if (afterSlash && index + 2 === pattern.length) {
          // Trailing `/**` (or a lone `**`) — match everything below.
          regex += ".*";
          index += 1;
        } else {
          // A `**` not bounded by slashes is just a single-segment wildcard.
          regex += "[^/]*";
          index += 1;
        }
      } else if (char === "*") {
        regex += "[^/]*";
      } else if (char === "?") {
        regex += "[^/]";
      } else if (char === "[") {
        const close = this.#classEnd(pattern, index);
        if (close === -1) {
          // No closing bracket: a literal `[`.
          regex += "\\[";
        } else {
          regex += this.#charClass(pattern.slice(index, close + 1));
          index = close;
        }
      } else {
        regex += char.replace(/[.+^${}()|[\]\\]/, "\\$&");
      }
    }

    return regex;
  }

  /**
   * Returns the index of the `]` that closes the character class opened at
   * `start`, or -1 when the class is never closed (so the `[` is a literal). A
   * `]` in the first position — directly after `[` or `[!` — is a class member,
   * not the terminator, matching shell glob rules.
   */
  #classEnd(pattern: string, start: number): number {
    let index = start + 1;
    if (pattern[index] === "!") {
      index += 1;
    }
    if (pattern[index] === "]") {
      index += 1;
    }
    while (index < pattern.length && pattern[index] !== "]") {
      index += 1;
    }
    return index < pattern.length ? index : -1;
  }

  /**
   * Translates a glob character class (e.g. `[Bb]`, `[!a-z]`) into its regex
   * equivalent, mapping a leading `!` negation to `^` and escaping any backslash
   * in the class body so the bracket expression stays well-formed.
   */
  #charClass(token: string): string {
    let body = token.slice(1, -1);
    const negated = body.startsWith("!");
    if (negated) {
      body = body.slice(1);
    }
    body = body.replace(/\\/g, "\\\\");
    return `[${negated ? "^" : ""}${body}]`;
  }
}
