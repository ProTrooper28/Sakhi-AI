/**
 * Haptic feedback helpers (progressive enhancement — safe no-ops on
 * desktops / browsers without the Vibration API).
 */

export const vibrate = (pattern: number | number[]): void => {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // ignore — vibration is a progressive enhancement
  }
};

/** Short pulse — one countdown number (3 / 2 / 1). */
export const vibrateCountdownTick = (): void => vibrate(70);

/** Long pulse — SOS activated. */
export const vibrateActivated = (): void => vibrate([140, 70, 140, 70, 260]);

/** Short confirmation — SOS resolved / cancelled. */
export const vibrateResolved = (): void => vibrate([40, 60, 40]);
