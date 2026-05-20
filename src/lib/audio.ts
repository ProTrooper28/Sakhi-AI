// Web Audio API helper for urgent, clear, and high-fidelity emergency sounds
let audioCtx: AudioContext | null = null;
let alarmInterval: ReturnType<typeof setInterval> | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

// Helper to synthesize a single siren sweep
function playSirenSweep(freqStart: number, freqEnd: number, duration: number, volume: number) {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    // Use standard sawtooth wave for piercing electronic sirens (very sharp & clear)
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freqStart, now);
    
    // Frequency sweep (upward and downward)
    const halfDuration = duration / 2;
    osc.frequency.linearRampToValueAtTime(freqEnd, now + halfDuration);
    osc.frequency.linearRampToValueAtTime(freqStart, now + duration);
    
    // Gain / volume envelope
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.05); // sharp attack
    gainNode.gain.setValueAtTime(volume, now + duration - 0.08); // sustain
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration); // decay
    
    // Apply lowpass filter that allows high piercing harmonics to pass clearly
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(4500, now); // high cutoff for piercing clarity
    
    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + duration);
  } catch (error) {
    console.warn("Could not synthesize siren sweep:", error);
  }
}

// 1. Play single SOS trigger siren (perfect for "Test Alert" button)
export function playSOSTriggerSound(isFirst = false) {
  // Piercing High-Pitch Siren: 1500Hz to 2100Hz over 0.35 seconds
  // Standard volume: 0.35 gain. Loud initial burst: 0.52 gain.
  const volume = isFirst ? 0.52 : 0.35;
  playSirenSweep(1500, 2100, 0.35, volume);
}

// 2. Play single Guardian Alert siren
export function playGuardianAlertReceivedSound() {
  // Urgent Guardian Siren: 680Hz to 980Hz over 0.6 seconds at a safe volume (0.18 gain)
  playSirenSweep(680, 980, 0.6, 0.18);
}

// 3. Start Repeating Alarm loop
export function startSOSAlarmLoop(isGuardian: boolean) {
  // Ensure any existing loop is terminated
  stopSOSAlarmLoop();
  
  if (isGuardian) {
    // Play immediately
    playGuardianAlertReceivedSound();
    // Repeat every 1.5 seconds
    alarmInterval = setInterval(() => {
      playGuardianAlertReceivedSound();
    }, 1500);
  } else {
    // Play a louder initial sound burst on first activation
    playSOSTriggerSound(true);
    // Repeat every 0.8 seconds (synchronized with active visual ripple)
    alarmInterval = setInterval(() => {
      playSOSTriggerSound(false);
    }, 800);
  }
}

// 4. Stop Repeating Alarm loop
export function stopSOSAlarmLoop() {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
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
