const BAR_WIDTH = 24;
const FILLED = "█";
const EMPTY = "░";

type OutputStream = {
  write(chunk: string): boolean;
  isTTY?: boolean;
};

/**
 * Renders a single-line, in-place progress bar for a long sequence of steps —
 * used while headers are written across many source files. On an interactive
 * terminal it redraws the bar in place as it advances and clears the line when
 * done; on a non-interactive stream (a pipe, a CI log, an agent) it stays silent
 * so the output is not flooded with carriage returns, leaving the caller's
 * before/after summary to tell the story instead.
 */
export class ProgressBar {
  readonly #out: OutputStream;
  readonly #label: string;
  #total = 0;

  /**
   * Creates a new ProgressBar.
   *
   * @param label - Text shown before the bar (e.g. "Inscribing headers").
   * @param out - The stream to render to; defaults to stdout.
   */
  constructor(label: string, out: OutputStream = process.stdout) {
    this.#label = label;
    this.#out = out;
  }

  /**
   * Begins a run of `total` steps, drawing the empty bar.
   *
   * @param total - The number of steps the bar will count up to.
   */
  start(total: number): void {
    this.#total = total;
    this.#render(0);
  }

  /**
   * Redraws the bar to reflect `done` completed steps.
   *
   * @param done - The number of steps completed so far.
   */
  update(done: number): void {
    this.#render(done);
  }

  /**
   * Finishes the run, clearing the bar's line so the caller's summary prints
   * cleanly beneath it.
   */
  stop(): void {
    if (this.#active()) {
      this.#out.write("\r[2K");
    }
  }

  /**
   * Draws the bar for the given progress, but only on an interactive terminal.
   */
  #render(done: number): void {
    if (!this.#active()) {
      return;
    }

    const ratio = this.#total === 0 ? 1 : done / this.#total;
    const filled = Math.round(ratio * BAR_WIDTH);
    const bar = FILLED.repeat(filled) + EMPTY.repeat(BAR_WIDTH - filled);
    const percent = String(Math.round(ratio * 100)).padStart(3);

    this.#out.write(
      `\r${this.#label} [${bar}] ${percent}% (${done}/${this.#total})`,
    );
  }

  /**
   * Reports whether the bar should draw — only when writing to an interactive
   * terminal.
   */
  #active(): boolean {
    return this.#out.isTTY === true && !process.env.NO_COLOR;
  }
}
