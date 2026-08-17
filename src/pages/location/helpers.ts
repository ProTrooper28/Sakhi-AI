/**
 * Shared helpers for the Live Location experiences (user + guardian).
 * Pure client utilities — no backend, no schema, no Realtime changes.
 */

/** Dev auto-expiry: an SOS older than 10 minutes is treated as resolved. */
export const SOS_EXPIRY_MS = 10 * 60 * 1000;

export type TrailPoint = { lat: number; lng: number; ts: number };

export type SafetyLike = {
  type: string;
  status: string;
  triggered_at: string;
};

export const isStaleSos = (e: SafetyLike): boolean =>
  e.type === "sos" &&
  e.status === "active" &&
  Date.now() - new Date(e.triggered_at).getTime() > SOS_EXPIRY_MS;

/** Haversine distance in meters. */
export const haversineMeters = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number => {
  const R = 6371e3;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const distanceLabel = (m: number | null | undefined): string => {
  if (m == null || !Number.isFinite(m)) return "—";
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
};

export const formatCoords = (lat: number, lng: number): string =>
  `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

export const googleMapsUrl = (lat: number, lng: number): string =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

export const appleMapsUrl = (lat: number, lng: number): string =>
  `https://maps.apple.com/?ll=${lat},${lng}&q=${lat},${lng}`;

export const formatTime = (ts: number | string | Date): string =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export const timeAgoShort = (iso: string): string => {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 15) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export const formatElapsed = (secs: number): string => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

/** Movement estimate from two consecutive fixes (or device speed). */
export type Movement = "stationary" | "walking" | "driving" | null;

export const movementFromSpeed = (speedMps: number | null | undefined): Movement => {
  if (speedMps == null || !Number.isFinite(speedMps) || speedMps < 0) return null;
  if (speedMps < 0.6) return "stationary";
  if (speedMps < 2.6) return "walking";
  return "driving";
};

export const movementLabel = (m: Movement): string => {
  if (m === "stationary") return "Stationary";
  if (m === "walking") return "Walking";
  if (m === "driving") return "Driving";
  return "—";
};

export const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "M";

export const AVATAR_COLORS = ["#F2956A", "#3D9970", "#D4455C", "#7A2B73", "#B7770D", "#2563EB"];

export type GeocodeResult = { label: string; address: string };

/**
 * Reverse geocode via Nominatim (OpenStreetMap). Returns a short readable
 * label ("Bandra West, Mumbai") plus a fuller address line. Never throws —
 * callers fall back to a default label on failure.
 */
/** fetch with a timeout so a dead geocoder/routing API never hangs the UI. */
const fetchWithTimeout = async (url: string, ms = 6000, init?: RequestInit): Promise<Response> => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
};

export const reverseGeocode = async (lat: number, lng: number): Promise<GeocodeResult> => {
  try {
    const res = await fetchWithTimeout(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
      5000,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) throw new Error("geocode failed");
    const data = (await res.json()) as {
      display_name?: string;
      address?: {
        suburb?: string;
        neighbourhood?: string;
        residential?: string;
        road?: string;
        city?: string;
        town?: string;
        village?: string;
        county?: string;
        state?: string;
        country?: string;
      };
    };
    const a = data.address ?? {};
    const area = a.suburb || a.neighbourhood || a.residential || a.road || "";
    const city = a.city || a.town || a.village || a.county || "";
    const state = a.state || "";
    const country = a.country || "";
    const label = [area, city].filter(Boolean).join(", ") || data.display_name?.split(",")[0] || "Current location";
    const address = [area, city, state, country].filter(Boolean).join(", ") || label;
    return { label, address };
  } catch {
    return { label: "Current location", address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
  }
};

/**
 * Device battery percentage (0–100) via the Battery API, with a module-level
 * cache that stays fresh through the `levelchange` event. Returns null when
 * unavailable (desktop browsers etc.).
 */
let cachedBattery: number | null = null;

export const getDeviceBattery = async (): Promise<number | null> => {
  try {
    const nav = navigator as Navigator & {
      getBattery?: () => Promise<{ level: number; addEventListener: (t: string, cb: () => void) => void }>;
    };
    if (!nav.getBattery) return null;
    const battery = await nav.getBattery();
    cachedBattery = Math.round(battery.level * 100);
    battery.addEventListener("levelchange", () => {
      cachedBattery = Math.round(battery.level * 100);
    });
    return cachedBattery;
  } catch {
    return cachedBattery;
  }
};

/** Copy text to clipboard (safe fallback). */
export const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
};

