/**
 * AI Safety Score — modular, explainable route-safety scoring engine.
 *
 * Given the route options produced by the existing routing layer, this module
 * computes a 0–100 safety score per route from weighted factors:
 *
 *   Time of Day        20%
 *   Community Reports  20%
 *   Crime Hotspots     20%   (safety-zone overlay — placeholder-ready)
 *   Police/Hospitals   15%
 *   Lighting           10%
 *   Road Isolation     10%
 *   Crowd Density       5%
 *
 * ARCHITECTURE (future-ready): every piece is a small pure function. The UI
 * consumes `ScoredRoute[]` and never knows how the score was produced, so the
 * weighted heuristics can be replaced by a real ML model later by rewriting
 * `calculateSafetyScore` / `analyzeRouteSafety` alone — no UI changes.
 *
 *   calculateSafetyScore()  → weighted 0–100 score + per-factor breakdown
 *   generateReason()        → ✔ positive reasons + ⚠ warnings
 *   generateExplanation()   → one readable AI-style sentence
 *   rankRoutes()            → routes with flags: fastest / safest / recommended
 */

import { haversineMeters, type RouteOption, type SafetyZone } from "@/pages/location/helpers";
import type { TravelMode } from "./journey";
import type { CommunityReport } from "./communitySafety";

// ── Public types ─────────────────────────────────────────────────────────────

export type RiskLevel = "safe" | "moderate" | "high";

export type FactorId =
  | "timeOfDay"
  | "communityReports"
  | "crimeHotspots"
  | "emergencyServices"
  | "lighting"
  | "isolation"
  | "crowdDensity";

export const FACTOR_WEIGHTS: Record<FactorId, number> = {
  timeOfDay: 0.2,
  communityReports: 0.2,
  crimeHotspots: 0.2,
  emergencyServices: 0.15,
  lighting: 0.1,
  isolation: 0.1,
  crowdDensity: 0.05,
};

export const FACTOR_LABELS: Record<FactorId, string> = {
  timeOfDay: "Time of Day",
  communityReports: "Community Reports",
  crimeHotspots: "Crime Hotspots",
  emergencyServices: "Police / Hospitals",
  lighting: "Lighting / Main Roads",
  isolation: "Road Isolation",
  crowdDensity: "Crowd Density",
};

export type SafetyFactor = {
  id: FactorId;
  label: string;
  /** 0–100, higher = safer. */
  score: number;
  weight: number;
  detail: string;
};

/** Police stations / hospitals near a route (placeholder or live data). */
export type EmergencyService = {
  kind: "police" | "hospital";
  lat: number;
  lng: number;
  name: string;
};

export type RouteSafetyContext = {
  /** Safety-zone overlay (risk / moderate / safe) — placeholder today. */
  zones: SafetyZone[];
  /** Community reports around the journey corridor. */
  reports: CommunityReport[];
  /** Police stations + hospitals near the corridor. */
  services: EmergencyService[];
  /** When the journey starts (epoch ms) — drives the time-of-day factor. */
  startedAtMs: number;
  mode: TravelMode;
};

/** Non-score stats kept alongside the analysis so reasons stay explainable. */
export type RouteStats = {
  policeDistM: number | null;
  hospitalDistM: number | null;
  negativeReports: number;
  darkAreaReports: number;
  safeSpots: number;
  isolatedFrac: number;
  nightWindow: boolean;
  mainRoad: boolean;
};

export type RouteSafetyAnalysis = {
  route: RouteOption;
  /** 0–100 (higher = safer). */
  score: number;
  riskLevel: RiskLevel;
  factors: SafetyFactor[];
  stats: RouteStats;
  reasons: string[];
  warnings: string[];
  explanation: string;
};

export type ScoredRoute = RouteSafetyAnalysis & {
  isFastest: boolean;
  isSafest: boolean;
  /** Extra minutes vs the fastest route (0 for the fastest itself). */
  timeDeltaMinVsFastest: number;
  /** Safest route is surfaced as the AI recommendation. */
  recommended: boolean;
};

// ── Risk levels ──────────────────────────────────────────────────────────────

