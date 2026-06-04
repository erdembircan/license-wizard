import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import {
  DEFAULT_IGNORES,
  GitignoreMatcher,
} from "@headers/GitignoreMatcher.js";
import type { IFileTreeWalker } from "@headers/interfaces/IFileTreeWalker.js";
import {
  DEFAULT_SOURCE_EXTENSIONS,
  isSupportedSource,
} from "@headers/SourceFile.js";

const GITIGNORE_FILE = ".gitignore";

export type ScanOptions = {
  /**
   * The directory to scan, relative to the working directory. Defaults to the
   * working directory itself.
   */
  root?: string;
  /**
   * The source extensions to collect. Defaults to the standard set.
   */
  extensions?: readonly string[];
  /**
   * Extra ignore patterns, in gitignore syntax, applied on top of the defaults
   * and the project's `.gitignore`.
   */
  extraIgnores?: readonly string[];
};

/**
 * Discovers the source files a header should be written into. It walks the
 * project tree once, pruning directories the project ignores — the wizard's
 * always-skipped dependency and VCS directories, plus whatever the project's
 * own `.gitignore` excludes — and keeps the files whose extension is supported.
 *
 * Discovery is a deliberate first pass, separate from writing: gathering the
 * full file list up front lets the caller show real progress (a known total)
 * while the headers are applied, and lets verification re-derive the same set.
 */
export class SourceFileScanner {
  readonly #walker: IFileTreeWalker;
  readonly #reader: IFileSystemReader;

  /**
   * Creates a new SourceFileScanner.
   *
   * @param walker - Walks the directory tree.
   * @param reader - Reads the project's `.gitignore`, when present.
   */
  constructor(walker: IFileTreeWalker, reader: IFileSystemReader) {
    this.#walker = walker;
    this.#reader = reader;
  }

  /**
   * Returns the supported source files beneath the scan root, in sorted order,
   * with ignored directories pruned and ignored files removed.
   *
   * @param options - The scan root, supported extensions, and extra ignores.
   */
  async scan(options: ScanOptions = {}): Promise<string[]> {
    const root = options.root ?? ".";
    const extensions = options.extensions ?? DEFAULT_SOURCE_EXTENSIONS;
    const matcher = await this.#buildMatcher(options.extraIgnores ?? []);

    const files = await this.#walker.walk(root, (relativePath) =>
      matcher.ignores(relativePath, true),
    );

    return files.filter(
      (file) =>
        isSupportedSource(file, extensions) && !matcher.ignores(file, false),
    );
  }

  /**
   * Builds the ignore matcher from the wizard's defaults, the caller's extra
   * patterns, and the project's `.gitignore` when it exists.
   */
  async #buildMatcher(
    extraIgnores: readonly string[],
  ): Promise<GitignoreMatcher> {
    const content = (await this.#reader.exists(GITIGNORE_FILE))
      ? await this.#reader.read(GITIGNORE_FILE)
      : "";
    return GitignoreMatcher.fromContent(content, [
      ...DEFAULT_IGNORES,
      ...extraIgnores,
    ]);
  }
}
