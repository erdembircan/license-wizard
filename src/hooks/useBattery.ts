import { useEffect, useState } from "react";

interface BatteryManagerLike {
  level: number;
  charging: boolean;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

type NavigatorWithBattery = Navigator & {
  getBattery?: () => Promise<BatteryManagerLike>;
};

export interface BatteryState {
  /** Charge level as a whole percentage (0–100). */
  percent: number;
  charging: boolean;
  /** Whether the reading is a real one from the Battery Status API. */
  supported: boolean;
}

/**
 * Reads the device battery through the Battery Status API and keeps it current
 * via the spec's `levelchange` / `chargingchange` events. Platforms that don't
 * expose the API (Safari, and desktops without a battery, which report fully
 * charged) fall back to a charged-at-100% reading, so the menu bar still shows
 * something plausible.
 *
 * @see https://w3c.github.io/battery/
 */
export function useBattery(): BatteryState {
  const [state, setState] = useState<BatteryState>({
    percent: 100,
    charging: true,
    supported: false,
  });

  useEffect(() => {
    const nav = navigator as NavigatorWithBattery;
    if (typeof nav.getBattery !== "function") return;

    let manager: BatteryManagerLike | null = null;
    let cancelled = false;
    const update = (): void => {
      if (!manager) return;
      setState({
        percent: Math.round(manager.level * 100),
        charging: manager.charging,
        supported: true,
      });
    };

    void nav.getBattery().then((battery) => {
      if (cancelled) return;
      manager = battery;
      update();
      battery.addEventListener("levelchange", update);
      battery.addEventListener("chargingchange", update);
    });

    return () => {
      cancelled = true;
      if (manager) {
        manager.removeEventListener("levelchange", update);
        manager.removeEventListener("chargingchange", update);
      }
    };
  }, []);

  return state;
}
