/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import { GitignoreMatcher } from "@headers/GitignoreMatcher.js";

/**
 * Builds {@link GitignoreMatcher} instances from `.gitignore` file content,
 * keeping construction concerns separate from the matcher itself: the matcher
 * is the component that answers "is this path ignored?", while this factory
 * knows how to assemble one from raw file text and extra patterns.
 */
export class GitignoreMatcherFactory {
  /**
   * Builds a matcher from the text of a `.gitignore` file, prepended with extra
   * patterns (the wizard's always-ignored directories) that the file's own rules
   * can still override via negation.
   *
   * @param content - The `.gitignore` file content (may be empty).
   * @param extra - Extra patterns applied before the file's own, lowest precedence.
   */
  fromContent(
    content: string,
    extra: readonly string[] = [],
  ): GitignoreMatcher {
    return new GitignoreMatcher([...extra, ...content.split("\n")]);
  }
}
