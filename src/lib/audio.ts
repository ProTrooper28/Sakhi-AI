// Web Audio API helper for urgent, clear, and high-fidelity emergency sounds.
//
// The ACTIVE siren deliberately does NOT use the Web Audio graph. When the
// microphone starts capturing (SOS auto-records evidence), mobile OSes
// reconfigure the audio route and suspend/duck WebAudio output — an
// oscillator chain dies no matter how often the context is resumed.
// HTMLAudioElement playback runs through the platform media pipeline (the
// same one that plays music while recording) and survives mic capture, so
// the alarm loop is a self-generated WAV played on a looping <audio> element
// with a watchdog that restarts it if the OS ever pauses it.

let audioCtx: AudioContext | null = null;

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
 * These listeners revive a suspended context and prime the siren element on
 * the very next tap/keypress — e.g. after a page reload while SOS is active.
 */
function attachUnlockListeners(): void {
  if (unlockListenersAttached || typeof window === "undefined") return;
  unlockListenersAttached = true;
  const unlock = () => {
    if (audioCtx && audioCtx.state !== "running") {
      void audioCtx.resume().catch(() => {});
    }
    // Create + silently prime the siren element so a later programmatic
    // play() (SOS activation) is allowed without needing a fresh gesture.
    ensureSirenElement();
    primeSirenElement();
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

// ── Police-style wail siren (one-shot bursts, Web Audio) ─────────────────────
// Used for single alerts (Test Siren button, one-shot pings) — short, gesture
// initiated, and finished long before any capture starts.

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

// ── Looping siren WAV (HTMLAudioElement engine) ──────────────────────────────
// One 9.6 s WAV synthesized in JS: 4.8 s slow wail (2 × 2.4 s sweeps) then
// 4.8 s fast yelp (8 × 0.6 s sweeps), phase-continuous at every boundary so
// it loops seamlessly. The wail→yelp alternation is baked into the file, so
// the siren audibly "changes" with zero runtime switching logic.

const SIREN_SR      = 11025;              // Hz — plenty for siren harmonics
const WAIL_SEG_SEC  = 4.8;
const YELP_SEG_SEC  = 4.8;
const WAIL_CYCLE_S  = 2.4;                // slow classic wail
const YELP_CYCLE_S  = 0.6;                // fast urgent yelp
const SIREN_CENTER  = 700;
const WAIL_SWEEP_HZ = 150;
const YELP_SWEEP_HZ = 200;

function synthSweepSegment(durationSec: number, cycleSec: number, sweepHz: number): Float32Array {
  const n = Math.round(durationSec * SIREN_SR);
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SIREN_SR;
    const f = SIREN_CENTER + sweepHz * Math.sin((2 * Math.PI * t) / cycleSec);
    phase += (2 * Math.PI * f) / SIREN_SR;
    // Warm brassy siren timbre: fundamental + soft harmonics (not a harsh saw).
    const s =
      Math.sin(phase) +
      0.35 * Math.sin(2 * phase) +
      0.18 * Math.sin(3 * phase) +
      0.08 * Math.sin(4 * phase);
    out[i] = s * 0.62;
  }
  return out;
}

function encodeWavDataUri(segments: Float32Array[]): string {
  const total = segments.reduce((a, c) => a + c.length, 0);
  const buf = new ArrayBuffer(44 + total * 2);
  const v = new DataView(buf);
  const ws = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  ws(0, "RIFF");
  v.setUint32(4, 36 + total * 2, true);
  ws(8, "WAVE");
  ws(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);          // PCM
  v.setUint16(22, 1, true);          // mono
  v.setUint32(24, SIREN_SR, true);
  v.setUint32(28, SIREN_SR * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  ws(36, "data");
  v.setUint32(40, total * 2, true);
  let off = 44;
  for (const seg of segments) {
    for (let i = 0; i < seg.length; i++) {
      const s = Math.max(-1, Math.min(1, seg[i]));
      v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      off += 2;
    }
  }
  // Base64 in chunks to stay far below the argument-count limit.
  const bytes = new Uint8Array(buf);
  let bin = "";
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CH));
  }
  return "data:audio/wav;base64," + btoa(bin);
}

let sirenDataUri: string | null = null;

