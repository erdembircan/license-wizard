import { useRef } from "react";
import { useTerminalPlayer } from "../hooks/useTerminalPlayer";
import type { TerminalScene } from "../data/scenes";

export interface TerminalControls {
  /** Close the window (red light). */
  onClose: () => void;
  /** Minimize the window into the dock (amber light). */
  onMinimize: () => void;
  /** Toggle the window between normal and full-screen (green light). */
  onMaximize: () => void;
  /** Whether the window is currently maximized — swaps the green glyph. */
  maximized: boolean;
}

interface TerminalProps {
  /** The scenes to play; one tab is built per scene. Pass a stable reference. */
  scenes: TerminalScene[];
  /** Accessible label for the tablist of scene tabs. */
  ariaLabel: string;
  /**
   * Optional DOM id for the window; when set, the body gets `${id}-body`. Used
   * by the hero terminal (`terminal` / `terminal-body`). Omit when more than one
   * terminal renders on the page so ids stay unique.
   */
  id?: string;
  /**
   * When provided, the three window lights become functional buttons (the hero
   * Easter egg). Omit on every other terminal so the lights stay decorative.
   */
  controls?: TerminalControls;
}

/**
 * A self-driving terminal window: the window bar with its three colored dots and
 * an (initially empty) tablist, plus the empty body region. The tabs and output
 * lines are created at runtime by useTerminalPlayer, which plays the given
 * scenes against the tabs container and body refs — line-by-line for shell
 * scenes, or as a streamed Claude Code transcript for agent scenes.
 *
 * When `controls` is passed the three lights turn into real close / minimize /
 * maximize buttons (used only by the hero window); otherwise they render as the
 * plain decorative dots every other terminal on the page uses.
 */
export default function Terminal({
  scenes,
  ariaLabel,
  id,
  controls,
}: TerminalProps) {
  const tabsRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useTerminalPlayer(tabsRef, bodyRef, scenes);

  return (
    <div className="terminal" id={id}>
      <div className="terminal-bar">
        {controls ? (
          <div
            className="term-lights"
            role="group"
            aria-label="Window controls"
          >
            <button
              type="button"
              className="term-dot term-dot-btn"
              style={{ background: "#ff5f57" }}
              onClick={controls.onClose}
              aria-label="Close terminal"
              title="Close"
            >
              <span className="term-dot-glyph" aria-hidden="true">
                ×
              </span>
            </button>
            <button
              type="button"
              className="term-dot term-dot-btn"
              style={{ background: "#febc2e" }}
              onClick={controls.onMinimize}
              aria-label="Minimize terminal"
              title="Minimize"
            >
              <span className="term-dot-glyph" aria-hidden="true">
                –
              </span>
            </button>
            <button
              type="button"
              className="term-dot term-dot-btn"
              style={{ background: "#28c840" }}
              onClick={controls.onMaximize}
              aria-label={
                controls.maximized ? "Restore terminal" : "Maximize terminal"
              }
              title={controls.maximized ? "Restore" : "Maximize"}
            >
              <span className="term-dot-glyph" aria-hidden="true">
                {controls.maximized ? "⤡" : "⤢"}
              </span>
            </button>
          </div>
        ) : (
          <>
            <span className="term-dot" style={{ background: "#ff5f57" }}></span>
            <span className="term-dot" style={{ background: "#febc2e" }}></span>
            <span className="term-dot" style={{ background: "#28c840" }}></span>
          </>
        )}
        <div
          ref={tabsRef}
          className="ml-3 flex gap-1"
          role="tablist"
          aria-label={ariaLabel}
        ></div>
      </div>
      <div
        ref={bodyRef}
        className="terminal-body"
        id={id ? `${id}-body` : undefined}
        role="region"
        aria-live="polite"
        aria-label="Terminal output"
      ></div>
    </div>
  );
}
