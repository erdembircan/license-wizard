/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import {
  HEADER_COMMENTS,
  type HeaderComment,
  type HeaderStyle,
} from "@headers/HeaderPlan.js";
import { FileSystemReaderError } from "@configuration/errors/FileSystemReaderError.js";

const HEADER_STYLES: readonly HeaderStyle[] = ["short", "full"];

/**
 * The persisted source-file header preference. Present only when the project
 * opted into headers; its presence is what makes verification check the header
 * surface at all.
 */
export type HeaderConfig = {
  style: HeaderStyle;
  /**
   * The comment delimiter the headers were written with (from
   * `--headers-comment`). Absent means the REUSE-conventional `block` style, so
   * configs written before this option existed keep their original output.
   * Persisted so verification reproduces the same block the writer wrote.
   */
  comment?: HeaderComment;
  /**
   * Extra gitignore-style patterns the headers were scoped to when installed
   * (from `--headers-ignore`). Persisted so verification re-derives the same set
   * of files the writer used — without it, `verify` (fixing by default) would
   * write headers into the very files the install was told to exclude.
   */
  ignore?: string[];
};

/**
 * Represents the persisted configuration for license-wizard.
 */
export type WizardConfig = {
  licenseId: string;
  tokens?: Record<string, string>;
  headers?: HeaderConfig;
};

/**
 * Validates a parsed value as a {@link WizardConfig} and returns it, or throws a
 * {@link FileSystemReaderError} naming the source file when its shape is wrong.
 * A stored config that survived only a bare `as WizardConfig` cast can carry an
 * absent `licenseId`, a non-string token, or an unknown header style — each of
 * which surfaces later as a confusing downstream failure (an empty rc masking a
 * real manifest config, a raw `TypeError` from the header renderer, a "No
 * license matches 'undefined'"). Rejecting up front, with the file named, turns
 * all of those into one clear error.
 *
 * @param value - The parsed JSON value to validate (the file body, or a
 *   manifest's `license-wizard` field).
 * @param fileName - The file the value came from, for the error message.
 */
export function parseWizardConfig(
  value: unknown,
  fileName: string,
): WizardConfig {
  const fail = (reason: string): never => {
    throw new FileSystemReaderError(
      `Malformed license-wizard configuration in ${fileName}: ${reason}`,
    );
  };

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail("expected a configuration object");
  }
  const record = value as Record<string, unknown>;

  if (typeof record.licenseId !== "string" || record.licenseId.trim() === "") {
    return fail('"licenseId" must be a non-empty string');
  }

  if (record.tokens !== undefined) {
    if (
      typeof record.tokens !== "object" ||
      record.tokens === null ||
      Array.isArray(record.tokens) ||
      !Object.values(record.tokens).every((v) => typeof v === "string")
    ) {
      return fail('"tokens" must be a map of strings');
    }
  }

  if (record.headers !== undefined) {
    const headers = record.headers;
    if (
      typeof headers !== "object" ||
      headers === null ||
      Array.isArray(headers)
    ) {
      return fail('"headers" must be an object');
    }
    const style = (headers as Record<string, unknown>).style;
    if (!HEADER_STYLES.includes(style as HeaderStyle)) {
      return fail('"headers.style" must be "short" or "full"');
    }
    const comment = (headers as Record<string, unknown>).comment;
    if (
      comment !== undefined &&
      !HEADER_COMMENTS.includes(comment as HeaderComment)
    ) {
      return fail('"headers.comment" must be "block" or "docblock"');
    }
    const ignore = (headers as Record<string, unknown>).ignore;
    if (
      ignore !== undefined &&
      (!Array.isArray(ignore) || !ignore.every((p) => typeof p === "string"))
    ) {
      return fail('"headers.ignore" must be an array of strings');
    }
  }

  return value as WizardConfig;
}
