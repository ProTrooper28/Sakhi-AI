import { describe, it, expect } from "vitest";
import {
  calculateSafetyScore,
  analyzeRouteSafety,
  rankRoutes,
  riskLevelFromScore,
  generateExplanation,
  sampleRoutePoints,
  type RouteSafetyContext,
  type EmergencyService,
} from "@/lib/safety/safetyScore";
import type { RouteOption, SafetyZone } from "@/pages/location/helpers";
import type { CommunityReport } from "@/lib/safety/communitySafety";

const DAY_MS = new Date("2026-09-23T14:00:00").getTime(); // 2 PM — daylight
const NIGHT_MS = new Date("2026-09-23T23:30:00").getTime(); // 11:30 PM

const route = (over: Partial<RouteOption> = {}): RouteOption => ({
  id: "fastest",
  label: "Fastest Route",
  points: [
    [19.0596, 72.8295],
    [19.064, 72.8298],
    [19.07, 72.83],
  ],
  durationSec: 600,
  distanceM: 1200,
  safety: "moderate",
  safetyScore: 50,
  ...over,
});

const report = (over: Partial<CommunityReport>): CommunityReport => ({
  id: "cr_test",
  category: "harassment",
  lat: 19.064,
  lng: 72.8298,
  label: "Reported nearby",
  note: "test",
  timestamp: new Date(Date.now() - 3600_000).toISOString(),
  source: "community",
  confidence: 80,
  ...over,
});

const context = (over: Partial<RouteSafetyContext> = {}): RouteSafetyContext => ({
  zones: [],
  reports: [],
  services: [
    { kind: "police", lat: 19.0605, lng: 72.8296, name: "PS" },
    { kind: "hospital", lat: 19.0605, lng: 72.8296, name: "Hosp" },
  ],
  startedAtMs: DAY_MS,
  mode: "walking",
  ...over,
});

const policeFar: EmergencyService[] = [
  { kind: "police", lat: 19.2, lng: 73.0, name: "Far PS" },
  { kind: "hospital", lat: 19.2, lng: 73.0, name: "Far Hosp" },
];

describe("risk levels", () => {
  it("maps 0–100 scores to the spec'd risk bands", () => {
    expect(riskLevelFromScore(92)).toBe("safe");
    expect(riskLevelFromScore(80)).toBe("safe");
    expect(riskLevelFromScore(79)).toBe("moderate");
    expect(riskLevelFromScore(60)).toBe("moderate");
    expect(riskLevelFromScore(59)).toBe("high");
    expect(riskLevelFromScore(10)).toBe("high");
  });
});

describe("calculateSafetyScore", () => {
  it("scores daylight + close emergency services high", () => {
    const { score } = calculateSafetyScore(route(), context());
    expect(score).toBeGreaterThan(70);
  });

  it("penalises late-night travel", () => {
    const day = calculateSafetyScore(route(), context({ startedAtMs: DAY_MS })).score;
    const night = calculateSafetyScore(route(), context({ startedAtMs: NIGHT_MS })).score;
    expect(night).toBeLessThan(day);
  });

  it("penalises negative community reports near the route", () => {
    const clean = calculateSafetyScore(route(), context()).score;
    const reported = calculateSafetyScore(
      route(),
      context({ reports: [report({}), report({ id: "cr2", category: "stalking", lat: 19.07, lng: 72.83 })] }),
    ).score;
    expect(reported).toBeLessThan(clean);
  });

  it("rewards community safe spots and penalises risk zones", () => {
    const zones: SafetyZone[] = [{ lat: 19.064, lng: 72.8298, radius: 500, level: "risk" }];
    const withRiskZone = calculateSafetyScore(route(), context({ zones })).score;
    const withSafeZone = calculateSafetyScore(
      route(),
      context({ zones: [{ ...zones[0]!, level: "safe" }] }),
    ).score;
    expect(withRiskZone).toBeLessThan(withSafeZone);
  });

  it("scores routes far from police/hospitals lower", () => {
    const near = calculateSafetyScore(route(), context()).score;
    const far = calculateSafetyScore(route(), context({ services: policeFar })).score;
    expect(far).toBeLessThan(near);
  });

  it("always returns a score within 0–100 and 7 factors", () => {
    const { score, factors } = calculateSafetyScore(route(), context({ zones: [], reports: [], services: [] }));
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
    expect(factors).toHaveLength(7);
    const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
    expect(totalWeight).toBeCloseTo(1);
  });
});

