import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Shake sensitivity thresholds (acceleration magnitude above baseline).
 * `accelerationIncludingGravity` includes ~9.8 m/s² from gravity at rest,
 * so these thresholds are above that baseline.
 */
const SENSITIVITY: Record<string, number> = {
  low: 25,
  medium: 18,
  high: 12,
};

const STORAGE_KEY = "sakhi_shake_sos_config";

export type ShakeSOSConfig = {
  enabled: boolean;
  sensitivity: "low" | "medium" | "high";
};

const DEFAULT_CONFIG: ShakeSOSConfig = {
  enabled: false,
  sensitivity: "medium",
};

const readConfig = (): ShakeSOSConfig => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
};

const writeConfig = (cfg: ShakeSOSConfig): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch { /* ignore */ }
};

const magnitude = (x: number, y: number, z: number): number =>
  Math.sqrt(x * x + y * y + z * z);

type UseShakeSOSResult = {
  listening: boolean;
  toggle: () => void;
  sensitivity: ShakeSOSConfig["sensitivity"];
  setSensitivity: (s: ShakeSOSConfig["sensitivity"]) => void;
  supported: boolean;
  shakeCount: number;
  lastShakeTime: number;
  permissionError: string | null;
  resetShakes: () => void;
};

export function useShakeSOS(onShakeDetected: () => void): UseShakeSOSResult {
  const [config, setConfig] = useState<ShakeSOSConfig>(readConfig);
  const [listening, setListening] = useState(false);
  const [shakeCount, setShakeCount] = useState(0);
  const [lastShakeTime, setLastShakeTime] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Refs for latest values — the event handler must never be stale
  const onShakeRef = useRef(onShakeDetected);
  onShakeRef.current = onShakeDetected;
  const configRef = useRef(config);
  configRef.current = config;

  const shakeCountRef = useRef(0);
  const lastShakeTimeRef = useRef(0);
  const cooldownRef = useRef(false);
  const handlerRef = useRef<((e: DeviceMotionEvent) => void) | null>(null);

  const supported = typeof window !== "undefined" && "DeviceMotionEvent" in window;

  /** Get current threshold from configRef (never stale). */
  const getThreshold = () => SENSITIVITY[configRef.current.sensitivity] || SENSITIVITY.medium;

  /**
   * Handle device motion — reads all state from refs so it never goes stale.
   * This function is created once and never changes.
   */
  const handleMotion = useCallback((event: DeviceMotionEvent) => {
    const acc = event.accelerationIncludingGravity;
    if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

    const mag = magnitude(acc.x, acc.y, acc.z);
    const now = Date.now();
    const threshold = getThreshold();

    if (mag > threshold) {
      // Debounce: ignore events within 300ms of last shake
      if (now - lastShakeTimeRef.current < 300) return;

      lastShakeTimeRef.current = now;
      setLastShakeTime(now);
      shakeCountRef.current += 1;
      setShakeCount(shakeCountRef.current);

      // Two shakes within 2.5 seconds → detected
      if (shakeCountRef.current >= 2 && !cooldownRef.current) {
        cooldownRef.current = true;
        onShakeRef.current();

        // Reset after cooldown
        setTimeout(() => {
          shakeCountRef.current = 0;
          setShakeCount(0);
          cooldownRef.current = false;
        }, 5000);
      }
    }

    // Reset shake count if more than 2.5 seconds have elapsed since last shake
    if (shakeCountRef.current > 0 && now - lastShakeTimeRef.current > 2500) {
      shakeCountRef.current = 0;
      setShakeCount(0);
    }
  }, []); // Empty deps — reads everything from refs

  /** Request iOS 13+ motion permission — MUST be called from a user gesture. */
  const requestMotionPermission = useCallback(async (): Promise<boolean> => {
    const DME = DeviceMotionEvent as any;
    if (typeof DME.requestPermission === "function") {
      try {
        const result = await DME.requestPermission();
        return result === "granted";
      } catch {
        return false;
      }
    }
    return true;
  }, []);

  /**
   * Start listening — called from toggle (user gesture on iOS).
   * The handler ref is stable so add/remove always reference the same function.
   */
  const startListening = useCallback(async () => {
    if (!supported) return;

    const granted = await requestMotionPermission();
    if (!granted) {
      setPermissionError("Motion sensor permission is required for Shake SOS.");
      return;
    }

    // Store handler in ref so removeEventListener can find it
    handlerRef.current = handleMotion;
    window.addEventListener("devicemotion", handleMotion, true);
    setListening(true);
    setPermissionError(null);
  }, [supported, handleMotion, requestMotionPermission]);

  const stopListening = useCallback(() => {
    if (handlerRef.current) {
      window.removeEventListener("devicemotion", handlerRef.current, true);
      handlerRef.current = null;
    }
    setListening(false);
    shakeCountRef.current = 0;
    setShakeCount(0);
  }, []);

  /**
   * Toggle — called directly from the settings UI click handler.
   * On iOS, this runs in the user gesture context so requestPermission works.
   */
  const toggle = useCallback(() => {
    const nextEnabled = !configRef.current.enabled;
    const next = { ...configRef.current, enabled: nextEnabled };
    setConfig(next);
    writeConfig(next);

    // Start/stop immediately based on the new value
    if (nextEnabled) {
      void startListening();
    } else {
      stopListening();
    }
  }, [startListening, stopListening]);

  const setSensitivity = useCallback((s: ShakeSOSConfig["sensitivity"]) => {
    const next = { ...configRef.current, sensitivity: s };
    setConfig(next);
    writeConfig(next);
  }, []);

  const resetShakes = useCallback(() => {
    shakeCountRef.current = 0;
    setShakeCount(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (handlerRef.current) {
        window.removeEventListener("devicemotion", handlerRef.current, true);
        handlerRef.current = null;
      }
    };
  }, []);

  return {
    listening: listening && config.enabled,
    toggle,
    sensitivity: config.sensitivity,
    setSensitivity,
    supported,
    shakeCount,
    lastShakeTime,
    permissionError,
    resetShakes,
  };
}
