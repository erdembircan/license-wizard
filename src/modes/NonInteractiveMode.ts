import type { Answer } from "@cli/Answer.js";
import type { IReporter } from "@cli/interfaces/IReporter.js";
import type { Config } from "@configuration/Config.js";
import type { ProjectManifestRepository } from "@configuration/ProjectManifestRepository.js";
import { HeaderRenderer } from "@headers/HeaderRenderer.js";
import type { HeaderStyle } from "@headers/HeaderPlan.js";
import { LicenseNotFoundError } from "@licensing/errors/LicenseNotFoundError.js";
import type { LicenseDetail } from "@licensing/LicenseDetail.js";
import type { LicenseGenerator } from "@licensing/LicenseGenerator.js";
import type { LicenseRepository } from "@licensing/LicenseRepository.js";
import { LicenseTemplate } from "@licensing/LicenseTemplate.js";
import type { HeaderApplier } from "../HeaderApplier.js";
import type {
  LicenseSelection,
  LicenseInstaller,
} from "../LicenseInstaller.js";
import type { IWizardMode } from "./IWizardMode.js";
import type { WizardFlags } from "./WizardFlags.js";

const SUGGESTION_LIMIT = 5;

/**
 * The flag-driven run mode: every workflow that bypasses the interactive
 * prompts. It sub-routes between three flag-selected flows, in priority order —
 * stripping wizard headers (`--remove-headers`), regenerating from the saved
 * configuration (`--apply-config`), and generating from selection flags
 * (`--license`/`--set`/`--headers`/`--save-*`/`--get-tokens`). Every path honors
 * `--dry-run`, and failures are written to stderr and set a non-zero exit code
 * without throwing.
 */
export class NonInteractiveMode implements IWizardMode {
  readonly #licenses: LicenseRepository;
  readonly #config: Config;
  readonly #manifests: ProjectManifestRepository;
  readonly #installer: LicenseInstaller;
  readonly #generator: LicenseGenerator;
  readonly #headers: HeaderApplier;
  readonly #reporter: IReporter;
  readonly #flags: WizardFlags;
  // Maps each save flag to the target id of the config store it writes to.
  readonly #saveTargetByFlag: Record<string, string>;

  /**
   * Creates a new NonInteractiveMode.
   *
   * @param licenses - Resolves license detail and suggests near-misses.
   * @param config - Reads the saved config and the available save targets.
   * @param manifests - Reports the declared manifest licenses for dry runs.
   * @param installer - Applies a resolved selection to the project.
   * @param generator - Renders the license text for dry-run previews.
   * @param headers - Writes, previews, and strips source-file headers.
   * @param reporter - Renders results, previews, and errors.
   * @param flags - The resolved CLI flags driving the run.
   * @param saveTargetByFlag - Maps each `--save-*` flag to its config store id.
   */
  constructor(
    licenses: LicenseRepository,
    config: Config,
    manifests: ProjectManifestRepository,
    installer: LicenseInstaller,
    generator: LicenseGenerator,
    headers: HeaderApplier,
    reporter: IReporter,
    flags: WizardFlags,
    saveTargetByFlag: Record<string, string>,
  ) {
    this.#licenses = licenses;
    this.#config = config;
    this.#manifests = manifests;
    this.#installer = installer;
    this.#generator = generator;
    this.#headers = headers;
    this.#reporter = reporter;
    this.#flags = flags;
    this.#saveTargetByFlag = saveTargetByFlag;
  }

  /**
   * Selects and runs the flag-driven flow, in priority order: header removal,
   * then config application, then selection-flag generation. Returns an empty
   * answer list — output is surfaced through the reporter.
   */
  async run(): Promise<Answer[]> {
    if (this.#flags["remove-headers"]) {
      await this.#removeHeaders();
      return [];
    }
    if (this.#flags["apply-config"]) {
      await this.#applyConfig();
      return [];
    }
    await this.#generate();
    return [];
  }

  /**
   * Generates from selection flags. Requires `--license`; with it the method
   * either lists the license's customizable fields (`--get-tokens`), reports the
   * fields still needed when `--set` values are incomplete, or generates the
   * `LICENSE` file — standard text when no `--set` values are given, or a
   * customized copyright when every field is supplied — and records the selection
   * in every project manifest present.
   */
  async #generate(): Promise<void> {
    const licenseId = this.#flags.license;

