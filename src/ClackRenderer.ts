import * as clack from "@clack/prompts";
import { styleText } from "node:util";
import type { Answer } from "./Answer.js";
import type { IRenderer } from "./IRenderer.js";
import type {
  AutocompleteQuestion,
  Question,
  QuestionType,
} from "./Question.js";

const MIN_SEARCH_LENGTH = 3;
const SPINNER_FRAMES_UNICODE = ["◒", "◐", "◓", "◑"];
const SPINNER_FRAMES_ASCII = ["•", "o", "O", "0"];
const SPINNER_DELAY_MS = 80;

/**
 * Renders questions to the terminal using the Clack prompt library.
 */
export class ClackRenderer implements IRenderer {
  /**
   * Creates a new ClackRenderer and immediately displays the intro label.
   */
  constructor(introLabel: string) {
    clack.intro(styleText("inverse", ` ${introLabel} `));
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
      autocomplete: (q) => this.#promptAutocomplete(q),
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
   * While a fetch is in progress Clack's spinner frames animate in the option
   * list so the prompt stays interactive throughout.
   */
  async #promptAutocomplete(
    question: AutocompleteQuestion,
  ): Promise<string | symbol> {
    type ClackOption = {
      value: string;
      label: string;
      hint?: string;
      disabled?: boolean;
    };
    type PromptHandle = {
      userInput: string;
      filteredOptions: ClackOption[];
      render: () => void;
    };

    const spinnerFrames = clack.unicode
      ? SPINNER_FRAMES_UNICODE
      : SPINNER_FRAMES_ASCII;

    /**
     * Starts animating Clack's spinner frames in the options list while a
     * search is in flight. Returns a stop function that clears the interval.
     */
    function startSpinner(handle: PromptHandle): () => void {
      let frameIndex = 0;
      const interval = setInterval(() => {
        const frame = spinnerFrames[frameIndex % spinnerFrames.length];
        frameIndex++;
        handle.filteredOptions = [
          {
            value: "__loading__",
            label: `${frame} Searching…`,
          },
        ];
        handle.render();
      }, SPINNER_DELAY_MS);
      return () => clearInterval(interval);
    }

    let cachedOptions: ClackOption[] = [];
    let lastQuery: string | null = null;
    let fetchInFlight = false;

    const optionsFn = function (this: PromptHandle): ClackOption[] {
      const input = this.userInput;

      if (input.length < MIN_SEARCH_LENGTH || !question.search) {
        return [];
      }

      if (input !== lastQuery && !fetchInFlight) {
        fetchInFlight = true;

        // Start the spinner animation in the option list.
        const stopSpinner = startSpinner(this);

        // Arrow functions below capture `this` lexically from optionsFn so
        // the prompt handle is accessible after the async operation settles.
        question.search(input)
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
