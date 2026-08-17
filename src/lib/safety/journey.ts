/**
 * Safety Journey — proactive journey monitoring (before the emergency).
 *
 * The user picks a destination + travel mode, starts a journey, and the
 * engine continuously evaluates GPS against the planned route:
 *
 *   • progress toward the destination
 *   • estimated arrival (based on mode speed — honest approximation)
 *   • unexpected stops / long inactivity
 *   • route deviation (delegated to routeAnalysis.ts)
 *   • arrival detection → "Journey Completed Safely"
 *
 * State is persisted to localStorage so a journey survives a reload. The
 * engine is pure (no React); pages subscribe by reading + re-evaluating.
 *
 * Integrations used (existing infra, never modified):
 *   • upsertLiveLocation  — guardian sees live position while journeying
 *   • sendSafeCheckIn     — journey completion notifies the guardian
 */

import { haversineMeters } from "@/pages/location/helpers";
import { analyzeDeviation } from "./routeAnalysis";

export type TravelMode = "walking" | "cab" | "auto" | "bike" | "public";

export const TRAVEL_MODES: { id: TravelMode; label: string; emoji: string; speedMps: number }[] = [
  { id: "walking", label: "Walking", emoji: "🚶‍♀️", speedMps: 1.3 },
  { id: "cab", label: "Cab", emoji: "🚕", speedMps: 10.5 },
  { id: "auto", label: "Auto", emoji: "🛺", speedMps: 8.5 },
  { id: "bike", label: "Bike", emoji: "🛵", speedMps: 11.5 },
  { id: "public", label: "Public Transport", emoji: "🚌", speedMps: 7.5 },
];

export type JourneyDestination = { lat: number; lng: number; label: string };

// ── Optional ride/travel details ──────────────────────────────────────────────

export type RideService = "uber" | "ola" | "rapido" | "auto" | "personal" | "other";

export const RIDE_SERVICES: { id: RideService; label: string }[] = [
  { id: "uber", label: "Uber" },
  { id: "ola", label: "Ola" },
  { id: "rapido", label: "Rapido" },
  { id: "auto", label: "Auto" },
  { id: "personal", label: "Personal Vehicle" },
  { id: "other", label: "Other" },
];

/**
 * Optional travel details. FUTURE-READY: ride-hailing integrations (official
 * Uber/Ola/Rapido SDKs or APIs) can auto-populate these fields — nothing here
 * is hardcoded to a provider; `integrationSource` records where the data came
 * from when a provider fills it in. The form fills them manually today.
 */
export type RideDetails = {
  cabNumber?: string;
  vehiclePlate?: string;
  driverName?: string;
  rideService?: RideService | null;
  driverPhone?: string;
  seatNumber?: string;
  busTrainNumber?: string;
  notes?: string;
  /** Future-ready: e.g. "uber-sdk", "ola-api" when a provider auto-fills. */
  integrationSource?: string | null;
};

/** Which AI safety monitors are armed for this journey. */
export type MonitoringOptions = {
  notifyOnArrival: boolean;
  detectDeviation: boolean;
  alertLongJourney: boolean;
  shareLiveLocation: boolean;
  emergencyRecording: boolean;
};

export const MONITORING_DEFAULTS: MonitoringOptions = {
  notifyOnArrival: true,
  detectDeviation: true,
  alertLongJourney: true,
  shareLiveLocation: true,
  emergencyRecording: true,
};

export type TrustedContact = { id: string; name: string };

/**
 * Demo trusted-contact options. When the real guardian list is wired in,
 * replace this array with the user's accepted guardians (same shape).
 */
export const TRUSTED_CONTACTS: TrustedContact[] = [
  { id: "mother", name: "Mother" },
  { id: "father", name: "Father" },
  { id: "friend", name: "Friend" },
  { id: "all", name: "All Guardians" },
];

export type JourneyStatus = "planning" | "active" | "completed" | "cancelled";

