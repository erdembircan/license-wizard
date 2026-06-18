type GenieDirection = "out" | "in";

const ROWS = 40;
const DURATION_MS = 560;
// Width of the funnel "neck" transition zone, as a fraction of window height. A
// wider band spreads the pinch over more rows for a smoother hourglass curve.
const BAND = 0.34;

const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const smoothstep = (t: number): number => t * t * (3 - 2 * t);
const easeInOut = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/**
 * Plays the macOS genie effect on `windowEl`, warping it into (or out of) the
 * dock `iconEl`.
 *
 * A single CSS transform can only shrink the window uniformly; the genie is a
 * non-affine warp, so the window is sliced into many thin horizontal rows and
 * each row is scaled and moved on its own along a funnel curve. A rising "fill
 * line" sweeps up the window: rows below it have narrowed to the dock icon's
 * width and slid down into it, rows above are still full width, and the soft
 * band between them is the hourglass neck. Rows are clones of the live window
 * (a brief static snapshot), so playback underneath is untouched; the real
 * window is hidden for the duration and revealed seamlessly at the end.
 *
 * Returns a cancel function that tears the effect down immediately. Honors
 * `prefers-reduced-motion` by skipping straight to the resolved state.
 */
export function playGenie(
  windowEl: HTMLElement,
  iconEl: Element,
  direction: GenieDirection,
  onDone?: () => void,
): () => void {
  const stage = windowEl.parentElement;
  const reduce =
    typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!stage || reduce) {
    if (direction === "in") windowEl.style.opacity = "";
    onDone?.();
    return () => {};
  }

  const sRect = stage.getBoundingClientRect();
  const wRect = windowEl.getBoundingClientRect();
  const iRect = iconEl.getBoundingClientRect();
  const width = wRect.width;
  const height = wRect.height;
  // Dock icon target, in window-local coordinates.
  const dockX = iRect.left + iRect.width / 2 - wRect.left;
  const dockY = iRect.top + iRect.height / 2 - wRect.top;
  const neckWidth = Math.max(iRect.width, 36);

  const overlay = document.createElement("div");
  overlay.className = "genie-overlay";
  overlay.setAttribute("aria-hidden", "true");
  overlay.style.cssText = `position:absolute;left:${wRect.left - sRect.left}px;top:${wRect.top - sRect.top}px;width:${width}px;height:${height}px;overflow:visible;pointer-events:none;z-index:6;`;

  const rowHeight = height / ROWS;
  const rows: { el: HTMLElement; mid: number; centerY: number }[] = [];
  for (let r = 0; r < ROWS; r++) {
    const strip = document.createElement("div");
    strip.style.cssText = `position:absolute;left:0;top:${r * rowHeight}px;width:${width}px;height:${rowHeight + 0.5}px;overflow:hidden;will-change:transform,opacity;backface-visibility:hidden;`;
    const clone = windowEl.cloneNode(true) as HTMLElement;
    clone.className = "";
    clone.removeAttribute("id");
    clone.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
    clone.style.cssText = `position:absolute;left:0;top:${-r * rowHeight}px;width:${width}px;height:${height}px;margin:0;opacity:1;`;
    strip.appendChild(clone);
    overlay.appendChild(strip);
    rows.push({
      el: strip,
      mid: (r + 0.5) / ROWS,
      centerY: r * rowHeight + rowHeight / 2,
    });
  }

  stage.appendChild(overlay);
  windowEl.style.opacity = "0";

  let startTs: number | null = null;
  let raf = 0;
  let finished = false;

  const finish = (): void => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    if (direction === "in") {
      // Reveal the real window with no transition, then drop the clones a frame
      // later so there's never a gap where neither is visible.
      windowEl.style.transition = "none";
      windowEl.style.opacity = "";
      requestAnimationFrame(() => {
        windowEl.style.transition = "";
        overlay.remove();
        onDone?.();
      });
    } else {
      overlay.remove();
      // The window stays hidden by its minimized CSS; clear the inline override.
      windowEl.style.opacity = "";
      onDone?.();
    }
  };

  const frame = (ts: number): void => {
    if (startTs === null) startTs = ts;
    const t = clamp((ts - startTs) / DURATION_MS, 0, 1);
    // `in` runs the same curve backwards: full at t=0 → window at t=1.
    const p = direction === "out" ? easeInOut(t) : easeInOut(1 - t);
    const fill = p * (1 + BAND);

    for (const row of rows) {
      // How far this row has been drawn into the funnel (0 = full width, 1 =
      // collapsed onto the dock icon). The band gives the neck its curve.
      const e = smoothstep(clamp((row.mid - (1 - fill)) / BAND, 0, 1));
      const scaleX = lerp(1, neckWidth / width, e);
      const scaleY = lerp(1, 0.34, e);
      const tx = (dockX - width / 2) * e;
      const ty = (dockY - row.centerY) * e;
      const opacity = e > 0.88 ? lerp(1, 0, (e - 0.88) / 0.12) : 1;
      row.el.style.transform = `translate(${tx}px,${ty}px) scale(${scaleX},${scaleY})`;
      row.el.style.opacity = `${opacity}`;
    }

    if (t < 1) raf = requestAnimationFrame(frame);
    else finish();
  };
  raf = requestAnimationFrame(frame);

  return () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    overlay.remove();
    windowEl.style.transition = "";
    windowEl.style.opacity = "";
  };
}
