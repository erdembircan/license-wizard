import { ClackRenderer } from "@cli/ClackRenderer.js";
import { FlagParser } from "@cli/FlagParser.js";
import { Orchestrator } from "@cli/Orchestrator.js";
import type { AutocompleteQuestion, Question } from "@cli/Question.js";
import { QuestionRepository } from "@cli/QuestionRepository.js";
import { Config } from "@configuration/Config.js";
import { NodeFileSystemReader } from "@configuration/NodeFileSystemReader.js";
import { NodeFileSystemWriter } from "@configuration/NodeFileSystemWriter.js";
import type { WizardConfig } from "@configuration/WizardConfig.js";
import { LicenseGenerator } from "@licensing/LicenseGenerator.js";
import { LicenseRepository } from "@licensing/LicenseRepository.js";
import { SpdxLicenseSource } from "@licensing/SpdxLicenseSource.js";

const flagParser = new FlagParser({
  verify: { type: "boolean", default: false },
  license: { type: "string", default: "" },
});

/**
 * Resolves the license id used to pre-populate the license question's default,
 * giving the `--license` flag priority over the saved config value.
 *
 * @param flagLicense - The `--license` flag value (empty string when absent).
 * @param config - The saved wizard config, or null when none exists.
 * @returns The license id to use as the default, or undefined when neither source provides one.
 */
export function resolveDefaultLicenseId(
  flagLicense: string,
  config: WizardConfig | null,
): string | undefined {
  return flagLicense || config?.licenseId;
}

/**
 * Entry point for the license-wizard CLI application.
 */
export class LicenseWizard {
  readonly #config: Config;
  readonly #licenseRepository: LicenseRepository;
  readonly #licenseGenerator: LicenseGenerator;
  readonly #licenseFlag: string;

  /**
   * Creates a new LicenseWizard instance and parses the provided CLI arguments.
   *
   * @param args - The raw argument list (e.g. `process.argv.slice(2)`).
   */
  constructor(args: string[]) {
    const flags = flagParser.parse(args);
    this.#licenseFlag = flags.license;

    const writer = new NodeFileSystemWriter();
    this.#config = new Config(new NodeFileSystemReader(), writer);

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

    const licenseQuestion: AutocompleteQuestion = {
      id: "license",
      text: "Which license do you want to use?",
      type: "autocomplete",
      defaultValue: resolveDefaultLicenseId(this.#licenseFlag, config),
      search: async (query) => {
        const results = await this.#licenseRepository.search(query);
        return results.map((entry) => ({
          value: entry.licenseId,
          label: entry.name,
          hint: entry.licenseId,
        }));
      },
    };

    const saveConfigQuestion: Question = {
      id: "saveConfig",
      text: "Save config file?",
      type: "confirm",
    };

    return [licenseQuestion, saveConfigQuestion];
  }

  /**
   * Runs the interactive wizard, collects answers, persists configuration when
   * the user opts in, and writes the selected license to a `LICENSE` file in
   * the working directory. Returns the collected answers.
   */
  async run() {
    const questions = await this.#buildQuestions();
    const renderer = new ClackRenderer("license-wizard");
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
      await this.#licenseGenerator.generate(licenseAnswer.value);
    }

    return answers;
  }
}
