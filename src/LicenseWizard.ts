import { ClackRenderer } from "@cli/ClackRenderer.js";
import { FlagParser } from "@cli/FlagParser.js";
import { Orchestrator } from "@cli/Orchestrator.js";
import type { Question } from "@cli/Question.js";
import { QuestionRepository } from "@cli/QuestionRepository.js";
import { Config } from "@configuration/Config.js";
import { NodeFileSystemReader } from "@configuration/NodeFileSystemReader.js";
import { NodeFileSystemWriter } from "@configuration/NodeFileSystemWriter.js";
import { LicenseRepository } from "@licensing/LicenseRepository.js";
import { SpdxLicenseSource } from "@licensing/SpdxLicenseSource.js";

const flagParser = new FlagParser({
  verify: { type: "boolean", default: false },
});

/**
 * Entry point for the license-wizard CLI application.
 */
export class LicenseWizard {
  readonly #orchestrator: Orchestrator;
  readonly #config: Config;

  /**
   * Creates a new LicenseWizard instance and parses the provided CLI arguments.
   *
   * @param args - The raw argument list (e.g. `process.argv.slice(2)`).
   */
  constructor(args: string[]) {
    flagParser.parse(args);

    this.#config = new Config(
      new NodeFileSystemReader(),
      new NodeFileSystemWriter(),
    );

    const licenseSource = new SpdxLicenseSource();
    const licenseRepository = new LicenseRepository(licenseSource);

    const licenseQuestion: Question = {
      id: "license",
      text: "Which license do you want to use?",
      type: "autocomplete",
      search: async (query) => {
        const results = await licenseRepository.search(query);
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

    const renderer = new ClackRenderer("license-wizard");
    const repository = new QuestionRepository([
      licenseQuestion,
      saveConfigQuestion,
    ]);
    this.#orchestrator = new Orchestrator(repository, renderer);
  }

  /**
   * Runs the interactive wizard, collects answers, and persists configuration
   * when the user opts in. Returns the collected answers.
   */
  async run() {
    const answers = await this.#orchestrator.run();

    const licenseAnswer = answers.find((a) => a.questionId === "license");
    const saveConfigAnswer = answers.find((a) => a.questionId === "saveConfig");

    if (
      saveConfigAnswer?.value === true &&
      typeof licenseAnswer?.value === "string"
    ) {
      await this.#config.write({ licenseId: licenseAnswer.value });
    }

    return answers;
  }
}
