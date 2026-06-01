import type { Answer } from "@cli/Answer.js";
import { ClackRenderer } from "@cli/ClackRenderer.js";
import { FlagParser } from "@cli/FlagParser.js";
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
import type { WizardConfig } from "@configuration/WizardConfig.js";
import { LicenseGenerator } from "@licensing/LicenseGenerator.js";
import { LicenseRepository } from "@licensing/LicenseRepository.js";
import { LicenseTemplate } from "@licensing/LicenseTemplate.js";
import { SpdxLicenseSource } from "@licensing/SpdxLicenseSource.js";
import type { TemplateSlot } from "@licensing/TemplateSlot.js";
import pkg from "../package.json" with { type: "json" };

const GENERATION_MODE_ID = "generationMode";
const SAVE_CONFIG_ID = "saveConfig";
const SKIP_SAVE = "skip";
const PACKAGE_JSON = "package.json";
const COMPOSER_JSON = "composer.json";

/**
 * Entry point for the license-wizard CLI application.
 */
export class LicenseWizard {
  readonly #config: Config;
  readonly #manifests: ProjectManifestRepository;
  readonly #licenseRepository: LicenseRepository;
  readonly #licenseGenerator: LicenseGenerator;
  readonly #flags;

  /**
   * Creates a new LicenseWizard instance and parses the provided CLI arguments.
   *
   * @param args - The raw argument list (e.g. `process.argv.slice(2)`).
   */
  constructor(args: string[]) {
    this.#flags = this.#parseFlags(args);

    const reader = new NodeFileSystemReader();
    const writer = new NodeFileSystemWriter();
    this.#config = new Config(
      [
        new RcConfigStore(),
        new ManifestConfigStore(PACKAGE_JSON),
        new ManifestConfigStore(COMPOSER_JSON),
      ],
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
    this.#licenseGenerator = new LicenseGenerator(
      this.#licenseRepository,
      writer,
    );
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
        description: "Verify the LICENSE file matches the saved configuration.",
      },
      license: {
        type: "string",
        default: "",
        description:
          "Select a license by its SPDX identifier and run non-interactively (no prompts).",
        placeholder: "<spdx-id>",
      },
      set: {
        type: "list",
        default: [],
        description:
          'Set a copyright field for the chosen license (repeatable), e.g. --set "year=2026". Implies non-interactive mode.',
        placeholder: "<field=value>",
      },
      "get-tokens": {
        type: "boolean",
        default: false,
        description:
          "List the copyright fields the selected license accepts (requires --license) and exit without generating.",
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
   * Writes the usage screen — the program invocation followed by the listing
   * of every supported flag — to stdout.
   */
  #printHelp(): void {
    process.stdout.write(
      `Usage: ${pkg.name} [options]\n\nOptions:\n${this.#createFlagParser().formatHelp()}\n`,
    );
  }

  /**
   * Reports whether any non-interactive flag was supplied. The presence of
   * `--license`, `--set`, or `--get-tokens` switches the wizard out of the
   * interactive prompt flow and into single-command CLI mode.
   */
  #isNonInteractive(): boolean {
    return (
      this.#flags.license !== "" ||
      this.#flags.set.length > 0 ||
      this.#flags["get-tokens"]
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
        "The --license <spdx-id> flag is required when using --set or --get-tokens.",
      );
      return;
    }

    const detail = await this.#licenseRepository.getLicense(licenseId);
    const slots = new LicenseTemplate(
      detail.standardLicenseTemplate ?? "",
    ).slots();

    if (this.#flags["get-tokens"]) {
      this.#printTokens(licenseId, slots);
      return;
    }

    const setEntries = this.#parseSetEntries(this.#flags.set);
    if (setEntries === null) {
      return;
    }

    // No --set values: generate the official text unchanged.
    if (setEntries.size === 0) {
      await this.#generateNonInteractive(licenseId, {});
      return;
    }

    // --set values present: the user wants a customized license. Resolve each
    // provided field against the license's real slots.
    const { values, missing, unknown } = this.#resolveSlotValues(
      slots,
      setEntries,
    );

    if (unknown.length > 0) {
      this.#printUnknownFields(licenseId, unknown, slots);
      return;
    }

    if (missing.length > 0) {
      this.#printMissingTokens(licenseId, values, missing);
      return;
    }

    await this.#generateNonInteractive(licenseId, values);
  }

  /**
   * Generates the license file and records the selection in every project
   * manifest present, then prints a one-line confirmation to stdout.
   *
   * @param licenseId - The SPDX identifier being generated.
   * @param slotValues - Resolved copyright slot values keyed by token.
   */
  async #generateNonInteractive(
    licenseId: string,
    slotValues: Record<string, string>,
  ): Promise<void> {
    await this.#licenseGenerator.generate(licenseId, slotValues);
    await this.#manifests.writeLicense(licenseId);
    process.stdout.write(
      `Wrote LICENSE (${licenseId}) and recorded it in the project manifests.\n`,
    );
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
   * Matches each supplied field against the license's slots and partitions the
   * result. A field matches a slot by its label (case-insensitively, e.g.
   * `year`) or by its exact bracket token (e.g. `<year>`). Returns the resolved
   * values keyed by token, the slots still missing a value, and any supplied
   * fields that match no slot.
   *
   * @param slots - The license's customizable copyright slots.
   * @param entries - The supplied fields keyed as typed, mapped to their values.
   */
  #resolveSlotValues(
    slots: TemplateSlot[],
    entries: Map<string, string>,
  ): {
    values: Record<string, string>;
    missing: TemplateSlot[];
    unknown: string[];
  } {
    const values: Record<string, string> = {};
    const unknown: string[] = [];

    for (const [field, value] of entries) {
      const slot = this.#matchSlot(slots, field);
      if (slot) {
        values[slot.token] = value;
      } else {
        unknown.push(field);
      }
    }

    const missing = slots.filter((slot) => !(slot.token in values));

    return { values, missing, unknown };
  }

  /**
   * Finds the slot a supplied field refers to, matching either its label
   * (case-insensitively) or its exact bracket token. Returns undefined when no
   * slot matches.
   *
   * @param slots - The license's customizable copyright slots.
   * @param field - The field name as typed on the command line.
   */
  #matchSlot(slots: TemplateSlot[], field: string): TemplateSlot | undefined {
    const normalized = field.toLowerCase();
    return slots.find(
      (slot) => slot.token === field || slot.label.toLowerCase() === normalized,
    );
  }

  /**
   * Prints the copyright fields a license accepts, with a copy-pasteable
   * `--set` example, to stdout. When the license has no customizable fields,
   * says so instead.
   *
   * @param licenseId - The SPDX identifier being described.
   * @param slots - The license's customizable copyright slots.
   */
  #printTokens(licenseId: string, slots: TemplateSlot[]): void {
    if (slots.length === 0) {
      process.stdout.write(
        `${licenseId} has no customizable copyright fields; it is generated as official text unchanged.\n`,
      );
      return;
    }

    const list = slots.map((slot) => `  ${slot.label}`).join("\n");
    const example = slots
      .map((slot) => `--set "${slot.label}=<value>"`)
      .join(" ");

    process.stdout.write(
      `${licenseId} accepts the following copyright field(s):\n\n${list}\n\n` +
        `Generate a customized license by supplying every field, e.g.:\n\n` +
        `  ${pkg.name} --license ${licenseId} ${example}\n\n` +
        `Omit --set to write the official text unchanged.\n`,
    );
  }

  /**
   * Reports that a customized generation cannot proceed because some required
   * fields were not supplied, listing what was provided and what is still
   * missing. Written to stderr with a non-zero exit code.
   *
   * @param licenseId - The SPDX identifier being generated.
   * @param values - The resolved slot values keyed by token.
   * @param missing - The slots still awaiting a value.
   */
  #printMissingTokens(
    licenseId: string,
    values: Record<string, string>,
    missing: TemplateSlot[],
  ): void {
    const missingList = missing.map((slot) => `  ${slot.label}`).join("\n");
    const example = missing
      .map((slot) => `--set "${slot.label}=<value>"`)
      .join(" ");

    process.stderr.write(
      `Cannot generate a customized ${licenseId} license: missing required field(s):\n\n` +
        `${missingList}\n\n` +
        `Supply every field (e.g. ${example}), or run with --get-tokens to list them all.\n`,
    );
    process.exitCode = 1;
  }

  /**
   * Reports that one or more supplied `--set` fields do not belong to the
   * license, listing the fields it does accept. Written to stderr with a
   * non-zero exit code.
   *
   * @param licenseId - The SPDX identifier being generated.
   * @param unknown - The supplied field names that matched no slot.
   * @param slots - The license's customizable copyright slots.
   */
  #printUnknownFields(
    licenseId: string,
    unknown: string[],
    slots: TemplateSlot[],
  ): void {
    const accepted =
      slots.length === 0
        ? `${licenseId} has no customizable copyright fields.`
        : `${licenseId} accepts: ${slots.map((slot) => slot.label).join(", ")}.`;

    process.stderr.write(
      `Unknown copyright field(s) for ${licenseId}: ${unknown.join(", ")}.\n` +
        `${accepted}\nRun with --get-tokens to list them.\n`,
    );
    process.exitCode = 1;
  }

  /**
   * Writes an error message to stderr and sets a non-zero exit code without
   * throwing, so non-interactive failures surface cleanly to callers and agents.
   *
   * @param message - The error message to report.
   */
  #fail(message: string): void {
    process.stderr.write(`${message}\n`);
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
   */
  async run() {
    if (this.#flags.help) {
      this.#printHelp();
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

    const slotValues =
      typeof licenseAnswer?.value === "string"
        ? this.#slotValuesFrom(licenseAnswer.fields)
        : {};

    if (typeof saveConfigAnswer?.value === "string") {
      if (saveConfigAnswer.value === SKIP_SAVE) {
        await this.#config.clear();
      } else if (typeof licenseAnswer?.value === "string") {
        const config: WizardConfig = { licenseId: licenseAnswer.value };
        if (Object.keys(slotValues).length > 0) {
          config.tokens = slotValues;
        }
        await this.#config.write(config, saveConfigAnswer.value);
      }
    }

    if (typeof licenseAnswer?.value === "string") {
      await this.#licenseGenerator.generate(licenseAnswer.value, slotValues);
      await this.#manifests.writeLicense(licenseAnswer.value);
    }

    return answers;
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
