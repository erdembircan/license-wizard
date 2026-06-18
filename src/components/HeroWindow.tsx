import { useCallback, useEffect, useRef, useState } from "react";
import Terminal from "./Terminal";
import MacDock from "./MacDock";
import { scenes } from "../data/scenes";

type WindowState = "open" | "minimized" | "closed" | "maximized";

/**
 * The slim faux menu bar that sits atop the mini desktop revealed behind the
 * terminal — brand mark, dummy app menus, and a static status cluster. Pure
 * chrome; nothing here is interactive.
 */
function MacMenuBar() {
  return (
    <div className="mac-menubar" aria-hidden="true">
      <div className="mac-menubar__left">
        <img
          src={`${import.meta.env.BASE_URL}favicon.svg`}
          alt=""
          className="mac-menubar__mark"
        />
        <span className="mac-menubar__app">License Wizard</span>
        <span className="mac-menubar__menu">File</span>
        <span className="mac-menubar__menu">Edit</span>
        <span className="mac-menubar__menu">View</span>
        <span className="mac-menubar__menu">Window</span>
        <span className="mac-menubar__menu">Help</span>
      </div>
      <div className="mac-menubar__right">
        <span>100%</span>
        <span>Wed 18 Jun</span>
        <span>9:41</span>
      </div>
    </div>
  );
}

/**
 * The hero's interactive terminal window. The terminal stays mounted at all
 * times (so its self-driving playback never restarts); the three window lights
 * drive a small macOS-style state machine instead:
 *
 * - **close** poofs the window out, revealing a mini desktop with a dock;
 * - **minimize** genies it down into that dock;
 * - clicking the License Wizard dock icon brings it back with the same rise;
 * - **maximize** pins the window to the whole viewport, and clicking it again
 *   (or pressing Escape) restores the inline size.
 *
 * Closing and minimizing only transform the window — its layout box is kept —
 * so the desktop behind shows through without shifting the page. Maximizing
 * lifts the window out of flow, so the stage height is locked first to hold the
 * space.
 */
export default function HeroWindow() {
  const [state, setState] = useState<WindowState>("open");
  const stageRef = useRef<HTMLDivElement>(null);
  // The ancestor whose entrance transform we suppress while maximized (see below).
  const riseRef = useRef<HTMLElement | null>(null);

  const open = useCallback(() => setState("open"), []);
  const close = useCallback(() => setState("closed"), []);
  const minimize = useCallback(() => setState("minimized"), []);

  const toggleMaximize = useCallback(() => {
    if (state === "maximized") {
      setState("open");
      return;
    }
    const el = stageRef.current;
    if (el) {
      // Capture the inline height before the window leaves flow, so the stage
      // doesn't collapse while the terminal is pinned to the viewport.
      el.style.minHeight = `${el.offsetHeight}px`;
      // `position: fixed` must resolve against the viewport, but the hero's
      // entrance animation (`.hero-rise`, fill-forwards) keeps an identity
      // transform on an ancestor — and any non-`none` transform turns that
      // ancestor into the containing block, trapping the maximized window inside
      // the hero cell. Drop the animation to clear that transform; since the
      // animation was also what held the element's final `opacity: 1`, pin the
      // resting state inline so the subtree stays visible. Restored on the way
      // back.
      const rise = el.closest<HTMLElement>(".hero-rise");
      riseRef.current = rise;
      if (rise) {
        rise.style.animation = "none";
        rise.style.transform = "none";
        rise.style.opacity = "1";
      }
    }
    setState("maximized");
  }, [state]);

  // Release the locked height and the suppressed ancestor transform once we're
  // back to an in-flow state.
  useEffect(() => {
    if (state === "maximized") return;
    if (stageRef.current) stageRef.current.style.minHeight = "";
    if (riseRef.current) {
      riseRef.current.style.animation = "";
      riseRef.current.style.transform = "";
      riseRef.current.style.opacity = "";
      riseRef.current = null;
    }
  }, [state]);

  // Escape leaves full screen, matching native window behavior.
  useEffect(() => {
    if (state !== "maximized") return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setState("open");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state]);

  const stowed = state === "closed" || state === "minimized";

  return (
    <div ref={stageRef} className={`mac-stage is-${state}`}>
      <div className="mac-stage__desktop">
        <MacMenuBar />
        <MacDock onLaunch={open} running={stowed} />
      </div>

      {state === "maximized" && (
        <button
          type="button"
          className="mac-stage__backdrop"
          onClick={toggleMaximize}
          aria-label="Restore terminal"
        ></button>
      )}

      <div className="mac-stage__window">
        <Terminal
          scenes={scenes}
          ariaLabel="License Wizard examples"
          id="terminal"
          controls={{
            onClose: close,
            onMinimize: minimize,
            onMaximize: toggleMaximize,
            maximized: state === "maximized",
          }}
        />
      </div>
    </div>
  );
}
