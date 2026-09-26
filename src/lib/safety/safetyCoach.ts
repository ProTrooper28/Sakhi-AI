/**
 * AI Safety Coach — proactive, context-aware guidance BEFORE an emergency.
 *
 * The AI Companion answers questions; the coach makes it a personal safety
 * assistant: it reads the live context (time of day, active journey, battery,
 * guardian link, voice/shake SOS arming) and produces
 *
 *   • a coach reply + quick actions for travel-scenario messages
 *     ("I'm travelling alone", "I'm travelling at night", "I'm going to meet
 *     someone", low battery, …),
 *   • one non-intrusive rotating safety tip (dismissible),
 *   • a one-line situation hint injected into the LLM system prompt so
 *     streamed replies use the context naturally.
 *
 * Emergency phrases are intentionally NOT handled here — they already have
 * their own instant-SOS pipeline (ACTIVE_DANGER_RE / EMERGENCY_RE), and the
 * coach never overrides it. Deterministic (no LLM) so coaching works offline.
 */

import type { ChatUserContext } from "@/lib/chatApi";

// ── Settings ─────────────────────────────────────────────────────────────────

export type CoachFrequency = "low" | "medium" | "high";

export type SafetyCoachSettings = {
  enabled: boolean;
  frequency: CoachFrequency;
};

export const DEFAULT_COACH_SETTINGS: SafetyCoachSettings = {
  enabled: true,
  frequency: "medium",
};

const SETTINGS_KEY = "sakhi_coach_settings";

export const readCoachSettings = (): SafetyCoachSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_COACH_SETTINGS };
    return { ...DEFAULT_COACH_SETTINGS, ...(JSON.parse(raw) as Partial<SafetyCoachSettings>) };
  } catch {
    return { ...DEFAULT_COACH_SETTINGS };
  }
};

export const writeCoachSettings = (s: SafetyCoachSettings): void => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // storage unavailable — settings stay in-memory
  }
};

/**
 * How often the rotating safety tip changes (minutes), per frequency.
 * "off"/disabled tips are handled by the `enabled` flag.
 */
export const COACH_TIP_INTERVAL_MIN: Record<CoachFrequency, number> = {
  low: 30,
  medium: 12,
  high: 5,
};

// ── Rotating safety tips (one at a time, dismissible) ────────────────────────

export const COACH_TIPS: string[] = [
  "💡 Carry a charged phone.",
  "💡 Share your route before travelling.",
  "💡 Prefer well-lit roads.",
  "💡 Avoid isolated shortcuts at night.",
  "💡 Keep emergency contacts updated.",
  "💡 Trust your instincts — leave early if something feels off.",
  "💡 Keep your phone reachable, not buried in a bag.",
  "💡 Check in with a guardian when you arrive.",
];

/** Deterministic pick so every surface shows the same tip for a slot. */
export const coachTipForSlot = (slot: number): string =>
  COACH_TIPS[((slot % COACH_TIPS.length) + COACH_TIPS.length) % COACH_TIPS.length];

// ── Scenario coaching (travel-style messages → advice + quick actions) ──────

export type CoachActionId =
  | "start-journey"
  | "notify-guardian"
  | "share-location"
  | "enable-voice"
  | "enable-shake"
  | "open-guardian"
  | "fake-call"
  | "call-112"
  | "sos";

export type CoachScenario = {
  id: string;
  reply: string;
  actions: { label: string; action: CoachActionId }[];
};

/** Scenario matchers — first match wins. `ctx` allows context conditions. */
const SCENARIOS: { id: string; test: (t: string, ctx: ChatUserContext) => boolean; coach: (ctx: ChatUserContext) => CoachScenario }[] = [
  {
    id: "meeting-someone",
    test: (t) => /\b(meet(ing)? (someone|a friend|a person|him|her|them)|first date|date (tonight|today)|meeting up|going to meet)\b/i.test(t),
    coach: () => ({
      id: "meeting-someone",
      reply: "For your safety, consider sharing your live journey with a trusted contact — and trust your instincts at any point.",
      actions: [
        { label: "🛡 Share Journey", action: "start-journey" },
        { label: "👥 Notify Guardian", action: "notify-guardian" },
        { label: "📞 Fake Call", action: "fake-call" },
      ],
    }),
  },
  {
    id: "travelling-alone",
    test: (t) => /\b(travell?ing alone|going alone|alone at night|walking alone|by myself)\b/i.test(t),
    coach: () => ({
      id: "travelling-alone",
      reply: "I recommend sharing your Safety Journey with a trusted guardian — I'll monitor the route and flag anything unusual.",
      actions: [
        { label: "🛡 Start Safety Journey", action: "start-journey" },
        { label: "👥 Notify Guardian", action: "notify-guardian" },
      ],
    }),
  },
  {
    id: "travelling-night",
    test: (t) => /\b(travell?ing at night|after dark|late night|night travel|late (?:tonight|right now)|walking (?:home )?(?:at )?night)\b/i.test(t),
    coach: () => ({
      id: "travelling-night",
      reply: "You're travelling after dark. Stay on well-lit roads and keep your emergency features enabled.",
      actions: [
        { label: "🎤 Enable Voice SOS", action: "enable-voice" },
        { label: "📍 Share Live Location", action: "share-location" },
      ],
    }),
  },
  {
    id: "cab-auto",
    test: (t) => /\b(taking a (cab|auto|taxi|uber|ola|rapido)|booked a (cab|auto)|cab (is|has) (here|arrived)|riding (a )?(cab|auto))\b/i.test(t),
    coach: () => ({
      id: "cab-auto",
      reply: "Share your ride details with a guardian and start a monitored journey — I'll flag any route deviation instantly.",
      actions: [
        { label: "🛡 Start Safety Journey", action: "start-journey" },
        { label: "👥 Notify Guardian", action: "notify-guardian" },
      ],
    }),
  },
];

