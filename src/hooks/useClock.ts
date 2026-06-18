import { useEffect, useState } from "react";

export interface ClockReading {
  /** Localized wall-clock time, e.g. "9:41:07 AM". */
  time: string;
  /** Localized short date, e.g. "Wed 18 Jun". */
  date: string;
}

function read(): ClockReading {
  const now = new Date();
  return {
    time: now.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    }),
    date: now.toLocaleDateString([], {
      weekday: "short",
      day: "numeric",
      month: "short",
    }),
  };
}

/**
 * A live wall clock that ticks once a second — but only while `active` is true.
 * The menu bar that consumes it is hidden unless the mini desktop is showing, so
 * the interval is torn down whenever the desktop is covered and started up again
 * (with an immediate refresh) when it reappears, keeping an idle hero from
 * running a per-second timer for nothing.
 */
export function useClock(active: boolean): ClockReading {
  const [reading, setReading] = useState<ClockReading>(read);

  useEffect(() => {
    if (!active) return;
    // Refresh on the next frame (not synchronously in the effect) so the clock
    // is current the moment the desktop reveals, then tick every second after.
    const raf = requestAnimationFrame(() => setReading(read()));
    const id = setInterval(() => setReading(read()), 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, [active]);

  return reading;
}
