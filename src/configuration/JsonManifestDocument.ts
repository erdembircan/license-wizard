/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import { JsonStyle } from "@configuration/JsonStyle.js";
import { FileSystemWriterError } from "@configuration/errors/FileSystemWriterError.js";

/**
 * A JSON manifest file (e.g. `package.json`, `composer.json`) as a single
 * editable document: it parses and object-guards the raw source on the way in,
 * captures the file's formatting style, exposes per-field reads and mutations,
 * and reserializes in that same style on the way out.
 *
 * Two independent hierarchies write to the same physical manifest files — one
 * owning the `"license"` field, the other the `"license-wizard"` field — and
 * each used to re-implement this read → guard → mutate → style-preserving-write
 * round-trip itself. This object owns the round-trip once so both become thin
 * field-mappers on top of it, and {@link JsonStyle} becomes a private detail
 * rather than something wired in two separate places.
 */
export class JsonManifestDocument {
  readonly #fields: Record<string, unknown>;
  readonly #style: JsonStyle;

  private constructor(fields: Record<string, unknown>, style: JsonStyle) {
    this.#fields = fields;
    this.#style = style;
  }

  /**
   * Parses the raw manifest source into an editable document, capturing its
   * formatting style so {@link serialize} reproduces it. The body must be a
   * JSON object — the only shape a top-level field can be written into. A JSON
   * array, string, number, or `null` would silently lose the field on
   * reserialization (`JSON.stringify` drops own properties set on an array, for
   * one), so those are rejected outright instead of being reported as a false
   * success.
   *
   * @param raw - The raw manifest file contents.
   * @param fileName - The manifest file name, used only for error messages.
   * @throws {FileSystemWriterError} When the source is not valid JSON, or its
   * top level is not a JSON object.
   */
  static read(raw: string, fileName: string): JsonManifestDocument {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (cause) {
      throw new FileSystemWriterError(
        `Cannot update ${fileName}: it is not valid JSON.`,
        cause,
      );
    }
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      throw new FileSystemWriterError(
        `Cannot update ${fileName}: its top level is not a JSON object.`,
      );
    }
    return new JsonManifestDocument(
      parsed as Record<string, unknown>,
      JsonStyle.detect(raw),
    );
  }

  /**
   * An empty document with the default style, for when there is no existing
   * manifest source to read from and one is being created from scratch.
   */
  static empty(): JsonManifestDocument {
    return new JsonManifestDocument({}, JsonStyle.default());
  }

  /**
   * Returns whether the manifest declares the given top-level field.
   *
   * @param field - The top-level field name.
   */
  has(field: string): boolean {
    return field in this.#fields;
  }

  /**
   * Returns the raw value of the given top-level field, or `undefined` when the
   * field is absent.
   *
   * @param field - The top-level field name.
   */
  get(field: string): unknown {
    return this.#fields[field];
  }

  /**
   * Records the given value in the named top-level field, creating it when
   * absent and overwriting it when present. Every other field is left intact.
   *
   * @param field - The top-level field name.
   * @param value - The value to store.
   */
  set(field: string, value: unknown): void {
    this.#fields[field] = value;
  }

  /**
   * Removes the named top-level field when present, leaving every other field
   * intact. Does nothing when the field is absent.
   *
   * @param field - The top-level field name.
   */
  delete(field: string): void {
    delete this.#fields[field];
  }

  /**
   * Serializes the document back to JSON in its captured style.
   */
  serialize(): string {
    return this.#style.serialize(this.#fields);
  }
}
