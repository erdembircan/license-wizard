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
        description: "Pre-select a license by its SPDX identifier.",
        placeholder: "<spdx-id>",
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
