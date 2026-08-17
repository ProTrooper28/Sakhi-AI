import { describe, it, expect, beforeEach } from "vitest";
import {
  startJourney,
  readJourney,
  clearJourney,
  evaluatePosition,
  analyzeDeviation,
  recommendForText,
  analyzeSafetyIntent,
  generateInsights,
  GPS_LOSS_ALERT_SEC,
  type TravelMode,
} from "@/lib/safety";

const DEST = { lat: 19.07, lng: 72.83, label: "Test Destination" };

const startTestJourney = (mode: TravelMode = "walking") =>
  startJourney({
    destination: DEST,
    mode,
    routePoints: [
      [19.0596, 72.8295],
      [19.064, 72.8298],
      [19.068, 72.8301],
      [19.07, 72.83],
    ],
    distanceM: 1200,
    durationSec: 900,
  });

describe("safety journey engine", () => {
  beforeEach(() => {
    clearJourney();
  });

  it("starts a journey in active status and persists it", () => {
    const j = startTestJourney("cab");
    expect(j.status).toBe("active");
    expect(j.destination?.label).toBe("Test Destination");
    expect(j.mode).toBe("cab");
    expect(readJourney().id).toBe(j.id);
  });

  it("completes the journey when the user reaches the destination", () => {
    const j = startTestJourney();
    const { journey, alerts } = evaluatePosition(j, { lat: DEST.lat, lng: DEST.lng });
    expect(journey.status).toBe("completed");
    expect(alerts.some((a) => a.kind === "arrived")).toBe(true);
  });

  it("records movement progress without completing early", () => {
    const j = startTestJourney();
    // First fix seeds the start position; the second fix measures movement.
    const first = evaluatePosition(j, { lat: 19.0596, lng: 72.8295 });
    expect(first.journey.status).toBe("active");
    const second = evaluatePosition(first.journey, { lat: 19.064, lng: 72.8298 });
    expect(second.journey.status).toBe("active");
    expect(second.journey.progressM).toBeGreaterThan(0);
  });
});

describe("route deviation detection", () => {
  const route: [number, number][] = [
    [19.0596, 72.8295],
    [19.064, 72.8298],
    [19.07, 72.83],
  ];

  it("flags a large deviation from the planned route", () => {
    // ~1.2km away from the route line (0.01 deg lat ≈ 1.1 km)
    const res = analyzeDeviation({ lat: 19.0596, lng: 72.84 }, route, 1200);
    expect(res.deviated).toBe(true);
    expect(res.message).toContain("Are you okay");
  });

  it("stays quiet when the position is on the route", () => {
    const res = analyzeDeviation({ lat: 19.064, lng: 72.8298 }, route, 1200);
    expect(res.deviated).toBe(false);
    expect(res.message).toBeNull();
  });
});

describe("AI safety recommendations", () => {
  it("recognises a stalking concern and recommends actions", () => {
    const rec = recommendForText("I think someone is following me");
    expect(rec.intent).toBe("following");
    expect(rec.escalate).toBe(true);
    expect(rec.actions.map((a) => a.id)).toContain("start-journey");
    expect(rec.actions.map((a) => a.id)).toContain("prepare-sos");
  });

  it("recognises a cab route concern", () => {
    expect(analyzeSafetyIntent("my cab took another route")).toBe("cab-route");
  });

  it("keeps replies short and action-oriented", () => {
    const rec = recommendForText("I'm walking home alone");
    expect(rec.reply.length).toBeLessThan(220);
  });
});

describe("monitoring options", () => {
  it("persists ride details, monitoring toggles and trusted contact", () => {
    const j = startJourney({
      destination: DEST,
      mode: "cab",
      routePoints: [[19.0596, 72.8295], [19.07, 72.83]],
      distanceM: 1200,
      durationSec: 600,
      rideDetails: { cabNumber: "42", vehiclePlate: "MH 01 AB 1234", driverName: "Raj" },
      monitoring: { detectDeviation: false, alertLongJourney: false },
      trustedContactId: "mother",
    });
    expect(j.rideDetails?.driverName).toBe("Raj");
    expect(j.monitoring.detectDeviation).toBe(false);
    expect(j.monitoring.notifyOnArrival).toBe(true); // defaults stay on
    expect(j.trustedContactId).toBe("mother");
    expect(readJourney().rideDetails?.vehiclePlate).toBe("MH 01 AB 1234");
  });

  it("skips deviation alerts when the monitor toggle is off", () => {
    const j = startJourney({
      destination: DEST,
      mode: "walking",
      routePoints: [[19.0596, 72.8295], [19.07, 72.83]],
      distanceM: 1200,
      durationSec: 600,
      monitoring: { detectDeviation: false },
    });
    const { alerts } = evaluatePosition(j, { lat: 19.0596, lng: 72.84 });
    expect(alerts.some((a) => a.kind === "deviation")).toBe(false);
  });

  it("alerts on GPS loss after a fix goes stale", () => {
    const j = startTestJourney();
    const first = evaluatePosition(j, { lat: 19.0596, lng: 72.8295 });
    // Simulate a fix that went stale (lastPosition older than the threshold).
    const stale = {
      ...first.journey,
      lastPosition: { lat: 19.0596, lng: 72.8295, at: Date.now() - GPS_LOSS_ALERT_SEC * 1000 - 5000 },
    };
    const { alerts } = evaluatePosition(stale, null);
    expect(alerts.some((a) => a.message.includes("GPS signal lost"))).toBe(true);
  });

  it("alerts when the journey runs unusually long", () => {
    const j = startTestJourney("walking"); // durationSec: 900
    const backdated = {
      ...j,
      startedAt: new Date(Date.now() - 2000 * 1000).toISOString(),
    };
    const { alerts } = evaluatePosition(backdated, { lat: 19.064, lng: 72.8298 });
    expect(alerts.some((a) => a.message.includes("longer than expected"))).toBe(true);
  });
});

describe("AI safety insights", () => {
  it("generates reassuring, short insights", () => {
    const insights = generateInsights({
      journeyActive: true,
      progressPct: 0.6,
      remainingM: 480,
      etaMs: Date.now() + 3 * 60_000,
      gpsOk: true,
      guardianTracking: true,
    });
    expect(insights.length).toBeGreaterThanOrEqual(2);
    expect(insights[0]!.length).toBeLessThan(90);
  });

  it("mentions low battery when relevant", () => {
    const insights = generateInsights({ gpsOk: false, battery: 12 });
    expect(insights.some((i) => i.includes("battery"))).toBe(true);
  });
});