export type JourneyAlert =
  | { kind: "deviation"; message: string; askedAt: number }
  | { kind: "inactivity"; message: string; since: number }
  | { kind: "progress"; message: string }
  | { kind: "arrived"; message: string }
  | { kind: "insight"; message: string };

export type Journey = {
  id: string;
  status: JourneyStatus;
  startedAt: string | null;
  completedAt: string | null;
  destination: JourneyDestination | null;
  mode: TravelMode;
  /** Expected arrival time (epoch ms) if the user set one, else derived. */
  expectedArrivalMs: number | null;
  /** Planned route polyline [lat, lng][]. */
  routePoints: [number, number][];
  distanceM: number;
  durationSec: number;
  lastPosition: { lat: number; lng: number; at: number } | null;
  /** Meters covered toward the destination (snapshot trail). */
  progressM: number;
  /** Latest AI monitoring insight shown on the journey screen. */
  latestInsight: string | null;
  /** True while a deviation alert is outstanding (reset when back on route). */
  deviationActive: boolean;
  /** True while an inactivity alert is outstanding (reset when moving again). */
  inactivityNotified: boolean;
  /** True while a GPS-loss alert is outstanding (reset when a fix returns). */
  gpsLostNotified: boolean;
  /** True while a long-journey alert is outstanding (reset on journey end). */
  longJourneyNotified: boolean;
  /** Optional ride/travel details (cab, driver, plate, notes…). */
  rideDetails: RideDetails | null;
  /** Which AI monitors are armed (deviation, long journey, sharing…). */
  monitoring: MonitoringOptions;
  /** Selected trusted contact id (from TRUSTED_CONTACTS). */
  trustedContactId: string;
  /** User-overridden expected arrival (epoch ms), when set. */
  etaOverride: number | null;
  /** Nonce bumped on every significant state change (re-render trigger). */
  revision: number;
};

export type JourneySnapshot = {
  journey: Journey;
  progressPct: number;
  remainingM: number;
  etaMs: number | null;
  deviated: boolean;
  distanceFromRouteM: number | null;
  inactiveSec: number;
  arrived: boolean;
};

const STORAGE_KEY = "sakhi_journey";

/** Persisted inactivity threshold (seconds) before we ask "are you okay?". */
export const INACTIVITY_ALERT_SEC = 90;
/** Seconds without a GPS fix before we warn the user we've lost their location. */
export const GPS_LOSS_ALERT_SEC = 45;
/** Journey is "unusually long" when elapsed > expected duration × this. */
export const LONG_JOURNEY_FACTOR = 1.5;
/** Arrival is declared when within this distance of the destination. */
export const ARRIVAL_RADIUS_M = 120;
/** Minimum position movement (m) to count as "moving". */
export const MOVEMENT_THRESHOLD_M = 12;

export const emptyJourney = (): Journey => ({
  id: "",
  status: "planning",
  startedAt: null,
  completedAt: null,
  destination: null,
  mode: "walking",
  expectedArrivalMs: null,
  routePoints: [],
  distanceM: 0,
  durationSec: 0,
  lastPosition: null,
  progressM: 0,
  latestInsight: null,
  deviationActive: false,
  inactivityNotified: false,
  gpsLostNotified: false,
  longJourneyNotified: false,
  rideDetails: null,
  monitoring: MONITORING_DEFAULTS,
  trustedContactId: "all",
  etaOverride: null,
  revision: 0,
});

export const readJourney = (): Journey => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyJourney();
    const parsed = JSON.parse(raw) as Journey;
    return { ...emptyJourney(), ...parsed };
  } catch {
    return emptyJourney();
  }
};

export const saveJourney = (j: Journey): Journey => {
  const next = { ...j, revision: j.revision + 1 };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable — journey still works in-memory
  }
  return next;
};

export const clearJourney = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
};

export const modeSpeedMps = (mode: TravelMode): number =>
  TRAVEL_MODES.find((m) => m.id === mode)?.speedMps ?? 8;

