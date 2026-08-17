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
export const reverseGeocode = async (lat: number, lng: number): Promise<GeocodeResult> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
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
