import { useCallback, useEffect, useRef, useState } from "react";
import Terminal from "./Terminal";
import MacDock from "./MacDock";
import { useBattery } from "../hooks/useBattery";
import { useClock } from "../hooks/useClock";
import { scenes } from "../data/scenes";

type WindowState = "open" | "minimized" | "closed" | "maximized";

/**
 * The small battery indicator in the menu bar: an outline cell whose inner fill
 * tracks the charge level, plus a bolt when charging.
 */
function BatteryGlyph({
  percent,
  charging,
}: {
  percent: number;
  charging: boolean;
}) {
  const fill = Math.max(2, (Math.min(100, percent) / 100) * 18);
  return (
    <svg
      className="mac-menubar__battglyph"
      viewBox="0 0 26 13"
      width="24"
      height="12"
      aria-hidden="true"
    >
      <rect
        x="0.75"
        y="0.75"
        width="22"
        height="11.5"
        rx="3"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.6"
      />
      <rect
        x="24"
        y="4.2"
        width="2"
        height="4.6"
        rx="1"
        fill="currentColor"
        fillOpacity="0.6"
      />
      <rect x="2" y="2" width={fill} height="9" rx="1.5" fill="currentColor" />
      {charging && (
        <path
          d="M13.2 1.6 8.6 7.4h3.1l-1 4 4.8-5.8h-3.1z"
          fill="#0e1830"
          stroke="currentColor"
          strokeWidth="0.5"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

/**
 * The slim faux menu bar atop the mini desktop: brand mark, dummy app menus, and
 * a live status cluster — the real device battery (Battery Status API) and a
 * wall clock that ticks every second while the desktop is showing.
 */
function MacMenuBar({ active }: { active: boolean }) {
  const battery = useBattery();
  const { time, date } = useClock(active);
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
        <span className="mac-menubar__battery">
          {battery.percent}%
          <BatteryGlyph percent={battery.percent} charging={battery.charging} />
        </span>
        <span>{date}</span>
        <span className="mac-menubar__clock">{time}</span>
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
 * - **minimize** plays the genie effect — warping the window down into the
 *   License Wizard dock icon — and clicking that icon plays it in reverse;
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
  // Set for the duration of the genie-in animation when relaunching from the
  // dock, so the window warps back out of its icon instead of snapping open.
  const [launching, setLaunching] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  // The ancestor whose entrance transform we suppress while maximized (see below).
  const riseRef = useRef<HTMLElement | null>(null);

  // Point the genie at the dock's License Wizard icon: stash, as CSS vars on the
  // window, the translation from the window's centre to the icon's centre. Both
  // the out (minimize) and in (relaunch) keyframes travel along that vector.
  const aimGenieAtDock = useCallback((): void => {
    const win = windowRef.current;
    const icon = stageRef.current?.querySelector(".dock-item--app");
    if (!win || !icon) return;
    const w = win.getBoundingClientRect();
    const i = icon.getBoundingClientRect();
    win.style.setProperty(
      "--genie-x",
      `${i.left + i.width / 2 - (w.left + w.width / 2)}px`,
    );
    win.style.setProperty(
      "--genie-y",
      `${i.top + i.height / 2 - (w.top + w.height / 2)}px`,
    );
  }, []);

  const minimize = useCallback(() => {
    aimGenieAtDock();
    setState("minimized");
  }, [aimGenieAtDock]);

  const close = useCallback(() => setState("closed"), []);

  const open = useCallback(() => {
    // Relaunching from a genied-down window plays the reverse warp; a closed
    // window simply pops back via its transition.
    setLaunching(state === "minimized");
    setState("open");
  }, [state]);

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
        <MacMenuBar active={stowed} />
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

      <div
        ref={windowRef}
        className={`mac-stage__window${launching ? " is-launching" : ""}`}
        onAnimationEnd={() => setLaunching(false)}
      >
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
