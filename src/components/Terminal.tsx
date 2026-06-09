import { useRef } from "react";
import { useTerminalPlayer } from "../hooks/useTerminalPlayer";
import type { TerminalScene } from "../data/scenes";

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
}

/**
 * A self-driving terminal window: the window bar with its three colored dots and
 * an (initially empty) tablist, plus the empty body region. The tabs and output
 * lines are created at runtime by useTerminalPlayer, which plays the given
 * scenes against the tabs container and body refs — line-by-line for shell
 * scenes, or as a streamed Claude Code transcript for agent scenes.
 */
export default function Terminal({ scenes, ariaLabel, id }: TerminalProps) {
  const tabsRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useTerminalPlayer(tabsRef, bodyRef, scenes);

  return (
    <div className="terminal" id={id}>
      <div className="terminal-bar">
        <span className="term-dot" style={{ background: "#ff5f57" }}></span>
        <span className="term-dot" style={{ background: "#febc2e" }}></span>
        <span className="term-dot" style={{ background: "#28c840" }}></span>
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
