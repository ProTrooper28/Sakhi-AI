/**
 * AI Safe Check-in — prevention BEFORE the emergency.
 *
 * When a Safety Journey's expected arrival time passes, Sakhi doesn't wait
 * for an SOS — it proactively checks on the user:
 *
 *   ETA expires → grace period (configurable, default 5 min)
 *     → 🛡 AI Safety Check sheet ("Are you safe?")
 *       → "I'm Safe"   → journey continues, acknowledgement remembered
 *       → "Need Help"  → quick emergency actions (user still decides)
 *       → no response  → follow-up nudge (default 2 min)
 *           → still unanswered → GUARDIANS NOTIFIED (never auto-SOS)
 *
 * The engine is pure (no React, no storage side effects except the tiny
 * read/write helpers) so the whole ladder is unit-testable and a real AI
 * service can later replace the time-based triggers without UI changes.
 *
 * State survives page reloads via localStorage and is keyed to the journey,
 * so a mid-journey refresh resumes the ladder exactly where it was.
 */

// ── Settings (user-configurable in Settings → AI Safety Check-ins) ──────────

export type SafeCheckinSettings = {
  /** Master switch for the whole feature. */
  enabled: boolean;
  /** Minutes after a missed ETA before the first check-in appears. */
  graceMinutes: number;
  /** Minutes the user has to respond before the follow-up nudge. */
  responseMinutes: number;
  /** Automatically notify linked guardians when the user stays silent. */
  autoNotifyGuardian: boolean;
};

export const SAFE_CHECKIN_GRACE_OPTIONS = [2, 5, 10, 15] as const;

export const DEFAULT_SAFE_CHECKIN_SETTINGS: SafeCheckinSettings = {
  enabled: true,
  graceMinutes: 5,
  responseMinutes: 2,
  autoNotifyGuardian: true,
};

const SETTINGS_KEY = "sakhi_safe_checkin_settings";

export const readSafeCheckinSettings = (): SafeCheckinSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SAFE_CHECKIN_SETTINGS };
    return { ...DEFAULT_SAFE_CHECKIN_SETTINGS, ...(JSON.parse(raw) as Partial<SafeCheckinSettings>) };
  } catch {
    return { ...DEFAULT_SAFE_CHECKIN_SETTINGS };
  }
};

export const writeSafeCheckinSettings = (s: SafeCheckinSettings): void => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // storage unavailable — settings stay in-memory
  }
};

// ── State machine ─────────────────────────────────────────────────────────────

/**
 * Ladder phases, in escalation order:
 *
 *   monitoring      — journey in progress, ETA not yet reached
 *   grace           — ETA passed, waiting out the configured grace period
 *   awaiting        — AI Safety Check shown, waiting for the user
 *   second-awaiting — no response → follow-up nudge shown
 *   escalated       — guardians notified (final, only fired once)
 *   resolved        — user confirmed "I'm Safe" (acknowledged & remembered)
 */
export type SafeCheckinPhase =
  | "monitoring"
  | "grace"
  | "awaiting"
  | "second-awaiting"
  | "escalated"
  | "resolved";

export type SafeCheckinState = {
  /** Journey this ladder belongs to (null = idle / not armed). */
  journeyId: string | null;
  phase: SafeCheckinPhase;
  /** Epoch ms when the expected arrival time passed (= the ETA itself). */
  etaMissedAt: number | null;
  /** Epoch ms the AI Safety Check sheet first appeared. */
  checkinShownAt: number | null;
  /** Epoch ms the follow-up nudge appeared. */
  nudgeShownAt: number | null;
  /** Epoch ms the user confirmed safety — the remembered acknowledgement. */
  acknowledgedAt: number | null;
  /** Epoch ms guardians were notified (latched so it never repeats). */
  escalatedAt: number | null;
};

export const initialCheckinState = (): SafeCheckinState => ({
  journeyId: null,
  phase: "monitoring",
  etaMissedAt: null,
  checkinShownAt: null,
  nudgeShownAt: null,
  acknowledgedAt: null,
  escalatedAt: null,
});

const STATE_KEY = "sakhi_safe_checkin_state";

export const readSafeCheckinState = (): SafeCheckinState => {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return initialCheckinState();
    return { ...initialCheckinState(), ...(JSON.parse(raw) as Partial<SafeCheckinState>) };
  } catch {
    return initialCheckinState();
  }
};

export const writeSafeCheckinState = (s: SafeCheckinState): void => {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
};

export const clearSafeCheckinState = (): void => {
  try {
    localStorage.removeItem(STATE_KEY);
  } catch {
    // ignore
  }
};

/**
 * Arm the ladder for a journey. `etaMs` is the journey's expected arrival —
 * the moment it passes, the grace countdown begins.
 */
export const beginCheckinMonitoring = (etaMs: number | null, journeyId: string): SafeCheckinState => {
  const state: SafeCheckinState = {
    ...initialCheckinState(),
    journeyId,
    etaMissedAt: etaMs,
  };
  writeSafeCheckinState(state);
  return state;
};

