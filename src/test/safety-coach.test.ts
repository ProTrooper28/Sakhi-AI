import { describe, it, expect } from "vitest";
import {
  coachScenarioFor,
  coachContextSuggestion,
  coachTipForSlot,
  COACH_TIPS,
  coachHintForContext,
  readCoachSettings,
  writeCoachSettings,
  DEFAULT_COACH_SETTINGS,
  COACH_SCENARIO_IDS,
} from "@/lib/safety/safetyCoach";
import type { ChatUserContext } from "@/lib/chatApi";

const baseCtx: ChatUserContext = {
  userName: "Anshu",
  journeyStatus: "none",
  voiceEnabled: true,
  shakeEnabled: false,
  guardianLinked: true,
};

describe("AI Safety Coach — scenario coaching", () => {
  it("coaches 'travelling alone' with journey + guardian actions", () => {
    const c = coachScenarioFor("I'm travelling alone right now", baseCtx);
    expect(c?.id).toBe("travelling-alone");
    expect(c?.reply).toContain("sharing your Safety Journey");
    expect(c?.actions.map((a) => a.action)).toEqual(["start-journey", "notify-guardian"]);
  });

  it("coaches 'travelling at night' with voice SOS + share location", () => {
    const c = coachScenarioFor("I'm travelling at night", baseCtx);
    expect(c?.id).toBe("travelling-night");
    expect(c?.reply).toContain("well-lit roads");
    expect(c?.actions.map((a) => a.action)).toContain("enable-voice");
  });

  it("coaches 'going to meet someone' with share journey + guardian", () => {
    const c = coachScenarioFor("I'm going to meet someone from an app today", baseCtx);
    expect(c?.id).toBe("meeting-someone");
    expect(c?.reply).toContain("trusted contact");
    expect(c?.actions.map((a) => a.action)).toContain("start-journey");
    expect(c?.actions.map((a) => a.action)).toContain("notify-guardian");
  });

  it("coaches cab rides with journey monitoring", () => {
    const c = coachScenarioFor("I'm taking a cab home", baseCtx);
    expect(c?.id).toBe("cab-auto");
  });

  it("returns null for non-scenario messages", () => {
    expect(coachScenarioFor("what's the emergency number?", baseCtx)).toBeNull();
    expect(coachScenarioFor("hi didi", baseCtx)).toBeNull();
    expect(coachScenarioFor("", baseCtx)).toBeNull();
  });
});

describe("AI Safety Coach — context suggestions", () => {
  it("prioritises low battery below 15%", () => {
    const s = coachContextSuggestion({ batteryLevel: 12, batteryCharging: false, guardianLinked: true });
    expect(s?.id).toBe("battery-low");
    expect(s?.text).toContain("battery is running low");
    expect(s?.actions.map((a) => a.action)).toEqual(["share-location", "notify-guardian"]);
  });

  it("stays quiet when charging even at 10%", () => {
    expect(coachContextSuggestion({ batteryLevel: 10, batteryCharging: true, guardianLinked: true })).toBeNull();
  });

  it("flags an overdue journey that has not been acknowledged", () => {
    const s = coachContextSuggestion({ journeyStatus: "active", journeyOverdueMin: 9, safeCheckinAcknowledged: false, guardianLinked: true });
    expect(s?.id).toBe("journey-overdue");
    // Acknowledged → no overdue nagging (next gap takes over instead).
    const next = coachContextSuggestion({ journeyStatus: "active", journeyOverdueMin: 9, safeCheckinAcknowledged: true, voiceEnabled: true, shakeEnabled: true, guardianLinked: true });
    expect(next).toBeNull();
  });

  it("suggests arming silent triggers during a journey", () => {
    const s = coachContextSuggestion({ journeyStatus: "active", voiceEnabled: false, shakeEnabled: false, guardianLinked: true });
    expect(s?.id).toBe("triggers-off");
    expect(s?.actions.map((a) => a.action)).toEqual(["enable-voice", "enable-shake"]);
  });

  it("suggests linking a guardian when none is linked", () => {
    const s = coachContextSuggestion({});
    expect(s?.id).toBe("no-guardian");
    expect(s?.actions[0].label).toContain("Guardian Dashboard");
  });

  it("returns null when everything is healthy", () => {
    expect(
      coachContextSuggestion({
        batteryLevel: 80,
        batteryCharging: false,
        journeyStatus: "active",
        voiceEnabled: true,
        shakeEnabled: true,
        guardianLinked: true,
      }),
    ).toBeNull();
  });
});

describe("AI Safety Coach — tips and hints", () => {
  it("rotates through the required tips, one per slot", () => {
    expect(COACH_TIPS.length).toBeGreaterThanOrEqual(5);
    expect(coachTipForSlot(0)).toBe(COACH_TIPS[0]);
    expect(coachTipForSlot(1)).toBe(COACH_TIPS[1]);
    // Wraps around.
    expect(coachTipForSlot(COACH_TIPS.length)).toBe(COACH_TIPS[0]);
  });

  it("builds a situation hint from context", () => {
    const hint = coachHintForContext({
      ...baseCtx,
      journeyStatus: "active",
      journeyDestination: "Bandra West, Mumbai",
      batteryLevel: 9,
      batteryCharging: false,
    });
    expect(hint).toContain("active Safety Journey is running to Bandra West");
    expect(hint).toContain("battery is critically low at 9%");
    // Healthy context → empty hint.
    expect(coachHintForContext({ ...baseCtx, batteryLevel: 90 })).toBe("");
  });
});

describe("AI Safety Coach — settings", () => {
  it("falls back to defaults and round-trips", () => {
    expect(readCoachSettings()).toEqual(DEFAULT_COACH_SETTINGS);
    writeCoachSettings({ enabled: false, frequency: "high" });
    expect(readCoachSettings()).toEqual({ enabled: false, frequency: "high" });
  });

  it("exposes every scenario id for the settings/docs", () => {
    expect(COACH_SCENARIO_IDS).toEqual(["meeting-someone", "travelling-alone", "travelling-night", "cab-auto"]);
  });
});
