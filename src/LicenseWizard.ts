import type { Answer } from "@cli/Answer.js";
import { ClackRenderer } from "@cli/ClackRenderer.js";
import { CliReporter } from "@cli/CliReporter.js";
import { FlagParser } from "@cli/FlagParser.js";
import type { IReporter } from "@cli/interfaces/IReporter.js";
import { Orchestrator } from "@cli/Orchestrator.js";
import type {
  AutocompleteQuestion,
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
import { NpmManifest } from "@configuration/NpmManifest.js";
import { ProjectManifestRepository } from "@configuration/ProjectManifestRepository.js";
import { RcConfigStore } from "@configuration/RcConfigStore.js";
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
const SKIP_SAVE = "skip";
const PACKAGE_JSON = "package.json";
const COMPOSER_JSON = "composer.json";
const SUGGESTION_LIMIT = 5;

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
  readonly #reporter: IReporter;
  readonly #flags;
  // Maps each save flag to the target id of the config store it writes to,
  // read back from the store instances so the ids are not duplicated here.
  readonly #saveTargetByFlag: Record<string, string>;

  /**
   * Creates a new LicenseWizard instance and parses the provided CLI arguments.
   *
   * @param args - The raw argument list (e.g. `process.argv.slice(2)`).
   */
  constructor(args: string[]) {
    this.#flags = this.#parseFlags(args);

    const reader = new NodeFileSystemReader();
    const writer = new NodeFileSystemWriter();
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
      "dry-run": {
        type: "boolean",
        default: false,
        description:
          "Print the license that would be generated and skip every write (LICENSE, config, manifests).",
      },
    });
  }

  /**
   * Builds the ordered list of questions, reading the saved config to
   * pre-populate defaults where applicable.
   */
  async #buildQuestions(): Promise<Question[]> {
    const config = await this.#config.read();
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

    const saveConfigQuestion = await this.#buildSaveConfigQuestion();

    return [licenseQuestion, saveConfigQuestion];
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
      return;
    }

    const detail = await this.#licenseRepository.getLicense(answer.value);
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
        "The --license <spdx-id> flag is required when using --set, --get-tokens, or a --save-* flag.",
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

    const setEntries = this.#parseSetEntries(this.#flags.set);
    if (setEntries === null) {
      return;
    }

    // No --set values: generate the official text unchanged.
    if (setEntries.size === 0) {
      await this.#generateNonInteractive(licenseId, {}, saveTarget);
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

    await this.#generateNonInteractive(licenseId, values, saveTarget);
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
   */
  async #generateNonInteractive(
    licenseId: string,
    slotValues: Record<string, string>,
    saveTarget: string,
  ): Promise<void> {
    const selection: LicenseSelection = {
      licenseId,
      tokens: slotValues,
      save:
        saveTarget === ""
          ? { action: "none" }
          : { action: "save", target: saveTarget },
    };

    if (this.#flags["dry-run"]) {
      await this.#preview(selection);
      return;
    }

    await this.#installer.install(selection);
    this.#reporter.generated(licenseId, saveTarget);
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
    const outcome = await this.#verifier.verify({
      fix: !this.#flags.strict,
    });

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
        return;
      case "fixed":
        this.#reporter.verifyFixed(outcome);
        return;
      case "mismatch":
        this.#reporter.verifyMismatch(outcome);
        this.#exitWithError();
        return;
    }
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
   * ignoring every other selection flag. When `--dry-run` is passed, the
   * resolved license is rendered and printed along with the writes that would
   * have happened, but no `LICENSE`, config, or manifest is written.
   */
  async run() {
    if (this.#flags.help) {
      this.#reporter.usage(this.#createFlagParser().formatHelp());
      return [];
    }

    // --verify is a standalone mode: it ignores every other selection flag and
    // checks the existing LICENSE against the saved configuration instead.
    if (this.#flags.verify) {
      await this.#runVerify();
      return [];
    }

    if (this.#isNonInteractive()) {
      await this.#runNonInteractive();
      return [];
    }

    const questions = await this.#buildQuestions();
    const renderer = new ClackRenderer({
      name: pkg.name,
      description: pkg.description,
      version: pkg.version,
    });
    const repository = new QuestionRepository(questions);
    const orchestrator = new Orchestrator(repository, renderer);

    const answers = await orchestrator.run();

    const licenseAnswer = answers.find((a) => a.questionId === "license");
    const saveConfigAnswer = answers.find((a) => a.questionId === "saveConfig");

    if (typeof licenseAnswer?.value === "string") {
      const selection: LicenseSelection = {
        licenseId: licenseAnswer.value,
        tokens: this.#slotValuesFrom(licenseAnswer.fields),
        save: this.#interactiveSave(saveConfigAnswer),
      };

      if (this.#flags["dry-run"]) {
        await this.#preview(selection);
      } else {
        await this.#installer.install(selection);
      }
    }

    return answers;
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
