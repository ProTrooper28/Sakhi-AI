/**
 * Battery-Aware Safety — never lose communication mid-journey.
 *
 * Live tracking is only as good as the phone's battery. While a Safety
 * Journey is active, the device battery is watched and the user (and
 * guardian) are warned BEFORE tracking dies:
 *
 *   30%  information   — gentle nudge, no interruption
 *   20%  warning       — toast: charge to keep live tracking alive
 *   10%  critical      — sheet: share location / notify guardian / charging
 *                        (level follows the user's threshold setting)
 *    5%  emergency     — last location + status pushed to the guardian
 *
 * Battery is only monitored while a journey is active — never otherwise —
 * and nothing here triggers SOS automatically. The engine is pure so the
 * whole ladder is unit-testable; `useDeviceBattery` supplies the readings.
 */

// ── Settings (Settings → Battery Safety) ─────────────────────────────────────

export type BatterySafetySettings = {
  /** Master switch for all battery warnings. */
  enabled: boolean;
  /** Automatically push the guardian alert at/below the threshold. */
  autoNotifyGuardian: boolean;
  /** Battery % at which critical mode (sheet + guardian alert) starts. */
  thresholdPercent: 10 | 15 | 20;
};

export const BATTERY_THRESHOLD_OPTIONS = [10, 15, 20] as const;

export const DEFAULT_BATTERY_SETTINGS: BatterySafetySettings = {
  enabled: true,
  autoNotifyGuardian: true,
  thresholdPercent: 10,
};

const SETTINGS_KEY = "sakhi_battery_settings";

export const readBatterySettings = (): BatterySafetySettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_BATTERY_SETTINGS };
    return { ...DEFAULT_BATTERY_SETTINGS, ...(JSON.parse(raw) as Partial<BatterySafetySettings>) };
  } catch {
    return { ...DEFAULT_BATTERY_SETTINGS };
  }
};

export const writeBatterySettings = (s: BatterySafetySettings): void => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // storage unavailable — settings stay in-memory
  }
};

// ── Levels, colours and presentation ─────────────────────────────────────────

export type BatteryLevel = "info" | "warning" | "critical" | "emergency";

/** Fixed alert bands (informational / warning / emergency). */
export const BATTERY_INFO_PCT = 30;
export const BATTERY_WARN_PCT = 20;
export const BATTERY_EMERGENCY_PCT = 5;

/**
 * Critical band start — the user's threshold setting, clamped to sane
 * bounds (never below 10 so guardian alerts always precede an emergency).
 */
export const batteryCriticalPct = (thresholdPercent: number): number =>
  Math.min(20, Math.max(10, thresholdPercent));

/** Classify a battery percentage, or null when there's nothing to say. */
export const batteryLevelFor = (pct: number | null | undefined, thresholdPercent: number): BatteryLevel | null => {
  if (pct == null || !Number.isFinite(pct)) return null;
  if (pct <= BATTERY_EMERGENCY_PCT) return "emergency";
  if (pct <= batteryCriticalPct(thresholdPercent)) return "critical";
  if (pct <= BATTERY_WARN_PCT) return "warning";
  if (pct <= BATTERY_INFO_PCT) return "info";
  return null;
};

const BATTERY_COLORS: Record<BatteryLevel, string> = {
  info: "#B7770D", // soft amber text on cream
  warning: "#B7770D", // yellow band
  critical: "#D9730D", // orange
  emergency: "#B8324A", // Sakhi red
};

const BATTERY_BGS: Record<BatteryLevel, string> = {
  info: "rgba(243,156,18,0.12)",
  warning: "rgba(243,156,18,0.14)",
  critical: "rgba(217,115,13,0.12)",
  emergency: "rgba(212,69,92,0.12)",
};

export const batteryColor = (level: BatteryLevel): string => BATTERY_COLORS[level];
export const batteryBg = (level: BatteryLevel): string => BATTERY_BGS[level];

/** Guardian dashboard gauge: 🟢 healthy, 🟡 fair, 🟠 low, 🔴 critical (≤10%). */
export const batteryGauge = (
  pct: number | null | undefined,
): { emoji: string; color: string; bg: string } => {
  if (pct == null || !Number.isFinite(pct)) return { emoji: "⚪", color: "#9E7A6A", bg: "rgba(158,122,106,0.1)" };
  if (pct > 50) return { emoji: "🟢", color: "#2E7D56", bg: "rgba(61,153,112,0.1)" };
  if (pct > BATTERY_WARN_PCT) return { emoji: "🟡", color: "#B7770D", bg: "rgba(243,156,18,0.12)" };
  if (pct > 10) return { emoji: "🟠", color: "#D9730D", bg: "rgba(217,115,13,0.12)" };
  return { emoji: "🔴", color: "#B8324A", bg: "rgba(212,69,92,0.12)" };
};

// ── Per-journey alert state (each level fires once per journey) ──────────────

