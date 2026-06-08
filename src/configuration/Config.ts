import type { IConfigStore } from "@configuration/interfaces/IConfigStore.js";
import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";
import type { WizardConfig } from "@configuration/WizardConfig.js";
import { FileSystemWriterError } from "@configuration/errors/FileSystemWriterError.js";

export type ConfigTarget = {
  id: string;
  label: string;
};

/**
 * Coordinates the wizard configuration across every store it can live in (the
 * `.licensewizardrc.json` dot-file and the `"license-wizard"` field of each
 * present project manifest). Reads honour store priority order; a write goes to
 * exactly one chosen store and clears the configuration from all the others, so
 * the configuration always has a single source of truth.
 *
 * Config owns the file system reader and writer and hands each store only the
 * capability an operation needs, so no store holds ambient file system access.
 */
export class Config {
  readonly #stores: readonly IConfigStore[];
  readonly #reader: IFileSystemReader;
  readonly #writer: IFileSystemWriter;

  /**
   * Creates a new Config over the given stores.
   *
   * @param stores - The stores to coordinate, in read-priority order (the
   *   first store that holds configuration wins).
   * @param reader - Handed to stores for read operations.
   * @param writer - Handed to stores for write operations.
   */
  constructor(
    stores: readonly IConfigStore[],
    reader: IFileSystemReader,
    writer: IFileSystemWriter,
  ) {
    this.#stores = stores;
    this.#reader = reader;
    this.#writer = writer;
  }

  /**
   * Returns the configuration from the highest-priority store that holds one,
   * or `null` when no store does.
   *
   * @throws {FileSystemReaderError} When a file system read operation fails.
   */
  async read(): Promise<WizardConfig | null> {
    for (const store of this.#stores) {
      const config = await store.read(this.#reader);
      if (config) {
        return config;
      }
    }
    return null;
  }

  /**
   * Returns the id of the highest-priority store that currently holds the
   * configuration — the one `read` resolves to — or `null` when no store does.
   * Lets a caller rewrite the existing configuration in place rather than
   * guessing a target.
   *
   * @throws {FileSystemReaderError} When a file system read operation fails.
   */
  async source(): Promise<string | null> {
    for (const store of this.#stores) {
      if (await store.read(this.#reader)) {
        return store.id;
      }
    }
    return null;
  }

  /**
   * Returns the stores currently eligible as save targets, in order. The
   * dot-file is always present; a manifest appears only when its file exists.
   */
  async targets(): Promise<ConfigTarget[]> {
    const targets: ConfigTarget[] = [];
    for (const store of this.#stores) {
      if (await store.available(this.#reader)) {
        targets.push({ id: store.id, label: store.label });
      }
    }
    return targets;
  }

  /**
   * Writes the configuration to the store identified by `targetId` and clears
   * it from every other store, keeping a single source of truth.
   *
   * @param config - The configuration to write.
   * @param targetId - The id of the store to write to.
   * @throws {FileSystemWriterError} When the target is unknown or a file system
   *   operation fails.
   */
  async write(config: WizardConfig, targetId: string): Promise<void> {
    const target = this.#stores.find((store) => store.id === targetId);
    if (!target) {
      throw new FileSystemWriterError(`Unknown config target: ${targetId}`);
    }

    await target.write(this.#reader, this.#writer, config);
    for (const store of this.#stores) {
      if (store !== target) {
        await store.clear(this.#reader, this.#writer);
      }
    }
  }

  /**
   * Clears the configuration from every store, leaving none behind. Used when
   * the user declines to save so no stale configuration lingers in any location.
   *
   * @throws {FileSystemWriterError} When a file system operation fails.
   */
  async clear(): Promise<void> {
    for (const store of this.#stores) {
      await store.clear(this.#reader, this.#writer);
    }
  }

  /**
   * Drops the saved `headers` preference, rewriting the configuration in place
   * to the store it already lives in while keeping the license id and any
   * tokens. Used after a header removal so later verification no longer checks a
   * header surface the project no longer has. Does nothing when no header
   * preference is set or no configuration exists.
   *
   * @throws {FileSystemWriterError} When a file system operation fails.
   */
  async clearHeaders(): Promise<void> {
    const config = await this.read();
    if (!config?.headers) {
      return;
    }

    const source = await this.source();
    if (source === null) {
      return;
    }

    const next: WizardConfig = { licenseId: config.licenseId };
    if (config.tokens) {
      next.tokens = config.tokens;
    }
    await this.write(next, source);
  }
}
