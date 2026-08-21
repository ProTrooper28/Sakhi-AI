import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Voice SOS detection hook — improved version.
 *
 * Improvements over v1:
 * 1. Multi-language phrases (English + Hindi/romanized)
 * 2. Fuzzy matching — handles common misheard variants
 * 3. Confidence scoring — filters low-confidence results
 * 4. Multi-result checking — checks all alternatives
 * 5. Better auto-restart with exponential backoff on transient errors
 * 6. Visual audio level feedback
 * 7. Debounce cooldown to prevent rapid re-triggers
 */

const DEFAULT_PHRASES = [
  // English
  "help me sakhi",
  "sakhi help",
  "sakhi emergency",
  "help me",
  "save me",
  "emergency",
  "i need help",
  // Hindi (romanized) — common safety phrases
  "bachao",
  "madad karo",
  "sakhi madad",
  "help karo",
  "danger hai",
  "khatra hai",
  "bachao mujhe",
];

const STORAGE_KEY = "sakhi_voice_sos_config";

/** Words that are commonly misheard — map to canonical form for fuzzy matching. */
const MISHEARD_MAP: Record<string, string[]> = {
  "help": ["help", "held", "helm", "hell"],
  "me": ["me", "mi", "may", "meh"],
  "sakhi": ["sakhi", "sucky", "socky", "saki", "sacki"],
  "save": ["save", "safe", "say", "sage"],
  "emergency": ["emergency", "emergancy", "emergecny", "emergence"],
  "need": ["need", "neet", "knead"],
  "bachao": ["bachao", "bachav", "bacha", "bachaon"],
  "madad": ["madad", "madat", "maddat"],
  "karo": ["karo", "kar", "kro"],
  "danger": ["danger", "danjer", "dangerous"],
  "khatra": ["khatra", "khatara", "khatdra"],
};

export type VoiceSOSConfig = {
  enabled: boolean;
  customPhrases: string[];
  language: "en" | "hi" | "both";
};

