/**
 * Fake Call audio — ringtone, vibration and the one-sided conversation.
 *
 * Everything is generated on-device:
 *   • the ringtone is a soft dual-tone loop built with the Web Audio API
 *     (same pattern as lib/audio.ts's siren engine, calm not alarming),
 *   • vibration uses the Vibration API when enabled,
 *   • the conversation plays through speechSynthesis with a natural rate
 *     and pitch so it sounds like a real voice on the line.
 *
 * No network, no guardian notification, no SOS — a pure exit strategy.
 */

let ringCtx: AudioContext | null = null;
let ringTimer: ReturnType<typeof setInterval> | null = null;
let ringGain: GainNode | null = null;

const getRingContext = (): AudioContext | null => {
  try {
    if (!ringCtx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ringCtx = new Ctor();
    }
    if (ringCtx.state === "suspended") void ringCtx.resume();
    return ringCtx;
  } catch {
    return null;
  }
};

/**
 * One soft "brr-brr" ring burst (two 0.4s tones at the classic 425 Hz,
 * gentle volume so it reads as a normal phone, not an alarm).
 */
const playRingBurst = (): void => {
  const ctx = getRingContext();
  if (!ctx || !ringGain) return;
  const now = ctx.currentTime;
  [0, 0.6].forEach((offset) => {
    const osc = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 425;
    // Subtle tremolo so the tone "wobbles" like a real ringer.
    mod.frequency.value = 18;
    modGain.gain.value = 60;
    mod.connect(modGain).connect(osc.frequency);
    osc.connect(ringGain!);
    osc.start(now + offset);
    mod.start(now + offset);
    osc.stop(now + offset + 0.4);
    mod.stop(now + offset + 0.4);
  });
};

/** Start the looping ringtone. Safe to call repeatedly. */
export const startFakeRingtone = (volume = 0.18): void => {
  const ctx = getRingContext();
  if (!ctx) return;
  stopFakeRingtone();
  ringGain = ctx.createGain();
  ringGain.gain.value = volume;
  ringGain.connect(ctx.destination);
  playRingBurst();
  ringTimer = setInterval(playRingBurst, 2000);
};

export const stopFakeRingtone = (): void => {
  if (ringTimer) {
    clearInterval(ringTimer);
    ringTimer = null;
  }
  ringGain?.disconnect();
  ringGain = null;
};

// ── Vibration ────────────────────────────────────────────────────────────────

let vibrateTimer: ReturnType<typeof setInterval> | null = null;

export const startFakeVibration = (): void => {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  stopFakeVibration();
  const buzz = () => navigator.vibrate?.(600);
  buzz();
  vibrateTimer = setInterval(buzz, 2000);
};

export const stopFakeVibration = (): void => {
  if (vibrateTimer) {
    clearInterval(vibrateTimer);
    vibrateTimer = null;
  }
  try {
    navigator.vibrate?.(0);
  } catch {
    // ignore
  }
};

// ── The one-sided conversation ───────────────────────────────────────────────

/** Split a script line into sentences with natural pauses between them. */
const sentences = (line: string): string[] =>
  line
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * Speak the call script through speechSynthesis at a human pace. Resolves
 * when the whole conversation finishes (or immediately for "none").
 */
export const playFakeConversation = (line: string): Promise<void> => {
  if (!line || typeof speechSynthesis === "undefined") return Promise.resolve();
  return new Promise((resolve) => {
    const parts = sentences(line);
    let idx = 0;
    const speakNext = () => {
      if (idx >= parts.length) {
        resolve();
        return;
      }
      const utter = new SpeechSynthesisUtterance(parts[idx]);
      utter.rate = 0.98; // conversational, not robotic
      utter.pitch = 1.05;
      utter.volume = 1;
      idx += 1;
      utter.onend = () => setTimeout(speakNext, 700);
      utter.onerror = () => resolve();
      speechSynthesis.speak(utter);
    };
    // A short pause before "picking up" feels like a real connect.
    setTimeout(speakNext, 600);
  });
};

export const stopFakeConversation = (): void => {
  try {
    speechSynthesis?.cancel();
  } catch {
    // ignore
  }
};
