import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";
import type { WizardConfig } from "@configuration/WizardConfig.js";

/**
 * Contract for a location the wizard configuration can live in (the standalone
 * `.licensewizardrc.json` dot-file, or a `"license-wizard"` field inside a
 * project manifest). Stores expose whether they are an eligible save target,
 * and can read, write, and clear the configuration they hold.
 *
 * A store owns no file system access of its own. Each operation receives only
 * the capabilities it needs from its caller — reads take a reader, and the
 * read-modify-write operations take both a reader and a writer — so no store
 * ever holds ambient permission to touch the file system.
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
   *
   * @param reader - Used to check for the underlying file.
   */
  available(reader: IFileSystemReader): Promise<boolean>;

  /**
   * Reads the wizard configuration held by this store, or `null` when it holds
   * none.
   *
   * @param reader - Used to check for and read the underlying file.
   */
  read(reader: IFileSystemReader): Promise<WizardConfig | null>;

  /**
   * Persists the given configuration to this store, preserving any surrounding
   * content the store does not own.
   *
   * @param reader - Used to read existing content that must be preserved.
   * @param writer - Used to persist the updated content.
   * @param config - The configuration to write.
   */
  write(
    reader: IFileSystemReader,
    writer: IFileSystemWriter,
    config: WizardConfig,
  ): Promise<void>;

  /**
   * Removes any wizard configuration this store holds, leaving the rest of the
   * underlying file untouched. Does nothing when there is nothing to remove.
   *
   * @param reader - Used to check for and read existing content.
   * @param writer - Used to persist or delete the underlying file.
   */
  clear(reader: IFileSystemReader, writer: IFileSystemWriter): Promise<void>;
}