/**
 * Coach a travel-style message. Returns null for messages that aren't coach
 * scenarios (normal chat, greetings, or emergencies — those keep their own
 * pipeline). Never fires for ACTIVE-DANGER phrases (checked by the caller).
 */
export const coachScenarioFor = (text: string, ctx: ChatUserContext): CoachScenario | null => {
  const lower = text.toLowerCase();
  for (const s of SCENARIOS) {
    if (s.test(lower, ctx)) return s.coach(ctx);
  }
  return null;
};

// ── Context suggestions (no message needed — pure context) ───────────────────

export type CoachSuggestion = {
  id: string;
  text: string;
  actions: { label: string; action: CoachActionId }[];
};

/**
 * The single most useful coaching suggestion for the current context, or
 * null when everything looks healthy. Priority order: battery → journey
 * risk (overdue check-in) → emergency features disabled → guardian missing.
 */
export const coachContextSuggestion = (ctx: {
  batteryLevel?: number | null;
  batteryCharging?: boolean;
  journeyStatus?: ChatUserContext["journeyStatus"];
  journeyOverdueMin?: number;
  safeCheckinAcknowledged?: boolean;
  voiceEnabled?: boolean;
  shakeEnabled?: boolean;
  guardianLinked?: boolean;
}): CoachSuggestion | null => {
  // Battery below 15% wins — tracking is about to stop.
  if (ctx.batteryLevel != null && ctx.batteryLevel < 15 && !ctx.batteryCharging) {
    return {
      id: "battery-low",
      text: "Your battery is running low. Live tracking may stop soon.",
      actions: [
        { label: "📍 Share Current Location", action: "share-location" },
        { label: "👥 Notify Guardian", action: "notify-guardian" },
      ],
    };
  }
  // Journey overdue and unacknowledged — push for a response.
  if (ctx.journeyStatus === "active" && ctx.journeyOverdueMin && ctx.journeyOverdueMin >= 5 && !ctx.safeCheckinAcknowledged) {
    return {
      id: "journey-overdue",
      text: `Your Safety Journey is ${ctx.journeyOverdueMin} min past its ETA and we haven't heard from you.`,
      actions: [
        { label: "👥 Notify Guardian", action: "notify-guardian" },
        { label: "📍 Share Live Location", action: "share-location" },
      ],
    };
  }
  // No silent triggers armed at all during a journey.
  if (ctx.journeyStatus === "active" && !ctx.voiceEnabled && !ctx.shakeEnabled) {
    return {
      id: "triggers-off",
      text: "Your journey is active but Voice and Shake SOS are both off — arm one so help is hands-free.",
      actions: [
        { label: "🎤 Enable Voice SOS", action: "enable-voice" },
        { label: "📳 Enable Shake SOS", action: "enable-shake" },
      ],
    };
  }
  // No guardian linked — the biggest gap in an emergency.
  if (!ctx.guardianLinked) {
    return {
      id: "no-guardian",
      text: "No guardian is linked yet — linking one means help always knows where you are.",
      actions: [{ label: "🤝 Open Guardian Dashboard", action: "open-guardian" }],
    };
  }
  return null;
};

/**
 * One-line situation hint for the LLM system prompt (coach mode). Empty when
 * everything is healthy — the AI then just answers normally.
 */
export const coachHintForContext = (ctx: ChatUserContext): string => {
  const hints: string[] = [];
  const hour = new Date().getHours();
  if (hour >= 21 || hour < 5) hints.push("it is late night — favour well-lit, populated routes");
  if (ctx.journeyStatus === "active" && ctx.journeyDestination) {
    hints.push(`an active Safety Journey is running to ${ctx.journeyDestination}`);
  }
  if (ctx.batteryLevel != null && ctx.batteryLevel < 15 && !ctx.batteryCharging) {
    hints.push(`battery is critically low at ${ctx.batteryLevel}%`);
  }
  if (!ctx.voiceEnabled && !ctx.shakeEnabled) hints.push("no silent SOS triggers are armed");
  if (!ctx.guardianLinked) hints.push("no guardian is linked (demo mode)");
  return hints.join("; ");
};

/** Numbered scenario examples used in the README-style docs and tests. */
export const COACH_SCENARIO_IDS = SCENARIOS.map((s) => s.id);
