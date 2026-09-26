import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  advanceCheckin,
  beginCheckinMonitoring,
  initialCheckinState,
  DEFAULT_SAFE_CHECKIN_SETTINGS,
  readSafeCheckinSettings,
  writeSafeCheckinSettings,
  checkinStatusLine,
  checkinContextSummary,
  checkinTimelineSteps,
  checkinStepsFromJourneyData,
  journeyEventFromLabel,
  CHECKIN_EVENT_MARKERS,
} from "@/lib/safety/safeCheckin";

const MIN = 60_000;

const run = (
  state = initialCheckinState(),
  input = {},
) =>
  advanceCheckin(state, {
    settings: DEFAULT_SAFE_CHECKIN_SETTINGS,
    ...input,
  });

describe("AI Safe Check-in engine", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("stays in monitoring while the ETA has not passed", () => {
    const armed = beginCheckinMonitoring(Date.now() + 30 * MIN, "jny_1");
    const { state, events } = run(armed, { now: Date.now() + 10 * MIN });
    expect(state.phase).toBe("monitoring");
    expect(events).toEqual([]);
  });

  it("moves monitoring → grace when the ETA passes", () => {
    const eta = Date.now() - 1000;
    const armed = beginCheckinMonitoring(eta, "jny_1");
    const { state, events } = run(armed, { now: eta + 1000 });
    expect(state.phase).toBe("grace");
    expect(events).toEqual([]);
  });

  it("shows the AI check-in only after the grace period ends (5 min default)", () => {
    const eta = 1_000_000;
    const armed = beginCheckinMonitoring(eta, "jny_1");
    // 4 minutes in: still waiting.
    const mid = run(armed, { now: eta + 4 * MIN });
    expect(mid.state.phase).toBe("grace");
    expect(mid.events).toEqual([]);
    // 5 minutes in: check-in appears.
    const after = run(armed, { now: eta + 5 * MIN });
    expect(after.state.phase).toBe("awaiting");
    expect(after.events).toEqual([{ type: "show-checkin" }]);
  });

  it("escalates: check → nudge → guardian alert with default 2-min windows", () => {
    const eta = 1_000_000;
    let { state } = run(beginCheckinMonitoring(eta, "jny_1"), { now: eta + 5 * MIN });
    expect(state.phase).toBe("awaiting");

    // No answer for 2 minutes → nudge.
    const nudge = run(state, { now: eta + 5 * MIN + 2 * MIN });
    expect(nudge.state.phase).toBe("second-awaiting");
    expect(nudge.events).toEqual([{ type: "show-nudge" }]);
    state = nudge.state;

    // Still no answer for another 2 minutes → guardians notified (never SOS).
    const escalated = run(state, { now: eta + 5 * MIN + 4 * MIN });
    expect(escalated.state.phase).toBe("escalated");
    expect(escalated.events).toEqual([{ type: "notify-guardian" }]);
  });

  it("never escalates when autoNotifyGuardian is off", () => {
    const eta = 1_000_000;
    const settings = { ...DEFAULT_SAFE_CHECKIN_SETTINGS, autoNotifyGuardian: false };
    let { state } = advanceCheckin(beginCheckinMonitoring(eta, "jny_1"), { settings, now: eta + 5 * MIN });
    ({ state } = advanceCheckin(state, { settings, now: eta + 7 * MIN }));
    const final = advanceCheckin(state, { settings, now: eta + 9 * MIN });
    expect(final.state.phase).toBe("escalated");
    expect(final.events).toEqual([]);
  });

  it("remembering the acknowledgement stops the ladder and is latched", () => {
    const eta = 1_000_000;
    let { state } = run(beginCheckinMonitoring(eta, "jny_1"), { now: eta + 5 * MIN });
    const ack = run(state, { acknowledged: true, now: eta + 6 * MIN });
    expect(ack.state.phase).toBe("resolved");
    expect(ack.events).toEqual([{ type: "resolved-safe" }]);
    expect(ack.state.acknowledgedAt).toBe(eta + 6 * MIN);

    // Time passes — no further events; acknowledging again does nothing.
    const later = run(ack.state, { now: eta + 60 * MIN });
    expect(later.events).toEqual([]);
    expect(later.state.phase).toBe("resolved");
    const again = run(later.state, { acknowledged: true, now: eta + 61 * MIN });
    expect(again.events).toEqual([]);
  });

  it("arrival or journey end resets monitoring without firing anything", () => {
    const eta = 1_000_000;
    let { state } = run(beginCheckinMonitoring(eta, "jny_1"), { now: eta + 5 * MIN });
    const arrived = run(state, { arrived: true, now: eta + 6 * MIN });
    expect(arrived.state.phase).toBe("monitoring");
    expect(arrived.state.journeyId).toBeNull();
    expect(arrived.events).toEqual([]);
    const ended = run(state, { journeyEnded: true, now: eta + 6 * MIN });
    expect(ended.state.phase).toBe("monitoring");
    expect(ended.events).toEqual([]);
  });

  it("dismiss only hides the sheet — timers keep counting", () => {
    const eta = 1_000_000;
    let { state } = run(beginCheckinMonitoring(eta, "jny_1"), { now: eta + 5 * MIN });
    expect(state.phase).toBe("awaiting");
    const dismissed = run(state, { dismissed: true, now: eta + 5.5 * MIN });
    expect(dismissed.state).toBe(state); // unchanged, timers run on
    // The nudge still arrives on schedule even though the sheet was dismissed.
    const nudge = run(dismissed.state, { now: eta + 7 * MIN });
    expect(nudge.state.phase).toBe("second-awaiting");
    expect(nudge.events).toEqual([{ type: "show-nudge" }]);
  });

  it("respects a custom 15-minute grace period from settings", () => {
    const eta = 1_000_000;
    const settings = { ...DEFAULT_SAFE_CHECKIN_SETTINGS, graceMinutes: 15 };
    const armed = beginCheckinMonitoring(eta, "jny_1");
    const early = advanceCheckin(armed, { settings, now: eta + 10 * MIN });
    expect(early.state.phase).toBe("grace");
    const late = advanceCheckin(armed, { settings, now: eta + 15 * MIN });
    expect(late.state.phase).toBe("awaiting");
    expect(late.events).toEqual([{ type: "show-checkin" }]);
  });
});

