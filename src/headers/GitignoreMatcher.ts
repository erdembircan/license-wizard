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
 * directories only, anchoring to the root when a pattern contains a slash, and
 * the `*`, `?`, and `**` wildcards. Patterns are evaluated in order and the last
 * one to match decides, mirroring git's own precedence.
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
   * Builds a matcher from the text of a `.gitignore` file, prepended with extra
   * patterns (the wizard's always-ignored directories) that the file's own rules
   * can still override via negation.
   *
   * @param content - The `.gitignore` file content (may be empty).
   * @param extra - Extra patterns applied before the file's own, lowest precedence.
   */
  static fromContent(
    content: string,
    extra: readonly string[] = [],
  ): GitignoreMatcher {
    return new GitignoreMatcher([...extra, ...content.split("\n")]);
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
   * Translates a gitignore glob into a regular-expression fragment: `**` spans
   * directory separators, `*` and `?` stay within a single path segment, and
   * every other character is matched literally.
   */
  #glob(pattern: string): string {
    let regex = "";

    for (let index = 0; index < pattern.length; index += 1) {
      const char = pattern[index];

      if (char === "*") {
        if (pattern[index + 1] === "*") {
          regex += ".*";
          index += 1;
        } else {
          regex += "[^/]*";
        }
      } else if (char === "?") {
        regex += "[^/]";
      } else {
        regex += char.replace(/[.+^${}()|[\]\\]/, "\\$&");
      }
    }

    return regex;
  }
}
