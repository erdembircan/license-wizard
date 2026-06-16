/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import path from "node:path";
import type { Answer } from "@cli/Answer.js";
import type { IReporter } from "@cli/interfaces/IReporter.js";
import type { Config } from "@configuration/Config.js";
import type { ProjectManifestRepository } from "@configuration/ProjectManifestRepository.js";
import { HeaderRenderer } from "@headers/HeaderRenderer.js";
import type { HeaderComment, HeaderStyle } from "@headers/HeaderPlan.js";
import { SUPPORTED_EXTENSIONS } from "@headers/SourceFileScanner.js";
import { LicenseNotFoundError } from "@licensing/errors/LicenseNotFoundError.js";
import type { LicenseDetail } from "@licensing/LicenseDetail.js";
import type { LicenseGenerator } from "@licensing/LicenseGenerator.js";
import type { LicenseRepository } from "@licensing/LicenseRepository.js";
import { LicenseCopyright } from "@licensing/LicenseCopyright.js";
import type { HeaderApplier } from "@application/HeaderApplier.js";
import type {
  LicenseSelection,
  LicenseInstaller,
} from "@application/LicenseInstaller.js";
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
   * forcing a header into a single skipped file, config application, then
   * selection-flag generation. Returns an empty answer list — output is surfaced
   * through the reporter.
   */
  async run(): Promise<Answer[]> {
    if (this.#flags["remove-headers"]) {
      await this.#removeHeaders();
      return [];
    }
    if (this.#flags["force-header"] !== "") {
      await this.#forceApply();
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
    // The customizable copyright spans both the LICENSE body and the header
    // notice: some licenses (the GPL family) expose no copyright field in their
    // body yet have `<year>`/`<name of author>` in their header, so tokens are
    // discovered from, and resolved against, the union of the two.
    const copyright = LicenseCopyright.fromDetail(detail);

    if (this.#flags["get-tokens"]) {
      this.#reporter.tokens(canonicalId, copyright.slots());
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

    const headerComment = this.#resolveHeaderComment(headerStyle);
    if (headerComment === null) {
      return;
    }

    const setEntries = this.#parseSetEntries(this.#flags.set);
    if (setEntries === null) {
      return;
    }

    // Resolve the supplied fields against only the slots the requested surfaces
    // need — the LICENSE body always, the header too only for a `full` header —
    // so customizing the LICENSE isn't forced to supply header-only fields, and
    // a `full` run still requires the header's. With no --set values this is
    // empty and the official text is generated unchanged.
    const requireHeader = headerStyle === "full";
    let values: Record<string, string> = {};
    if (setEntries.size > 0) {
      const resolution = copyright.resolveFor(setEntries, requireHeader);

      if (resolution.unknown.length > 0) {
        // A field that's unknown to the body but valid once a full header is in
        // play isn't a typo — it's a header-only field the user can't apply
        // without --headers full. Calling it "unknown" (when --get-tokens lists
        // it) is misleading, so steer them to the flag instead.
        const headerOnly = requireHeader
          ? []
          : this.#headerOnlyFields(copyright, setEntries, resolution.unknown);
        if (headerOnly.length === resolution.unknown.length) {
          this.#failHeaderOnlyFields(canonicalId, headerOnly);
          return;
        }
        this.#reporter.unknownFields(
          canonicalId,
          resolution.unknown,
          copyright.requiredSlots(requireHeader),
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
      this.#failUnfillableFullHeader(canonicalId, copyright);
      return;
    }

    await this.#generateLicense(
      canonicalId,
      values,
      saveTarget,
      headerStyle,
      headerComment,
      this.#flags["headers-ignore"],
    );
  }

  /**
   * Reports the failure for a `full` header whose copyright placeholders can't be
   * filled, steering the user to the route that works: supplying the fields when
   * the license exposes them, or `--headers short` when it does not.
   *
   * @param licenseId - The canonical SPDX identifier being generated.
   * @param copyright - The license's copyright, whose slots are the fillable fields.
   */
  #failUnfillableFullHeader(
    licenseId: string,
    copyright: LicenseCopyright,
  ): void {
    const slots = copyright.slots();
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
   * Returns which of the supplied unknown fields are not typos but copyright
   * fields that exist only on the header — known once a full header is in scope,
   * yet unknown to the body that this (non-full) run generates. Comparing the
   * body-scoped resolution against the full-header one isolates exactly those.
   *
   * @param copyright - The license's copyright across both surfaces.
   * @param entries - The supplied `--set` fields keyed as typed.
   * @param unknown - The fields the body-scoped resolution rejected.
   */
  #headerOnlyFields(
    copyright: LicenseCopyright,
    entries: Map<string, string>,
    unknown: string[],
  ): string[] {
    const unknownToFull = copyright.resolveFor(entries, true).unknown;
    return unknown.filter((field) => !unknownToFull.includes(field));
  }

  /**
   * Reports that the supplied fields apply only to a license's header notice and
   * can't be used without `--headers full`, rather than mislabelling them as
   * unknown when `--get-tokens` would list them.
   *
   * @param licenseId - The canonical SPDX identifier being generated.
   * @param fields - The header-only field names the user supplied.
   */
  #failHeaderOnlyFields(licenseId: string, fields: string[]): void {
    const list = fields.join(", ");
    const plural = fields.length > 1;
    this.#fail(
      `${list} ${plural ? "are" : "is"} only used in ${licenseId}'s header notice, not its license text. ` +
        `Add --headers full to apply ${plural ? "them" : "it"}, or drop ${plural ? "them" : "it"}.`,
    );
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
      config.headers?.comment ?? "block",
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
   * Forces the configured header into a single file the safety guard skipped,
   * named by the `--force-header` path — the actionable escape hatch that pairs
   * with surfacing the skipped list. The override only attaches to a config that
   * opted into headers: when headers are not enabled it is silently disregarded
   * rather than failed. The path is validated as relative-and-inside-the-project
   * first (a security boundary), then the header derived from the saved config is
   * forced into it, even though a normal run would skip it. Honors `--dry-run`.
   */
  async #forceApply(): Promise<void> {
    const config = await this.#config.read();
    if (!config?.headers) {
      return;
    }

    const target = this.#resolveForceTarget(this.#flags["force-header"]);
    if (target === null) {
      return;
    }

    const detail = await this.#resolveLicenseDetail(config.licenseId);
    if (detail === null) {
      return;
    }

    const report = await this.#headers.forceApply(
      config.licenseId,
      config.headers.style,
      config.headers.comment ?? "block",
      config.tokens ?? {},
      target,
      { dryRun: this.#flags["dry-run"] },
    );

    if (report.outcome === "missing") {
      this.#fail(
        `Cannot force a header into "${target}": no such file in this project.`,
      );
      return;
    }
    if (report.outcome === "unsupported") {
      this.#fail(
        `Cannot force a header into "${target}": it is not a source file the wizard heads (${SUPPORTED_EXTENSIONS.join(", ")}).`,
      );
      return;
    }
    if (report.outcome === "outside") {
      this.#fail(
        `Cannot force a header into "${target}": it resolves outside the project (a symlinked directory leads out of it).`,
      );
      return;
    }

    this.#reporter.headersForceApplied({
      licenseId: report.licenseId,
      style: report.style,
      file: report.file,
      outcome: report.outcome,
      dryRun: this.#flags["dry-run"],
    });
  }

  /**
   * Validates the `--force-header` path and returns it unchanged when safe, or
   * null after reporting an error. The path must be relative and must resolve to
   * a location inside the working directory the command ran in: an absolute path,
   * or one that climbs out of the project with `..`, is rejected. This is a
   * security boundary — the override must never be coaxed into writing outside
   * the project it was invoked in.
   *
   * @param requested - The raw path supplied to `--force-header`.
   */
  #resolveForceTarget(requested: string): string | null {
    const cwd = process.cwd();
    const relativeToCwd = path.relative(cwd, path.resolve(cwd, requested));
    const escapes =
      relativeToCwd === "" ||
      relativeToCwd === ".." ||
      relativeToCwd.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relativeToCwd);

    if (path.isAbsolute(requested) || escapes) {
      this.#fail(
        `Cannot force a header into "${requested}": the path must be relative to the current directory and stay inside the project.`,
      );
      return null;
    }

    return requested;
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
   * Resolves the `--headers-comment` flag into a comment delimiter. The flag only
   * governs how a written header is wrapped, so it is tied to headers being
   * enabled: supplying it without `--headers` is a usage error rather than a
   * silently-dropped no-op. When absent it defaults to `block` (the
   * REUSE-conventional block-comment style); otherwise it must be `block` or
   * `docblock`. Returns null after reporting the error on either failure.
   *
   * @param headerStyle - The resolved header style, or the empty string when no
   *   header is being written.
   */
  #resolveHeaderComment(headerStyle: "" | HeaderStyle): HeaderComment | null {
    const raw = this.#flags["headers-comment"].trim().toLowerCase();

    if (raw === "") {
      return "block";
    }
    if (headerStyle === "") {
      this.#fail(
        '--headers-comment has no effect without --headers. Add "--headers short" (or "full"), or drop --headers-comment.',
      );
      return null;
    }
    if (raw !== "block" && raw !== "docblock") {
      this.#fail(
        `Invalid --headers-comment value "${this.#flags["headers-comment"]}". Use "block" or "docblock".`,
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
   * @param headerComment - The comment delimiter (`block` or `docblock`) the
   *   header is wrapped in; persisted only when it differs from the `block`
   *   default, keeping pre-existing configs byte-for-byte unchanged.
   * @param extraIgnores - Extra gitignore-style patterns scoping which files are
   *   headed; persisted into the saved header config so verification reuses the
   *   same scope.
   */
  async #generateLicense(
    licenseId: string,
    slotValues: Record<string, string>,
    saveTarget: string,
    headerStyle: "" | HeaderStyle,
    headerComment: HeaderComment,
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
              ...(headerComment !== "block" ? { comment: headerComment } : {}),
              ...(extraIgnores.length > 0 ? { ignore: extraIgnores } : {}),
            },
    };

    if (this.#flags["dry-run"]) {
      await this.#preview(selection);
      if (headerStyle !== "") {
        await this.#previewHeaders(
          licenseId,
          headerStyle,
          headerComment,
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
        headerComment,
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
   * @param comment - The comment delimiter (`block` or `docblock`).
   * @param tokens - Copyright tokens inherited from the license customization.
   * @param extraIgnores - Extra gitignore-style patterns scoping the scan.
   */
  async #previewHeaders(
    licenseId: string,
    style: HeaderStyle,
    comment: HeaderComment,
    tokens: Record<string, string>,
    extraIgnores: string[],
  ): Promise<void> {
    const preview = await this.#headers.preview(
      licenseId,
      style,
      comment,
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
      skipped: preview.skipped,
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
