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
import { NodeFileSystemReader } from "@configuration/NodeFileSystemReader.js";
import { NodeFileSystemWriter } from "@configuration/NodeFileSystemWriter.js";
import { NpmManifest } from "@configuration/NpmManifest.js";
import { ProjectManifestRepository } from "@configuration/ProjectManifestRepository.js";
import { LicenseGenerator } from "@licensing/LicenseGenerator.js";
import { LicenseRepository } from "@licensing/LicenseRepository.js";
import { LicenseTemplate } from "@licensing/LicenseTemplate.js";
import { SpdxLicenseSource } from "@licensing/SpdxLicenseSource.js";
import type { TemplateSlot } from "@licensing/TemplateSlot.js";
import pkg from "../package.json" with { type: "json" };

const GENERATION_MODE_ID = "generationMode";

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
    const flagParser = new FlagParser({
      verify: { type: "boolean", default: false },
      license: { type: "string", default: "" },
    });
    this.#flags = flagParser.parse(args);

    const reader = new NodeFileSystemReader();
    const writer = new NodeFileSystemWriter();
    this.#config = new Config(reader, writer);
    this.#manifests = new ProjectManifestRepository([
      new ComposerManifest(reader, writer),
      new NpmManifest(reader, writer),
    ]);

    const licenseSource = new SpdxLicenseSource();
    this.#licenseRepository = new LicenseRepository(licenseSource);
    this.#licenseGenerator = new LicenseGenerator(
      this.#licenseRepository,
      writer,
    );
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
        this.#offerCustomization(answer, lifecycle),
    };

    const saveConfigQuestion: Question = {
      id: "saveConfig",
      text: "Save config file?",
      type: "confirm",
    };

    return [licenseQuestion, saveConfigQuestion];
  }

  /**
   * After a license is chosen, fetches its SPDX template and — only when the
   * license has customizable copyright slots — injects a Standard/Customize
   * question. Licenses with no slots skip the choice entirely and are written
   * as their standard text.
   */
  async #offerCustomization(
    answer: Answer,
    lifecycle: QuestionLifecycle,
  ): Promise<void> {
    if (typeof answer.value !== "string" || answer.value === "") {
      return;
    }

    const detail = await this.#licenseRepository.getLicense(answer.value);
    const slots = new LicenseTemplate(detail.standardLicenseTemplate).slots();

    if (slots.length === 0) {
      return;
    }

    lifecycle.inject([this.#buildGenerationModeQuestion(slots)]);
  }

  /**
   * Builds the Standard/Customize select. Choosing "customize" injects one text
   * question per copyright slot, labeled by the slot's placeholder text.
   */
  #buildGenerationModeQuestion(slots: TemplateSlot[]): SelectQuestion {
    const slotQuestions: TextQuestion[] = slots.map((slot) => ({
      id: slot.token,
      text: slot.label,
      type: "text",
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
   * Runs the interactive wizard, collects answers, persists configuration when
   * the user opts in, writes the selected license to a `LICENSE` file in the
   * working directory, and records the selection in every project manifest
   * present (`composer.json`, `package.json`). Returns the collected answers.
   */
  async run() {
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

    if (
      saveConfigAnswer?.value === true &&
      typeof licenseAnswer?.value === "string"
    ) {
      await this.#config.write({ licenseId: licenseAnswer.value });
    }

    if (typeof licenseAnswer?.value === "string") {
      const slotValues = this.#slotValuesFrom(licenseAnswer.fields);
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
