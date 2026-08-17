/**
 * AI Recommendations + Insights — turns safety conversations into concrete
 * actions, and GPS/journey state into short, reassuring insights.
 *
 * The assistant page uses `analyzeSafetyIntent` + `recommendActions`; the
 * journey page and home page use `generateInsights`. No LLM is called — the
 * engine is deterministic intent detection so it always works offline and
 * never hallucinates. A real model can be swapped in behind the same API.
 */

export type SafetyIntent =
  | "following"
  | "unsafe-area"
  | "cab-route"
  | "walking-alone"
  | "panic"
  | "recovery"
  | "report"
  | "journey"
  | "greeting"
  | "unknown";

export type SafetyAction =
  | { id: "start-journey"; label: string }
  | { id: "share-location"; label: string }
  | { id: "call-guardian"; label: string }
  | { id: "prepare-sos"; label: string }
  | { id: "nearby-safe"; label: string }
  | { id: "file-report"; label: string }
  | { id: "review-evidence"; label: string }
  | { id: "helplines"; label: string };

export type Recommendation = {
  intent: SafetyIntent;
  reply: string;
  actions: SafetyAction[];
  /** When true the app should switch to emergency styling. */
  escalate: boolean;
};

// ── Intent detection (keyword superset of the old assistant classifier) ──────
const KEYWORDS: Record<SafetyIntent, string[]> = {
  following: ["follow", "following", "stalk", "stalker", "pecha", "पीछा", "someone behind", "watching me"],
  "unsafe-area": ["unsafe", "dark", "empty street", "lonely road", "bad area", "dangerous area", "isolation", "asurkshit", "असुरक्षित"],
  "cab-route": ["cab", "auto", "driver", "different route", "wrong route", "took another", "not the route", "going somewhere else"],
  "walking-alone": ["walking home", "walk home", "alone", "by myself", "night walk", "akeli", "अकेली"],
  panic: ["help", "emergency", "bachao", "बचाओ", "back off", "go away", "scared", "terrified", "danger", "threat", "chasing", "run"],
  recovery: ["safe now", "okay now", "i'm fine", "i am fine", "false alarm", "theek", "safe", "secured", "calm down"],
  report: ["report", "harassment", "file", "incident", "police", "complaint", "fir"],
  journey: ["journey", "trip", "travelling", "traveling", "going to", "heading to", "start journey", "track my"],
  greeting: ["hi", "hello", "hey", "namaste", "didi", "sister", "sakhi", "start", "good morning"],
  unknown: [],
};

export const analyzeSafetyIntent = (text: string): SafetyIntent => {
  const lower = text.toLowerCase().trim();
  if (!lower) return "unknown";
  // Panic words win over everything (safety first).
  for (const intent of ["panic", "following", "cab-route", "unsafe-area", "walking-alone", "recovery", "report", "journey", "greeting"] as SafetyIntent[]) {
    if (KEYWORDS[intent].some((w) => lower.includes(w))) return intent;
  }
  return "unknown";
};

// ── Action generation ─────────────────────────────────────────────────────────
export const recommendActions = (intent: SafetyIntent): SafetyAction[] => {
  switch (intent) {
    case "panic":
      return [
        { id: "prepare-sos", label: "Trigger SOS" },
        { id: "call-guardian", label: "Call Guardian" },
        { id: "share-location", label: "Share Live Location" },
      ];
    case "following":
      return [
        { id: "start-journey", label: "Start Safety Journey" },
        { id: "share-location", label: "Share Live Location" },
        { id: "call-guardian", label: "Call Guardian" },
        { id: "nearby-safe", label: "Find Safe Place Nearby" },
        { id: "prepare-sos", label: "Prepare SOS" },
      ];
    case "cab-route":
      return [
        { id: "start-journey", label: "Start Safety Journey" },
        { id: "share-location", label: "Share Live Location" },
        { id: "call-guardian", label: "Call Guardian" },
        { id: "prepare-sos", label: "Prepare SOS" },
      ];
    case "unsafe-area":
      return [
        { id: "nearby-safe", label: "Find Safe Place Nearby" },
        { id: "share-location", label: "Share Live Location" },
        { id: "start-journey", label: "Start Safety Journey" },
      ];
    case "walking-alone":
      return [
        { id: "start-journey", label: "Start Safety Journey" },
        { id: "share-location", label: "Share Live Location" },
        { id: "call-guardian", label: "Call Guardian" },
      ];
    case "recovery":
      return [
        { id: "review-evidence", label: "Review Evidence" },
        { id: "file-report", label: "Prepare Report" },
        { id: "helplines", label: "Emergency Helplines" },
      ];
    case "report":
      return [
        { id: "file-report", label: "File Anonymous Report" },
        { id: "review-evidence", label: "Review Evidence" },
      ];
    case "journey":
      return [{ id: "start-journey", label: "Start Safety Journey" }];
    default:
      return [
        { id: "start-journey", label: "Start Safety Journey" },
        { id: "share-location", label: "Share Live Location" },
        { id: "helplines", label: "Emergency Helplines" },
      ];
  }
};

