/**
 * Fake Call — a preventive exit strategy, not an emergency feature.
 *
 * When a situation feels uncomfortable — before it becomes unsafe — the user
 * can trigger a realistic incoming call (Mom, Dad, Office, …) after a chosen
 * delay. Answering plays a believable one-sided conversation so they can
 * politely leave.
 *
 * Hard rules (by design):
 *   • guardians are NEVER notified,
 *   • SOS is NEVER triggered,
 *   • everything runs locally — ringtone, vibration and the conversation
 *     are generated on-device, no network or accounts involved.
 *
 * The engine is pure (settings + presets + a tiny pending-call state
 * machine); the ringtone/vibration/voice live in fakeCallAudio.ts and the
 * UI in FakeCallOverlay.tsx behind a provider.
 */

// ── Presets ───────────────────────────────────────────────────────────────────

export type FakeCallerId = "mom" | "dad" | "brother" | "office" | "friend" | "custom";

export type FakeCaller = {
  id: FakeCallerId;
  name: string;
  emoji: string;
  /** One-letter avatar fallback. */
  initials: string;
};

export const FAKE_CALLERS: FakeCaller[] = [
  { id: "mom", name: "Mom", emoji: "👩", initials: "M" },
  { id: "dad", name: "Dad", emoji: "👨", initials: "D" },
  { id: "brother", name: "Brother", emoji: "🧑", initials: "B" },
  { id: "office", name: "Office", emoji: "🏢", initials: "O" },
  { id: "friend", name: "Friend", emoji: "🧑‍🤝‍🧑", initials: "F" },
  { id: "custom", name: "Custom", emoji: "✏️", initials: "C" },
];

export type FakeCallDelay = 0 | 10 | 30 | 60 | 120;

export const FAKE_CALL_DELAYS: { value: FakeCallDelay; label: string }[] = [
  { value: 0, label: "Immediately" },
  { value: 10, label: "10 seconds" },
  { value: 30, label: "30 seconds" },
  { value: 60, label: "1 minute" },
  { value: 120, label: "2 minutes" },
];

export type FakeCallAudioId = "waiting" | "almost" | "cab" | "none";

export const FAKE_CALL_AUDIOS: { id: FakeCallAudioId; label: string; line: string }[] = [
  { id: "waiting", label: "We're waiting outside", line: "Hi! Where are you? We're waiting outside." },
  { id: "almost", label: "I'm almost there", line: "I'm almost there. Stay where you are." },
  { id: "cab", label: "Your cab has arrived", line: "Your cab has arrived." },
  { id: "none", label: "No audio (silent)", line: "" },
];

export const fakeCallAudioFor = (id: FakeCallAudioId): string =>
  FAKE_CALL_AUDIOS.find((a) => a.id === id)?.line ?? "";

// ── Settings ─────────────────────────────────────────────────────────────────

export type FakeCallSettings = {
  defaultCallerId: FakeCallerId;
  customCallerName: string;
  defaultDelaySec: FakeCallDelay;
  defaultAudioId: FakeCallAudioId;
  ringtone: boolean;
  vibration: boolean;
};

export const DEFAULT_FAKE_CALL_SETTINGS: FakeCallSettings = {
  defaultCallerId: "mom",
  customCallerName: "",
  defaultDelaySec: 10,
  defaultAudioId: "waiting",
  ringtone: true,
  vibration: true,
};

const SETTINGS_KEY = "sakhi_fake_call_settings";

export const readFakeCallSettings = (): FakeCallSettings => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return { ...DEFAULT_FAKE_CALL_SETTINGS };
    return { ...DEFAULT_FAKE_CALL_SETTINGS, ...(JSON.parse(stored) as Partial<FakeCallSettings>) };
  } catch {
    return { ...DEFAULT_FAKE_CALL_SETTINGS };
  }
};

export const writeFakeCallSettings = (s: FakeCallSettings): void => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // storage unavailable — settings stay in-memory
  }
};

// ── Pending-call state machine ────────────────────────────────────────────────

export type FakeCallStatus = "idle" | "pending" | "ringing" | "active" | "ended";

export type FakeCallRequest = {
  callerId: FakeCallerId;
  callerName: string;
  delaySec: FakeCallDelay;
  audioId: FakeCallAudioId;
};

export type FakeCallState = {
  status: FakeCallStatus;
  /** When the incoming-call screen appears (epoch ms); null while idle. */
  ringAt: number | null;
  request: FakeCallRequest | null;
  /** Epoch ms the user accepted the call (drives the conversation). */
  acceptedAt: number | null;
  endedAt: number | null;
};

export const initialFakeCallState = (): FakeCallState => ({
  status: "idle",
  ringAt: null,
  request: null,
  acceptedAt: null,
  endedAt: null,
});

/** Resolve the display caller for a request (custom names override presets). */
export const fakeCallerFor = (request: FakeCallRequest | null): FakeCaller | null => {
  if (!request) return null;
  if (request.callerId === "custom" && request.callerName.trim()) {
    const name = request.callerName.trim();
    return { id: "custom", name, emoji: "👤", initials: name.slice(0, 1).toUpperCase() };
  }
  return FAKE_CALLERS.find((c) => c.id === request.callerId) ?? null;
};

/**
 * Schedule a fake call. Pure — returns the new state; the provider applies
 * it and its tick loop flips to `ringing` when the delay elapses.
 */
export const scheduleFakeCall = (
  request: FakeCallRequest,
  now: number = Date.now(),
): FakeCallState => ({
  status: "pending",
  ringAt: now + request.delaySec * 1000,
  request,
  acceptedAt: null,
  endedAt: null,
});

/**
 * Advance a pending call to ringing when its time has come. Returns the
 * state unchanged while still pending, plus whether it just flipped.
 */
export const advanceFakeCall = (
  state: FakeCallState,
  now: number = Date.now(),
): { state: FakeCallState; fired: boolean } => {
  if (state.status !== "pending") return { state, fired: false };
  if (state.ringAt != null && now >= state.ringAt) {
    return { state: { ...state, status: "ringing" }, fired: true };
  }
  return { state, fired: false };
};

/** Seconds left until the phone "rings" (for a countdown chip). */
export const fakeCallCountdownSec = (state: FakeCallState, now: number = Date.now()): number | null => {
  if (state.status !== "pending" || state.ringAt == null) return null;
  return Math.max(0, Math.ceil((state.ringAt - now) / 1000));
};
