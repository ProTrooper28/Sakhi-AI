import { useEffect, useRef, useState, useCallback } from "react";

const DEFAULT_PHRASES = [
  "help me sakhi",
  "sakhi help",
  "sakhi emergency",
  "help me",
  "save me",
  "emergency",
  "i need help",
];

const STORAGE_KEY = "sakhi_voice_sos_config";

export type VoiceSOSConfig = {
  enabled: boolean;
  customPhrases: string[];
};

const DEFAULT_VOICE_CONFIG: VoiceSOSConfig = {
  enabled: false,
  customPhrases: [],
};

const readConfig = (): VoiceSOSConfig => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VOICE_CONFIG;
    return { ...DEFAULT_VOICE_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_VOICE_CONFIG;
  }
};

const writeConfig = (cfg: VoiceSOSConfig): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch { /* ignore */ }
};

const ALL_BUILTIN = DEFAULT_PHRASES.map((p) => p.toLowerCase().trim());

const normalize = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

type UseVoiceSOSResult = {
  listening: boolean;
  toggle: () => void;
  phrases: string[];
  addPhrase: (phrase: string) => void;
  removePhrase: (phrase: string) => void;
  supported: boolean;
  lastTranscript: string;
  permissionError: string | null;
};

export function useVoiceSOS(onPhraseDetected: () => void): UseVoiceSOSResult {
  const [config, setConfig] = useState<VoiceSOSConfig>(readConfig);
  const [listening, setListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("");
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  // Refs for latest values — event handlers always read current data
  const onPhraseRef = useRef(onPhraseDetected);
  onPhraseRef.current = onPhraseDetected;
  const configRef = useRef(config);
  configRef.current = config;

  const supported = typeof window !== "undefined" && (() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    return !!SR;
  })();

  /** Always-current phrase check — reads from configRef, never stale. */
  const checkMatch = (transcript: string): boolean => {
    const norm = normalize(transcript);
    const phrases = configRef.current.customPhrases
      .map((p) => normalize(p))
      .filter((p) => p.length > 0);
    const all = [...ALL_BUILTIN, ...phrases];
    return all.some((phrase) => norm.includes(phrase));
  };

  const startListening = useCallback(() => {
    if (!supported || recognitionRef.current) return;

    try {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SR();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-IN";
      recognition.maxAlternatives = 3;

      // Uses refs — never stale closures
      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          for (let alt = 0; alt < result.length; alt++) {
            const transcript = result[alt].transcript;
            setLastTranscript(transcript);
            if (checkMatch(transcript)) {
              onPhraseRef.current();
              return;
            }
          }
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setPermissionError("Microphone permission denied. Enable it in browser settings.");
          setListening(false);
          recognitionRef.current = null;
        }
        // Transient errors → auto-restart via onend
      };

      recognition.onend = () => {
        // Auto-restart while still active
        if (recognitionRef.current) {
          try { recognition.start(); } catch { /* already started */ }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setListening(true);
      setPermissionError(null);
    } catch (err) {
      console.error("[sakhi-voice] Failed to start:", err);
      setPermissionError("Voice recognition not available on this device/browser.");
    }
  }, [supported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      try { rec.onend = null; rec.abort(); } catch { /* ignore */ }
    }
    setListening(false);
    setLastTranscript("");
  }, []);

  const toggle = useCallback(() => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  }, [listening, startListening, stopListening]);

  const addPhrase = useCallback((phrase: string) => {
    const trimmed = phrase.trim().toLowerCase();
    if (!trimmed || configRef.current.customPhrases.includes(trimmed)) return;
    const next = { ...configRef.current, customPhrases: [...configRef.current.customPhrases, trimmed] };
    setConfig(next);
    writeConfig(next);
  }, []);

  const removePhrase = useCallback((phrase: string) => {
    const next = { ...configRef.current, customPhrases: configRef.current.customPhrases.filter((p) => p !== phrase) };
    setConfig(next);
    writeConfig(next);
  }, []);

  // Sync enabled state from config
  useEffect(() => {
    if (config.enabled && !listening && supported) {
      startListening();
    } else if (!config.enabled && listening) {
      stopListening();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.enabled, supported]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        const rec = recognitionRef.current;
        recognitionRef.current = null;
        try { rec.onend = null; rec.abort(); } catch { /* ignore */ }
      }
    };
  }, []);

  const allPhrases = [...ALL_BUILTIN, ...config.customPhrases];

  return {
    listening: listening && config.enabled,
    toggle,
    phrases: allPhrases,
    addPhrase,
    removePhrase,
    supported,
    lastTranscript,
    permissionError,
  };
}