/** Stop monitoring (journey ended / completed / cancelled). */
export const resetCheckinMonitoring = (): SafeCheckinState => {
  clearSafeCheckinState();
  return initialCheckinState();
};

/** Events the engine emits — the UI turns these into sheets, toasts, syncs. */
export type SafeCheckinEvent =
  | { type: "show-checkin" }
  | { type: "show-nudge" }
  | { type: "notify-guardian" }
  | { type: "resolved-safe" };

export type AdvanceCheckinInput = {
  /** Epoch ms "now" (injectable for tests). Defaults to Date.now(). */
  now?: number;
  settings: SafeCheckinSettings;
  /** Journey arrived at the destination — ladder is done, no check-in. */
  arrived?: boolean;
  /** Journey completed/cancelled — monitoring stops cleanly. */
  journeyEnded?: boolean;
  /** User pressed "I'm Safe" — remembered, stops the escalation. */
  acknowledged?: boolean;
  /** User dismissed the sheet — timers keep running (ignoring = no answer). */
  dismissed?: boolean;
};

const MIN = 60_000;

const sameCheckinState = (a: SafeCheckinState, b: SafeCheckinState): boolean =>
  a.journeyId === b.journeyId &&
  a.phase === b.phase &&
  a.etaMissedAt === b.etaMissedAt &&
  a.checkinShownAt === b.checkinShownAt &&
  a.nudgeShownAt === b.nudgeShownAt &&
  a.acknowledgedAt === b.acknowledgedAt &&
  a.escalatedAt === b.escalatedAt;

/** One transition of the ladder (single step). */
const stepCheckin = (
  state: SafeCheckinState,
  input: AdvanceCheckinInput,
  now: number,
): { state: SafeCheckinState; events: SafeCheckinEvent[] } => {
  // Journey over (arrived or ended) — the ladder is simply done.
  if (input.arrived || input.journeyEnded) {
    return { state: initialCheckinState(), events: [] };
  }

  // "I'm Safe" — remembered; no further escalation for this journey.
  if (input.acknowledged && state.phase !== "resolved") {
    return {
      state: { ...state, phase: "resolved", acknowledgedAt: now },
      events: [{ type: "resolved-safe" }],
    };
  }

  // Dismiss only hides the sheet — the timers keep counting.
  if (input.dismissed) return { state, events: [] };

  // Terminal / unarmed states never advance.
  if (!state.etaMissedAt || state.phase === "resolved" || state.phase === "escalated") {
    return { state, events: [] };
  }

  if (state.phase === "monitoring") {
    if (now >= state.etaMissedAt) {
      return { state: { ...state, phase: "grace" }, events: [] };
    }
    return { state, events: [] };
  }

  if (state.phase === "grace") {
    const graceEndsAt = state.etaMissedAt + input.settings.graceMinutes * MIN;
    if (now >= graceEndsAt) {
      return {
        state: { ...state, phase: "awaiting", checkinShownAt: now },
        events: [{ type: "show-checkin" }],
      };
    }
    return { state, events: [] };
  }

  if (state.phase === "awaiting") {
    const responseEndsAt = (state.checkinShownAt ?? now) + input.settings.responseMinutes * MIN;
    if (now >= responseEndsAt) {
      return {
        state: { ...state, phase: "second-awaiting", nudgeShownAt: now },
        events: [{ type: "show-nudge" }],
      };
    }
    return { state, events: [] };
  }

  // second-awaiting → escalate (guardians only, never auto-SOS).
  const finalEndsAt = (state.nudgeShownAt ?? now) + input.settings.responseMinutes * MIN;
  if (now >= finalEndsAt) {
    return {
      state: { ...state, phase: "escalated", escalatedAt: now },
      events: input.settings.autoNotifyGuardian ? [{ type: "notify-guardian" }] : [],
    };
  }
  return { state, events: [] };
};

/**
 * Advance the ladder to `now` and return the settled state plus every event
 * that fired along the way. Cascades through as many transitions as needed
 * (e.g. a phone sleep that skipped several phases) so callers can simply
 * call it on every tick. Escalation fires exactly once (latched by phase).
 */
export const advanceCheckin = (
  state: SafeCheckinState,
  input: AdvanceCheckinInput,
): { state: SafeCheckinState; events: SafeCheckinEvent[] } => {
  const now = input.now ?? Date.now();
  let current = state;
  const events: SafeCheckinEvent[] = [];
  // Bounded loop: at most a handful of phases exist; guards against any
  // unexpected oscillation.
  for (let i = 0; i < 8; i++) {
    const next = stepCheckin(current, input, now);
    events.push(...next.events);
    if (sameCheckinState(current, next.state)) return { state: current, events };
    current = next.state;
  }
  return { state: current, events };
};

// ── Presentation helpers (shared by the journey page, guardian dashboard
//    and the AI Companion context) ────────────────────────────────────────────

/** Short status line for the journey screen's overdue indicator. */
export const checkinStatusLine = (state: SafeCheckinState): string | null => {
  switch (state.phase) {
    case "grace":
      return "Running behind — Sakhi is watching over you";
    case "awaiting":
      return "AI Safety Check waiting for your response";
    case "second-awaiting":
      return "You haven't responded — Sakhi is worried";
    case "escalated":
      return "Guardians have been alerted";
    default:
      return null;
  }
};