const REPLIES: Record<SafetyIntent, string[]> = {
  panic: [
    "Stay calm — I'm right here with you. Go toward a crowded, well-lit place now. Your SOS is one tap away and your guardian is being kept ready.",
    "You're not alone. Move toward people or a shop and keep your phone visible. I've prepared your safety actions below.",
  ],
  following: [
    "I'm watching your route carefully. Cross the street or step into a shop if you can — don't walk to an isolated spot. Your guardian can start tracking you right now.",
    "Trust your instinct. Let's start a Safety Journey so I can monitor your route and your guardian can follow live.",
  ],
  "cab-route": [
    "That's a real warning sign. Share your live location with your guardian now, and I'll start monitoring your journey so any wrong turn alerts us.",
    "If the driver isn't following the expected route, stay alert. Start a journey with me and I'll flag deviations immediately.",
  ],
  "unsafe-area": [
    "Let's find a safe, populated place near you. I'll keep your location shared so someone always knows where you are.",
    "Avoid dark or empty stretches. Let's pick a safer path together — your location is being watched.",
  ],
  "walking-alone": [
    "Walking alone at night deserves a Safety Journey. I'll monitor your path, your pace, and your ETA — and your guardian can watch in real time.",
    "Let's make sure someone knows your route. Start a journey and share your live location with your guardian.",
  ],
  recovery: [
    "I'm so relieved you're safe. Let's close the loop properly — review any evidence and decide if you want to file a report.",
    "Good to hear you're okay. I've stood down the emergency mode, but the safety tools stay one tap away.",
  ],
  report: [
    "You can file this anonymously — no one will know it was you. Let's capture the details and any evidence together.",
    "Let's prepare your report now. You can attach evidence from your locker and submit anonymously.",
  ],
  journey: [
    "Let's get you on a Safety Journey. Pick your destination and mode, and I'll monitor the whole trip.",
    "A Safety Journey keeps your guardian informed and flags any deviation. Where are you heading?",
  ],
  greeting: [
    "Namaste! I'm watching your location and ready to help. Tell me where you're going, or if anything feels off.",
    "Hey! Sakhi here. Are you walking somewhere, taking a cab, or heading home? I'll keep an eye on the whole path.",
  ],
  unknown: [
    "I'm listening closely. If you're worried about your surroundings, tell me — or start a Safety Journey and I'll watch over the route.",
    "Tell me more — and remember, you can start a Safety Journey, share your live location, or call your guardian any time.",
  ],
};

export const recommendForText = (text: string): Recommendation => {
  const intent = analyzeSafetyIntent(text);
  const pool = REPLIES[intent] ?? REPLIES.unknown;
  return {
    intent,
    reply: pool[Math.floor(Math.random() * pool.length)]!,
    actions: recommendActions(intent),
    escalate: intent === "panic" || intent === "following" || intent === "cab-route",
  };
};

// ── AI Safety Insights (short, relevant, reassuring) ─────────────────────────
export type InsightContext = {
  journeyActive?: boolean;
  progressPct?: number;
  remainingM?: number;
  etaMs?: number | null;
  gpsOk?: boolean;
  guardianTracking?: boolean;
  deviated?: boolean;
  inactiveSec?: number;
  battery?: number | null;
};

const minutesUntil = (etaMs: number | null): number | null =>
  etaMs ? Math.max(0, Math.round((etaMs - Date.now()) / 60000)) : null;

/**
 * Generate 1–3 short insights from the current context. Always reassuring,
 * never alarming — the deviation prompt lives in the journey page itself.
 */
export const generateInsights = (ctx: InsightContext): string[] => {
  const out: string[] = [];

  if (ctx.journeyActive) {
    const mins = minutesUntil(ctx.etaMs);
    if (mins != null && ctx.remainingM != null) {
      out.push(
        mins <= 1
          ? "You're almost there — under a minute to go."
          : `You're ${mins} min from your destination.`,
      );
    } else if (ctx.progressPct != null) {
      out.push(`You're ${Math.round(ctx.progressPct * 100)}% through your journey.`);
    }
    if (ctx.guardianTracking) out.push("Guardian is actively tracking your journey.");
  } else {
    out.push("Guardian can see your live location whenever sharing is on.");
  }

  if (ctx.gpsOk) {
    out.push("Location updates are working normally.");
  } else {
    out.push("Location updates are paused — sharing will resume when GPS is available.");
  }

  if (ctx.deviated) {
    out.push("We noticed a route change. If it wasn't intentional, tell me.");
  } else if (ctx.inactiveSec != null && ctx.inactiveSec > 20) {
    out.push("You've stopped for a moment. Everything okay?");
  }

  if (ctx.battery != null && ctx.battery < 20) {
    out.push(`Your battery is at ${ctx.battery}% — keep your phone reachable.`);
  }

  return out.slice(0, 3);
};
