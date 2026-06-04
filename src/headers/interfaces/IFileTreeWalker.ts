/**
 * Contract for walking a directory tree and collecting its files.
 */
export interface IFileTreeWalker {
  /**
   * Recursively lists every file beneath `root`, returning their paths relative
   * to `root` in POSIX form. A directory for which `skipDirectory` returns true
   * is not descended into, so excluded trees (such as `node_modules`) cost
   * nothing to skip.
   *
   * @param root - The directory to walk, relative to the working directory.
   * @param skipDirectory - Predicate receiving each directory's relative path;
   *   returning true prunes that directory.
   */
  walk(
    root: string,
    skipDirectory: (relativePath: string) => boolean,
  ): Promise<string[]>;
}
