/**
 * Community Safety Map — foundation for community-driven safety data.
 *
 * Architecture: the UI renders `CommunityReport[]` and never cares where the
 * rows came from. Today a deterministic placeholder generator produces
 * clearly-labelled community reports around the user's position; a real
 * source (anonymous server reports, official open data, a third-party API)
 * can be swapped in by replacing `getCommunityReports` with a fetch — zero UI
 * changes.
 *
 * Reports are ALWAYS marked with a source:
 *   "community"  — submitted by other users (unverified, shown distinctly)
 *   "official"   — verified data (police/city open data — future)
 *   "mine"       — this user's own anonymous submission (local only)
 */

import { haversineMeters } from "@/pages/location/helpers";

export type CommunityReportSource = "community" | "official" | "mine";

export type CommunityReportCategory =
  | "harassment"
  | "stalking"
  | "theft"
  | "dark-area"
  | "suspicious"
  | "safe-place";

export type CommunityReport = {
  id: string;
  category: CommunityReportCategory;
  lat: number;
  lng: number;
  label: string;
  /** Short description (sanitized, no personal data). */
  note: string;
  timestamp: string;
  source: CommunityReportSource;
  /** 0–100 confidence that this report is accurate. */
  confidence: number;
};

export const COMMUNITY_CATEGORY_META: Record<
  CommunityReportCategory,
  { label: string; color: string; emoji: string }
> = {
  harassment: { label: "Harassment", color: "#D4455C", emoji: "⚠️" },
  stalking: { label: "Stalking", color: "#B8324A", emoji: "👀" },
  theft: { label: "Theft", color: "#E67E22", emoji: "🛍️" },
  "dark-area": { label: "Poorly Lit", color: "#7A2B73", emoji: "🌑" },
  suspicious: { label: "Suspicious Activity", color: "#B7770D", emoji: "❓" },
  "safe-place": { label: "Safe Spot", color: "#3D9970", emoji: "✅" },
};

export const SOURCE_META: Record<CommunityReportSource, { label: string; badge: string }> = {
  community: { label: "Community Report", badge: "Community" },
  official: { label: "Verified / Official", badge: "Verified" },
  mine: { label: "Your Report", badge: "You" },
};

const CATEGORIES: CommunityReportCategory[] = [
  "harassment",
  "dark-area",
  "suspicious",
  "safe-place",
  "theft",
  "stalking",
  "dark-area",
  "safe-place",
];

/** Deterministic LCG so placeholder reports are stable for a given anchor. */
const seededRandom = (seed: number): (() => number) => {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

/**
 * Placeholder community data — deterministic reports around the anchor.
 * TODO(real-data): replace with `fetch("/api/community-reports")` returning
 * the same shape. The UI needs no changes.
 */
export const getCommunityReports = (
  anchor: { lat: number; lng: number },
  count = 6,
): CommunityReport[] => {
  const rand = seededRandom(Math.round(anchor.lat * 100) * 486187739 ^ Math.round(anchor.lng * 100));
  const out: CommunityReport[] = [];
  const lngScale = Math.cos((anchor.lat * Math.PI) / 180) || 1;
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2 + rand() * 0.8;
    const dist = 400 + rand() * 1400;
    const lat = anchor.lat + (Math.cos(ang) * dist) / 111320;
    const lng = anchor.lng + (Math.sin(ang) * dist) / (111320 * lngScale);
    const cat = CATEGORIES[i % CATEGORIES.length]!;
    out.push({
      id: `cr_${i}_${Math.round(anchor.lat * 100)}_${Math.round(anchor.lng * 100)}`,
      category: cat,
      lat,
      lng,
      label: "Reported nearby",
      note:
        cat === "safe-place"
          ? "Someone marked this area as safe during the evening."
          : cat === "dark-area"
            ? "Multiple users flagged poor lighting here at night."
            : "A user shared a brief safety note in this area.",
      timestamp: new Date(now - (i + 1) * 3600_000 * 4).toISOString(),
      source: i === 0 ? "official" : i === count - 1 ? "mine" : "community",
      confidence: i === 0 ? 92 : 45 + Math.floor(rand() * 40),
    });
  }
  return out.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

/** Local anonymous submissions (persisted in localStorage). */
const LOCAL_KEY = "sakhi_community_reports";

export const readLocalCommunityReports = (): CommunityReport[] => {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as CommunityReport[]) : [];
  } catch {
    return [];
  }
};

export const submitCommunityReport = (
  p: Omit<CommunityReport, "id" | "timestamp" | "source" | "confidence">,
): CommunityReport => {
  const report: CommunityReport = {
    ...p,
    id: `cr_local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    source: "mine",
    confidence: 60,
  };
  try {
    const all = [report, ...readLocalCommunityReports()].slice(0, 20);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
  return report;
};

/** Merge placeholder + local reports, nearest first. */
export const mergeCommunityReports = (
  anchor: { lat: number; lng: number },
): CommunityReport[] => {
  const base = getCommunityReports(anchor);
  const local = readLocalCommunityReports();
  const all = [...local, ...base];
  return all.sort(
    (a, b) =>
      haversineMeters(a.lat, a.lng, anchor.lat, anchor.lng) -
      haversineMeters(b.lat, b.lng, anchor.lat, anchor.lng),
  );
};
