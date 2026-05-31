import type { IConfigStore } from "@configuration/interfaces/IConfigStore.js";
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
 */
export class Config {
  readonly #stores: readonly IConfigStore[];

  /**
   * Creates a new Config over the given stores.
   *
   * @param stores - The stores to coordinate, in read-priority order (the
   *   first store that holds configuration wins).
   */
  constructor(stores: readonly IConfigStore[]) {
    this.#stores = stores;
  }

  /**
   * Returns the configuration from the highest-priority store that holds one,
   * or `null` when no store does.
   *
   * @throws {FileSystemReaderError} When a file system read operation fails.
   */
  async read(): Promise<WizardConfig | null> {
    for (const store of this.#stores) {
      const config = await store.read();
      if (config) {
        return config;
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
      if (await store.available()) {
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

    await target.write(config);
    for (const store of this.#stores) {
      if (store !== target) {
        await store.clear();
      }
    }
  }
}