/** Share via the Web Share API; falls back to clipboard. Returns how it went. */
export const shareLocation = async (
  lat: number,
  lng: number,
  label?: string | null,
): Promise<"shared" | "copied" | "failed"> => {
  const text = `Sakhi — I'm here: ${label ?? formatCoords(lat, lng)}`;
  const url = googleMapsUrl(lat, lng);
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title: "Sakhi Live Location", text, url });
      return "shared";
    } catch {
      // user dismissed or share failed — fall through to clipboard
    }
  }
  const ok = await copyText(`${text} ${url}`);
  return ok ? "copied" : "failed";
};

// ── Safety layer (GeoJSON placeholder architecture) ───────────────────────────
//
// The UI consumes a GeoJSON FeatureCollection and renders it — it never
// cares where the data comes from. Today a deterministic placeholder is
// generated around the user's position; later a real crime/safety data
// source (police open data, a server action, a third-party safety API) can
// be swapped in by replacing `buildSafetyGeoJson` with a data fetch, with
// zero UI changes.

export type SafetyLevel = "safe" | "moderate" | "risk";

/** Simple internal zones (derived from GeoJSON) used for route scoring. */
export type SafetyZone = { lat: number; lng: number; radius: number; level: SafetyLevel };

/** GeoJSON feature — supports Point (with radius property) or Polygon. */
export type SafetyFeature = {
  type: "Feature";
  properties: {
    level: SafetyLevel;
    name?: string;
    /** Radius in meters for Point features. */
    radius?: number;
    source?: string;
  };
  geometry:
    | { type: "Point"; coordinates: [number, number] }
    | { type: "Polygon"; coordinates: [number, number][][] };
};

export type SafetyFeatureCollection = {
  type: "FeatureCollection";
  features: SafetyFeature[];
};

export const SAFETY_ZONE_COLORS: Record<SafetyLevel, string> = {
  safe: "#3D9970",
  moderate: "#F39C12",
  risk: "#D4455C",
};

export const SAFETY_LEGEND: { level: SafetyLevel; label: string }[] = [
  { level: "safe", label: "Safe" },
  { level: "moderate", label: "Moderate" },
  { level: "risk", label: "Caution" },
];

