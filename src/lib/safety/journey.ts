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
  pos: { lat: number; lng: number },
  opts: { inactivityAlertSec?: number } = {},
): { journey: Journey; snapshot: JourneySnapshot; alerts: JourneyAlert[] } => {
  const alerts: JourneyAlert[] = [];
  let journey = j;

  // ── Progress / movement accounting ──
  const last = journey.lastPosition;
  let progressM = journey.progressM;
  if (last) {
    const moved = haversineMeters(last.lat, last.lng, pos.lat, pos.lng);
    if (moved > MOVEMENT_THRESHOLD_M) {
      progressM = Math.min(journey.distanceM, progressM + moved);
    }
  }

  // ── Route deviation (flagship check) — alert fires once per deviation ──
  const deviation = analyzeDeviation(pos, journey.routePoints, journey.distanceM);
  let deviationActive = journey.deviationActive;
  if (deviation.deviated && !deviationActive) {
    deviationActive = true;
    alerts.push({
      kind: "deviation",
      message: deviation.message ?? "We noticed you're no longer following your planned route. Are you okay?",
      askedAt: Date.now(),
    });
  } else if (!deviation.deviated && deviationActive) {
    deviationActive = false; // back on route — arm the next alert
  }

  // ── Inactivity — alert fires once, resets when movement resumes ──
  const threshold = opts.inactivityAlertSec ?? INACTIVITY_ALERT_SEC;
  const inactiveSec = last ? Math.floor((Date.now() - last.at) / 1000) : 0;
  let inactivityNotified = journey.inactivityNotified;
  if (last && inactiveSec >= threshold && !inactivityNotified) {
    inactivityNotified = true;
    alerts.push({
      kind: "inactivity",
      message: "You've stopped unexpectedly. Is everything okay?",
      since: Date.now(),
    });
  } else if (inactiveSec < threshold && inactivityNotified) {
    inactivityNotified = false;
  }

  journey = saveJourney({
    ...journey,
    lastPosition: { lat: pos.lat, lng: pos.lng, at: Date.now() },
    progressM,
    deviationActive,
    inactivityNotified,
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