/** Compact journey/check-in summary for the AI Companion's live context. */
export const checkinContextSummary = (
  state: SafeCheckinState,
  now: number = Date.now(),
): string | null => {
  switch (state.phase) {
    case "monitoring":
      return null;
    case "grace": {
      const mins = state.etaMissedAt ? Math.max(1, Math.round((now - state.etaMissedAt) / MIN)) : 0;
      return `ETA passed ${mins} min ago — grace period running, check-in coming up`;
    }
    case "awaiting":
      return "AI Safety Check sent — user has not responded yet";
    case "second-awaiting":
      return "AI Safety Check sent — user still has not responded (second notice)";
    case "escalated":
      return "User never responded after the missed ETA — guardians were alerted";
    case "resolved":
      return "User confirmed they are safe after the AI Safety Check";
    default:
      return null;
  }
};

// ── Guardian-side timeline (Active Journeys card + activity feed) ────────────

/** Ordered AI Safe Check-in timeline steps shown on the guardian dashboard. */
export const CHECKIN_TIMELINE_STEPS = [
  "started",
  "eta-missed",
  "check-sent",
  "no-response",
  "guardian-alerted",
] as const;
export type CheckinTimelineStep = (typeof CHECKIN_TIMELINE_STEPS)[number];

export const CHECKIN_STEP_LABELS: Record<CheckinTimelineStep, string> = {
  started: "Journey Started",
  "eta-missed": "ETA Missed",
  "check-sent": "AI Safety Check Sent",
  "no-response": "No Response",
  "guardian-alerted": "Guardian Alerted",
};

/** Which timeline steps a check-in phase has already reached. */
export const checkinTimelineSteps = (
  phase: SafeCheckinPhase,
  acknowledged: boolean,
): CheckinTimelineStep[] => {
  if (phase === "monitoring") return acknowledged ? ["started"] : [];
  if (phase === "grace") return ["started", "eta-missed"];
  if (phase === "awaiting") return ["started", "eta-missed", "check-sent"];
  if (phase === "second-awaiting") return ["started", "eta-missed", "check-sent", "no-response"];
  if (phase === "escalated") return [...CHECKIN_TIMELINE_STEPS];
  // resolved — reached the check but the user answered; no escalation.
  if (acknowledged) return ["started", "eta-missed", "check-sent"];
  return acknowledged ? ["started"] : [];
};

/**
 * Parse the `safeCheckin` payload the user app syncs inside
 * `active_journeys.journey_data` into guardian-visible timeline steps.
 * Returns [] for absent/foreign payloads.
 */
export const checkinStepsFromJourneyData = (data: unknown): CheckinTimelineStep[] => {
  try {
    if (!data || typeof data !== "object") return [];
    const sc = (data as { safeCheckin?: { phase?: unknown; acknowledgedAt?: unknown } }).safeCheckin;
    if (!sc || typeof sc.phase !== "string") return [];
    const phase = sc.phase as SafeCheckinPhase;
    if (!["monitoring", "grace", "awaiting", "second-awaiting", "escalated", "resolved"].includes(phase)) {
      return [];
    }
    return checkinTimelineSteps(phase, typeof sc.acknowledgedAt === "number" && sc.acknowledgedAt > 0);
  } catch {
    return [];
  }
};

/**
 * Marker prefixes the user app writes into `safety_events.location_label`
 * for AI Safe Check-in events. The guardian dashboard maps them to distinct
 * timeline items (instead of the generic "checked in safely").
 */
export const CHECKIN_EVENT_MARKERS = {
  journeyStart: "Journey started:",
  etaMissed: "ETA missed:",
  checkSent: "AI Safety Check sent:",
  noResponse: "No response to AI Safety Check:",
  guardianAlert: "AI Safety Alert:",
} as const;

export type JourneyEventKind = "journey-started" | "eta-missed" | "check-sent" | "no-response" | "guardian-alerted";

/** Map a safety_events label to a guardian timeline item, or null. */
export const journeyEventFromLabel = (
  label: string | null | undefined,
): { kind: JourneyEventKind; title: string } | null => {
  if (!label) return null;
  if (label.startsWith(CHECKIN_EVENT_MARKERS.journeyStart)) {
    return { kind: "journey-started", title: "started a Safety Journey" };
  }
  if (label.startsWith(CHECKIN_EVENT_MARKERS.etaMissed)) {
    return { kind: "eta-missed", title: "missed the expected arrival time" };
  }
  if (label.startsWith(CHECKIN_EVENT_MARKERS.checkSent)) {
    return { kind: "check-sent", title: "received an AI Safety Check" };
  }
  if (label.startsWith(CHECKIN_EVENT_MARKERS.noResponse)) {
    return { kind: "no-response", title: "has not responded to the AI Safety Check" };
  }
  if (label.startsWith(CHECKIN_EVENT_MARKERS.guardianAlert)) {
    return { kind: "guardian-alerted", title: "was alerted — no response after the missed ETA" };
  }
  return null;
};
