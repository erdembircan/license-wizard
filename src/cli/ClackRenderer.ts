/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import * as clack from "@clack/prompts";
import { buildAgentHint, buildBanner } from "@cli/Banner.js";
import type { Answer } from "@cli/Answer.js";
import type {
  CompletionSummary,
  IRenderer,
} from "@cli/interfaces/IRenderer.js";
import type {
  AutocompleteOption,
  AutocompleteQuestion,
  ConfirmQuestion,
  Question,
  QuestionType,
  SelectQuestion,
  TextQuestion,
} from "@cli/Question.js";
import { Spinner } from "@cli/Spinner.js";
import { debounce } from "@cli/Debounce.js";

const MIN_SEARCH_LENGTH = 3;
const DEBOUNCE_DELAY_MS = 100;

// The spark glyph the wizard signs its closing note with, matching the
// non-interactive reporter's success mark.
const SPARK = "✦";

/**
 * Renders questions to the terminal using the Clack prompt library.
 */
export class ClackRenderer implements IRenderer {
  readonly #spinner: Spinner;
  readonly #name: string;

  /**
   * Creates a new ClackRenderer and renders the startup banner.
   *
   * @param meta - The application name, description, and version shown in the banner.
   * @param spinner - Optional spinner instance; defaults to a new Spinner.
   */
  constructor(
    meta: { name: string; description: string; version: string },
    spinner: Spinner = new Spinner(),
  ) {
    this.#spinner = spinner;
    this.#name = meta.name;
    const color = this.#supportsColor();
    // The agent hint sits directly under the banner so automated callers see,
    // before any prompt blocks, that a flag-driven non-interactive mode exists.
    process.stdout.write(
      buildBanner(meta, { color }) + "\n" + buildAgentHint({ color }) + "\n",
    );
  }

  /**
   * Reports whether the output stream can display ANSI color, so the banner is
   * only styled on a capable interactive terminal.
   */
  #supportsColor(): boolean {
    return (
      process.stdout.isTTY === true &&
      !process.env.NO_COLOR &&
      process.env.TERM !== "dumb"
    );
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
    return "Spell interrupted — nothing was conjured.";
  }

  /**
   * Renders the closing note shown after the wizard writes the license: a framed
   * summary of what was conjured and where, signed off with a parting flourish.
   */
  complete(summary: CompletionSummary): void {
    const lines = [
      `LICENSE    conjured as ${summary.licenseId}${
        summary.customized
          ? " with your customized copyright"
          : " from the official text"
      }`,
    ];

    if (summary.manifests.length > 0) {
      lines.push(`Manifests  inscribed in ${summary.manifests.join(", ")}`);
    }

    if (summary.headers) {
      lines.push(
        `Headers    ${summary.headers.style} mark inscribed in ` +
          `${summary.headers.written} of ${summary.headers.total} source file(s)`,
      );
      if (summary.headers.skipped.length > 0) {
        const skipped = summary.headers.skipped;
        lines.push(
          `Skipped    ${skipped.length} file(s) the header couldn't be safely written into:`,
        );
        for (const file of skipped) {
          lines.push(`             ${file}`);
        }
        lines.push(
          `           force one in (when safe): ${this.#name} --force-header "${skipped[0]}"`,
        );
      }
    }

    lines.push(
      summary.savedTo === ""
        ? "Spellbook  left unsaved this time"
        : `Spellbook  saved to ${summary.savedTo}`,
    );

    clack.note(lines.join("\n"), `${SPARK} The spell is cast`);
    clack.outro(
      `${summary.licenseId} is ready — may your code be ever free. ${SPARK}`,
    );
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
      text: (q) =>
        clack.text({
          message: q.text,
          initialValue: (q as TextQuestion).defaultValue,
          validate: (q as TextQuestion).required
            ? (value) =>
                value !== undefined && value.trim() !== ""
                  ? undefined
                  : "A value is required."
            : undefined,
        }),
      confirm: (q) =>
        clack.confirm({
          message: q.text,
          initialValue: (q as ConfirmQuestion).defaultValue,
        }),
      select: (q) =>
        clack.select({
          message: q.text,
          options: (q as SelectQuestion).options,
          initialValue: (q as SelectQuestion).defaultValue,
        }),
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
   * Keystrokes are debounced with a ~100ms delay so the search only fires once
   * the user pauses typing. While a fetch is in progress the spinner animates
   * in the option list so the prompt stays interactive throughout.
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

    // Seed the option list with the exact default so it opens pre-selected via
    // `initialValue`, instead of fuzzy-searching the stored value (which would
    // match every same-prefix license rather than the exact one).
    if (question.defaultValue !== undefined) {
      cachedOptions = [
        { value: question.defaultValue, label: question.defaultValue },
      ];
    }

    /**
     * Runs a search for the given input, animating the spinner and updating
     * the prompt handle when results arrive.
     */
    const runSearch = (
      input: string,
      search: NonNullable<AutocompleteQuestion["search"]>,
      handle: PromptHandle,
    ): void => {
      // Guard: another fetch may have started in the meantime.
      if (fetchInFlight || input === lastQuery) {
        return;
      }

      fetchInFlight = true;

      // Start the spinner animation in the option list.
      const stopSpinner = spinner.start(handle);

      search(input)
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
          handle.filteredOptions = cachedOptions;
          handle.render();
        })
        .catch(() => {
          stopSpinner();
          cachedOptions = [];
          lastQuery = input;
          fetchInFlight = false;

          handle.filteredOptions = [];
          handle.render();
        });
    };

    const debouncedSearch = debounce(runSearch, DEBOUNCE_DELAY_MS);

    const optionsFn = function (this: PromptHandle): AutocompleteOption[] {
      const input = this.userInput;
      const search = question.search;

      if (input.length < MIN_SEARCH_LENGTH || !search) {
        debouncedSearch.cancel();
        return cachedOptions;
      }

      if (input !== lastQuery && !fetchInFlight) {
        // Pass `this` as an argument to avoid the no-this-alias lint rule while
        // still making the prompt handle accessible inside the async callback.
        debouncedSearch(input, search, this);
      }

      return cachedOptions;
    };

    return clack.autocomplete({
      message: question.text,
      initialValue: question.defaultValue,
      // Cast required: the clack type expects `this: AutocompletePrompt` (with
      // private members) but at runtime we only access `userInput`,
      // `filteredOptions`, and `render`.
      options: optionsFn as unknown as Parameters<
        typeof clack.autocomplete<string>
      >[0]["options"],
      filter: () => true,
      // A required prompt rejects an empty submission (clack yields `undefined`
      // for one) so the wizard can't continue with no license chosen and then
      // silently exit having written nothing.
      validate: question.required
        ? (value) =>
            typeof value === "string" && value !== ""
              ? undefined
              : "Choose a license to continue."
        : undefined,
      placeholder: `Type at least ${MIN_SEARCH_LENGTH} characters to search…`,
    });
  }
}
