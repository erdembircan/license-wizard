import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Question } from "./Question.js";

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

const clack = await import("@clack/prompts");
const { ClackRenderer } = await import("./ClackRenderer.js");

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

      it("options function triggers search when input reaches 3 characters", async () => {
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

        expect(search).toHaveBeenCalledWith("MIT");
      });

      it("shows a spinner loading indicator in filteredOptions and re-renders while search is in flight", async () => {
        vi.useFakeTimers();
        vi.mocked(clack.autocomplete).mockResolvedValue("MIT");
        vi.mocked(clack.isCancel).mockReturnValue(false);

        // Keep the search pending so we can observe mid-flight state
        let resolveSearch!: (r: unknown[]) => void;
        const search = vi.fn().mockReturnValue(
          new Promise<unknown[]>((res) => {
            resolveSearch = res;
          }),
        );

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

        // Advance one spinner tick so the interval fires
        vi.advanceTimersByTime(80);

        // While fetch is in flight, filteredOptions should contain a spinner frame entry
        expect(handle.filteredOptions).toHaveLength(1);
        expect(handle.filteredOptions[0]).toEqual(
          expect.objectContaining({ disabled: true }),
        );
        expect((handle.filteredOptions[0] as { label: string }).label).toMatch(
          /^[◒◐◓◑•oO0] Searching…$/,
        );
        expect(handle.render).toHaveBeenCalled();

        resolveSearch([]);
        vi.useRealTimers();
      });

      it("updates filteredOptions with results and re-renders after search resolves", async () => {
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

        // Trigger fetch
        optionsFn.call(handle);
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
  });
});
