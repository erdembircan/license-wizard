import { useRef } from "react";
import { useTerminalPlayer } from "../hooks/useTerminalPlayer";

/**
 * The interactive hero terminal shell: the window bar with its three colored
 * dots and the (initially empty) tablist, plus the empty terminal body region.
 * The tabs and output lines are created at runtime by useTerminalPlayer, which
 * drives the scene playback against the tabs container and body refs.
 */
export default function Terminal() {
  const tabsRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useTerminalPlayer(tabsRef, bodyRef);

  return (
    <div className="terminal" id="terminal">
      <div className="terminal-bar">
        <span className="term-dot" style={{ background: "#ff5f57" }}></span>
        <span className="term-dot" style={{ background: "#febc2e" }}></span>
        <span className="term-dot" style={{ background: "#28c840" }}></span>
        <div
          ref={tabsRef}
          className="ml-3 flex gap-1"
          role="tablist"
          aria-label="License Wizard examples"
          id="term-tabs"
        ></div>
      </div>
      <div
        ref={bodyRef}
        className="terminal-body"
        id="terminal-body"
        role="region"
        aria-live="polite"
        aria-label="Terminal output"
      ></div>
    </div>
  );
}
