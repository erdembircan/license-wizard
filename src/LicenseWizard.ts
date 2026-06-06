import type { Answer } from "@cli/Answer.js";
import { ClackRenderer } from "@cli/ClackRenderer.js";
import { CliReporter } from "@cli/CliReporter.js";
import { FlagParser } from "@cli/FlagParser.js";
import type {
  CompletionHeaders,
  IRenderer,
} from "@cli/interfaces/IRenderer.js";
import type { IReporter } from "@cli/interfaces/IReporter.js";
import { Orchestrator } from "@cli/Orchestrator.js";
import { ProgressBar } from "@cli/ProgressBar.js";
import type {
  AutocompleteQuestion,
  ConfirmQuestion,
  Question,
  QuestionLifecycle,
  SelectQuestion,
  TextQuestion,
} from "@cli/Question.js";
import { QuestionRepository } from "@cli/QuestionRepository.js";
import { ComposerManifest } from "@configuration/ComposerManifest.js";
import { Config } from "@configuration/Config.js";
import { ManifestConfigStore } from "@configuration/ManifestConfigStore.js";
import { NodeFileSystemReader } from "@configuration/NodeFileSystemReader.js";
import { NodeFileSystemWriter } from "@configuration/NodeFileSystemWriter.js";
import type { IFileSystemReader } from "@configuration/interfaces/IFileSystemReader.js";
import type { IFileSystemWriter } from "@configuration/interfaces/IFileSystemWriter.js";
import { NpmManifest } from "@configuration/NpmManifest.js";
import { ProjectManifestRepository } from "@configuration/ProjectManifestRepository.js";
import { RcConfigStore } from "@configuration/RcConfigStore.js";
import type { WizardConfig } from "@configuration/WizardConfig.js";
import { HeaderComposer } from "@headers/HeaderComposer.js";
import { HeaderInstaller } from "@headers/HeaderInstaller.js";
import { HeaderRemover } from "@headers/HeaderRemover.js";
import type { HeaderPlan, HeaderStyle } from "@headers/HeaderPlan.js";
import { HeaderRenderer } from "@headers/HeaderRenderer.js";
import { HeaderVerifier } from "@headers/HeaderVerifier.js";
import { NodeFileTreeWalker } from "@headers/NodeFileTreeWalker.js";
import { SourceFile } from "@headers/SourceFile.js";
import { SourceFileScanner } from "@headers/SourceFileScanner.js";
import { LicenseNotFoundError } from "@licensing/errors/LicenseNotFoundError.js";
import { LicenseGenerator } from "@licensing/LicenseGenerator.js";
import type { LicenseDetail } from "@licensing/LicenseDetail.js";
import { LicenseRepository } from "@licensing/LicenseRepository.js";
import { LicenseTemplate } from "@licensing/LicenseTemplate.js";
import { SpdxLicenseSource } from "@licensing/SpdxLicenseSource.js";
import type { TemplateSlot } from "@licensing/TemplateSlot.js";
import { LicenseInstaller } from "./LicenseInstaller.js";
import type { ConfigSave, LicenseSelection } from "./LicenseInstaller.js";
import { LicenseVerifier } from "./LicenseVerifier.js";
import pkg from "../package.json" with { type: "json" };

const GENERATION_MODE_ID = "generationMode";
const SAVE_CONFIG_ID = "saveConfig";
const HEADERS_ENABLE_ID = "addHeaders";
const HEADERS_STYLE_ID = "headerStyle";
const MODE_ID = "mode";
const MODE_SETUP = "setup";
const MODE_REMOVE = "remove";
const REMOVE_HEADERS_ID = "removeHeaders";
const SKIP_SAVE = "skip";
const PACKAGE_JSON = "package.json";
const COMPOSER_JSON = "composer.json";
const SUGGESTION_LIMIT = 5;

export type HeaderApplyReport = {
  licenseId: string;
  style: HeaderStyle;
  total: number;
  written: number;
  unchanged: number;
};

/**
 * Entry point for the license-wizard CLI application.
 */
