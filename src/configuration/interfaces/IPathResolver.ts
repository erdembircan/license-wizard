/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

/**
 * Contract for resolving a path to its real on-disk location. Kept separate from
 * the broad file read/write contracts because only the targeted `--force-header`
 * override needs it — to enforce real (not merely lexical) containment within the
 * project before writing — so the common reader and writer fakes are not burdened
 * with a capability they never use.
 */
export interface IPathResolver {
  /**
   * Resolves the path to its canonical absolute location with every symlink
   * along the way followed, so callers can confirm a target really lives inside
   * a directory rather than reaching out of it through a symlink.
   *
   * @param path - The path to resolve.
   */
  realPath(path: string): Promise<string>;
}
