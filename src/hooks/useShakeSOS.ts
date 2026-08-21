import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Shake sensitivity thresholds (acceleration magnitude above baseline).
 * Values are in m/s² approximations of the deviceacceleration event.
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
  } catch {
    // ignore
  }
};

/**
 * Calculate the magnitude of a 3D acceleration vector.
 */
const magnitude = (x: number, y: number, z: number): number =>
  Math.sqrt(x * x + y * y + z * z);

type UseShakeSOSResult = {
  /** Whether shake SOS monitoring is active. */
  listening: boolean;
  /** Toggle shake monitoring on/off. */
  toggle: () => void;
  /** Current sensitivity setting. */
  sensitivity: ShakeSOSConfig["sensitivity"];
  /** Set sensitivity. */
  setSensitivity: (s: ShakeSOSConfig["sensitivity"]) => void;
  /** Whether the browser supports DeviceMotion. */
  supported: boolean;
  /** Current shake count detected (for test mode / countdown UI). */
  shakeCount: number;
  /** Timestamp of the last shake (ms). */
  lastShakeTime: number;
  /** Whether a permission error occurred. */
  permissionError: string | null;
  /** Manually reset shake count (after countdown). */
  resetShakes: () => void;
};

/**
 * Detect two intentional shakes within 2–3 seconds.
 *
 * - Ignores normal walking (low sustained acceleration).
 * - Requires two high-acceleration events within the window.
 * - Adjustable sensitivity.
 */
export function useShakeSOS(onShakeDetected: () => void): UseShakeSOSResult {
  const [config, setConfig] = useState<ShakeSOSConfig>(readConfig);
  const [listening, setListening] = useState(false);
  const [shakeCount, setShakeCount] = useState(0);
  const [lastShakeTime, setLastShakeTime] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const onShakeRef = useRef(onShakeDetected);
  onShakeRef.current = onShakeDetected;

  const shakeCountRef = useRef(0);
  const lastShakeTimeRef = useRef(0);
  const cooldownRef = useRef(false);

  // Check for browser support
  const supported = typeof window !== "undefined" && "DeviceMotionEvent" in window;

  const threshold = SENSITIVITY[config.sensitivity] || SENSITIVITY.medium;

  /** Handle device motion events. */
  const handleMotion = useCallback(
    (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

      const mag = magnitude(acc.x, acc.y, acc.z);
      const now = Date.now();

      // Filter out low-level noise (walking, ambient vibration)
      // Gravity ~9.8, so threshold above that for a "shake"
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

      // Reset shake count if more than 2.5 seconds between shakes
      if (shakeCountRef.current > 0 && now - lastShakeTimeRef.current > 2500) {
        shakeCountRef.current = 0;
        setShakeCount(0);
      }
    },
    [threshold]
  );

  /** Request permission for iOS 13+ DeviceMotion. */
  const requestMotionPermission = useCallback(async (): Promise<boolean> => {
    // iOS 13+ requires explicit permission
    const DME = DeviceMotionEvent as any;
    if (typeof DME.requestPermission === "function") {
      try {
        const result = await DME.requestPermission();
        return result === "granted";
      } catch {
        return false;
      }
    }
    // Android / older iOS — no explicit permission needed
    return true;
  }, []);

  /** Start listening. */
  const startListening = useCallback(async () => {
    if (!supported) return;

    const granted = await requestMotionPermission();
    if (!granted) {
      setPermissionError("Motion sensor permission is required for Shake SOS.");
      return;
    }

    window.addEventListener("devicemotion", handleMotion, true);
    setListening(true);
    setPermissionError(null);
  }, [supported, handleMotion, requestMotionPermission]);

  /** Stop listening. */
  const stopListening = useCallback(() => {
    window.removeEventListener("devicemotion", handleMotion, true);
    setListening(false);
    shakeCountRef.current = 0;
    setShakeCount(0);
  }, [handleMotion]);

  /** Toggle. */
  const toggle = useCallback(() => {
    const next = { ...config, enabled: !config.enabled };
    setConfig(next);
    writeConfig(next);
  }, [config]);

  /** Set sensitivity. */
  const setSensitivity = useCallback(
    (s: ShakeSOSConfig["sensitivity"]) => {
      const next = { ...config, sensitivity: s };
      setConfig(next);
      writeConfig(next);
    },
    [config]
  );

  /** Manually reset shake count. */
  const resetShakes = useCallback(() => {
    shakeCountRef.current = 0;
    setShakeCount(0);
  }, []);

  // Sync enabled state
  useEffect(() => {
    if (config.enabled && !listening && supported) {
      void startListening();
    } else if (!config.enabled && listening) {
      stopListening();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.enabled, supported]);

  // Cleanup
  useEffect(() => {
    return () => {
      window.removeEventListener("devicemotion", handleMotion, true);
    };
  }, [handleMotion]);

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
