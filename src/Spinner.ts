import * as clack from "@clack/prompts";

const SPINNER_FRAMES_UNICODE = ["◒", "◐", "◓", "◑"];
const SPINNER_FRAMES_ASCII = ["•", "o", "O", "0"];
const SPINNER_DELAY_MS = 80;

type SpinnerHandle = {
  filteredOptions: { value: string; label: string }[];
  render: () => void;
};

/**
 * Animates Clack's spinner frames in the filtered options list of an
 * autocomplete prompt while an async operation is in flight.
 */
export class Spinner {
  /**
   * Starts the spinner animation on the given prompt handle and returns a
   * function that stops it when called.
   *
   * @param handle - The autocomplete prompt context to animate.
   * @returns A function that stops the spinner and clears the interval.
   */
  start(handle: SpinnerHandle): () => void {
    const frames = clack.unicode
      ? SPINNER_FRAMES_UNICODE
      : SPINNER_FRAMES_ASCII;
    let frameIndex = 0;
    const interval = setInterval(() => {
      const frame = frames[frameIndex % frames.length];
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
}