describe("generateReason + generateExplanation", () => {
  it("lists reasons for a good route and warnings for a bad one", () => {
    const good = analyzeRouteSafety(route(), context(), { isSafest: true });
    expect(good.reasons.length).toBeGreaterThan(0);
    expect(good.warnings.length).toBe(0);

    const bad = analyzeRouteSafety(
      route(),
      context({
        services: policeFar,
        reports: [report({}), report({ id: "c2", category: "theft" }), report({ id: "c3", category: "dark-area" }), report({ id: "c4", category: "suspicious" })],
        startedAtMs: NIGHT_MS,
      }),
    );
    expect(bad.warnings.length).toBeGreaterThan(0);
    expect(bad.riskLevel).not.toBe("safe");
  });

  it("produces readable explanations mentioning the time tradeoff", () => {
    const safest = analyzeRouteSafety(route({ id: "safest" }), context(), { isSafest: true });
    expect(safest.explanation).toContain("recommended");
    expect(safest.explanation.length).toBeGreaterThan(30);

    const fast = analyzeRouteSafety(route(), context(), { isFastest: true, timeDeltaMinVsFastest: 0 });
    const slowerSafest = analyzeRouteSafety(route({ id: "safest" }), context(), {
      isSafest: true,
      isFastest: false,
      timeDeltaMinVsFastest: 2,
    });
    expect(fast.explanation.length).toBeGreaterThan(20);
    expect(generateExplanation(slowerSafest, { isSafest: true, timeDeltaMinVsFastest: 2 })).toContain("2 min");
    expect(fast.explanation).toContain("quickest");
  });
});

describe("rankRoutes", () => {
  it("marks exactly one recommended route and sorts it first", () => {
    const safest: RouteOption = {
      ...route({ id: "safest", label: "Safest Route" }),
      durationSec: 720,
    };
    const fast = route();
    const scored = rankRoutes([fast, safest], context());
    expect(scored).toHaveLength(2);
    expect(scored.filter((s) => s.recommended)).toHaveLength(1);
    expect(scored[0]!.recommended).toBe(true);
    expect(scored[0]!.isSafest).toBe(true);
  });

  it("flags the safest route's extra minutes vs the fastest", () => {
    const safest: RouteOption = { ...route({ id: "safest" }), durationSec: 720 };
    const fast = route(); // 600 s = 10 min
    const scored = rankRoutes([fast, safest], context());
    const safestEntry = scored.find((s) => s.route.id === "safest")!;
    expect(safestEntry.timeDeltaMinVsFastest).toBe(2);
    const fastestEntry = scored.find((s) => s.route.id === "fastest")!;
    expect(fastestEntry.isFastest).toBe(true);
    expect(fastestEntry.timeDeltaMinVsFastest).toBe(0);
  });

  it("returns [] for empty input", () => {
    expect(rankRoutes([], context())).toEqual([]);
  });
});

describe("sampleRoutePoints", () => {
  it("caps long polylines and keeps the destination", () => {
    const long: [number, number][] = Array.from({ length: 500 }, (_, i) => [19 + i * 0.0001, 72 + i * 0.0001]);
    const sampled = sampleRoutePoints(long, 24);
    expect(sampled.length).toBeLessThanOrEqual(25);
    expect(sampled[sampled.length - 1]).toEqual(long[long.length - 1]);
  });
});
