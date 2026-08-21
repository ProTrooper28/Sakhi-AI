import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Default emergency activation phrases.
 */
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

export const DEFAULT_VOICE_CONFIG: VoiceSOSConfig = {
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
  } catch {
    // storage full or unavailable
  }
};

/**
 * All built-in phrases (lowercase, trimmed).
 */
const ALL_BUILTIN = DEFAULT_PHRASES.map((p) => p.toLowerCase().trim());

/**
 * Normalize speech transcript for matching:
 * - lowercase
 * - collapse whitespace
 * - strip punctuation
 */
const normalize = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

type UseVoiceSOSResult = {
  /** Whether voice SOS monitoring is active. */
  listening: boolean;
  /** Toggle voice monitoring on/off. */
  toggle: () => void;
  /** The currently configured phrases (builtin + custom). */
  phrases: string[];
  /** Add a custom phrase. */
  addPhrase: (phrase: string) => void;
  /** Remove a custom phrase. */
  removePhrase: (phrase: string) => void;
  /** Whether the browser supports SpeechRecognition. */
  supported: boolean;
  /** Current transcript being processed (for test mode display). */
  lastTranscript: string;
  /** Whether a permission error occurred. */
  permissionError: string | null;
};

export function useVoiceSOS(onPhraseDetected: () => void): UseVoiceSOSResult {
  const [config, setConfig] = useState<VoiceSOSConfig>(readConfig);
  const [listening, setListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("");
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const onPhraseRef = useRef(onPhraseDetected);
  onPhraseRef.current = onPhraseDetected;

  // Check for browser support
  const supported = typeof window !== "undefined" && (() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    return !!SR;
  })();

  /** Build the full list of phrases to match against. */
  const getAllPhrases = useCallback((): string[] => {
    const customs = config.customPhrases
      .map((p) => normalize(p))
      .filter((p) => p.length > 0);
    return [...ALL_BUILTIN, ...customs];
  }, [config.customPhrases]);

  /** Check if transcript matches any phrase. */
  const checkMatch = useCallback(
    (transcript: string): boolean => {
      const norm = normalize(transcript);
      const phrases = getAllPhrases();
      return phrases.some((phrase) => norm.includes(phrase));
    },
    [getAllPhrases]
  );

  /** Start the speech recognition loop. */
  const startListening = useCallback(() => {
    if (!supported) return;

    try {
      // Request mic permission first
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        // Got permission — release the stream immediately
        stream.getTracks().forEach((t) => t.stop());

        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SR();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-IN"; // Primary language
        recognition.maxAlternatives = 3;

        recognition.onresult = (event: any) => {
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            // Check all alternatives for a match
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
            setPermissionError("Microphone access is required for Voice SOS. Please allow microphone permission.");
            setListening(false);
            return;
          }
          // For transient errors (network,aborted), restart silently
          if (event.error === "no-speech" || event.error === "audio-capture" || event.error === "network") {
            // auto-restart via onend
            return;
          }
        };

        recognition.onend = () => {
          // Auto-restart if still supposed to be listening
          if (recognitionRef.current) {
            try {
              recognition.start();
            } catch {
              // already started
            }
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
        setListening(true);
        setPermissionError(null);
      }).catch(() => {
        setPermissionError("Microphone permission denied. Voice SOS requires microphone access.");
      });
    } catch {
      setPermissionError("Failed to initialize voice recognition.");
    }
  }, [supported, checkMatch]);

  /** Stop the speech recognition loop. */
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      try {
        rec.onend = null;
        rec.abort();
      } catch {
        // ignore
      }
    }
    setListening(false);
    setLastTranscript("");
  }, []);

  /** Toggle listening on/off. */
  const toggle = useCallback(() => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  }, [listening, startListening, stopListening]);

  /** Add a custom phrase. */
  const addPhrase = useCallback(
    (phrase: string) => {
      const trimmed = phrase.trim().toLowerCase();
      if (!trimmed || config.customPhrases.includes(trimmed)) return;
      const next = { ...config, customPhrases: [...config.customPhrases, trimmed] };
      setConfig(next);
      writeConfig(next);
    },
    [config]
  );

  /** Remove a custom phrase. */
  const removePhrase = useCallback(
    (phrase: string) => {
      const next = {
        ...config,
        customPhrases: config.customPhrases.filter((p) => p !== phrase),
      };
      setConfig(next);
      writeConfig(next);
    },
    [config]
  );

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
        try {
          rec.onend = null;
          rec.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const allPhrases = [
    ...ALL_BUILTIN.map((p) => p),
    ...config.customPhrases,
  ];

  return {
    listening: listening && config.enabled,
    toggle: () => {
      const next = { ...config, enabled: !config.enabled };
      setConfig(next);
      writeConfig(next);
    },
    phrases: allPhrases,
    addPhrase,
    removePhrase,
    supported,
    lastTranscript,
    permissionError,
  };
}
