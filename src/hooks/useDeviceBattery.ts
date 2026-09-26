import { useEffect, useState } from "react";

type BatteryManagerLike = {
  level: number;
  charging: boolean;
  addEventListener: (type: "levelchange" | "chargingchange", cb: () => void) => void;
  removeEventListener: (type: "levelchange" | "chargingchange", cb: () => void) => void;
};

/**
 * Device battery via the Battery Status API (Chrome/Edge/Android).
 * Returns `{ level: null }` on unsupported browsers (desktop Safari/Firefox,
 * most desktops) — callers must treat null as "unknown, stay quiet".
 *
 * Re-renders only when the rounded percentage actually changes.
 */
export const useDeviceBattery = (): { level: number | null; charging: boolean } => {
  const [level, setLevel] = useState<number | null>(null);
  const [charging, setCharging] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManagerLike> };
    if (!nav.getBattery) return;

    void nav.getBattery().then((battery) => {
      if (cancelled) return;
      const apply = () => {
        const pct = Math.round(battery.level * 100);
        setLevel((prev) => (prev === pct ? prev : pct));
        setCharging(battery.charging);
      };
      apply();
      battery.addEventListener("levelchange", apply);
      battery.addEventListener("chargingchange", apply);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { level, charging };
};