export class LicenseWizard {
  readonly #config: Config;
  readonly #manifests: ProjectManifestRepository;
  readonly #licenseRepository: LicenseRepository;
  readonly #generator: LicenseGenerator;
  readonly #installer: LicenseInstaller;
  readonly #verifier: LicenseVerifier;
  readonly #reader: IFileSystemReader;
  readonly #writer: IFileSystemWriter;
  // The header collaborators are built lazily (see the getters below) so a run
  // that never touches headers — the common case — never pays to assemble them.
  #scannerInstance: SourceFileScanner | null = null;
  #headerInstallerInstance: HeaderInstaller | null = null;
  #headerRemoverInstance: HeaderRemover | null = null;
  #headerVerifierInstance: HeaderVerifier | null = null;
  readonly #reporter: IReporter;
  readonly #flags;
  // Maps each save flag to the target id of the config store it writes to,
  // read back from the store instances so the ids are not duplicated here.
  readonly #saveTargetByFlag: Record<string, string>;
  // The detail of the license chosen in the interactive flow, captured when the
  // license is answered so the later header questions can decide whether the
  // `full` style is available without fetching it again.
  #interactiveHeaderDetail: LicenseDetail | null = null;

  /**
   * Creates a new LicenseWizard instance and parses the provided CLI arguments.
   *
   * @param args - The raw argument list (e.g. `process.argv.slice(2)`).
   */
  constructor(args: string[]) {
    this.#flags = this.#parseFlags(args);

    const reader = new NodeFileSystemReader();
    const writer = new NodeFileSystemWriter();
    this.#reader = reader;
    this.#writer = writer;
    const rcConfigStore = new RcConfigStore();
    const npmConfigStore = new ManifestConfigStore(PACKAGE_JSON);
    const composerConfigStore = new ManifestConfigStore(COMPOSER_JSON);
    this.#saveTargetByFlag = {
      "save-rc": rcConfigStore.id,
      "save-npm": npmConfigStore.id,
      "save-composer": composerConfigStore.id,
    };
    this.#config = new Config(
      [rcConfigStore, npmConfigStore, composerConfigStore],
      reader,
      writer,
    );
    this.#manifests = new ProjectManifestRepository(
      [new ComposerManifest(), new NpmManifest()],
      reader,
      writer,
    );

    const licenseSource = new SpdxLicenseSource();
    this.#licenseRepository = new LicenseRepository(licenseSource);
    this.#generator = new LicenseGenerator(this.#licenseRepository, writer);
    this.#installer = new LicenseInstaller(
      this.#config,
      this.#manifests,
      this.#generator,
    );
    this.#verifier = new LicenseVerifier(
      this.#config,
      this.#manifests,
      this.#generator,
      reader,
    );
    this.#reporter = new CliReporter(pkg.name);
  }

  /**
   * Lazily builds and memoizes the source-file scanner, so it is assembled only
   * when a run actually scans for headers.
   */
  get #scanner(): SourceFileScanner {
    return (this.#scannerInstance ??= new SourceFileScanner(
      new NodeFileTreeWalker(),
      this.#reader,
    ));
  }

  /**
   * Lazily builds and memoizes the header installer, so it is assembled only
   * when a run actually writes headers.
   */
  get #headerInstaller(): HeaderInstaller {
    return (this.#headerInstallerInstance ??= new HeaderInstaller(
      this.#reader,
      this.#writer,
    ));
  }

  /**
   * Lazily builds and memoizes the header remover, so it is assembled only when
   * a `--remove-headers` run actually strips headers.
   */
  get #headerRemover(): HeaderRemover {
    return (this.#headerRemoverInstance ??= new HeaderRemover(
      this.#reader,
      this.#writer,
    ));
  }

  /**
   * Lazily builds and memoizes the header verifier, so it is assembled only when
   * a `--verify` run reaches the header surface.
   */
  get #headerVerifier(): HeaderVerifier {
    return (this.#headerVerifierInstance ??= new HeaderVerifier(
      this.#scanner,
      this.#reader,
      this.#writer,
      this.#licenseRepository,
    ));
  }

  /**
   * Parses the raw CLI arguments against the supported flag definitions and
   * returns the resolved flag values.
   *
   * @param args - The raw argument list (e.g. `process.argv.slice(2)`).
   */
  #parseFlags(args: string[]) {
    return this.#createFlagParser().parse(args);
  }

  /**
   * Builds the flag parser configured with every supported flag and its help
   * metadata. Shared by argument parsing and the `--help` listing.
   */
  #createFlagParser() {
    return new FlagParser({
      help: {
        type: "boolean",
        default: false,
        description: "Show this help message and exit.",
      },
      verify: {
        type: "boolean",
        default: false,
        description:
          "Verify LICENSE and manifest license fields match the saved config, reconciling drift (standalone mode).",
      },
      strict: {
        type: "boolean",
        default: false,
        description:
          "With --verify, fail (exit non-zero) on any drift instead of reconciling it (for CI).",
      },
      "apply-config": {
        type: "boolean",
        default: false,
        description:
          "Generate non-interactively from the project's saved config (.licensewizardrc.json, package.json, or composer.json); errors if none exists. Takes priority over --license, --set, --headers, and --save-*.",
      },
      license: {
        type: "string",
        default: "",
        description: "Select a license by SPDX id (non-interactive).",
        placeholder: "<spdx-id>",
      },
      set: {
        type: "list",
        default: [],
        description: 'Set a copyright field, e.g. "year=2026" (repeatable).',
        placeholder: "<field=value>",
      },
      "save-rc": {
        type: "boolean",
        default: false,
        description: "Save config to .licensewizardrc.json.",
      },
      "save-npm": {
        type: "boolean",
        default: false,
        description: "Save config to package.json (must exist).",
      },
      "save-composer": {
        type: "boolean",
        default: false,
        description: "Save config to composer.json (must exist).",
      },
      "get-tokens": {
        type: "boolean",
        default: false,
        description: "List the license's copyright fields and exit.",
      },
      headers: {
        type: "string",
        default: "",
        description:
          'Also write SPDX license headers into source files: "short" (SPDX tags) or "full" (the license notice).',
        placeholder: "<short|full>",
      },
      "headers-ignore": {
        type: "list",
        default: [],
        description:
          "Extra gitignore-style pattern to skip when writing headers (repeatable).",
        placeholder: "<glob>",
      },
      "remove-headers": {
        type: "boolean",
        default: false,
        description:
          "Remove wizard-written SPDX headers from source files and drop the saved headers preference (standalone; takes priority over --headers).",
      },
      "dry-run": {
        type: "boolean",
        default: false,
        description:
          "Print the license that would be generated and skip every write (LICENSE, config, manifests).",
      },
    });
  }

  /**
   * Builds the ordered license-setup questions (license → headers → save),
   * pre-populating defaults from the saved config and project manifest.
   *
   * @param config - The saved configuration, used for license/token defaults.
   */
  async #buildSetupQuestions(config: WizardConfig | null): Promise<Question[]> {
    const projectLicense = await this.#manifests.readLicense();

    const licenseQuestion: AutocompleteQuestion = {
      id: "license",
      text: "Which license do you want to use?",
      type: "autocomplete",
      defaultValue: this.#flags.license || projectLicense || config?.licenseId,
      search: async (query) => {
        const results = await this.#licenseRepository.search(query);
        return results.map((entry) => ({
          value: entry.licenseId,
          label: entry.name,
          hint: entry.licenseId,
        }));
      },
      onAnswer: (answer, lifecycle) =>
        this.#offerCustomization(answer, lifecycle, config?.tokens),
    };

    const headersQuestion = this.#buildHeadersQuestion();
    const saveConfigQuestion = await this.#buildSaveConfigQuestion();

    return [licenseQuestion, headersQuestion, saveConfigQuestion];
  }

  /**
   * Builds the opening mode prompt, shown only when the saved config carries a
   * headers preference. Its answer routes {@link run} to either the license
   * setup flow or the header-removal path.
   */
  #buildModeQuestion(): SelectQuestion {
    return {
      id: MODE_ID,
      text: "What would you like to do?",
      type: "select",
      defaultValue: MODE_SETUP,
      options: [
        {
          value: MODE_SETUP,
          label: "Set up a license",
          hint: "choose a license, optionally add headers",
        },
        {
          value: MODE_REMOVE,
          label: "Remove license headers",
          hint: "delete the wizard-written headers from your files",
        },
      ],
    };
  }

  /**
   * Builds the removal confirmation shown after the "remove license headers"
   * mode is chosen. Its answer decides whether {@link run} strips the headers.
   */
  #buildRemoveHeadersQuestion(): ConfirmQuestion {
    return {
      id: REMOVE_HEADERS_ID,
      text: "Remove the wizard-written license headers from your source files?",
      type: "confirm",
      defaultValue: true,
    };
  }

  /**
   * Builds the top-level "add headers?" prompt. Answering yes injects a
   * short/full style choice, but only when the chosen license publishes a
   * standard header — otherwise only the `short` style applies and no further
   * question is needed. The license's support is read from the detail captured
   * when the license was answered, which runs before this question.
   */
  #buildHeadersQuestion(): ConfirmQuestion {
    return {
      id: HEADERS_ENABLE_ID,
      text: "Add SPDX license headers to your source files?",
      type: "confirm",
      defaultValue: false,
      onAnswer: (answer, lifecycle) => {
        const supportsFull =
          this.#interactiveHeaderDetail !== null &&
          HeaderRenderer.supportsFull(this.#interactiveHeaderDetail);
        if (answer.value === true && supportsFull) {
          lifecycle.inject([this.#buildHeaderStyleQuestion()]);
        }
      },
    };
  }

  /**
   * Builds the short/full header-style choice, offered only for licenses that
   * publish a standard header (so `full` is a real option). The copyright fields
   * are not asked again here — the header reuses whatever was chosen for the
   * license text.
   */
  #buildHeaderStyleQuestion(): SelectQuestion {
    return {
      id: HEADERS_STYLE_ID,
      text: "Which header style do you want in each file?",
      type: "select",
      defaultValue: "short",
      options: [
        {
          value: "short",
          label: "Short",
          hint: "SPDX-License-Identifier tag lines",
        },
        {
          value: "full",
          label: "Full",
          hint: "the complete license notice",
        },
      ],
    };
  }

  /**
   * Builds the save-location picker. Offers every store currently eligible as a
   * target — the `.licensewizardrc.json` dot-file is always present, and each
   * project manifest appears only when its file exists — plus a "skip" option.
   * Choosing a target later writes the config there and clears it everywhere
   * else; choosing "skip" saves nowhere and clears the config from every
   * location.
   */
  async #buildSaveConfigQuestion(): Promise<SelectQuestion> {
    const targets = await this.#config.targets();

    return {
      id: SAVE_CONFIG_ID,
      text: "Where do you want to save the wizard config?",
      type: "select",
      defaultValue: targets[0]?.id ?? SKIP_SAVE,
      options: [
        ...targets.map((target) => ({
          value: target.id,
          label: target.label,
        })),
        {
          value: SKIP_SAVE,
          label: "Skip",
          hint: "save nowhere, clear any existing",
        },
      ],
    };
  }

  /**
   * After a license is chosen, fetches its SPDX template and — only when the
   * license has customizable copyright slots — injects a Standard/Customize
   * question. Licenses with no slots skip the choice entirely and are written
   * as their standard text.
   *
   * @param savedTokens - Previously saved token values, keyed by slot token,
   *   used to pre-fill the copyright slot questions' defaults.
   */
  async #offerCustomization(
    answer: Answer,
    lifecycle: QuestionLifecycle,
    savedTokens?: Record<string, string>,
  ): Promise<void> {
    if (typeof answer.value !== "string" || answer.value === "") {
      this.#interactiveHeaderDetail = null;
      return;
    }

    const detail = await this.#licenseRepository.getLicense(answer.value);
    // Remember the detail so the later header-style question can tell whether
    // this license supports a `full` header without fetching it again.
    this.#interactiveHeaderDetail = detail;
    const slots = new LicenseTemplate(
      detail.standardLicenseTemplate ?? "",
    ).slots();

    if (slots.length === 0) {
      return;
    }

    lifecycle.inject([this.#buildGenerationModeQuestion(slots, savedTokens)]);
  }

  /**
   * Builds the Standard/Customize select. Choosing "customize" injects one text
   * question per copyright slot, labeled by the slot's placeholder text and
   * pre-filled with any previously saved value for that token.
   *
   * @param savedTokens - Previously saved token values, keyed by slot token.
   */
  #buildGenerationModeQuestion(
    slots: TemplateSlot[],
    savedTokens?: Record<string, string>,
  ): SelectQuestion {
    const slotQuestions: TextQuestion[] = slots.map((slot) => ({
      id: slot.token,
      text: slot.label,
      type: "text",
      defaultValue: savedTokens?.[slot.token],
    }));

    return {
      id: GENERATION_MODE_ID,
      text: "How do you want to generate the license?",
      type: "select",
      defaultValue: "standard",
      options: [
        {
          value: "standard",
          label: "Standard",
          hint: "official text, unchanged",
        },
        {
          value: "customize",
          label: "Customize",
          hint: "fill in the copyright",
        },
      ],
      onAnswer: (modeAnswer, modeLifecycle) => {
        if (modeAnswer.value === "customize") {
          modeLifecycle.inject(slotQuestions);
        }
      },
    };
  }

  /**
   * Reports whether any non-interactive flag was supplied. The presence of
   * `--license`, `--set`, `--get-tokens`, or any `--save-*` flag switches the
   * wizard out of the interactive prompt flow and into single-command CLI mode.
   */
  #isNonInteractive(): boolean {
    return (
      this.#flags.license !== "" ||
      this.#flags.set.length > 0 ||
      this.#flags.headers !== "" ||
      this.#flags["get-tokens"] ||
      this.#flags["save-rc"] ||
      this.#flags["save-npm"] ||
      this.#flags["save-composer"]
    );
  }

  /**
   * Runs the wizard in non-interactive CLI mode. Requires `--license`; with it
   * the method either lists the license's customizable fields (`--get-tokens`),
   * reports the fields still needed when `--set` values are incomplete, or
   * generates the `LICENSE` file — standard text when no `--set` values are
   * given, or a customized copyright when every field is supplied — and records
   * the selection in every project manifest present. Failures and incomplete
   * requests are written to stderr and set a non-zero exit code without throwing.
   */
  async #runNonInteractive(): Promise<void> {
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

    const template = new LicenseTemplate(detail.standardLicenseTemplate ?? "");

    if (this.#flags["get-tokens"]) {
      this.#reporter.tokens(licenseId, template.slots());
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

    // No --set values: generate the official text unchanged.
    if (setEntries.size === 0) {
      await this.#generateNonInteractive(
        licenseId,
        {},
        saveTarget,
        headerStyle,
      );
      return;
    }

    // --set values present: the user wants a customized license. Resolve each
    // provided field against the license's copyright slots.
    const { values, missing, unknown } = template.resolveSlots(setEntries);

    if (unknown.length > 0) {
      this.#reporter.unknownFields(licenseId, unknown, template.slots());
      this.#exitWithError();
      return;
    }

    if (missing.length > 0) {
      this.#reporter.missingFields(licenseId, missing);
      this.#exitWithError();
      return;
    }

    await this.#generateNonInteractive(
      licenseId,
      values,
      saveTarget,
      headerStyle,
    );
  }

  /**
   * Runs the wizard in non-interactive mode driven entirely by the project's
   * saved configuration instead of selection flags: it reads the highest-priority
   * config store and regenerates the `LICENSE`, manifest fields, and — when the
   * config opted into headers — the source-file headers from it, leaving the
   * config where it lives (no save location is changed). A missing configuration
   * is reported as a failure with a non-zero exit code. Honors `--dry-run`, which
   * previews the regeneration without writing. Like the other non-interactive
   * paths, failures are written to stderr and set the exit code without throwing.
   */
  async #runApplyConfig(): Promise<void> {
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

    // The saved config is the source of truth, so its license and header style
    // are applied as recorded rather than re-validated against selection flags.
    // The empty save target leaves the config in the store it already lives in.
    await this.#generateNonInteractive(
      config.licenseId,
      config.tokens ?? {},
      "",
      config.headers?.style ?? "",
    );
  }

  /**
   * Fetches the requested license's detail, or reports the closest available
   * identifiers and returns null when the id is unrecognized. Treating a missing
   * license as a recoverable user mistake keeps the CLI from crashing on a typo
   * and instead points at the licenses that do exist.
   *
   * @param licenseId - The SPDX identifier requested via `--license`.
   */
  async #resolveLicenseDetail(
    licenseId: string,
  ): Promise<LicenseDetail | null> {
    try {
      return await this.#licenseRepository.getLicense(licenseId);
    } catch (error) {
      if (error instanceof LicenseNotFoundError) {
        const suggestions = await this.#licenseRepository.suggest(
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
   * error when more than one is given or the requested location is not present
   * in the project.
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
   */
  async #generateNonInteractive(
    licenseId: string,
    slotValues: Record<string, string>,
    saveTarget: string,
    headerStyle: "" | HeaderStyle,
  ): Promise<void> {
    const selection: LicenseSelection = {
      licenseId,
      tokens: slotValues,
      save:
        saveTarget === ""
          ? { action: "none" }
          : { action: "save", target: saveTarget },
      headers: headerStyle === "" ? undefined : { style: headerStyle },
    };

    if (this.#flags["dry-run"]) {
      await this.#preview(selection);
      if (headerStyle !== "") {
        await this.#previewHeaders(licenseId, headerStyle, slotValues);
      }
      return;
    }

    await this.#installer.install(selection);
    this.#reporter.generated(licenseId, saveTarget);

    if (headerStyle !== "") {
      const report = await this.#applyHeaders(
        licenseId,
        headerStyle,
        slotValues,
      );
      if (report.total === 0) {
        this.#reporter.headersNoFiles(licenseId);
      } else {
        this.#reporter.headersGenerated(report);
      }
    }
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
   * Scans the project for eligible source files and writes the header described
   * by the selection into each, showing a progress bar across the run, and
   * returns a tally of how many files were written versus already current.
   *
   * @param licenseId - The SPDX identifier whose header is written.
   * @param style - The header style (`short` or `full`).
   * @param tokens - Copyright tokens inherited from the license customization.
   */
  async #applyHeaders(
    licenseId: string,
    style: HeaderStyle,
    tokens: Record<string, string>,
  ): Promise<HeaderApplyReport> {
    const detail = await this.#licenseRepository.getLicense(licenseId);
    const files = await this.#scanner.scan({
      extraIgnores: this.#flags["headers-ignore"],
    });

    if (files.length === 0) {
      return { licenseId, style, total: 0, written: 0, unchanged: 0 };
    }

    const plan: HeaderPlan = { detail, style, tokens };
    const bar = new ProgressBar("  Inscribing headers");
    bar.start(files.length);
    const summary = await this.#headerInstaller.install(files, plan, (p) =>
      bar.update(p.done),
    );
    bar.stop();

    return {
      licenseId,
      style,
      total: files.length,
      written: summary.written.length,
      unchanged: summary.unchanged.length,
    };
  }

  /**
   * Previews the header that would be written and the files it would touch,
   * writing nothing. Shared by the interactive and non-interactive `--dry-run`
   * paths.
   *
   * @param licenseId - The SPDX identifier whose header would be written.
   * @param style - The header style (`short` or `full`).
   * @param tokens - Copyright tokens inherited from the license customization.
   */
  async #previewHeaders(
    licenseId: string,
    style: HeaderStyle,
    tokens: Record<string, string>,
  ): Promise<void> {
    const detail = await this.#licenseRepository.getLicense(licenseId);
    const files = await this.#scanner.scan({
      extraIgnores: this.#flags["headers-ignore"],
    });

    if (files.length === 0) {
      this.#reporter.headersNoFiles(licenseId);
      return;
    }

    // Render the sample block in the comment style of the first target file, so
    // the preview matches what that file would actually receive.
    const sample = new HeaderComposer({ detail, style, tokens }).block(
      SourceFile.extensionOf(files[0]),
    );
    this.#reporter.headersDryRun({ licenseId, style, files, sample });
  }

  /**
   * Renders the selection's license and reports what a real run would have
   * written — the `LICENSE` file, the present project manifests, and the config
   * save location — without performing any write. Shared by the interactive and
   * non-interactive `--dry-run` paths so both preview the same plan.
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
   * Parses raw `--set` arguments of the form `field=value` into a map keyed by
   * the field as typed. Splits on the first `=` so values may contain `=`.
   * Returns null after reporting an error when any entry is missing a `=` or has
   * an empty field name.
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

      entries.set(field, item.slice(separator + 1));
    }

    return entries;
  }

  /**
   * Runs the standalone `--verify` mode: checks both the on-disk `LICENSE` and
   * every present manifest's declared license against the saved configuration.
   * A missing `LICENSE` or missing configuration is reported as a failure (both
   * are required). When anything has drifted the file is rewritten and the
   * drifted manifests are updated by default, or — when `--strict` is set —
   * everything is left untouched and the drift is reported as a failure with a
   * non-zero exit code, so the check can gate a CI pipeline. Like the other
   * non-interactive paths, failures are written to stderr and set the exit code
   * without throwing.
   */
  async #runVerify(): Promise<void> {
    const fix = !this.#flags.strict;
    const outcome = await this.#verifier.verify({ fix });

    switch (outcome.kind) {
      case "missing-license":
        this.#fail(
          "Cannot verify: no LICENSE file found. Generate one first, e.g. with --license <spdx-id>.",
        );
        return;
      case "missing-config":
        this.#fail(
          "Cannot verify: no saved configuration found. Save one first with a --save-* flag.",
        );
        return;
      case "match":
        this.#reporter.verifyMatch(outcome);
        break;
      case "fixed":
        this.#reporter.verifyFixed(outcome);
        break;
      case "mismatch":
        this.#reporter.verifyMismatch(outcome);
        this.#exitWithError();
        break;
    }

    // When the configuration opts into source-file headers, verify that surface
    // too, in the same mode. The config is present here (a missing one returned
    // above), so re-reading it cannot fail.
    const config = await this.#config.read();
    if (config !== null) {
      await this.#runHeaderVerify(config, fix);
    }
  }

  /**
   * Verifies the source-file headers against the saved configuration, reporting
   * the result and — in strict mode — setting a non-zero exit code on drift.
   * Does nothing when the configuration does not opt into headers.
   *
   * @param config - The saved configuration to verify against.
   * @param fix - Whether to reconcile drift or only report it.
   */
  async #runHeaderVerify(config: WizardConfig, fix: boolean): Promise<void> {
    const outcome = await this.#headerVerifier.verify(config, { fix });

    switch (outcome.kind) {
      case "disabled":
        return;
      case "match":
        this.#reporter.headersVerifyMatch(outcome);
        return;
      case "fixed":
        this.#reporter.headersVerifyFixed(outcome);
        return;
      case "mismatch":
        this.#reporter.headersVerifyMismatch(outcome);
        this.#exitWithError();
        return;
    }
  }

  /**
   * Runs the standalone `--remove-headers` mode: scans the project for source
   * files and strips any wizard-written header from each, regardless of whether
   * it had drifted, then drops the saved headers preference so verification no
   * longer checks that surface. Honors `--headers-ignore` for scope and
   * `--dry-run`, which lists the files that would be cleared without touching
   * them (and leaves the configuration alone).
   */
  async #runRemoveHeaders(): Promise<void> {
    const files = await this.#scanner.scan({
      extraIgnores: this.#flags["headers-ignore"],
    });

    if (this.#flags["dry-run"]) {
      const removed: string[] = [];
      for (const file of files) {
        const content = await this.#reader.read(file);
        if (new SourceFile(content, file).hasManagedHeader()) {
          removed.push(file);
        }
      }
      this.#reporter.headersRemoveDryRun({ removed, total: files.length });
      return;
    }

    let summary = { removed: [] as string[], total: files.length };
    if (files.length > 0) {
      const bar = new ProgressBar("  Removing headers");
      bar.start(files.length);
      summary = await this.#headerRemover.remove(files, (progress) =>
        bar.update(progress.done),
      );
      bar.stop();
    }

    this.#reporter.headersRemoved(summary);
    await this.#clearHeadersConfig();
  }

  /**
   * Drops the saved `headers` preference from the configuration after a removal,
   * so verification no longer checks a header surface the project no longer has.
   * Rewrites the configuration in place — keeping the license id and any tokens —
   * to the store it already lives in; does nothing when no header preference is
   * set or no configuration exists.
   */
  async #clearHeadersConfig(): Promise<void> {
    const config = await this.#config.read();
    if (!config?.headers) {
      return;
    }

    const source = await this.#config.source();
    if (source === null) {
      return;
    }

    const next: WizardConfig = { licenseId: config.licenseId };
    if (config.tokens) {
      next.tokens = config.tokens;
    }
    await this.#config.write(next, source);
  }

  /**
   * Reports an error message through the reporter and sets a non-zero exit code
   * without throwing, so non-interactive failures surface cleanly to callers and
   * agents.
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

  /**
   * Runs the interactive wizard, collects answers, persists the configuration
   * to the chosen save location (clearing it from the others) — or, when the
   * user skips, clears the configuration from every location — writes the
   * selected license to a `LICENSE` file in the working
   * directory, and records the selection in every project manifest present
   * (`composer.json`, `package.json`). Returns the collected answers.
   * When `--help` is passed, prints the usage screen and exits without running.
   * When `--verify` is passed, runs the standalone verification mode instead,
   * ignoring every other selection flag. When `--apply-config` is passed,
   * regenerates everything from the project's saved configuration, ignoring the
   * selection flags it takes priority over. When `--dry-run` is passed, the
   * resolved license is rendered and printed along with the writes that would
   * have happened, but no `LICENSE`, config, or manifest is written.
   */
  async run() {
    if (this.#flags.help) {
      this.#reporter.usage(this.#createFlagParser().formatHelp());
      return [];
    }

    // --remove-headers is a standalone mode and takes priority over --headers:
    // when both are given, the headers are removed rather than written.
    if (this.#flags["remove-headers"]) {
      await this.#runRemoveHeaders();
      return [];
    }

    // --verify is a standalone mode: it ignores every other selection flag and
    // checks the existing LICENSE against the saved configuration instead.
    if (this.#flags.verify) {
      await this.#runVerify();
      return [];
    }

    // --apply-config is a standalone mode: it generates from the project's saved
    // configuration rather than from selection flags, and so takes priority over
    // --license, --set, --headers, and the --save-* flags.
    if (this.#flags["apply-config"]) {
      await this.#runApplyConfig();
      return [];
    }

    if (this.#isNonInteractive()) {
      await this.#runNonInteractive();
      return [];
    }

    const renderer = new ClackRenderer({
      name: pkg.name,
      description: pkg.description,
      version: pkg.version,
    });
    const config = await this.#config.read();

    // Adaptive opening: when the project already opted into headers, ask up front
    // whether to set up a license or remove the headers. Removal is rendered on
    // its own and short-circuits the license setup flow entirely.
    if (config?.headers) {
      const mode = await renderer.render(this.#buildModeQuestion());
      if (mode.value === MODE_REMOVE) {
        const confirmed = await renderer.render(
          this.#buildRemoveHeadersQuestion(),
        );
        if (confirmed.value === true) {
          await this.#runRemoveHeaders();
        }
        return [mode, confirmed];
      }
    }

    const questions = await this.#buildSetupQuestions(config);
    const repository = new QuestionRepository(questions);
    const orchestrator = new Orchestrator(repository, renderer);

    const answers = await orchestrator.run();

    const licenseAnswer = answers.find((a) => a.questionId === "license");
    const saveConfigAnswer = answers.find(
      (a) => a.questionId === SAVE_CONFIG_ID,
    );
    const headersAnswer = answers.find(
      (a) => a.questionId === HEADERS_ENABLE_ID,
    );

    if (typeof licenseAnswer?.value === "string") {
      const tokens = this.#slotValuesFrom(licenseAnswer.fields);
      const headerStyle = this.#interactiveHeaderStyle(headersAnswer);
      const selection: LicenseSelection = {
        licenseId: licenseAnswer.value,
        tokens,
        save: this.#interactiveSave(saveConfigAnswer),
        headers: headerStyle ? { style: headerStyle } : undefined,
      };

      if (this.#flags["dry-run"]) {
        await this.#preview(selection);
        if (headerStyle) {
          await this.#previewHeaders(selection.licenseId, headerStyle, tokens);
        }
      } else {
        await this.#installer.install(selection);
        const headers = headerStyle
          ? this.#toCompletionHeaders(
              await this.#applyHeaders(
                selection.licenseId,
                headerStyle,
                tokens,
              ),
            )
          : undefined;
        await this.#reportInteractiveCompletion(renderer, selection, headers);
      }
    }

    return answers;
  }

  /**
   * Resolves the chosen header style from the interactive answers: undefined
   * when headers were declined, otherwise the selected style — defaulting to
   * `short` when no style sub-question was asked (the license had no `full`
   * option).
   */
  #interactiveHeaderStyle(
    headersAnswer: Answer | undefined,
  ): HeaderStyle | undefined {
    if (headersAnswer?.value !== true) {
      return undefined;
    }
    const style = headersAnswer.fields?.[HEADERS_STYLE_ID];
    return style === "full" ? "full" : "short";
  }

  /**
   * Adapts a header apply report into the completion-summary shape, or undefined
   * when no report is available.
   */
  #toCompletionHeaders(report: HeaderApplyReport): CompletionHeaders {
    return {
      style: report.style,
      written: report.written,
      total: report.total,
    };
  }

  /**
   * Hands the renderer a summary of the interactive install so it can show the
   * closing confirmation: which license was conjured (and whether its copyright
   * was customized), the present manifests it was recorded in, how its header was
   * applied, and where the configuration was saved.
   *
   * @param renderer - The interactive renderer to surface the summary through.
   * @param selection - The resolved license, copyright tokens, and save instruction.
   * @param headers - The header outcome, when headers were written.
   */
  async #reportInteractiveCompletion(
    renderer: IRenderer,
    selection: LicenseSelection,
    headers: CompletionHeaders | undefined,
  ): Promise<void> {
    const manifests = (await this.#manifests.declaredLicenses()).map(
      (manifest) => manifest.name,
    );

    renderer.complete({
      licenseId: selection.licenseId,
      customized: Object.keys(selection.tokens).length > 0,
      savedTo: selection.save.action === "save" ? selection.save.target : "",
      manifests,
      headers,
    });
  }

  /**
   * Translates the save-location answer into a config save instruction:
   * "skip" clears every location, a chosen target writes there (clearing the
   * rest), and an unanswered question leaves the configuration untouched.
   */
  #interactiveSave(saveConfigAnswer: Answer | undefined): ConfigSave {
    if (typeof saveConfigAnswer?.value !== "string") {
      return { action: "none" };
    }
    if (saveConfigAnswer.value === SKIP_SAVE) {
      return { action: "clear" };
    }
    return { action: "save", target: saveConfigAnswer.value };
  }

  /**
   * Extracts the copyright slot values from a license answer's collected fields,
   * dropping the generation-mode marker and any non-string entries. Returns an
   * empty map when no customization fields were collected (the standard path).
   */
  #slotValuesFrom(
    fields: Answer["fields"] | undefined,
  ): Record<string, string> {
    const slotValues: Record<string, string> = {};

    if (!fields) {
      return slotValues;
    }

    for (const [key, value] of Object.entries(fields)) {
      if (key !== GENERATION_MODE_ID && typeof value === "string") {
        slotValues[key] = value;
      }
    }

    return slotValues;
  }
}
