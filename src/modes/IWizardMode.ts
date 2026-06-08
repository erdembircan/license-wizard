import type { Answer } from "@cli/Answer.js";

/**
 * Contract for a wizard run mode — one of the application's top-level
 * workflows (interactive, non-interactive, verify). `LicenseWizard` parses the
 * flags, selects the matching mode, and hands control to it through this single
 * method, so each mode is a self-contained sub-orchestrator that owns its own
 * flow and collaborators.
 *
 * The returned answers are meaningful only for the interactive mode, which
 * surfaces the collected prompt answers; the flag-driven modes report through
 * the injected reporter and return an empty array.
 */
export interface IWizardMode {
  /**
   * Runs the mode end to end and returns the answers it collected (empty for
   * the non-interactive and verify modes, which write their output through the
   * reporter rather than returning it).
   */
  run(): Promise<Answer[]>;
}
