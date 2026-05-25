import * as clack from "@clack/prompts";
import { styleText } from "node:util";
import type { Answer } from "./Answer.js";
import type { IRenderer } from "./IRenderer.js";
import type { Question, QuestionType } from "./Question.js";

const MIN_SEARCH_LENGTH = 3;

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
   * Options are only fetched and displayed once the user has typed at least
   * three characters, so the prompt is immediately interactive with no
   * upfront loading delay.
   */
  async #promptAutocomplete(question: Question): Promise<string | symbol> {
    type ClackOption = { value: string; label: string; hint?: string };
    type PromptContext = { userInput: string; render: () => void };

    let cachedOptions: ClackOption[] = [];
    let lastQuery: string | null = null;
    let fetchInFlight = false;

    const optionsFn = function (this: PromptContext): ClackOption[] {
      const input = this.userInput;

      if (input.length < MIN_SEARCH_LENGTH || !question.search) {
        return [];
      }

      if (input !== lastQuery && !fetchInFlight) {
        fetchInFlight = true;
        const triggerRender = this.render.bind(this);
        question.search!(input)
          .then((results) => {
            cachedOptions = results.map((opt) => ({
              value: opt.value,
              label: opt.label,
              hint: opt.hint,
            }));
            lastQuery = input;
            fetchInFlight = false;
            triggerRender();
          })
          .catch(() => {
            cachedOptions = [];
            lastQuery = input;
            fetchInFlight = false;
          });
      }

      return cachedOptions;
    };

    return clack.autocomplete({
      message: question.text,
      // Cast required: the clack type expects `this: AutocompletePrompt` (with
      // private members) but at runtime we only access `userInput` and `render`.
      options: optionsFn as unknown as Parameters<
        typeof clack.autocomplete<string>
      >[0]["options"],
      filter: () => true,
      placeholder: `Type at least ${MIN_SEARCH_LENGTH} characters to search…`,
    });
  }
}