/** Estimate duration (seconds) for a distance using the mode's speed. */
export const estimateDurationSec = (distanceM: number, mode: TravelMode): number =>
  distanceM / modeSpeedMps(mode);

export const startJourney = (p: {
  destination: JourneyDestination;
  mode: TravelMode;
  routePoints: [number, number][];
  distanceM: number;
  durationSec: number;
  expectedArrivalMs?: number | null;
  rideDetails?: RideDetails | null;
  monitoring?: Partial<MonitoringOptions>;
  trustedContactId?: string;
  etaOverride?: number | null;
}): Journey => {
  const j: Journey = {
    id: `jny_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    status: "active",
    startedAt: new Date().toISOString(),
    completedAt: null,
    destination: p.destination,
    mode: p.mode,
    expectedArrivalMs: p.expectedArrivalMs ?? Date.now() + p.durationSec * 1000,
    routePoints: p.routePoints,
    distanceM: p.distanceM,
    durationSec: p.durationSec,
    lastPosition: null,
    progressM: 0,
    latestInsight: "AI monitoring active. Route locked in.",
    deviationActive: false,
    inactivityNotified: false,
    gpsLostNotified: false,
    longJourneyNotified: false,
    rideDetails: p.rideDetails ?? null,
    monitoring: { ...MONITORING_DEFAULTS, ...p.monitoring },
    trustedContactId: p.trustedContactId ?? "all",
    etaOverride: p.etaOverride ?? null,
    revision: 0,
  };
  return saveJourney(j);
};

export const completeJourney = (j: Journey): Journey =>
  saveJourney({ ...j, status: "completed", completedAt: new Date().toISOString() });

export const cancelJourney = (j: Journey): Journey =>
  saveJourney({ ...j, status: "cancelled", completedAt: new Date().toISOString() });

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/**
 * Evaluate the journey against the latest GPS fix. Pure — pages call this on
 * every position update and render the returned snapshot.
 */
export const evaluateJourney = (
  j: Journey,
  pos: { lat: number; lng: number } | null,
): JourneySnapshot => {
  const dest = j.destination;
  const remainingM = dest
    ? haversineMeters(pos?.lat ?? j.lastPosition?.lat ?? dest.lat, pos?.lng ?? j.lastPosition?.lng ?? dest.lng, dest.lat, dest.lng)
    : 0;
  const progressPct = j.distanceM > 0 ? clamp(1 - remainingM / j.distanceM, 0, 1) : 0;

  const inactiveSec =
    j.lastPosition && pos
      ? Math.max(
          0,
          Math.floor((Date.now() - j.lastPosition.at) / 1000),
        )
      : 0;

  const arrived =
    !!pos && !!dest && haversineMeters(pos.lat, pos.lng, dest.lat, dest.lng) <= ARRIVAL_RADIUS_M;

  return {
    journey: j,
    progressPct,
    remainingM,
    etaMs: j.expectedArrivalMs,
    deviated: false, // set by analyzeRoute (see evaluatePosition below)
    distanceFromRouteM: null,
    inactiveSec,
    arrived,
  };
};

/**
 * Combine a GPS fix with route-deviation analysis and return an updated
 * journey + snapshot + any alerts worth surfacing. The route deviation
 * thresholds live in routeAnalysis.ts so they can be tuned independently.
 */
export const evaluatePosition = (
  j: Journey,
  pos: { lat: number; lng: number } | null,
  opts: { inactivityAlertSec?: number; gpsLossAlertSec?: number; longJourneyFactor?: number } = {},
): { journey: Journey; snapshot: JourneySnapshot; alerts: JourneyAlert[] } => {
  const alerts: JourneyAlert[] = [];
  let journey = j;
  const now = Date.now();
  const threshold = opts.inactivityAlertSec ?? INACTIVITY_ALERT_SEC;
  const gpsLossSec = opts.gpsLossAlertSec ?? GPS_LOSS_ALERT_SEC;
  const longFactor = opts.longJourneyFactor ?? LONG_JOURNEY_FACTOR;

  // ── Progress / movement accounting (only with a fresh fix) ──
  let progressM = journey.progressM;
  if (pos && journey.lastPosition) {
    const moved = haversineMeters(journey.lastPosition.lat, journey.lastPosition.lng, pos.lat, pos.lng);
    if (moved > MOVEMENT_THRESHOLD_M) {
      progressM = Math.min(journey.distanceM, progressM + moved);
    }
  }

  // ── GPS loss — warn once, reset when a fix returns ──
  let gpsLostNotified = journey.gpsLostNotified;
  if (!pos) {
    const sinceFix = journey.lastPosition ? Math.floor((now - journey.lastPosition.at) / 1000) : gpsLossSec + 1;
    if (sinceFix >= gpsLossSec && !gpsLostNotified) {
      gpsLostNotified = true;
      alerts.push({
        kind: "insight",
        message: "GPS signal lost — we can't see your location. Everything okay?",
      });
    }
  } else if (gpsLostNotified) {
    gpsLostNotified = false;
  }

  // ── Route deviation (flagship check, respect monitor toggle) ──
  let deviationActive = journey.deviationActive;
  let deviation: ReturnType<typeof analyzeDeviation> = {
    deviated: false,
    distanceFromRouteM: null,
    movingAway: false,
    message: null,
  };
  if (pos && journey.monitoring.detectDeviation) {
    deviation = analyzeDeviation(pos, journey.routePoints, journey.distanceM);
    if (deviation.deviated && !deviationActive) {
      deviationActive = true;
      alerts.push({
        kind: "deviation",
        message: deviation.message ?? "We noticed you're no longer following your planned route. Everything okay?",
        askedAt: now,
      });
    } else if (!deviation.deviated && deviationActive) {
      deviationActive = false; // back on route — arm the next alert
    }
  }

  // ── Inactivity — alert fires once, resets when movement resumes ──
  const inactiveSec = journey.lastPosition ? Math.floor((now - journey.lastPosition.at) / 1000) : 0;
  let inactivityNotified = journey.inactivityNotified;
  if (pos && inactiveSec >= threshold && !inactivityNotified) {
    inactivityNotified = true;
    alerts.push({
      kind: "inactivity",
      message: "You've stopped unexpectedly. Everything okay?",
      since: now,
    });
  } else if (pos && inactiveSec < threshold && inactivityNotified) {
    inactivityNotified = false;
  }

  // ── Unusually long journey (respect monitor toggle) ──
  let longJourneyNotified = journey.longJourneyNotified;
  if (journey.monitoring.alertLongJourney && journey.startedAt && journey.durationSec > 0) {
    const elapsedSec = (now - new Date(journey.startedAt).getTime()) / 1000;
    if (elapsedSec > journey.durationSec * longFactor && !longJourneyNotified) {
      longJourneyNotified = true;
      alerts.push({
        kind: "insight",
        message: "Your journey is taking longer than expected. Everything okay?",
      });
    }
  }

  journey = saveJourney({
    ...journey,
    lastPosition: pos ? { lat: pos.lat, lng: pos.lng, at: now } : journey.lastPosition,
    progressM,
    deviationActive,
    inactivityNotified,
    gpsLostNotified,
    longJourneyNotified,
  });

  const snapshot: JourneySnapshot = {
    ...evaluateJourney(journey, pos),
    deviated: deviation.deviated,
    distanceFromRouteM: deviation.distanceFromRouteM,
    inactiveSec,
  };

  // Arrival overrides everything else.
  if (snapshot.arrived && journey.status === "active") {
    journey = completeJourney(journey);
    snapshot.journey = journey;
    alerts.push({ kind: "arrived", message: "Journey Completed Safely" });
  }

  return { journey, snapshot, alerts };
};
