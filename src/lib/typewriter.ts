/**
 * Produces the sequence of progressively-revealed prefixes for typing `text`
 * one character at a time — `["", "n", "np", ... , text]`. Kept pure so the
 * typing logic can be tested without a DOM or timers.
 */
export function typingFrames(text: string): string[] {
  const frames: string[] = [];
  for (let i = 0; i <= text.length; i++) {
    frames.push(text.slice(0, i));
  }
  return frames;
}

export interface TypewriterOptions {
  /** Milliseconds between characters. */
  charMs?: number;
  /** Called with each successive prefix, including the final full string. */
  onFrame: (frame: string) => void;
  /** Called once the full string has been typed. */
  onDone?: () => void;
}

/**
 * Types `text` into a callback one character at a time. Returns a function that
 * cancels any pending characters.
 */
export function runTypewriter(
  text: string,
  { charMs = 42, onFrame, onDone }: TypewriterOptions,
): () => void {
  const frames = typingFrames(text);
  let index = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const tick = (): void => {
    onFrame(frames[index]!);
    index += 1;
    if (index < frames.length) {
      timer = setTimeout(tick, charMs);
    } else if (onDone) {
      onDone();
    }
  };

  tick();

  return () => {
    if (timer) clearTimeout(timer);
  };
}