/** Deterministic LCG so the zones are stable for a given anchor. */
const seededRandom = (seed: number): (() => number) => {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

/**
 * Placeholder safety data — generates a GeoJSON FeatureCollection of
 * green / yellow / red areas anchored around the current position.
 *
 * TODO(real-data): replace this function with a real safety data source,
 * e.g. `fetch("/api/safety-zones")` or a crime open-data endpoint that
 * returns the same FeatureCollection shape. The UI needs no changes.
 */
export const buildSafetyGeoJson = (
  anchor: { lat: number; lng: number },
  radiusM = 2200,
): SafetyFeatureCollection => {
  const rand = seededRandom(Math.round(anchor.lat * 100) * 73856093 ^ Math.round(anchor.lng * 100));
  const levels: SafetyLevel[] = ["safe", "safe", "moderate", "moderate", "risk", "safe", "moderate", "risk"];
  const features: SafetyFeature[] = [];
  const lngScale = Math.cos((anchor.lat * Math.PI) / 180) || 1;
  for (let i = 0; i < levels.length; i++) {
    const ang = (i / levels.length) * Math.PI * 2 + rand() * 0.7;
    const dist = radiusM * (0.3 + rand() * 0.7);
    const lat = anchor.lat + (Math.cos(ang) * dist) / 111320;
    const lng = anchor.lng + (Math.sin(ang) * dist) / (111320 * lngScale);
    features.push({
      type: "Feature",
      properties: {
        level: levels[i]!,
        radius: 300 + rand() * 500,
        source: "placeholder-demo",
      },
      geometry: { type: "Point", coordinates: [lng, lat] },
    });
  }
  return { type: "FeatureCollection", features };
};

/** Flatten a FeatureCollection into scoring zones (Point features + polygons' centroids). */
export const safetyZonesFromGeoJson = (fc: SafetyFeatureCollection | null): SafetyZone[] => {
  if (!fc) return [];
  const zones: SafetyZone[] = [];
  for (const f of fc.features) {
    if (f.geometry.type === "Point") {
      const [lng, lat] = f.geometry.coordinates;
      zones.push({ lat, lng, radius: f.properties.radius ?? 400, level: f.properties.level });
    } else {
      const ring = f.geometry.coordinates[0];
      if (!ring || ring.length === 0) continue;
      const lat = ring.reduce((s, [lng, la]) => s + la, 0) / ring.length;
      const lng = ring.reduce((s, [lo]) => s + lo, 0) / ring.length;
      zones.push({ lat, lng, radius: 500, level: f.properties.level });
    }
  }
  return zones;
};

// ── Routing (OSRM, public API, no key) ───────────────────────────────────────

export type Destination = { lat: number; lng: number; label: string };

export type RouteKind = "safest" | "fastest" | "walking" | "driving";

export type RouteOption = {
  id: RouteKind;
  label: string;
  points: [number, number][];
  durationSec: number;
  distanceM: number;
  safety: "safe" | "moderate" | "caution";
  /** 0–100 safety score against the overlay zones (higher = safer). */
  safetyScore: number;
};

export const etaLabel = (sec: number): string =>
  sec < 60 ? "<1 min" : `${Math.round(sec / 60)} min`;

type GeoHit = { lat: number; lng: number; label: string };

/** Parse Photon (komoot) — { features: [{ geometry: [lng,lat], properties }] }. */
const parsePhoton = (data: unknown): GeoHit[] => {
  const features = (data as { features?: { geometry?: { coordinates?: [number, number] }; properties?: Record<string, string> }[] }).features;
  if (!features?.length) return [];
  return features
    .filter((f) => f.geometry?.coordinates)
    .map((f) => {
      const [lng, lat] = f.geometry!.coordinates!;
      const p = f.properties ?? {};
      const parts = [p.name, p.street, p.suburb, p.district, p.city, p.state, p.country].filter(Boolean);
      return { lat, lng, label: parts.join(", ") || p.name || "Location" };
    });
};

/** Parse Nominatim — array of { lat, lon, display_name }. */
const parseNominatim = (data: unknown): GeoHit[] =>
  (Array.isArray(data) ? data : [])
    .filter((d) => d && d.lat && d.lon)
    .map((d) => ({
      lat: parseFloat(d.lat as string),
      lng: parseFloat(d.lon as string),
      label: (d as { display_name?: string }).display_name ?? "Location",
    }));

/**
 * Destination search — tries Photon (komoot, keyless + CORS-friendly) and
 * Nominatim (OpenStreetMap) in parallel with timeouts, so one flaky/rate-
 * limited geocoder never blocks the picker. First non-empty result wins.
 * TODO(api-key): for production, switch to a keyed geocoder (Mapbox,
 * Google) behind an env var for guaranteed reliability.
 */
export const geocodeSearch = async (q: string): Promise<Destination[]> => {
  const qs = encodeURIComponent(q);
  const tryGeocode = async (url: string, parse: (d: unknown) => GeoHit[]): Promise<GeoHit[]> => {
    try {
      const res = await fetchWithTimeout(url, 5000, { headers: { Accept: "application/json" } });
      if (!res.ok) return [];
      return parse(await res.json());
    } catch {
      return [];
    }
  };

  const [photon, nominatim] = await Promise.all([
    tryGeocode(`https://photon.komoot.io/api/?q=${qs}&limit=5`, parsePhoton),
    tryGeocode(`https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${qs}`, parseNominatim),
  ]);
  const hits = photon.length > 0 ? photon : nominatim;
  return hits.slice(0, 5);
};

type OsrmRoute = {
  distance: number;
  duration: number;
  geometry: { coordinates: [number, number][] };
};

/**
 * OSRM public demo server (no key).
 * TODO(api-key): for production, replace with a commercial routing API
 * (Mapbox Directions, Google Directions) behind an env var key.
 */
const osrmFetch = async (
  profile: "driving" | "walking",
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  alternatives: boolean,
): Promise<OsrmRoute[]> => {
  const res = await fetchWithTimeout(
    `https://router.project-osrm.org/route/v1/${profile}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&alternatives=${alternatives}&steps=false`,
    5000,
  );
  if (!res.ok) throw new Error("osrm failed");
  const data = (await res.json()) as { code: string; routes?: OsrmRoute[] };
  if (data.code !== "Ok" || !data.routes?.length) throw new Error("osrm no route");
  return data.routes;
};

/** Safety score for a polyline sampled against the overlay zones. */
const scoreRoute = (points: [number, number][], zones: SafetyZone[]): number => {
  if (zones.length === 0 || points.length === 0) return 0;
  const step = Math.max(1, Math.floor(points.length / 24));
  let total = 0;
  let count = 0;
  for (let i = 0; i < points.length; i += step) {
    const [lat, lng] = points[i]!;
    let best: { d: number; level: SafetyLevel } | null = null;
    for (const z of zones) {
      const d = haversineMeters(lat, lng, z.lat, z.lng);
      if (!best || d < best.d) best = { d, level: z.level };
    }
    if (best && best.d < 500) {
      total += best.level === "safe" ? 1 : best.level === "moderate" ? 0 : -1;
      count++;
    }
  }
  if (count === 0) return 0;
  return total / count;
};

const safetyLabel = (score: number): RouteOption["safety"] =>
  score > 0.2 ? "safe" : score < -0.1 ? "caution" : "moderate";

/** Map the −1…1 raw score to a 0–100 safety score. */
const toScore100 = (raw: number): number =>
  Math.max(0, Math.min(100, Math.round((raw + 1) * 50)));

const labelOf = (kind: RouteKind): string =>
  kind === "safest"
    ? "Safest Route"
    : kind === "fastest"
      ? "Fastest Route"
      : kind === "walking"
        ? "Walking"
        : "Driving";

/** Straight-line fallback (offline / OSRM unavailable) with honest estimates. */
const fallbackRoute = (
  kind: RouteKind,
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  zones: SafetyZone[],
): RouteOption => {
  const dist = haversineMeters(from.lat, from.lng, to.lat, to.lng);
  const speed = kind === "walking" ? 1.3 : kind === "safest" ? 8.5 : 10.5; // m/s
  const raw = scoreRoute([[from.lat, from.lng], [to.lat, to.lng]], zones);
  return {
    id: kind,
    label: labelOf(kind),
    points: [[from.lat, from.lng], [to.lat, to.lng]],
    durationSec: dist / speed,
    distanceM: dist,
    safety: safetyLabel(raw),
    safetyScore: toScore100(raw),
  };
};

const toOption = (
  kind: RouteKind,
  points: [number, number][],
  durationSec: number,
  distanceM: number,
  zones: SafetyZone[],
): RouteOption => {
  const raw = scoreRoute(points, zones);
  return {
    id: kind,
    label: labelOf(kind),
    points,
    durationSec,
    distanceM,
    safety: safetyLabel(raw),
    safetyScore: toScore100(raw),
  };
};

/**
 * Build the four route options (Safest / Fastest / Walking / Driving).
 * Uses OSRM's public demo API (no key); falls back to straight-line
 * estimates when the network or OSRM is unavailable.
 */
export const fetchRouteOptions = async (
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  zones: SafetyZone[],
): Promise<RouteOption[]> => {
  const straight = [
    fallbackRoute("fastest", from, to, zones),
    fallbackRoute("safest", from, to, zones),
    fallbackRoute("walking", from, to, zones),
    fallbackRoute("driving", from, to, zones),
  ];
  try {
    // Fetch the two profiles independently so one failure never discards the
    // other (e.g. walking unsupported → driving routes still render).
    const [drivingRoutes, walkingRoutes] = await Promise.all([
      osrmFetch("driving", from, to, true).catch(() => [] as OsrmRoute[]),
      osrmFetch("walking", from, to, false).catch(() => [] as OsrmRoute[]),
    ]);
    if (drivingRoutes.length === 0) return straight;

    const map = (r: OsrmRoute): [number, number][] =>
      r.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

    const fastest = drivingRoutes.reduce((a, b) => (a.duration <= b.duration ? a : b));
    const fastestPts = map(fastest);
    // Safest = the driving option (primary or alternative) with the best
    // safety score against the overlay zones; ties go to the fastest.
    const scored = drivingRoutes.map((r) => ({ r, score: scoreRoute(map(r), zones) }));
    const best = scored.sort((a, b) => b.score - a.score || a.r.duration - b.r.duration)[0]!;
    const other = drivingRoutes.find((r) => r !== best.r && r !== fastest) ?? fastest;

    const walking = walkingRoutes[0];
    const options: RouteOption[] = [
      toOption("safest", map(best.r), best.r.duration, best.r.distance, zones),
      toOption("fastest", fastestPts, fastest.duration, fastest.distance, zones),
      ...(walking ? [toOption("walking", map(walking), walking.duration, walking.distance, zones)] : []),
      toOption("driving", map(other), other.duration, other.distance, zones),
    ];
    // Deduplicate identical geometries (primary === alternative on short trips).
    const seen = new Set<string>();
    return options.filter((o) => {
      const key = o.points.map((p) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`).join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  } catch {
    return straight;
  }
};

/** Live-location sharing toggle (localStorage, default ON). */
const SHARING_KEY = "sakhi_location_sharing";

export const isSharingEnabled = (): boolean => {
  try {
    return localStorage.getItem(SHARING_KEY) !== "off";
  } catch {
    return true;
  }
};

export const setSharingEnabled = (on: boolean): void => {
  try {
    if (on) localStorage.removeItem(SHARING_KEY);
    else localStorage.setItem(SHARING_KEY, "off");
  } catch {
    // ignore storage errors
  }
};