export const riskLevelFromScore = (score: number): RiskLevel =>
  score >= 80 ? "safe" : score >= 60 ? "moderate" : "high";

export const RISK_META: Record<RiskLevel, { label: string; color: string; bg: string; dot: string }> = {
  safe: { label: "Safe", color: "#3D9970", bg: "rgba(61,153,112,0.12)", dot: "🟢" },
  moderate: { label: "Moderate", color: "#F39C12", bg: "rgba(243,156,18,0.14)", dot: "🟡" },
  high: { label: "High Risk", color: "#D4455C", bg: "rgba(212,69,92,0.12)", dot: "🔴" },
};

// ── Geo helpers ──────────────────────────────────────────────────────────────

const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));

/** Sample a polyline down to ≤ `max` points so scoring stays O(1)-ish. */
export const sampleRoutePoints = (points: [number, number][], max = 24): [number, number][] => {
  if (points.length <= max) return points;
  const step = Math.ceil(points.length / max);
  const out: [number, number][] = [];
  for (let i = 0; i < points.length; i += step) out.push(points[i]!);
  const last = points[points.length - 1]!;
  if (out[out.length - 1] !== last) out.push(last);
  return out;
};

const nearestDistanceM = (
  lat: number,
  lng: number,
  items: { lat: number; lng: number }[],
): number | null => {
  let best: number | null = null;
  for (const it of items) {
    const d = haversineMeters(lat, lng, it.lat, it.lng);
    if (best == null || d < best) best = d;
  }
  return best;
};