describe("AI Safe Check-in settings", () => {
  beforeEach(() => {
    localStorage.removeItem("sakhi_safe_checkin_settings");
  });

  it("falls back to defaults when nothing is stored", () => {
    expect(readSafeCheckinSettings()).toEqual(DEFAULT_SAFE_CHECKIN_SETTINGS);
  });

  it("round-trips a custom grace period", () => {
    writeSafeCheckinSettings({ ...DEFAULT_SAFE_CHECKIN_SETTINGS, graceMinutes: 10 });
    expect(readSafeCheckinSettings().graceMinutes).toBe(10);
  });
});

describe("AI Safe Check-in presentation helpers", () => {
  it("returns no status line before the ETA is missed", () => {
    expect(checkinStatusLine(initialCheckinState())).toBeNull();
  });

  it("describes each escalation phase", () => {
    const eta = 1_000_000;
    let { state } = run(beginCheckinMonitoring(eta, "jny_1"), { now: eta + 5 * MIN });
    expect(checkinStatusLine(state)).toContain("waiting");
    ({ state } = run(state, { now: eta + 7 * MIN }));
    expect(checkinStatusLine(state)).toContain("haven't responded");
    ({ state } = run(state, { now: eta + 9 * MIN }));
    expect(checkinStatusLine(state)).toContain("Guardians");
    expect(checkinContextSummary(state)).toContain("guardians were alerted");
  });

  it("summarises a resolved acknowledgement for the AI companion", () => {
    const eta = 1_000_000;
    let { state } = run(beginCheckinMonitoring(eta, "jny_1"), { now: eta + 5 * MIN });
    ({ state } = run(state, { acknowledged: true }));
    expect(checkinContextSummary(state)).toContain("confirmed they are safe");
  });
});

describe("AI Safe Check-in guardian timeline", () => {
  it("maps phases to the ordered timeline steps", () => {
    expect(checkinTimelineSteps("monitoring", false)).toEqual([]);
    expect(checkinTimelineSteps("grace", false)).toEqual(["started", "eta-missed"]);
    expect(checkinTimelineSteps("awaiting", false)).toEqual(["started", "eta-missed", "check-sent"]);
    expect(checkinTimelineSteps("second-awaiting", false)).toEqual([
      "started",
      "eta-missed",
      "check-sent",
      "no-response",
    ]);
    expect(checkinTimelineSteps("escalated", false)).toEqual([
      "started",
      "eta-missed",
      "check-sent",
      "no-response",
      "guardian-alerted",
    ]);
    // Acknowledged: reached the check but no escalation.
    expect(checkinTimelineSteps("resolved", true)).toEqual(["started", "eta-missed", "check-sent"]);
  });

  it("parses the journey_data payload from active_journeys", () => {
    const data = {
      mode: "walking",
      safeCheckin: { phase: "second-awaiting", acknowledgedAt: null },
    };
    expect(checkinStepsFromJourneyData(data)).toEqual([
      "started",
      "eta-missed",
      "check-sent",
      "no-response",
    ]);
    expect(checkinStepsFromJourneyData(null)).toEqual([]);
    expect(checkinStepsFromJourneyData({ foo: 1 })).toEqual([]);
    expect(checkinStepsFromJourneyData({ safeCheckin: { phase: "bogus" } })).toEqual([]);
  });

  it("maps marked event labels to guardian timeline items", () => {
    const alert = journeyEventFromLabel(
      `${CHECKIN_EVENT_MARKERS.guardianAlert} The user has not responded after missing the expected arrival time.`,
    );
    expect(alert?.kind).toBe("guardian-alerted");
    expect(journeyEventFromLabel("Route deviation: moved 200m off route")).toBeNull();
    expect(journeyEventFromLabel(null)).toBeNull();
  });
});