const DEFAULT_VOICE_CONFIG: VoiceSOSConfig = {
  enabled: false,
  customPhrases: [],
  language: "both",
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

/** Normalize text: lowercase, strip punctuation, collapse whitespace. */
const normalize = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Fuzzy match: check if transcript contains a phrase, allowing for
 * common misheard-word variants. Returns true if any variant matches.
 */
const fuzzyMatch = (transcript: string, phrase: string): boolean => {
  const normTranscript = normalize(transcript);
  const normPhrase = normalize(phrase);

  // Exact match first
  if (normTranscript.includes(normPhrase)) return true;

  // Build variant: for each word in phrase, check if any misheard variant
  // appears in the transcript at roughly the same position
  const phraseWords = normPhrase.split(" ");
  const transcriptWords = normTranscript.split(" ");

  // Simple sliding window fuzzy check
  for (let i = 0; i <= transcriptWords.length - phraseWords.length; i++) {
    let allMatch = true;
    for (let j = 0; j < phraseWords.length; j++) {
      const target = phraseWords[j];
      const candidate = transcriptWords[i + j] || "";

      if (candidate === target) continue;

      // Check misheard variants
      const variants = MISHEARD_MAP[target];
      if (variants && variants.some((v) => v === candidate)) continue;

      // Levenshtein-like: allow 1 char difference for words > 3 chars
      if (target.length > 3 && candidate.length > 0) {
        let diff = 0;
        const maxLen = Math.max(target.length, candidate.length);
        const minLen = Math.min(target.length, candidate.length);
        if (maxLen - minLen <= 1) {
          for (let k = 0; k < minLen; k++) {
            if (target[k] !== candidate[k]) diff++;
          }
          if (diff <= 1) continue;
        }
      }

      allMatch = false;
      break;
    }
    if (allMatch) return true;
  }

  return false;
};

type UseVoiceSOSResult = {
  listening: boolean;
  toggle: () => void;
  phrases: string[];
  addPhrase: (phrase: string) => void;
  removePhrase: (phrase: string) => void;
  supported: boolean;
  lastTranscript: string;
  permissionError: string | null;
  audioLevel: number; // 0-1 normalized audio level for visualization
  isListening: boolean; // raw listening state (ignores config.enabled)
  confidence: number; // last match confidence 0-1
};

/** Cooldown after detection to prevent rapid re-triggers (ms). */
const DETECTION_COOLDOWN = 8000;

export function useVoiceSOS(onPhraseDetected: () => void): UseVoiceSOSResult {
  const [config, setConfig] = useState<VoiceSOSConfig>(readConfig);
  const [listening, setListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("");
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [confidence, setConfidence] = useState(0);

  const recognitionRef = useRef<any>(null);
  const cooldownRef = useRef(false);
  const restartAttemptsRef = useRef(0);
  const audioLevelIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refs for latest values — event handlers always read current data
  const onPhraseRef = useRef(onPhraseDetected);
  onPhraseRef.current = onPhraseDetected;
  const configRef = useRef(config);
  configRef.current = config;

  const supported = typeof window !== "undefined" && (() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    return !!SR;
  })();

  /** Check if transcript matches any phrase (fuzzy). Returns confidence 0-1. */
  const checkMatch = (transcript: string): number => {
    const norm = normalize(transcript);
    if (norm.length < 2) return 0;

    const phrases = configRef.current.customPhrases
      .map((p) => normalize(p))
      .filter((p) => p.length > 0);
    const all = [...ALL_BUILTIN, ...phrases];

    // Exact match = high confidence
    for (const phrase of all) {
      if (norm.includes(phrase)) return 1.0;
    }

    // Fuzzy match = medium confidence
    for (const phrase of configRef.current.customPhrases) {
      if (fuzzyMatch(transcript, phrase)) return 0.85;
    }
    for (const phrase of DEFAULT_PHRASES) {
      if (fuzzyMatch(transcript, phrase)) return 0.8;
    }

    return 0;
  };

  /** Estimate audio level from amplitude of recognition results (visual feedback). */
  const estimateAudioLevel = useCallback(() => {
    // SpeechRecognition doesn't expose raw audio, so we simulate a breathing
    // indicator while actively listening. Real level would need Web Audio API.
    setAudioLevel((prev) => {
      const target = listening ? 0.3 + Math.random() * 0.4 : 0;
      return prev + (target - prev) * 0.3;
    });
  }, [listening]);

  // Audio level animation while listening
  useEffect(() => {
    if (listening) {
      audioLevelIntervalRef.current = setInterval(estimateAudioLevel, 150);
    } else {
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current);
        audioLevelIntervalRef.current = null;
      }
      setAudioLevel(0);
    }
    return () => {
      if (audioLevelIntervalRef.current) clearInterval(audioLevelIntervalRef.current);
    };
  }, [listening, estimateAudioLevel]);

  const startListening = useCallback(() => {
    if (!supported || recognitionRef.current) return;

    try {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SR();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = configRef.current.language === "hi" ? "hi-IN"
        : configRef.current.language === "en" ? "en-US"
        : "en-IN"; // "both" → Indian English which handles Hindi well
      recognition.maxAlternatives = 5; // Check more alternatives for better detection

      recognition.onresult = (event: any) => {
        let bestConfidence = 0;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          // Check if this is a final result (more reliable than interim)
          const isFinal = result.isFinal;

          for (let alt = 0; alt < result.length; alt++) {
            const transcript = result[alt].transcript;
            const conf = result[alt].confidence || 0.5;

            setLastTranscript(transcript);

            const matchScore = checkMatch(transcript);
            // Weight: 60% match quality + 40% recognition confidence
            const combinedScore = matchScore * 0.6 + conf * 0.4;

            if (matchScore > 0 && combinedScore > bestConfidence) {
              bestConfidence = combinedScore;
            }
          }
        }

        // Only trigger if confidence is above threshold and not on cooldown
        if (bestConfidence >= 0.5 && !cooldownRef.current) {
          cooldownRef.current = true;
          setConfidence(bestConfidence);
          onPhraseRef.current();

          // Cooldown to prevent rapid re-triggers
          setTimeout(() => {
            cooldownRef.current = false;
          }, DETECTION_COOLDOWN);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("[sakhi-voice] Error:", event.error);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setPermissionError("Microphone permission denied. Enable it in browser settings.");
          setListening(false);
          recognitionRef.current = null;
          restartAttemptsRef.current = 0;
        }
        // Transient errors → auto-restart via onend with backoff
      };

      recognition.onend = () => {
        // Auto-restart while still active, with exponential backoff for errors
        if (recognitionRef.current) {
          const delay = Math.min(1000 * Math.pow(1.5, restartAttemptsRef.current), 10000);
          restartAttemptsRef.current += 1;
          setTimeout(() => {
            if (recognitionRef.current) {
              try {
                recognition.start();
                restartAttemptsRef.current = 0; // Reset on successful start
              } catch { /* already started */ }
            }
          }, delay);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setListening(true);
      setPermissionError(null);
      restartAttemptsRef.current = 0;
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
    setAudioLevel(0);
    restartAttemptsRef.current = 0;
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
      if (audioLevelIntervalRef.current) clearInterval(audioLevelIntervalRef.current);
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
    audioLevel,
    isListening: listening,
    confidence,
  };
}