const fmtDist = (m: number | null): string => {
  if (m == null) return "—";
  return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`;
};

const hourOf = (ms: number): number => new Date(ms).getHours();
/** 21:00–04:59 counts as the late-night window for scoring. */
const isNightWindow = (ms: number): boolean => hourOf(ms) >= 21 || hourOf(ms) < 5;

// ── Individual factor scorers (each returns 0–100 + a detail line) ──────────

const scoreTimeOfDay = (startedAtMs: number): { score: number; detail: string } => {
  const h = hourOf(startedAtMs);
  const time = `${String(h).padStart(2, "0")}:00`;
  if (h >= 21 || h < 5) return { score: 30, detail: `Late-night travel window (${time})` };
  if (h >= 18) return { score: 60, detail: `Evening hours (${time})` };
  if (h < 7) return { score: 55, detail: `Early-morning hours (${time})` };
  return { score: 90, detail: `Daylight travel (${time})` };
};

const NEGATIVE_CATEGORIES = new Set(["harassment", "stalking", "theft", "dark-area", "suspicious"]);

const scoreCommunityReports = (
  reports: CommunityReport[],
  samples: [number, number][],
  now = Date.now(),
): { score: number; detail: string; negative: number; dark: number; safe: number } => {
  let penalty = 0;
  let dark = 0;
  let safe = 0;
  for (const r of reports) {
    const near = samples.some(([lat, lng]) => haversineMeters(lat, lng, r.lat, r.lng) < 600);
    if (!near) continue;
    // Recency decay: last 7 days count fully, older reports fade to 30%.
    const ageDays = Math.max(0, (now - new Date(r.timestamp).getTime()) / 86_400_000);
    const weight = Math.max(0.3, 1 - ageDays / 7) * (r.confidence / 100);
    if (r.category === "safe-place") {
      safe += weight;
      continue;
    }
    if (NEGATIVE_CATEGORIES.has(r.category)) {
      penalty += weight;
      if (r.category === "dark-area") dark += weight;
    }
  }
  const score = clamp(Math.round(88 - 13 * penalty + 6 * safe));
  const detail =
    penalty >= 3
      ? "Multiple community reports nearby"
      : penalty >= 1
        ? `${Math.ceil(penalty)} recent report${penalty >= 2 ? "s" : ""} nearby`
        : safe >= 1
          ? "Community-marked safe spots nearby"
          : "Few community reports nearby";
  return { score, detail, negative: penalty, dark, safe };
};

const scoreCrimeHotspots = (
  zones: SafetyZone[],
  samples: [number, number][],
): { score: number; detail: string; hits: number } => {
  if (zones.length === 0) {
    return { score: 62, detail: "No hotspot data — scored conservatively", hits: 0 };
  }
  let raw = 0;
  let hits = 0;
  for (const [lat, lng] of samples) {
    const d = nearestDistanceM(lat, lng, zones);
    if (d != null && d < 500) {
      const zone = zones.reduce((a, b) =>
        haversineMeters(lat, lng, b.lat, b.lng) < haversineMeters(lat, lng, a.lat, a.lng) ? b : a,
      );
      raw += zone.level === "risk" ? -1 : zone.level === "moderate" ? -0.4 : 0.6;
      hits++;
    }
  }
  const avg = hits > 0 ? raw / hits : 0;
  const score = clamp(Math.round(62 + avg * 38));
  const riskHits = zones.filter((z) => z.level === "risk").length;
  return {
    score,
    detail: hits === 0 ? "Clear of known hotspots" : `Passes near ${riskHits} caution zone${riskHits === 1 ? "" : "s"}`,
    hits,
  };
};

const serviceBand = (d: number): number =>
  d <= 400 ? 100 : d <= 800 ? 85 : d <= 1400 ? 65 : d <= 2500 ? 40 : 20;

const scoreEmergencyServices = (
  services: EmergencyService[],
  samples: [number, number][],
): { score: number; detail: string; policeDistM: number | null; hospitalDistM: number | null } => {
  let policeDistM: number | null = null;
  let hospitalDistM: number | null = null;
  for (const [lat, lng] of samples) {
    for (const s of services) {
      const d = haversineMeters(lat, lng, s.lat, s.lng);
      if (s.kind === "police") {
        if (policeDistM == null || d < policeDistM) policeDistM = d;
      } else if (hospitalDistM == null || d < hospitalDistM) {
        hospitalDistM = d;
      }
    }
  }
  const pScore = policeDistM != null ? serviceBand(policeDistM) : 20;
  const hScore = hospitalDistM != null ? serviceBand(hospitalDistM) : 20;
  const score = Math.round((pScore + hScore) / 2);
  return {
    score,
    detail: `Police ${fmtDist(policeDistM)} · Hospital ${fmtDist(hospitalDistM)}`,
    policeDistM,
    hospitalDistM,
  };
};

const scoreLighting = (
  darkPenalty: number,
  mode: TravelMode,
  startedAtMs: number,
): { score: number; detail: string } => {
  const mainRoad = mode === "cab" || mode === "auto" || mode === "bike";
  let score = 62;
  if (mainRoad) score += 18; // routed along main roads by the driving profile
  if (isNightWindow(startedAtMs)) score -= 14;
  score -= 9 * darkPenalty;
  return {
    score: clamp(Math.round(score)),
    detail: darkPenalty >= 1 ? "Poorly lit stretch reported nearby" : mainRoad ? "Well-lit main roads" : "Mixed lighting along the way",
  };
};

const scoreIsolation = (
  zones: SafetyZone[],
  reports: CommunityReport[],
  services: EmergencyService[],
  samples: [number, number][],
): { score: number; detail: string; isolatedFrac: number } => {
  const anchors: { lat: number; lng: number }[] = [...zones, ...reports, ...services];
  if (anchors.length === 0) return { score: 55, detail: "No activity data — scored conservatively", isolatedFrac: 0.5 };
  let isolated = 0;
  for (const [lat, lng] of samples) {
    if ((nearestDistanceM(lat, lng, anchors) ?? Infinity) > 700) isolated++;
  }
  const isolatedFrac = samples.length > 0 ? isolated / samples.length : 0;
  return {
    score: clamp(Math.round(96 - 60 * isolatedFrac), 10),
    detail:
      isolatedFrac > 0.4
        ? "Passes through isolated stretches"
        : isolatedFrac > 0.15
          ? "Some quieter stretches"
          : "Stays in populated areas",
    isolatedFrac,
  };
};

const scoreCrowdDensity = (
  zones: SafetyZone[],
  reports: CommunityReport[],
  services: EmergencyService[],
  samples: [number, number][],
  mode: TravelMode,
): { score: number; detail: string; signals: number } => {
  const anchors: { lat: number; lng: number }[] = [...zones, ...reports, ...services];
  let signals = 0;
  for (const a of anchors) {
    if (samples.some(([lat, lng]) => haversineMeters(lat, lng, a.lat, a.lng) < 600)) signals++;
  }
  const mainRoad = mode === "cab" || mode === "auto" || mode === "bike";
  const score = clamp(Math.round((mainRoad ? 53 : 45) + 7 * signals), 35);
  return {
    score,
    detail: score >= 70 ? "High footfall / busy area" : score >= 55 ? "Moderately busy corridor" : "Low population density along parts of the route",
    signals,
  };
};

// ── Core API ─────────────────────────────────────────────────────────────────

/**
 * Weighted 0–100 safety score for one route, with the full per-factor
 * breakdown. Pure — swap the body for a real model later, keep the shape.
 */
export const calculateSafetyScore = (
  route: RouteOption,
  ctx: RouteSafetyContext,
): { score: number; factors: SafetyFactor[]; stats: RouteStats } => {
  const samples = sampleRoutePoints(route.points);
  const reports = scoreCommunityReports(ctx.reports, samples);
  const hotspots = scoreCrimeHotspots(ctx.zones, samples);
  const services = scoreEmergencyServices(ctx.services, samples);
  const lighting = scoreLighting(reports.dark, ctx.mode, ctx.startedAtMs);
  const isolation = scoreIsolation(ctx.zones, ctx.reports, ctx.services, samples);
  const crowd = scoreCrowdDensity(ctx.zones, ctx.reports, ctx.services, samples, ctx.mode);
  const timeOfDay = scoreTimeOfDay(ctx.startedAtMs);

  const byId: Record<FactorId, { score: number; detail: string }> = {
    timeOfDay,
    communityReports: reports,
    crimeHotspots: hotspots,
    emergencyServices: services,
    lighting,
    isolation,
    crowdDensity: crowd,
  };

  const factors = (Object.keys(FACTOR_WEIGHTS) as FactorId[]).map((id) => ({
    id,
    label: FACTOR_LABELS[id],
    weight: FACTOR_WEIGHTS[id],
    score: byId[id]!.score,
    detail: byId[id]!.detail,
  }));

  const score = clamp(
    Math.round(factors.reduce((sum, f) => sum + f.score * f.weight, 0)),
  );

  const stats: RouteStats = {
    policeDistM: services.policeDistM,
    hospitalDistM: services.hospitalDistM,
    negativeReports: reports.negative,
    darkAreaReports: reports.dark,
    safeSpots: reports.safe,
    isolatedFrac: isolation.isolatedFrac,
    nightWindow: isNightWindow(ctx.startedAtMs),
    mainRoad: ctx.mode === "cab" || ctx.mode === "auto" || ctx.mode === "bike",
  };

  return { score, factors, stats };
};

/**
 * ✔ / ⚠ bullet reasons shown in the "Why this route?" sheet.
 * Pure — replace with model-generated rationale later, same shape.
 */
export const generateReason = (
  a: RouteSafetyAnalysis,
  flags: { isFastest?: boolean } = {},
): { reasons: string[]; warnings: string[] } => {
  const { stats, score } = a;
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (!stats.nightWindow && score >= 60) reasons.push("Daylight / evening travel window");
  if (stats.policeDistM != null && stats.policeDistM <= 800) reasons.push(`Police station within ${fmtDist(stats.policeDistM)}`);
  if (stats.hospitalDistM != null && stats.hospitalDistM <= 800) reasons.push(`Hospital within ${fmtDist(stats.hospitalDistM)}`);
  if (stats.safeSpots >= 1) reasons.push("Community-marked safe spot nearby");
  if (stats.negativeReports < 1) reasons.push("Few community reports on this corridor");
  if (stats.mainRoad) reasons.push("Stays on well-lit main roads");
  if (stats.isolatedFrac <= 0.15) reasons.push("Passes through populated areas");
  if (a.factors.find((f) => f.id === "crowdDensity")!.score >= 70) reasons.push("High footfall / busy area");
  if (flags.isFastest) reasons.push("Shortest safe route");

  if (stats.policeDistM == null || stats.policeDistM > 2000) warnings.push("No nearby police station");
  if (stats.hospitalDistM == null || stats.hospitalDistM > 2000) warnings.push("No nearby hospital");
  if (stats.darkAreaReports >= 1) warnings.push("Poor lighting reported nearby");
  if (stats.negativeReports >= 3) warnings.push("Multiple community reports");
  if (stats.isolatedFrac > 0.4) warnings.push("Low population density");
  if (stats.nightWindow) warnings.push("Late-night travel window");
  if (score < 60 && !stats.mainRoad) warnings.push("Higher historical crime index nearby");

  // Most important first, capped so the sheet stays readable.
  return { reasons: reasons.slice(0, 5), warnings: warnings.slice(0, 5) };
};

/**
 * One readable AI-style sentence for the "Why this route?" sheet.
 * Replace the phrase bank with a real LLM summary later — same signature.
 */
export const generateExplanation = (
  a: RouteSafetyAnalysis,
  opts: { isFastest?: boolean; isSafest?: boolean; timeDeltaMinVsFastest?: number } = {},
): string => {
  const { stats, score } = a;
  const delta = opts.timeDeltaMinVsFastest ?? 0;
  const parts: string[] = [];

  if ((opts.isSafest ?? false) && (opts.isFastest ?? false)) {
    parts.push("the fastest way there while staying on well-lit, busier roads");
  } else if (opts.isSafest ?? false) {
    parts.push("it remains on well-lit main roads" );
    if (stats.isolatedFrac <= 0.15) parts.push("passes through populated areas");
    if (stats.negativeReports < 1) parts.push("has fewer reported incidents than the alternatives");
    if (stats.policeDistM != null && stats.policeDistM <= 800) parts.push("keeps emergency services close by");
    if (delta > 0) parts.push(`takes about ${delta} min longer than the fastest option`);
  } else if (opts.isFastest ?? false) {
    parts.push(
      delta > 0
        ? `it is about ${delta} min faster than the safest option`
        : "it is the quickest way to get there",
    );
    if (stats.negativeReports >= 1) parts.push("but passes stretches with recent community reports");
    else if (stats.isolatedFrac > 0.4) parts.push("but uses quieter, more isolated roads");
    else if (stats.policeDistM == null || stats.policeDistM > 2000) parts.push("but has fewer emergency services nearby");
    else parts.push("but trades some safety margin for speed");
  } else if (score >= 60) {
    parts.push("it offers a reasonable balance of speed and safety");
    if (stats.mainRoad) parts.push("mostly following main roads");
  } else {
    parts.push("it uses quieter roads with fewer people around");
    if (stats.negativeReports >= 1) parts.push("and recent community reports sit along the way");
  }

  const head = (opts.isSafest ?? false) ? "This route is recommended because" : "This route was scored this way because";
  return `${head} ${parts.join(", ")}.`;
};

/** Analyze a single route: score + reasons + explanation in one call. */
export const analyzeRouteSafety = (
  route: RouteOption,
  ctx: RouteSafetyContext,
  flags: { isFastest?: boolean; isSafest?: boolean; timeDeltaMinVsFastest?: number } = {},
): RouteSafetyAnalysis => {
  const { score, factors, stats } = calculateSafetyScore(route, ctx);
  const base: RouteSafetyAnalysis = {
    route,
    score,
    riskLevel: riskLevelFromScore(score),
    factors,
    stats,
    reasons: [],
    warnings: [],
    explanation: "",
  };
  const { reasons, warnings } = generateReason(base, flags);
  const explanation = generateExplanation(base, flags);
  return { ...base, reasons, warnings, explanation };
};

/**
 * Score + rank a full set of route options.
 *
 * Returns routes sorted best-first (the AI recommendation leads), each flagged
 * with isFastest / isSafest / recommended and the extra-minutes cost of
 * choosing safety over speed — the "Safer route available (+2 mins)" feature.
 */
export const rankRoutes = (options: RouteOption[], ctx: RouteSafetyContext): ScoredRoute[] => {
  if (options.length === 0) return [];

  const fastest = options.reduce((a, b) => (a.durationSec <= b.durationSec ? a : b));
  const fastestDur = fastest.durationSec;
  const analyses = options.map((o) =>
    analyzeRouteSafety(o, ctx, {
      isFastest: o.id === fastest.id,
      timeDeltaMinVsFastest: Math.max(0, Math.round((o.durationSec - fastestDur) / 60)),
    }),
  );

  // Safest wins ties against equally-scored but slower routes.
  const safest = analyses.reduce((a, b) => (b.score > a.score || (b.score === a.score && b.route.durationSec < a.route.durationSec) ? b : a));

  return analyses
    .map((a): ScoredRoute => ({
      ...a,
      isFastest: a.route.id === fastest.id,
      isSafest: a.route.id === safest.route.id,
      recommended: a.route.id === safest.route.id,
      timeDeltaMinVsFastest: Math.max(0, Math.round((a.route.durationSec - fastestDur) / 60)),
    }))
    .sort((x, y) => Number(y.recommended) - Number(x.recommended) || y.score - x.score || x.route.durationSec - y.route.durationSec);
};

// ── Emergency services (police / hospitals) ─────────────────────────────────
//
// Real source: OpenStreetMap Overpass API (keyless, like the app's other
// geo APIs). Falls back to a deterministic placeholder so scoring and the
// UI keep working offline. TODO(real-data): point this at a verified
// emergency-services dataset or the platform's own POI table.

const fetchWithTimeout = async (url: string, ms: number): Promise<Response> => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
};

/** Deterministic LCG placeholder so services are stable for a given anchor. */
const seededRandom = (seed: number): (() => number) => {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

const placeholderServices = (anchor: { lat: number; lng: number }): EmergencyService[] => {
  const rand = seededRandom(Math.round(anchor.lat * 100) * 2654435761 ^ Math.round(anchor.lng * 100));
  const out: EmergencyService[] = [];
  const lngScale = Math.cos((anchor.lat * Math.PI) / 180) || 1;
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + rand() * 0.9;
    const dist = 500 + rand() * 1600;
    out.push({
      kind: i % 2 === 0 ? "police" : "hospital",
      lat: anchor.lat + (Math.cos(ang) * dist) / 111320,
      lng: anchor.lng + (Math.sin(ang) * dist) / (111320 * lngScale),
      name: i % 2 === 0 ? "Police Station (demo)" : "Hospital (demo)",
    });
  }
  return out;
};

/**
 * Police stations + hospitals around an anchor point. Live Overpass query
 * with a hard timeout, falling back to stable demo placeholders.
 */
export const fetchEmergencyServices = async (
  anchor: { lat: number; lng: number },
  radiusM = 2500,
): Promise<EmergencyService[]> => {
  try {
    const q = `[out:json][timeout:8];(node["amenity"="police"](around:${radiusM},${anchor.lat},${anchor.lng});node["amenity"="hospital"](around:${radiusM},${anchor.lat},${anchor.lng}););out body 40;`;
    const res = await fetchWithTimeout(
      `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`,
      5000,
    );
    if (!res.ok) throw new Error("overpass failed");
    const data = (await res.json()) as {
      elements?: { lat: number; lon: number; tags?: { amenity?: string; name?: string } }[];
    };
    const services: EmergencyService[] = (data.elements ?? [])
      .filter((e) => e.tags?.amenity === "police" || e.tags?.amenity === "hospital")
      .map((e) => ({
        kind: e.tags!.amenity === "police" ? ("police" as const) : ("hospital" as const),
        lat: e.lat,
        lng: e.lon,
        name: e.tags?.name ?? (e.tags!.amenity === "police" ? "Police Station" : "Hospital"),
      }));
    return services.length > 0 ? services : placeholderServices(anchor);
  } catch {
    return placeholderServices(anchor);
  }
};
