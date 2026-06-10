/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

/**
 * Contract for reading from the file system.
 */
export interface IFileSystemReader {
  /**
   * Reads the contents of the file at the given path.
   *
   * @param path - The path to the file to read.
   */
  read(path: string): Promise<string>;

  /**
   * Returns whether a file exists at the given path.
   *
   * @param path - The path to check.
   */
  exists(path: string): Promise<boolean>;
}
