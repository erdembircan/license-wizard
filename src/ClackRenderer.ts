import * as clack from "@clack/prompts";
import { styleText } from "node:util";
import type { Answer } from "./Answer.js";
import type { IRenderer } from "./IRenderer.js";
import type {
  AutocompleteOption,
  AutocompleteQuestion,
  Question,
  QuestionType,
} from "./Question.js";
import { Spinner } from "./Spinner.js";

const MIN_SEARCH_LENGTH = 3;

/**
 * Renders questions to the terminal using the Clack prompt library.
 */
export class ClackRenderer implements IRenderer {
  readonly #spinner: Spinner;

  /**
   * Creates a new ClackRenderer and immediately displays the intro label.
   *
   * @param introLabel - The label shown in the intro banner.
   * @param spinner - Optional spinner instance; defaults to a new Spinner.
   */
  constructor(introLabel: string, spinner: Spinner = new Spinner()) {
    clack.intro(styleText("inverse", ` ${introLabel} `));
    this.#spinner = spinner;
  }

  /**
   * Renders a question to the terminal and returns the user's answer.
   */
  async render(question: Question): Promise<Answer> {
    let value: string | boolean | symbol;

    try {
      value = await this.#promptForQuestion(question);
    } catch (err) {
      clack.cancel(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }

    if (clack.isCancel(value)) {
      clack.cancel(this.onCancel());
      process.exit(0);
    }

    return { questionId: question.id, value: value as string | boolean };
  }

  /**
   * Returns the message displayed when the user cancels the prompt session.
   */
  onCancel(): string {
    return "Operation cancelled.";
  }

  /**
   * Maps a question's type to its corresponding Clack prompt and invokes it.
   */
  async #promptForQuestion(
    question: Question,
  ): Promise<string | boolean | symbol> {
    const promptMap: Partial<
      Record<QuestionType, (q: Question) => Promise<string | boolean | symbol>>
    > = {
      text: (q) => clack.text({ message: q.text }),
      confirm: (q) => clack.confirm({ message: q.text }),
      autocomplete: (q) => this.#promptAutocomplete(q as AutocompleteQuestion),
    };

    const prompt = promptMap[question.type];

    if (!prompt) {
      throw new Error(`Unsupported question type: "${question.type}"`);
    }

    return prompt(question);
  }

  /**
   * Renders an autocomplete prompt backed by the question's search callback.
   * Options are only fetched when the user has typed at least three characters.
   * While a fetch is in progress the spinner animates in the option list so
   * the prompt stays interactive throughout.
   */
  async #promptAutocomplete(
    question: AutocompleteQuestion,
  ): Promise<string | symbol> {
    type PromptHandle = {
      userInput: string;
      filteredOptions: AutocompleteOption[];
      render: () => void;
    };

    const spinner = this.#spinner;
    let cachedOptions: AutocompleteOption[] = [];
    let lastQuery: string | null = null;
    let fetchInFlight = false;

    const optionsFn = function (this: PromptHandle): AutocompleteOption[] {
      const input = this.userInput;

      if (input.length < MIN_SEARCH_LENGTH || !question.search) {
        return [];
      }

      if (input !== lastQuery && !fetchInFlight) {
        fetchInFlight = true;

        // Start the spinner animation in the option list.
        const stopSpinner = spinner.start(this);

        // Arrow functions below capture `this` lexically from optionsFn so
        // the prompt handle is accessible after the async operation settles.
        question
          .search(input)
          .then((results) => {
            stopSpinner();
            cachedOptions = results.map((opt) => ({
              value: opt.value,
              label: opt.label,
              hint: opt.hint,
            }));
            lastQuery = input;
            fetchInFlight = false;

            // Update the visible list with real results and re-render.
            this.filteredOptions = cachedOptions;
            this.render();
          })
          .catch(() => {
            stopSpinner();
            cachedOptions = [];
            lastQuery = input;
            fetchInFlight = false;

            this.filteredOptions = [];
            this.render();
          });
      }

      return cachedOptions;
    };

    return clack.autocomplete({
      message: question.text,
      // Cast required: the clack type expects `this: AutocompletePrompt` (with
      // private members) but at runtime we only access `userInput`,
      // `filteredOptions`, and `render`.
      options: optionsFn as unknown as Parameters<
        typeof clack.autocomplete<string>
      >[0]["options"],
      filter: () => true,
      placeholder: `Type at least ${MIN_SEARCH_LENGTH} characters to search…`,
    });
  }
}