export type BatteryAlertEvent =
  | { type: "warning"; level: "warning" }
  | { type: "critical"; level: "critical" }
  | { type: "emergency"; level: "emergency" };

export type BatteryAlertState = {
  journeyId: string | null;
  /** Levels already surfaced to the user for this journey. */
  fired: BatteryLevel[];
  /** Battery % captured with the last emergency push (for the sheet copy). */
  lastLevelPct: number | null;
};

export const initialBatteryAlertState = (): BatteryAlertState => ({
  journeyId: null,
  fired: [],
  lastLevelPct: null,
});

const ALERTS_KEY = "sakhi_battery_alerts";

export const readBatteryAlertState = (): BatteryAlertState => {
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    if (!raw) return initialBatteryAlertState();
    const parsed = JSON.parse(raw) as Partial<BatteryAlertState>;
    return {
      journeyId: typeof parsed.journeyId === "string" ? parsed.journeyId : null,
      fired: Array.isArray(parsed.fired) ? parsed.fired.filter((f): f is BatteryLevel => typeof f === "string") : [],
      lastLevelPct: typeof parsed.lastLevelPct === "number" ? parsed.lastLevelPct : null,
    };
  } catch {
    return initialBatteryAlertState();
  }
};

export const writeBatteryAlertState = (s: BatteryAlertState): void => {
  try {
    localStorage.setItem(ALERTS_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
};

export const clearBatteryAlertState = (): void => {
  try {
    localStorage.removeItem(ALERTS_KEY);
  } catch {
    // ignore
  }
};

export type AdvanceBatteryInput = {
  journeyId: string;
  /** Latest battery percentage (null = unknown — never fires). */
  level: number | null;
  settings: BatterySafetySettings;
};

/**
 * Evaluate the current battery against the alert ladder. Pure; each level
 * fires exactly once per journey, in severity order. Callers turn the
 * returned events into toasts/sheets/guardian pushes.
 */
export const advanceBatteryAlerts = (
  state: BatteryAlertState,
  input: AdvanceBatteryInput,
): { state: BatteryAlertState; events: BatteryAlertEvent[] } => {
  const { settings } = input;

  // Reset when a new journey starts.
  const base =
    state.journeyId === input.journeyId
      ? state
      : { ...initialBatteryAlertState(), journeyId: input.journeyId };

  const level = batteryLevelFor(input.level, settings.thresholdPercent);
  if (!level || level === "info") {
    return { state: { ...base, lastLevelPct: input.level }, events: [] };
  }

  // Fire only the CURRENT band (once per journey). On a sudden plunge the
  // most severe alert supersedes the pending lower ones — the user gets one
  // clear warning, not a toast + sheet + push at the same instant.
  const events: BatteryAlertEvent[] = [];
  const fired = [...base.fired];
  if (!fired.includes(level)) {
    fired.push(level);
    events.push({ type: level, level } as BatteryAlertEvent);
  }

  return {
    state: { ...base, fired, lastLevelPct: input.level },
    events: settings.enabled ? events : [],
  };
};

// ── Guardian alert payload (marked safety_events label) ──────────────────────

export const BATTERY_EVENT_MARKER = "Battery Alert:";

/**
 * Label the user app writes to safety_events for the guardian feed:
 * "Battery Alert: <name>'s battery is critically low (7%)…".
 */
export const batteryAlertLabel = (p: {
  userName: string;
  batteryPct: number;
  at: number;
  mapsUrl: string;
}): string =>
  `${BATTERY_EVENT_MARKER} ${p.userName}'s phone battery is critically low (${Math.round(p.batteryPct)}%). Live tracking may stop soon. Last known location: ${p.mapsUrl} · ${new Date(p.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

/** Parse the guardian-side feed item from a safety_events label. */
export const batteryEventFromLabel = (
  label: string | null | undefined,
): { summary: string } | null => {
  if (!label || !label.startsWith(BATTERY_EVENT_MARKER)) return null;
  return { summary: label.slice(BATTERY_EVENT_MARKER.length).trim() };
};

// ── AI Companion context ──────────────────────────────────────────────────────

/**
 * One-line battery status for the AI Companion's live context, e.g.
 * "battery critically low during an active Safety Journey (7%)".
 */
export const batteryContextSummary = (
  pct: number | null | undefined,
  thresholdPercent: number,
): string | null => {
  const level = batteryLevelFor(pct, thresholdPercent);
  if (!level || pct == null) return null;
  switch (level) {
    case "info":
      return `battery at ${Math.round(pct)}% — fine for now, may want to charge soon`;
    case "warning":
      return `battery low (${Math.round(pct)}%) — live tracking could stop soon`;
    case "critical":
      return `battery critically low (${Math.round(pct)}%) during an active Safety Journey`;
    case "emergency":
      return `battery almost dead (${Math.round(pct)}%) — device may power off during the active Safety Journey`;
    default:
      return null;
  }
};
