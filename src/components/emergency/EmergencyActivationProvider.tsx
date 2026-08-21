import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { useVoiceSOS } from "@/hooks/useVoiceSOS";
import { useShakeSOS } from "@/hooks/useShakeSOS";
import { vibrateActivated } from "@/lib/haptics";

/**
 * Emergency Activation context — bridges Voice SOS + Double Shake SOS
 * to the existing triggerSOS workflow. Does NOT modify any existing SOS
 * code — just calls the same `triggerSOS()` the button already calls.
 */

type TestMode = {
  active: boolean;
  method: "voice" | "shake" | null;
  timestamp: number | null;
};

type CountdownState = {
  active: boolean;
  secondsLeft: number;
  source: "shake" | "voice" | null;
  cancelled: boolean;
};

type EmergencyActivationContextType = {
  /** Voice SOS state. */
  voiceListening: boolean;
  voiceToggle: () => void;
  voicePhrases: string[];
  voiceAddPhrase: (phrase: string) => void;
  voiceRemovePhrase: (phrase: string) => void;
  voiceSupported: boolean;
  voiceTranscript: string;
  voicePermissionError: string | null;
  voiceAudioLevel: number;
  voiceIsListening: boolean;
  voiceConfidence: number;

  /** Shake SOS state. */
  shakeListening: boolean;
  shakeToggle: () => void;
  shakeSensitivity: "low" | "medium" | "high";
  shakeSetSensitivity: (s: "low" | "medium" | "high") => void;
  shakeSupported: boolean;
  shakePermissionError: string | null;

  /** Test mode. */
  testMode: TestMode;
  enterTestMode: (method: "voice" | "shake") => void;
  exitTestMode: () => void;

  /** Countdown. */
  countdown: CountdownState;
  cancelCountdown: () => void;
  triggerNow: () => void;

  /** Whether any activation method (beyond SOS button) is enabled. */
  hasAnyActivation: boolean;
};

const EmergencyActivationContext = createContext<EmergencyActivationContextType | null>(null);

const COUNTDOWN_SECONDS = 3;

export function EmergencyActivationProvider({
  children,
  triggerSOS,
}: {
  children: ReactNode;
  triggerSOS: () => void;
}) {
  const [testMode, setTestMode] = useState<TestMode>({
    active: false,
    method: null,
    timestamp: null,
  });

  const [countdown, setCountdown] = useState<CountdownState>({
    active: false,
    secondsLeft: COUNTDOWN_SECONDS,
    source: null,
    cancelled: false,
  });

  const countdownRef = useRef(countdown);
  countdownRef.current = countdown;

  const triggerSOSRef = useRef(triggerSOS);
  triggerSOSRef.current = triggerSOS;

  const testModeRef = useRef(testMode);
  testModeRef.current = testMode;

  /**
   * Core activation handler — called by voice or shake triggers.
   * If in test mode → record the detection without triggering SOS.
   * Otherwise → start countdown, then trigger SOS.
   */
  const handleActivation = useCallback(
    (source: "voice" | "shake") => {
      if (testModeRef.current.active) {
        setTestMode({
          active: true,
          method: source,
          timestamp: Date.now(),
        });
        vibrateActivated();
        return;
      }

      // Start countdown (if not already counting down)
      if (countdownRef.current.active) return;

      setCountdown({
        active: true,
        secondsLeft: COUNTDOWN_SECONDS,
        source,
        cancelled: false,
      });
      vibrateActivated();
    },
    []
  );

  // Voice SOS
  const {
    listening: voiceListening,
    toggle: voiceToggle,
    phrases: voicePhrases,
    addPhrase: voiceAddPhrase,
    removePhrase: voiceRemovePhrase,
    supported: voiceSupported,
    lastTranscript: voiceTranscript,
    permissionError: voicePermissionError,
    audioLevel: voiceAudioLevel,
    isListening: voiceIsListening,
    confidence: voiceConfidence,
  } = useVoiceSOS(() => handleActivation("voice"));

  // Shake SOS
  const {
    listening: shakeListening,
    toggle: shakeToggle,
    sensitivity: shakeSensitivity,
    setSensitivity: shakeSetSensitivity,
    supported: shakeSupported,
    permissionError: shakePermissionError,
  } = useShakeSOS(() => handleActivation("shake"));

  // Countdown timer
  useEffect(() => {
    if (!countdown.active || countdown.secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev.secondsLeft <= 1) {
          // Time's up → trigger SOS
          clearInterval(timer);
          setTimeout(() => triggerSOSRef.current(), 0);
          return { active: false, secondsLeft: 0, source: null, cancelled: false };
        }
        return { ...prev, secondsLeft: prev.secondsLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown.active, countdown.secondsLeft]);

  /** Cancel the countdown. */
  const cancelCountdown = useCallback(() => {
    setCountdown({ active: false, secondsLeft: COUNTDOWN_SECONDS, source: null, cancelled: true });
  }, []);

  /** Trigger SOS immediately (bypass countdown). */
  const triggerNow = useCallback(() => {
    setCountdown({ active: false, secondsLeft: COUNTDOWN_SECONDS, source: null, cancelled: false });
    triggerSOSRef.current();
  }, []);

  /** Enter test mode. */
  const enterTestMode = useCallback((method: "voice" | "shake") => {
    setTestMode({ active: true, method, timestamp: null });
  }, []);

  /** Exit test mode. */
  const exitTestMode = useCallback(() => {
    setTestMode({ active: false, method: null, timestamp: null });
  }, []);

  const hasAnyActivation = voiceListening || shakeListening;

  return (
    <EmergencyActivationContext.Provider
      value={{
        voiceListening,
        voiceToggle,
        voicePhrases,
        voiceAddPhrase,
        voiceRemovePhrase,
        voiceSupported,
        voiceTranscript,
        voicePermissionError,
        voiceAudioLevel,
        voiceIsListening,
        voiceConfidence,
        shakeListening,
        shakeToggle,
        shakeSensitivity,
        shakeSetSensitivity,
        shakeSupported,
        shakePermissionError,
        testMode,
        enterTestMode,
        exitTestMode,
        countdown,
        cancelCountdown,
        triggerNow,
        hasAnyActivation,
      }}
    >
      {children}
    </EmergencyActivationContext.Provider>
  );
}

export function useEmergencyActivation() {
  const ctx = useContext(EmergencyActivationContext);
  if (!ctx) throw new Error("useEmergencyActivation must be used within EmergencyActivationProvider");
  return ctx;
}
