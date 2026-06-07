import { useEffect, useState, type CSSProperties } from "react";

interface Sparkle {
  id: number;
  /** Position as a percentage of the viewport, so a mid-flight resize keeps
   *  the sparkle roughly in view rather than clipping it off-screen. */
  left: number;
  top: number;
  /** Edge length in pixels. */
  size: number;
  /** How long this sparkle takes to fade in and back out, in milliseconds. */
  duration: number;
}

// A fresh sparkle is born every SPAWN_INTERVAL_MS and removed once its twinkle
// finishes, with no more than MAX_SPARKLES alive at once — enough to feel alive
// without crowding the page.
const SPAWN_INTERVAL_MS = 520;
const MAX_SPARKLES = 16;
const MIN_SIZE_PX = 9;
const MAX_SIZE_PX = 22;
const MIN_DURATION_MS = 3000;
const MAX_DURATION_MS = 5200;

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Renders a viewport-fixed overlay that continually spawns twinkling sparkles
 * at random positions, so wherever the reader has scrolled, a few stars glint
 * in the current view. Each sparkle fades in and out once, then is removed.
 *
 * Sits behind the page content and ignores pointer events, and stays inert when
 * the reader has asked for reduced motion.
 */
export default function Sparkles() {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    let nextId = 0;
    const timers = new Set<ReturnType<typeof setTimeout>>();

    const spawn = () => {
      const id = nextId++;
      const duration = randomBetween(MIN_DURATION_MS, MAX_DURATION_MS);

      setSparkles((current) =>
        current.length >= MAX_SPARKLES
          ? current
          : [
              ...current,
              {
                id,
                left: randomBetween(0, 100),
                top: randomBetween(0, 100),
                size: randomBetween(MIN_SIZE_PX, MAX_SIZE_PX),
                duration,
              },
            ],
      );

      const removal = setTimeout(() => {
        timers.delete(removal);
        setSparkles((current) => current.filter((s) => s.id !== id));
      }, duration);
      timers.add(removal);
    };

    const interval = setInterval(spawn, SPAWN_INTERVAL_MS);
    return () => {
      clearInterval(interval);
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="sparkle-field" aria-hidden="true">
      {sparkles.map((s) => (
        <svg
          key={s.id}
          className="sparkle"
          style={
            {
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              animationDuration: `${s.duration}ms`,
            } as CSSProperties
          }
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 0l2.2 9.8L24 12l-9.8 2.2L12 24l-2.2-9.8L0 12l9.8-2.2z" />
        </svg>
      ))}
    </div>
  );
}
