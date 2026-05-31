import type { WizardConfig } from "@configuration/WizardConfig.js";

/**
 * Contract for a location the wizard configuration can live in (the standalone
 * `.licensewizardrc.json` dot-file, or a `"license-wizard"` field inside a
 * project manifest). Stores expose whether they are an eligible save target,
 * and can read, write, and clear the configuration they hold.
 */
export interface IConfigStore {
  /**
   * A stable identifier for this store, used as the value of its option in the
   * save-location picker.
   */
  readonly id: string;

  /**
   * A human-readable label for this store, shown in the save-location picker.
   */
  readonly label: string;

  /**
   * Returns whether this store can be offered as a save target. The dot-file is
   * always available; a manifest store is available only when its file exists.
   */
  available(): Promise<boolean>;

  /**
   * Reads the wizard configuration held by this store, or `null` when it holds
   * none.
   */
  read(): Promise<WizardConfig | null>;

  /**
   * Persists the given configuration to this store.
   *
   * @param config - The configuration to write.
   */
  write(config: WizardConfig): Promise<void>;

  /**
   * Removes any wizard configuration this store holds, leaving the rest of the
   * underlying file untouched. Does nothing when there is nothing to remove.
   */
  clear(): Promise<void>;
}