function buildSirenDataUri(): string {
  if (!sirenDataUri) {
    sirenDataUri = encodeWavDataUri([
      synthSweepSegment(WAIL_SEG_SEC, WAIL_CYCLE_S, WAIL_SWEEP_HZ),
      synthSweepSegment(YELP_SEG_SEC, YELP_CYCLE_S, YELP_SWEEP_HZ),
    ]);
  }
  return sirenDataUri;
}

let sirenEl: HTMLAudioElement | null = null;
let sirenWatchdog: ReturnType<typeof setInterval> | null = null;
let sirenBaseVolume = 1;   // per-kind base volume before master
let alarmActive = false;

function sirenTargetVolume(): number {
  return Math.max(0, Math.min(1, sirenBaseVolume * masterVolume));
}

function applySirenVolume(): void {
  if (sirenEl) sirenEl.volume = sirenTargetVolume();
}

function ensureSirenElement(): HTMLAudioElement {
  if (!sirenEl) {
    sirenEl = new Audio(buildSirenDataUri());
    sirenEl.loop = true;
    sirenEl.preload = "auto";
    sirenEl.setAttribute("playsinline", "");
  }
  return sirenEl;
}

/**
 * Silently start (and immediately pause) the siren element inside a user
 * gesture. This "unlocks" playback so later programmatic play() calls are
 * allowed even when the original SOS tap is no longer in the gesture stack.
 */
function primeSirenElement(): void {
  if (alarmActive || !sirenEl) return;
  const el = sirenEl;
  const prevVol = el.volume;
  el.volume = 0;
  el.play()
    .then(() => {
      el.pause();
      el.currentTime = 0;
      el.volume = prevVol;
    })
    .catch(() => {
      el.volume = prevVol;
    });
}

function startSirenEngine(baseVolume: number): void {
  // Idempotent: AppContext and the SOS screen can both arm the same alarm.
  if (alarmActive && sirenBaseVolume === baseVolume) return;
  alarmActive = true;
  sirenBaseVolume = baseVolume;

  const el = ensureSirenElement();
  el.volume = sirenTargetVolume();
  el.play().catch(() => {
    // Blocked until a gesture — retry on the next interaction.
    const retry = () => {
      window.removeEventListener("pointerdown", retry);
      if (alarmActive) void el.play().catch(() => {});
    };
    window.addEventListener("pointerdown", retry);
  });

  if (!sirenWatchdog) {
    sirenWatchdog = setInterval(() => {
      if (!alarmActive || !sirenEl) return;
      const e = sirenEl;
      // OS route changes can pause the element — revive it.
      if (e.paused) void e.play().catch(() => {});
      // Keep volume in sync with the live slider.
      const tv = sirenTargetVolume();
      if (Math.abs(e.volume - tv) > 0.01) e.volume = tv;
      // Also keep the shared context alive for the one-shot sounds.
      if (audioCtx && audioCtx.state !== "running") {
        void audioCtx.resume().catch(() => {});
      }
    }, 500);
  }
}

function stopSirenEngine(): void {
  alarmActive = false;
  if (sirenWatchdog) {
    clearInterval(sirenWatchdog);
    sirenWatchdog = null;
  }
  if (sirenEl) {
    try {
      sirenEl.pause();
      sirenEl.currentTime = 0;
    } catch { /* ignore */ }
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

// 3. Start Repeating Alarm loop — continuous platform-media siren.
export function startSOSAlarmLoop(isGuardian: boolean) {
  // Ensure any existing loop is terminated first.
  stopSOSAlarmLoop();
  if (isGuardian) {
    // Softer, steady loop for the guardian device.
    startSirenEngine(0.35);
  } else {
    // Loud siren for the user: wail ↔ yelp alternation baked into the loop.
    startSirenEngine(0.9);
  }
}

// 4. Stop Repeating Alarm loop
export function stopSOSAlarmLoop() {
  stopSirenEngine();
}

/**
 * Force-restart the user siren from scratch (SOS screen "Restart" button).
 * Recreates the audio element so a wedged playback starts genuinely fresh.
 */
export function restartSiren(): void {
  stopSOSAlarmLoop();
  sirenEl = null; // rebuild from a fresh element
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
