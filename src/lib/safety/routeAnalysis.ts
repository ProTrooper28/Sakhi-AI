/**
 * Route Analysis — deviation detection (a flagship Sakhi AI feature).
 *
 * Continuously compares live GPS against the planned route polyline. When the
 * user significantly leaves the path — or moves away from the destination —
 * the journey layer surfaces a discreet "are you okay?" prompt.
 *
 * All thresholds are configurable via `DEVIATION_CONFIG` so product can tune
 * them without touching page code.
 */

import { haversineMeters } from "@/pages/location/helpers";

export type DeviationConfig = {
  /** Distance (m) from the route polyline that counts as "deviated". */
  maxDeviationMeters: number;
  /** Distance (m) the user must be past the deviation before it matters. */
  minLeewayMeters: number;
  /** Seconds of sustained deviation before we ask. */
  sustainedSec: number;
  /** Seconds without a user response before the guardian is notified. */
  responseTimeoutSec: number;
};

/** Adjustable thresholds — tune here, no UI changes needed. */
export const DEVIATION_CONFIG: DeviationConfig = {
  maxDeviationMeters: 180,
  minLeewayMeters: 60,
  sustainedSec: 20,
  responseTimeoutSec: 45,
};

export type DeviationResult = {
  deviated: boolean;
  distanceFromRouteM: number | null;
  /** True when the user is moving away from the destination (wrong way). */
  movingAway: boolean;
  message: string | null;
};

/** Shortest distance from a point to a polyline (haversine, meters). */
export const distanceToPolylineM = (
  lat: number,
  lng: number,
  points: [number, number][],
): number => {
  if (points.length === 0) return 0;
  if (points.length === 1) return haversineMeters(lat, lng, points[0][0], points[0][1]);
  let best = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const d = distanceToSegmentM(lat, lng, a, b);
    if (d < best) best = d;
  }
  return best;
};

/** Distance from a point to a line segment (haversine approximation). */
const distanceToSegmentM = (
  lat: number,
  lng: number,
  a: [number, number],
  b: [number, number],
): number => {
  const dAB = haversineMeters(a[0], a[1], b[0], b[1]);
  if (dAB === 0) return haversineMeters(lat, lng, a[0], a[1]);

  // Project onto the AB line in a flat local approximation.
  const latScale = 111320;
  const lngScale = 111320 * Math.cos(((a[0] + b[0]) / 2) * Math.PI / 180);
  const ax = a[1] * lngScale;
  const ay = a[0] * latScale;
  const bx = b[1] * lngScale;
  const by = b[0] * latScale;
  const px = lng * lngScale;
  const py = lat * latScale;

  const abx = bx - ax;
  const aby = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby)));
  const cx = ax + t * abx;
  const cy = ay + t * aby;
  return haversineMeters(cy / latScale, cx / lngScale, lat, lng);
};

/**
 * Analyze one GPS fix against the planned route.
 *
 *   deviated        — farther from the route than the threshold (with leeway)
 *   movingAway      — moving away from the destination instead of toward it
 *   message         — the discreet prompt to show (or null)
 */
export const analyzeDeviation = (
  pos: { lat: number; lng: number },
  routePoints: [number, number][],
  totalDistanceM: number,
  cfg: DeviationConfig = DEVIATION_CONFIG,
): DeviationResult => {
  if (routePoints.length === 0 || totalDistanceM <= 0) {
    return { deviated: false, distanceFromRouteM: null, movingAway: false, message: null };
  }

  const distanceFromRouteM = distanceToPolylineM(pos.lat, pos.lng, routePoints);
  const deviated = distanceFromRouteM > cfg.maxDeviationMeters + cfg.minLeewayMeters;

  // Wrong-way check: is the user getting farther from the destination than
  // the nearest route point is?
  const dest = routePoints[routePoints.length - 1]!;
  const userToDest = haversineMeters(pos.lat, pos.lng, dest[0], dest[1]);
  // Progress along the route (meters remaining from the start).
  const remainingAlongRoute = totalDistanceM;
  const movingAway = deviated && userToDest > remainingAlongRoute * 0.85;

  const message = deviated
    ? "We noticed you're no longer following your planned route. Are you okay?"
    : null;

  return { deviated, distanceFromRouteM, movingAway, message };
};

/**
 * Deviation response timer — how long the user has to answer "are you okay?"
 * before the guardian is notified. Returns seconds remaining, or null when no
 * deviation is pending.
 */
export const deviationResponseRemainingSec = (
  askedAt: number | null,
  cfg: DeviationConfig = DEVIATION_CONFIG,
): number | null => {
  if (!askedAt) return null;
  const elapsed = Math.floor((Date.now() - askedAt) / 1000);
  const remaining = cfg.responseTimeoutSec - elapsed;
  return remaining > 0 ? remaining : 0;
};
