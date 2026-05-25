import { ClackRenderer } from "./ClackRenderer.js";
import { FlagParser } from "./FlagParser.js";
import { Orchestrator } from "./Orchestrator.js";
import { QuestionRepository } from "./QuestionRepository.js";
import type { Question } from "./Question.js";

const flagParser = new FlagParser({
  verify: { type: "boolean", default: false },
});

const licenseQuestion: Question = {
  id: "license",
  text: "License?",
  type: "text",
};

const saveConfigQuestion: Question = {
  id: "saveConfig",
  text: "Save config file?",
  type: "confirm",
};

/**
 * Entry point for the license-wizard CLI application.
 */
export class LicenseWizard {
  readonly #orchestrator: Orchestrator;

  /**
   * Creates a new LicenseWizard instance and parses the provided CLI arguments.
   *
   * @param args - The raw argument list (e.g. `process.argv.slice(2)`).
   */
  constructor(args: string[]) {
    flagParser.parse(args);

    const renderer = new ClackRenderer("license-wizard");
    const repository = new QuestionRepository([
      licenseQuestion,
      saveConfigQuestion,
    ]);
    this.#orchestrator = new Orchestrator(repository, renderer);
  }

  /**
   * Runs the interactive wizard and returns the collected answers.
   */
  async run() {
    return this.#orchestrator.run();
  }
}
