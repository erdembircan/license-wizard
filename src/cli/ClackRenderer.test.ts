import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Question } from "@cli/Question.js";

vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  text: vi.fn(),
  confirm: vi.fn(),
  autocomplete: vi.fn(),
  spinner: vi.fn(),
  cancel: vi.fn(),
  isCancel: vi.fn(),
  unicode: true,
}));

vi.mock("@cli/Spinner.js", () => {
  const SpinnerMock = vi.fn(function (this: {
    start: ReturnType<typeof vi.fn>;
  }) {
    this.start = vi.fn().mockReturnValue(vi.fn());
  });
  return { Spinner: SpinnerMock };
});

const clack = await import("@clack/prompts");
const { Spinner } = await import("@cli/Spinner.js");
const { ClackRenderer } = await import("@cli/ClackRenderer.js");

/**
 * Creates a mock prompt handle that simulates the AutocompletePrompt context
 * passed as `this` to the options function.
 */
function makePromptHandle(userInput: string) {
  return {
    userInput,
    filteredOptions: [] as unknown[],
    render: vi.fn(),
  };
}

describe("ClackRenderer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("render", () => {
    describe("prompt mapping", () => {
      it("calls clack.text for a text question type", async () => {
        vi.mocked(clack.text).mockResolvedValue("MIT");
        vi.mocked(clack.isCancel).mockReturnValue(false);

        const renderer = new ClackRenderer("test");
        const questionText = "Pick a license";
        const question: Question = {
          id: "license",
          text: questionText,
          type: "text",
        };

        const answer = await renderer.render(question);

        expect(clack.text).toHaveBeenCalledWith({ message: questionText });
        expect(answer).toEqual({ questionId: "license", value: "MIT" });
      });

      it("calls clack.confirm for a confirm question type and returns true", async () => {
        vi.mocked(clack.confirm).mockResolvedValue(true);
        vi.mocked(clack.isCancel).mockReturnValue(false);

        const renderer = new ClackRenderer("test");
        const questionText = "Add a license?";
        const question: Question = {
          id: "addLicense",
          text: questionText,
          type: "confirm",
        };

        const answer = await renderer.render(question);

        expect(clack.confirm).toHaveBeenCalledWith({ message: questionText });
        expect(answer).toEqual({ questionId: "addLicense", value: true });
      });

      it("calls clack.confirm for a confirm question type and returns false", async () => {
        vi.mocked(clack.confirm).mockResolvedValue(false);
        vi.mocked(clack.isCancel).mockReturnValue(false);

        const renderer = new ClackRenderer("test");
        const question: Question = {
          id: "addLicense",
          text: "Add a license?",
          type: "confirm",
        };

        const answer = await renderer.render(question);

        expect(answer).toEqual({ questionId: "addLicense", value: false });
      });

      it("calls clack.autocomplete for an autocomplete question type", async () => {
        vi.mocked(clack.autocomplete).mockResolvedValue("MIT");
        vi.mocked(clack.isCancel).mockReturnValue(false);

        const search = vi
          .fn()
          .mockResolvedValue([
            { value: "MIT", label: "MIT License", hint: "MIT" },
          ]);

        const renderer = new ClackRenderer("test");
        const question: Question = {
          id: "license",
          text: "Which license?",
          type: "autocomplete",
          search,
        };

        const answer = await renderer.render(question);

        expect(clack.autocomplete).toHaveBeenCalledWith(
          expect.objectContaining({
            message: "Which license?",
          }),
        );
        expect(answer).toEqual({ questionId: "license", value: "MIT" });
      });

      it("passes options as a function to clack.autocomplete", async () => {
        vi.mocked(clack.autocomplete).mockResolvedValue("MIT");
        vi.mocked(clack.isCancel).mockReturnValue(false);

        const search = vi.fn().mockResolvedValue([]);

        const renderer = new ClackRenderer("test");
        const question: Question = {
          id: "license",
          text: "Which license?",
          type: "autocomplete",
          search,
        };

        await renderer.render(question);

        const call = vi.mocked(clack.autocomplete).mock.calls[0][0];
        expect(typeof call.options).toBe("function");
      });

      it("options function returns empty array when input is shorter than 3 characters", async () => {
        vi.mocked(clack.autocomplete).mockResolvedValue("MIT");
        vi.mocked(clack.isCancel).mockReturnValue(false);

        const search = vi.fn().mockResolvedValue([]);

        const renderer = new ClackRenderer("test");
        const question: Question = {
          id: "license",
          text: "Which license?",
          type: "autocomplete",
          search,
        };

        await renderer.render(question);

        const call = vi.mocked(clack.autocomplete).mock.calls[0][0];
        const optionsFn = call.options as unknown as (
          this: ReturnType<typeof makePromptHandle>,
        ) => unknown[];

        const handle = makePromptHandle("mi");
        const result = optionsFn.call(handle);

        expect(result).toEqual([]);
        expect(search).not.toHaveBeenCalled();
      });

      it("options function does not trigger search immediately on keystroke", async () => {
        vi.useFakeTimers();
        vi.mocked(clack.autocomplete).mockResolvedValue("MIT");
        vi.mocked(clack.isCancel).mockReturnValue(false);

        const search = vi.fn().mockResolvedValue([]);

        const renderer = new ClackRenderer("test");
        const question: Question = {
          id: "license",
          text: "Which license?",
          type: "autocomplete",
          search,
        };

        await renderer.render(question);

        const call = vi.mocked(clack.autocomplete).mock.calls[0][0];
        const optionsFn = call.options as unknown as (
          this: ReturnType<typeof makePromptHandle>,
        ) => unknown[];

        const handle = makePromptHandle("MIT");
        optionsFn.call(handle);

        // Search must not fire before the debounce delay elapses.
        expect(search).not.toHaveBeenCalled();
      });

      it("options function triggers search after the debounce delay", async () => {
        vi.useFakeTimers();
        vi.mocked(clack.autocomplete).mockResolvedValue("MIT");
        vi.mocked(clack.isCancel).mockReturnValue(false);

        const searchResults = [
          { value: "MIT", label: "MIT License", hint: "MIT" },
        ];
        const search = vi.fn().mockResolvedValue(searchResults);

        const renderer = new ClackRenderer("test");
        const question: Question = {
          id: "license",
          text: "Which license?",
          type: "autocomplete",
          search,
        };

        await renderer.render(question);

        const call = vi.mocked(clack.autocomplete).mock.calls[0][0];
        const optionsFn = call.options as unknown as (
          this: ReturnType<typeof makePromptHandle>,
        ) => unknown[];

        const handle = makePromptHandle("MIT");
        optionsFn.call(handle);

        // Advance past the debounce window.
        await vi.runAllTimersAsync();

        expect(search).toHaveBeenCalledWith("MIT");
      });

      it("cancels a pending search when a new keystroke arrives before the delay elapses", async () => {
        vi.useFakeTimers();
        vi.mocked(clack.autocomplete).mockResolvedValue("MIT");
        vi.mocked(clack.isCancel).mockReturnValue(false);

        const search = vi.fn().mockResolvedValue([]);

        const renderer = new ClackRenderer("test");
        const question: Question = {
          id: "license",
          text: "Which license?",
          type: "autocomplete",
          search,
        };

        await renderer.render(question);

        const call = vi.mocked(clack.autocomplete).mock.calls[0][0];
        const optionsFn = call.options as unknown as (
          this: ReturnType<typeof makePromptHandle>,
        ) => unknown[];

        // First keystroke: "MIT"
        const handle1 = makePromptHandle("MIT");
        optionsFn.call(handle1);

        // Second keystroke before delay fires: "MITX"
        const handle2 = makePromptHandle("MITX");
        optionsFn.call(handle2);

        // Advance past the debounce window.
        await vi.runAllTimersAsync();

        // Search must only be called once, with the latest input.
        expect(search).toHaveBeenCalledTimes(1);
        expect(search).toHaveBeenCalledWith("MITX");
      });

      it("starts the spinner when a search is triggered after the debounce delay", async () => {
        vi.useFakeTimers();
        vi.mocked(clack.autocomplete).mockResolvedValue("MIT");
        vi.mocked(clack.isCancel).mockReturnValue(false);

        const search = vi.fn().mockResolvedValue([]);
        const spinnerInstance = new Spinner();

        const renderer = new ClackRenderer("test", spinnerInstance);
        const question: Question = {
          id: "license",
          text: "Which license?",
          type: "autocomplete",
          search,
        };

        await renderer.render(question);

        const call = vi.mocked(clack.autocomplete).mock.calls[0][0];
        const optionsFn = call.options as unknown as (
          this: ReturnType<typeof makePromptHandle>,
        ) => unknown[];

        const handle = makePromptHandle("MIT");
        optionsFn.call(handle);

        await vi.runAllTimersAsync();

        expect(spinnerInstance.start).toHaveBeenCalledWith(handle);
      });

      it("stops the spinner after search resolves", async () => {
        vi.useFakeTimers();
        vi.mocked(clack.autocomplete).mockResolvedValue("MIT");
        vi.mocked(clack.isCancel).mockReturnValue(false);

        const searchResults = [
          { value: "MIT", label: "MIT License", hint: "MIT" },
        ];
        const search = vi.fn().mockResolvedValue(searchResults);
        const stopSpinner = vi.fn();
        const spinnerInstance = new Spinner();
        (spinnerInstance.start as ReturnType<typeof vi.fn>).mockReturnValue(
          stopSpinner,
        );

        const renderer = new ClackRenderer("test", spinnerInstance);
        const question: Question = {
          id: "license",
          text: "Which license?",
          type: "autocomplete",
          search,
        };

        await renderer.render(question);

        const call = vi.mocked(clack.autocomplete).mock.calls[0][0];
        const optionsFn = call.options as unknown as (
          this: ReturnType<typeof makePromptHandle>,
        ) => unknown[];

        const handle = makePromptHandle("MIT");
        optionsFn.call(handle);

        await vi.runAllTimersAsync();

        await vi.waitFor(() => expect(stopSpinner).toHaveBeenCalled());
      });

      it("updates filteredOptions with results and re-renders after search resolves", async () => {
        vi.useFakeTimers();
        vi.mocked(clack.autocomplete).mockResolvedValue("MIT");
        vi.mocked(clack.isCancel).mockReturnValue(false);

        const searchResults = [
          { value: "MIT", label: "MIT License", hint: "MIT" },
        ];
        const search = vi.fn().mockResolvedValue(searchResults);

        const renderer = new ClackRenderer("test");
        const question: Question = {
          id: "license",
          text: "Which license?",
          type: "autocomplete",
          search,
        };

        await renderer.render(question);

        const call = vi.mocked(clack.autocomplete).mock.calls[0][0];
        const optionsFn = call.options as unknown as (
          this: ReturnType<typeof makePromptHandle>,
        ) => unknown[];

        const handle = makePromptHandle("MIT");

        // Trigger debounce
        optionsFn.call(handle);

        // Advance past the debounce delay so the search fires.
        await vi.runAllTimersAsync();

        expect(search).toHaveBeenCalledWith("MIT");

        // Wait for search to resolve and filteredOptions to be updated
        await vi.waitFor(() =>
          expect(handle.filteredOptions).toEqual([
            { value: "MIT", label: "MIT License", hint: "MIT" },
          ]),
        );

        // render() should have been called at least once for results
        expect(handle.render).toHaveBeenCalled();
      });

      it("options function returns empty array when no search callback is provided", async () => {
        vi.mocked(clack.autocomplete).mockResolvedValue("MIT");
        vi.mocked(clack.isCancel).mockReturnValue(false);

        const renderer = new ClackRenderer("test");
        const question: Question = {
          id: "license",
          text: "Which license?",
          type: "autocomplete",
        };

        await renderer.render(question);

        const call = vi.mocked(clack.autocomplete).mock.calls[0][0];
        const optionsFn = call.options as unknown as (
          this: ReturnType<typeof makePromptHandle>,
        ) => unknown[];

        const handle = makePromptHandle("MIT");
        const result = optionsFn.call(handle);

        expect(result).toEqual([]);
      });

      it("calls clack.cancel and exits with code 1 for an unsupported question type", async () => {
        const renderer = new ClackRenderer("test");
        const question = {
          id: "q1",
          text: "Unknown?",
          type: "unknown",
        } as unknown as Question;

        await renderer.render(question);

        expect(clack.cancel).toHaveBeenCalled();
        expect(process.exit).toHaveBeenCalledWith(1);
      });
    });

    describe("initialValue forwarding", () => {
      it("passes initialValue to clack.text when set on a text question", async () => {
        vi.mocked(clack.text).mockResolvedValue("MIT");
        vi.mocked(clack.isCancel).mockReturnValue(false);

        const renderer = new ClackRenderer("test");
        const question: Question = {
          id: "q",
          text: "Enter text",
          type: "text",
          initialValue: "default-text",
        };

        await renderer.render(question);

        expect(clack.text).toHaveBeenCalledWith(
          expect.objectContaining({ initialValue: "default-text" }),
        );
      });

      it("does not pass initialValue to clack.text when absent", async () => {
        vi.mocked(clack.text).mockResolvedValue("MIT");
        vi.mocked(clack.isCancel).mockReturnValue(false);

        const renderer = new ClackRenderer("test");
        const question: Question = {
          id: "q",
          text: "Enter text",
          type: "text",
        };

        await renderer.render(question);

        const call = vi.mocked(clack.text).mock.calls[0][0];
        expect(call.initialValue).toBeUndefined();
      });

      it("passes initialValue to clack.confirm when set on a confirm question", async () => {
        vi.mocked(clack.confirm).mockResolvedValue(true);
        vi.mocked(clack.isCancel).mockReturnValue(false);

        const renderer = new ClackRenderer("test");
        const question: Question = {
          id: "q",
          text: "Confirm?",
          type: "confirm",
          initialValue: true,
        };

        await renderer.render(question);

        expect(clack.confirm).toHaveBeenCalledWith(
          expect.objectContaining({ initialValue: true }),
        );
      });

      it("does not pass initialValue to clack.confirm when absent", async () => {
        vi.mocked(clack.confirm).mockResolvedValue(false);
        vi.mocked(clack.isCancel).mockReturnValue(false);

        const renderer = new ClackRenderer("test");
        const question: Question = {
          id: "q",
          text: "Confirm?",
          type: "confirm",
        };

        await renderer.render(question);

        const call = vi.mocked(clack.confirm).mock.calls[0][0];
        expect(call.initialValue).toBeUndefined();
      });

      it("passes initialValue to clack.autocomplete when set on an autocomplete question", async () => {
        vi.mocked(clack.autocomplete).mockResolvedValue("MIT");
        vi.mocked(clack.isCancel).mockReturnValue(false);

        const renderer = new ClackRenderer("test");
        const question: Question = {
          id: "q",
          text: "Pick license",
          type: "autocomplete",
          initialValue: "MIT",
        };

        await renderer.render(question);

        expect(clack.autocomplete).toHaveBeenCalledWith(
          expect.objectContaining({ initialValue: "MIT" }),
        );
      });

      it("does not pass initialValue to clack.autocomplete when absent", async () => {
        vi.mocked(clack.autocomplete).mockResolvedValue("MIT");
        vi.mocked(clack.isCancel).mockReturnValue(false);

        const renderer = new ClackRenderer("test");
        const question: Question = {
          id: "q",
          text: "Pick license",
          type: "autocomplete",
        };

        await renderer.render(question);

        const call = vi.mocked(clack.autocomplete).mock.calls[0][0];
        expect(call.initialValue).toBeUndefined();
      });
    });
  });
});
