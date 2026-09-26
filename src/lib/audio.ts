// Web Audio API helper for urgent, clear, and high-fidelity emergency sounds
let audioCtx: AudioContext | null = null;
let alarmInterval: ReturnType<typeof setInterval> | null = null;

// Master volume for ALL emergency sounds (0–1). Applies live to a running
// siren — the SOS screen's volume slider is instantly audible.
let masterVolume = 1;

export const setSOSVolume = (v: number): void => {
  masterVolume = Math.max(0, Math.min(1, v));
  applySirenVolume();
};

export const getSOSVolume = (): number => masterVolume;

let unlockListenersAttached = false;

/**
 * Browsers only allow audio to start (or resume) inside a user gesture.
 * These listeners revive a suspended context on the very next tap/keypress —
 * e.g. after a page reload while SOS is active, or after OS interruptions.
 */
function attachUnlockListeners(): void {
  if (unlockListenersAttached || typeof window === "undefined") return;
  unlockListenersAttached = true;
  const unlock = () => {
    if (audioCtx && audioCtx.state !== "running") {
      void audioCtx.resume().catch(() => {});
    }
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("touchstart", unlock);
  window.addEventListener("keydown", unlock);
}

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  attachUnlockListeners();
  return audioCtx;
}

// ── Police-style wail siren (one-shot bursts) ────────────────────────────────
// The classic "wee-oo" emergency wail: a sawtooth tone swept between 550 Hz
// and 850 Hz by a slow triangle LFO, shaped through a bandpass filter that
// follows the sweep. Used for single alerts (Test Siren, guardian ping).

const WAIL_LOW    = 550;   // Hz — bottom of the sweep
const WAIL_HIGH   = 850;   // Hz — top of the sweep
const WAIL_CENTER = (WAIL_LOW + WAIL_HIGH) / 2;  // 700 Hz
const WAIL_AMP    = (WAIL_HIGH - WAIL_LOW) / 2;  // ±150 Hz
const WAIL_CYCLE  = 2.4;   // seconds per full up-and-down sweep

function playPoliceWail(durationSec: number, volume: number, fadeInSec: number) {
  try {
    const ctx = getAudioContext();
    if (ctx.state !== "running") {
      void ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    const vol = volume * masterVolume;
    if (vol <= 0.001) return;

    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(WAIL_CENTER, now);

    // Triangle LFO sweeps the tone up and down (the wail).
    const lfo = ctx.createOscillator();
    lfo.type = "triangle";
    lfo.frequency.setValueAtTime(1 / WAIL_CYCLE, now);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(WAIL_AMP, now);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    // Bandpass follows the sweep so the tone stays tight and siren-like.
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.setValueAtTime(3.2, now);
    bp.frequency.setValueAtTime(WAIL_CENTER, now);
    lfoGain.connect(bp.frequency);

    // Gain envelope: smooth fade-in, sustained body, gentle tail.
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + fadeInSec);
    gain.gain.setValueAtTime(vol, now + Math.max(fadeInSec, durationSec - 0.2));
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

    osc.connect(bp);
    bp.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + durationSec + 0.05);
    lfo.start(now);
    lfo.stop(now + durationSec + 0.05);
  } catch (error) {
    console.warn("Could not synthesize police siren:", error);
  }
}

// ── Continuous siren engine (used while SOS is active) ──────────────────────
// A single persistent oscillator + LFO chain that plays WITHOUT GAPS for as
// long as the alarm loop is active. A watchdog keeps it alive:
//   • resumes the AudioContext if the OS suspends/interrupts it (iOS does
//     this when the microphone starts capturing, or the app is backgrounded)
//   • re-asserts the gain level every tick (self-healing against ramps to 0)
//   • alternates between a slow WAIL and a fast YELP every ~4 s so the siren
//     audibly changes, like a real police siren.

const SIREN_CENTER = 700;  // Hz
const SIREN_AMP    = 150;  // Hz (± around center)
const WAIL_MODE_CYCLE = 2.4;   // s — slow classic wail
const YELP_MODE_CYCLE = 0.55;  // s — fast urgent yelp
const MODE_SWITCH_TICKS = 8;   // 8 × 500 ms = 4 s per mode

interface SirenState {
  ctx: AudioContext;
  osc: OscillatorNode;
  lfo: OscillatorNode;
  gain: GainNode;
  baseVolume: number;               // per-kind volume before master
  mode: "wail" | "yelp";
  ticks: number;
  alternating: boolean;             // SOS alternates modes; guardian stays calm
  key: "user" | "guardian";         // lets double-starts become no-ops
}

let siren: SirenState | null = null;
let sirenWatchdog: ReturnType<typeof setInterval> | null = null;

function applySirenVolume(): void {
  if (!siren) return;
  const now = siren.ctx.currentTime;
  const target = siren.baseVolume * masterVolume;
  const g = siren.gain.gain;
  g.cancelScheduledValues(now);
  if (target <= 0.001) {
    g.setTargetAtTime(0.0001, now, 0.05);
  } else {
    g.setTargetAtTime(target, now, 0.08);
  }
}

function setSirenMode(mode: "wail" | "yelp"): void {
  if (!siren) return;
  siren.mode = mode;
  const cycle = mode === "wail" ? WAIL_MODE_CYCLE : YELP_MODE_CYCLE;
  const now = siren.ctx.currentTime;
  const f = siren.lfo.frequency;
  f.cancelScheduledValues(now);
  f.setValueAtTime(f.value, now);
  f.linearRampToValueAtTime(1 / cycle, now + 0.35);
}