    if (licenseId === "") {
      this.#fail(
        "The --license <spdx-id> flag is required when using --set, --headers, --get-tokens, or a --save-* flag.",
      );
      return;
    }

    const detail = await this.#resolveLicenseDetail(licenseId);
    if (detail === null) {
      return;
    }

    // From here on use the canonical identifier the source resolved, not the
    // (possibly differently-cased) text the user typed, so the LICENSE, config,
    // and manifest fields all record the official SPDX id (e.g. `MIT`, not `mit`).
    const canonicalId = detail.licenseId;
    const template = new LicenseTemplate(detail.standardLicenseTemplate ?? "");

    if (this.#flags["get-tokens"]) {
      this.#reporter.tokens(canonicalId, template.slots());
      return;
    }

    // Validate the requested save location up front so generation never runs
    // when the config cannot be persisted as asked.
    const saveTarget = await this.#resolveSaveTarget();
    if (saveTarget === null) {
      return;
    }

    // Validate the header request up front too, for the same reason.
    const headerStyle = this.#resolveHeaderStyle(detail);
    if (headerStyle === null) {
      return;
    }

    const setEntries = this.#parseSetEntries(this.#flags.set);
    if (setEntries === null) {
      return;
    }

    // Resolve the supplied fields against the license's copyright slots. With no
    // --set values this is empty and the official text is generated unchanged.
    let values: Record<string, string> = {};
    if (setEntries.size > 0) {
      const resolution = template.resolveSlots(setEntries);

      if (resolution.unknown.length > 0) {
        this.#reporter.unknownFields(
          canonicalId,
          resolution.unknown,
          template.slots(),
        );
        this.#exitWithError();
        return;
      }

      if (resolution.missing.length > 0) {
        this.#reporter.missingFields(canonicalId, resolution.missing);
        this.#exitWithError();
        return;
      }

      values = resolution.values;
    }

    // A `full` header must not be stamped with copyright placeholders the
    // selection can't fill (e.g. the GPL family exposes no copyright fields, so
    // its notice's `<year>`/`<name of author>` could never be substituted).
    if (
      headerStyle === "full" &&
      HeaderRenderer.fullHeaderHasUnfilledPlaceholders(detail, values)
    ) {
      this.#failUnfillableFullHeader(canonicalId, template);
      return;
    }

    await this.#generateLicense(
      canonicalId,
      values,
      saveTarget,
      headerStyle,
      this.#flags["headers-ignore"],
    );
  }

  /**
   * Reports the failure for a `full` header whose copyright placeholders can't be
   * filled, steering the user to the route that works: supplying the fields when
   * the license exposes them, or `--headers short` when it does not.
   *
   * @param licenseId - The canonical SPDX identifier being generated.
   * @param template - The license's body template, whose slots are the fillable fields.
   */
  #failUnfillableFullHeader(
    licenseId: string,
    template: LicenseTemplate,
  ): void {
    const slots = template.slots();
    if (slots.length > 0) {
      const fields = slots.map((slot) => slot.label).join(", ");
      this.#fail(
        `${licenseId}'s full header notice needs copyright values. Supply them with --set (${fields}), or use --headers short.`,
      );
    } else {
      this.#fail(
        `${licenseId} exposes no copyright fields, so its full header notice would ship unfilled placeholders. Use --headers short instead.`,
      );
    }
  }

  /**
   * Regenerates everything from the project's saved configuration instead of
   * selection flags: it reads the highest-priority config store and regenerates
   * the `LICENSE`, manifest fields, and — when the config opted into headers —
   * the source-file headers from it, leaving the config where it lives. A missing
   * configuration is reported as a failure. Honors `--dry-run`.
   */
  async #applyConfig(): Promise<void> {
    const config = await this.#config.read();

    if (config === null) {
      this.#fail(
        "Cannot apply config: no saved configuration found. Save one first with a --save-* flag, or run the wizard interactively.",
      );
      return;
    }

    const detail = await this.#resolveLicenseDetail(config.licenseId);
    if (detail === null) {
      return;
    }

    // The saved config is the source of truth, so its license, header style, and
    // the ignore scope the headers were installed with are applied as recorded
    // rather than re-validated against selection flags. The empty save target
    // leaves the config in the store it already lives in.
    await this.#generateLicense(
      config.licenseId,
      config.tokens ?? {},
      "",
      config.headers?.style ?? "",
      config.headers?.ignore ?? [],
    );
  }

  /**
   * Strips wizard-written headers from every source file and drops the saved
   * headers preference so verification no longer checks that surface. Honors
   * `--headers-ignore` for scope and `--dry-run`, which lists the files that
   * would be cleared without touching them (and leaves the configuration alone).
   */
  async #removeHeaders(): Promise<void> {
    const extraIgnores = this.#flags["headers-ignore"];

    if (this.#flags["dry-run"]) {
      const report = await this.#headers.previewRemoval(extraIgnores);
      this.#reporter.headersRemoveDryRun(report);
      return;
    }

    const report = await this.#headers.remove(extraIgnores);
    this.#reporter.headersRemoved(report);
    await this.#config.clearHeaders();
  }

  /**
   * Fetches the requested license's detail, or reports the closest available
   * identifiers and returns null when the id is unrecognized.
   *
   * @param licenseId - The SPDX identifier requested via `--license` or config.
   */
  async #resolveLicenseDetail(
    licenseId: string,
  ): Promise<LicenseDetail | null> {
    try {
      return await this.#licenses.getLicense(licenseId);
    } catch (error) {
      if (error instanceof LicenseNotFoundError) {
        const suggestions = await this.#licenses.suggest(
          licenseId,
          SUGGESTION_LIMIT,
        );
        this.#reporter.licenseNotFound(licenseId, suggestions);
        this.#exitWithError();
        return null;
      }
      throw error;
    }
  }

  /**
   * Resolves which config store the `--save-*` flags request. Returns the empty
   * string when none is given (the default — save nowhere), the target store id
   * when exactly one available location is requested, or null after reporting an
   * error when more than one is given or the requested location is not present.
   */
  async #resolveSaveTarget(): Promise<string | null> {
    const flags = this.#flags as Record<string, boolean | string | string[]>;
    const requested = Object.entries(this.#saveTargetByFlag)
      .filter(([flag]) => flags[flag])
      .map(([, targetId]) => targetId);

    if (requested.length === 0) {
      return "";
    }

    if (requested.length > 1) {
      this.#fail(
        "Choose at most one save location (--save-rc, --save-npm, or --save-composer).",
      );
      return null;
    }

    const targetId = requested[0];
    const available = await this.#config.targets();
    if (!available.some((target) => target.id === targetId)) {
      this.#fail(
        `Cannot save to ${targetId}: it is not present in this project.`,
      );
      return null;
    }

    return targetId;
  }

  /**
   * Validates the `--headers` flag against the chosen license and returns the
   * requested style: the empty string when no header was requested, the style
   * when valid, or null after reporting an error when the value is unrecognized
   * or `full` was asked for a license that publishes no standard header.
   *
   * @param detail - The resolved detail of the license being generated.
   */
  #resolveHeaderStyle(detail: LicenseDetail): "" | HeaderStyle | null {
    const raw = this.#flags.headers.trim().toLowerCase();

    if (raw === "") {
      return "";
    }
    if (raw !== "short" && raw !== "full") {
      this.#fail(
        `Invalid --headers value "${this.#flags.headers}". Use "short" or "full".`,
      );
      return null;
    }
    if (raw === "full" && !HeaderRenderer.supportsFull(detail)) {
      this.#fail(
        `${detail.licenseId} publishes no standard header; only --headers short is available for it.`,
      );
      return null;
    }
    return raw;
  }

  /**
   * Applies the resolved selection through the installer — persisting the config
   * to the requested save location, writing the `LICENSE`, and recording the
   * selection in every present manifest — then reports the result. Under
   * `--dry-run` it previews the selection instead, writing nothing.
   *
   * @param licenseId - The SPDX identifier being generated.
   * @param slotValues - Resolved copyright slot values keyed by token.
   * @param saveTarget - The config store id to persist to, or the empty string
   *   to save nowhere.
   * @param headerStyle - The header style to also write into source files, or
   *   the empty string to write no headers.
   * @param extraIgnores - Extra gitignore-style patterns scoping which files are
   *   headed; persisted into the saved header config so verification reuses the
   *   same scope.
   */
  async #generateLicense(
    licenseId: string,
    slotValues: Record<string, string>,
    saveTarget: string,
    headerStyle: "" | HeaderStyle,
    extraIgnores: string[],
  ): Promise<void> {
    const selection: LicenseSelection = {
      licenseId,
      tokens: slotValues,
      save:
        saveTarget === ""
          ? { action: "none" }
          : { action: "save", target: saveTarget },
      headers:
        headerStyle === ""
          ? undefined
          : {
              style: headerStyle,
              ...(extraIgnores.length > 0 ? { ignore: extraIgnores } : {}),
            },
    };

    if (this.#flags["dry-run"]) {
      await this.#preview(selection);
      if (headerStyle !== "") {
        await this.#previewHeaders(
          licenseId,
          headerStyle,
          slotValues,
          extraIgnores,
        );
      }
      return;
    }

    await this.#installer.install(selection);
    this.#reporter.generated(licenseId, saveTarget);

    if (headerStyle !== "") {
      const report = await this.#headers.apply(
        licenseId,
        headerStyle,
        slotValues,
        extraIgnores,
      );
      if (report.total === 0) {
        this.#reporter.headersNoFiles(licenseId);
      } else {
        this.#reporter.headersGenerated(report);
      }
    }
  }

  /**
   * Renders the selection's license and reports what a real run would have
   * written — the `LICENSE` file, the present project manifests, and the config
   * save location — without performing any write.
   *
   * @param selection - The resolved license, copyright tokens, and save instruction.
   */
  async #preview(selection: LicenseSelection): Promise<void> {
    const content = await this.#generator.render(
      selection.licenseId,
      selection.tokens,
    );
    const manifests = (await this.#manifests.declaredLicenses()).map(
      (manifest) => manifest.name,
    );

    this.#reporter.dryRun({
      licenseId: selection.licenseId,
      content,
      save: selection.save,
      manifests,
    });
  }

  /**
   * Previews the header that would be written and the files it would touch,
   * writing nothing.
   *
   * @param licenseId - The SPDX identifier whose header would be written.
   * @param style - The header style (`short` or `full`).
   * @param tokens - Copyright tokens inherited from the license customization.
   * @param extraIgnores - Extra gitignore-style patterns scoping the scan.
   */
  async #previewHeaders(
    licenseId: string,
    style: HeaderStyle,
    tokens: Record<string, string>,
    extraIgnores: string[],
  ): Promise<void> {
    const preview = await this.#headers.preview(
      licenseId,
      style,
      tokens,
      extraIgnores,
    );

    if (preview === null) {
      this.#reporter.headersNoFiles(licenseId);
      return;
    }

    this.#reporter.headersDryRun({
      licenseId,
      style,
      files: preview.files,
      sample: preview.sample,
    });
  }

  /**
   * Parses raw `--set` arguments of the form `field=value` into a map keyed by
   * the field as typed. Splits on the first `=` so values may contain `=`. Both
   * the field and the value are trimmed of surrounding whitespace, so a stray
   * space around either does not leak into the copyright line. Returns null after
   * reporting an error when any entry is missing a `=` or has an empty field name;
   * an empty value is left for slot resolution to reject as a missing field.
   *
   * @param raw - The raw `--set` argument values, each expected to be `field=value`.
   */
  #parseSetEntries(raw: string[]): Map<string, string> | null {
    const entries = new Map<string, string>();

    for (const item of raw) {
      const separator = item.indexOf("=");
      const field = separator === -1 ? "" : item.slice(0, separator).trim();

      if (field === "") {
        this.#fail(
          `Invalid --set value "${item}". Expected the form --set "field=value".`,
        );
        return null;
      }

      entries.set(field, item.slice(separator + 1).trim());
    }

    return entries;
  }

  /**
   * Reports an error message through the reporter and sets a non-zero exit code
   * without throwing, so failures surface cleanly to callers and agents.
   *
   * @param message - The error message to report.
   */
  #fail(message: string): void {
    this.#reporter.error(message);
    this.#exitWithError();
  }

  /**
   * Sets a non-zero exit code for a failure the reporter has already described,
   * without throwing.
   */
  #exitWithError(): void {
    process.exitCode = 1;
  }
}
