// Web Audio API helper for urgent, clear, and high-fidelity emergency sounds
let audioCtx: AudioContext | null = null;
let alarmInterval: ReturnType<typeof setInterval> | null = null;

// Master volume for ALL emergency sounds (0–1). The siren loop reads this on
// every sweep, so the SOS screen's volume slider applies immediately.
let masterVolume = 1;

export const setSOSVolume = (v: number): void => {
  masterVolume = Math.max(0, Math.min(1, v));
};

export const getSOSVolume = (): number => masterVolume;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

// ── Police-style wail siren ──────────────────────────────────────────────────
// The classic "wee-oo" emergency wail: a sawtooth tone swept between 550 Hz
// and 850 Hz by a slow triangle LFO, shaped through a bandpass filter that
// follows the sweep. Instantly recognizable as a police siren, far less
// piercing than a fixed high-frequency electronic tone.

const WAIL_LOW    = 550;   // Hz — bottom of the sweep
const WAIL_HIGH   = 850;   // Hz — top of the sweep
const WAIL_CENTER = (WAIL_LOW + WAIL_HIGH) / 2;  // 700 Hz
const WAIL_AMP    = (WAIL_HIGH - WAIL_LOW) / 2;  // ±150 Hz
const WAIL_CYCLE  = 2.4;   // seconds per full up-and-down sweep

function playPoliceWail(durationSec: number, volume: number, fadeInSec: number) {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      void ctx.resume();
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

// 1. Play single SOS trigger siren (perfect for "Test Alert" button)
export function playSOSTriggerSound(isFirst = false) {
  // Police-style wail — one full up-down sweep. The first burst fades in
  // smoothly from silence (0.6s) at a louder level; looped repeats use a
  // short attack and overlap slightly so the wail stays continuous.
  playPoliceWail(WAIL_CYCLE + 0.25, isFirst ? 0.45 : 0.3, isFirst ? 0.6 : 0.08);
}

// 2. Play single Guardian Alert siren
export function playGuardianAlertReceivedSound() {
  // Softer, shorter wail for the guardian device (alerting but not alarming).
  playPoliceWail(WAIL_CYCLE * 0.75 + 0.25, 0.16, 0.2);
}

// 3. Start Repeating Alarm loop
export function startSOSAlarmLoop(isGuardian: boolean) {
  // Ensure any existing loop is terminated
  stopSOSAlarmLoop();
  
  if (isGuardian) {
    // Play immediately, then repeat back-to-back (continuous gentle wail).
    playGuardianAlertReceivedSound();
    alarmInterval = setInterval(() => {
      playGuardianAlertReceivedSound();
    }, WAIL_CYCLE * 0.75);
  } else {
    // Play a louder initial burst on first activation, then loop seamlessly.
    playSOSTriggerSound(true);
    alarmInterval = setInterval(() => {
      playSOSTriggerSound(false);
    }, WAIL_CYCLE);
  }
}

// 4. Stop Repeating Alarm loop
export function stopSOSAlarmLoop() {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
}

// 5b. Countdown tick — a short, soft two-tone warning beep. The pitch rises
//     slightly as the countdown advances (3 → 2 → 1) so the user can audibly
//     track progress without it sounding like an alarm.
export function playCountdownBeep(tick: number) {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      void ctx.resume();
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
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    const now = ctx.currentTime;
    
    // Ascending, clean C-major success arpeggio arpeggio (sine wave for maximum purity and calmness)
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