function buildSiren(baseVolume: number, alternating: boolean, key: SirenState["key"]): SirenState | null {
  try {
    const ctx = getAudioContext();
    if (ctx.state !== "running") {
      void ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(SIREN_CENTER, now);

    // Triangle LFO sweeps the tone up and down (the wail).
    const lfo = ctx.createOscillator();
    lfo.type = "triangle";
    lfo.frequency.setValueAtTime(1 / WAIL_MODE_CYCLE, now);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(SIREN_AMP, now);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    // Bandpass follows the sweep so the tone stays tight and siren-like.
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.setValueAtTime(3.2, now);
    bp.frequency.setValueAtTime(SIREN_CENTER, now);
    lfoGain.connect(bp.frequency);

    const gain = ctx.createGain();
    const vol = Math.max(baseVolume * masterVolume, 0.001);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(vol, now + 0.3);

    osc.connect(bp);
    bp.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    lfo.start(now);

    return { ctx, osc, lfo, gain, baseVolume, mode: "wail", ticks: 0, alternating, key };
  } catch (error) {
    console.warn("Could not start continuous siren:", error);
    return null;
  }
}

function startSirenEngine(baseVolume: number, alternating: boolean, key: SirenState["key"]): void {
  // Idempotent: AppContext and the SOS screen can both call start for the same
  // mode — only (re)build when the engine is not already running as that mode.
  if (siren && siren.key === key) return;
  if (siren) stopSirenEngine();
  const state = buildSiren(baseVolume, alternating, key);
  if (!state) return;
  siren = state;

  sirenWatchdog = setInterval(() => {
    if (!siren) return;
    // Revive the context after OS-level suspends/interruptions.
    if (siren.ctx.state !== "running") {
      void siren.ctx.resume().catch(() => {});
    }
    siren.ticks += 1;
    // Alternate wail ↔ yelp so the sound keeps changing.
    if (siren.alternating && siren.ticks % MODE_SWITCH_TICKS === 0) {
      setSirenMode(siren.mode === "wail" ? "yelp" : "wail");
    }
    // Pin the gain at the requested level (self-healing).
    applySirenVolume();
  }, 500);
}

function stopSirenEngine(): void {
  if (sirenWatchdog) {
    clearInterval(sirenWatchdog);
    sirenWatchdog = null;
  }
  if (siren) {
    try {
      const now = siren.ctx.currentTime;
      siren.gain.gain.cancelScheduledValues(now);
      siren.gain.gain.setTargetAtTime(0.0001, now, 0.06);
      siren.osc.stop(now + 0.25);
      siren.lfo.stop(now + 0.25);
    } catch { /* already stopped */ }
    siren = null;
  }
}

// 1. Play single SOS trigger siren (perfect for "Test Alert" button)
export function playSOSTriggerSound(isFirst = false) {
  // Police-style wail — one full up-down sweep. The first burst fades in
  // smoothly from silence (0.6s) at a louder level; repeats use a
  // short attack so the wail stays continuous.
  playPoliceWail(WAIL_CYCLE + 0.25, isFirst ? 0.45 : 0.3, isFirst ? 0.6 : 0.08);
}

// 2. Play single Guardian Alert siren
export function playGuardianAlertReceivedSound() {
  // Softer, shorter wail for the guardian device (alerting but not alarming).
  playPoliceWail(WAIL_CYCLE * 0.75 + 0.25, 0.16, 0.2);
}

// 3. Start Repeating Alarm loop — a continuous, self-healing siren.
export function startSOSAlarmLoop(isGuardian: boolean) {
  // Ensure any existing loop is terminated
  stopSOSAlarmLoop();

  if (isGuardian) {
    // Gentle, steady wail for the guardian device (no mode alternation).
    startSirenEngine(0.2, false, "guardian");
  } else {
    // Louder siren for the user that alternates wail ↔ yelp.
    startSirenEngine(0.42, true, "user");
  }
}

// 4. Stop Repeating Alarm loop
export function stopSOSAlarmLoop() {
  stopSirenEngine();
}

/**
 * Force-restart the user siren from scratch (SOS screen "Restart" button).
 * Tears down and rebuilds the whole oscillator chain so a wedged audio graph
 * gets genuinely recreated instead of just toggling the gain.
 */
export function restartSiren(): void {
  stopSOSAlarmLoop();
  startSOSAlarmLoop(false);
}

// 5b. Countdown tick — a short, soft two-tone warning beep. The pitch rises
//     slightly as the countdown advances (3 → 2 → 1) so the user can audibly
//     track progress without it sounding like an alarm.
export function playCountdownBeep(tick: number) {
  try {
    const ctx = getAudioContext();
    if (ctx.state !== "running") {
      void ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    const base = 620 + Math.max(0, 3 - tick) * 45; // 620 → 665 → 710 Hz
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(base, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.22 * masterVolume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.24);
  } catch (error) {
    console.warn("Could not play countdown beep:", error);
  }
}

// 5. Success chime: calm and reassuring success tone arpeggio
export function playSuccessChimeSound() {
  // First, stop any sirens playing in this context
  stopSOSAlarmLoop();

  try {
    const ctx = getAudioContext();
    if (ctx.state !== "running") {
      void ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;

    // Ascending, clean C-major success arpeggio (sine wave for maximum purity and calmness)
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.06, now + idx * 0.08 + 0.03); // calm volume
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.45);
    });
  } catch (error) {
    console.warn("Could not play Success Chime Sound:", error);
  }
}
