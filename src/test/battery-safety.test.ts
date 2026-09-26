import { describe, it, expect, beforeEach } from "vitest";
import {
  advanceBatteryAlerts,
  batteryLevelFor,
  batteryCriticalPct,
  batteryColor,
  batteryGauge,
  batteryAlertLabel,
  batteryEventFromLabel,
  batteryContextSummary,
  initialBatteryAlertState,
  readBatterySettings,
  writeBatterySettings,
  DEFAULT_BATTERY_SETTINGS,
  BATTERY_EVENT_MARKER,
  type BatteryAlertState,
} from "@/lib/safety/batterySafety";

describe("Battery-Aware Safety engine", () => {
  it("classifies battery bands against fixed thresholds", () => {
    expect(batteryLevelFor(86, 10)).toBeNull();
    expect(batteryLevelFor(34, 10)).toBeNull();
    expect(batteryLevelFor(30, 10)).toBe("info");
    expect(batteryLevelFor(18, 10)).toBe("warning");
    expect(batteryLevelFor(9, 10)).toBe("critical");
    expect(batteryLevelFor(4, 10)).toBe("emergency");
    expect(batteryLevelFor(null, 10)).toBeNull();
    expect(batteryLevelFor(101, 10)).toBeNull();
  });

  it("respects the user's threshold setting, clamped to 10–20", () => {
    expect(batteryCriticalPct(10)).toBe(10);
    expect(batteryCriticalPct(15)).toBe(15);
    expect(batteryCriticalPct(20)).toBe(20);
    expect(batteryLevelFor(14, 15)).toBe("critical");
    expect(batteryLevelFor(16, 15)).toBe("warning");
  });

  it("fires warning → critical → emergency once per journey, superseding pending bands", () => {
    let state: BatteryAlertState = initialBatteryAlertState();
    const journeyId = "jny_1";

    // Healthy → quiet.
    let res = advanceBatteryAlerts(state, { journeyId, level: 80, settings: DEFAULT_BATTERY_SETTINGS });
    expect(res.events).toEqual([]);

    // 20% → warning toast only.
    res = advanceBatteryAlerts(res.state, { journeyId, level: 20, settings: DEFAULT_BATTERY_SETTINGS });
    expect(res.events).toEqual([{ type: "warning", level: "warning" }]);

    // Still 20% on the next tick → nothing new.
    res = advanceBatteryAlerts(res.state, { journeyId, level: 20, settings: DEFAULT_BATTERY_SETTINGS });
    expect(res.events).toEqual([]);

    // Plunge to 4% → emergency fires alone (supersedes the pending critical).
    res = advanceBatteryAlerts(res.state, { journeyId, level: 4, settings: DEFAULT_BATTERY_SETTINGS });
    expect(res.events).toEqual([{ type: "emergency", level: "emergency" }]);

    state = res.state;
    expect(state.fired).toEqual(["warning", "emergency"]);
    expect(state.lastLevelPct).toBe(4);
  });

  it("never fires when the battery is unknown or charging is handled by the caller", () => {
    let res = advanceBatteryAlerts(initialBatteryAlertState(), { journeyId: "jny_1", level: null, settings: DEFAULT_BATTERY_SETTINGS });
    expect(res.events).toEqual([]);
  });

  it("silences everything when the feature is disabled", () => {
    const settings = { ...DEFAULT_BATTERY_SETTINGS, enabled: false };
    const res = advanceBatteryAlerts(initialBatteryAlertState(), { journeyId: "jny_1", level: 4, settings });
    expect(res.events).toEqual([]);
  });

  it("resets the ladder when a new journey starts", () => {
    const settings = DEFAULT_BATTERY_SETTINGS;
    let res = advanceBatteryAlerts(initialBatteryAlertState(), { journeyId: "jny_1", level: 20, settings });
    res = advanceBatteryAlerts(res.state, { journeyId: "jny_1", level: 4, settings });
    expect(res.state.fired).toEqual(["warning", "emergency"]);

    // New journey → fresh ladder; 20% warns again.
    res = advanceBatteryAlerts(res.state, { journeyId: "jny_2", level: 20, settings });
    expect(res.events).toEqual([{ type: "warning", level: "warning" }]);
    expect(res.state.journeyId).toBe("jny_2");
  });

  it("reports the current band once; the caller decides the guardian push", () => {
    // The engine reports the event; the caller checks autoNotifyGuardian.
    const res = advanceBatteryAlerts(initialBatteryAlertState(), { journeyId: "jny_1", level: 8, settings: DEFAULT_BATTERY_SETTINGS });
    expect(res.events.map((e) => e.type)).toEqual(["critical"]);
  });
});

describe("Battery-Aware Safety settings", () => {
  beforeEach(() => {
    localStorage.removeItem("sakhi_battery_settings");
  });

  it("falls back to defaults and round-trips a custom threshold", () => {
    expect(readBatterySettings()).toEqual(DEFAULT_BATTERY_SETTINGS);
    writeBatterySettings({ ...DEFAULT_BATTERY_SETTINGS, thresholdPercent: 15 });
    expect(readBatterySettings().thresholdPercent).toBe(15);
  });
});

describe("Battery-Aware Safety guardian payload", () => {
  it("builds and parses the marked alert label", () => {
    const maps = "https://www.google.com/maps/search/?api=1&query=19.07,72.87";
    const label = batteryAlertLabel({ userName: "Anshu", batteryPct: 7, at: new Date("2026-09-26T20:42:00").getTime(), mapsUrl: maps });
    expect(label.startsWith(BATTERY_EVENT_MARKER)).toBe(true);
    expect(label).toContain("Anshu's phone battery is critically low (7%)");
    expect(label).toContain(maps);

    const parsed = batteryEventFromLabel(label);
    expect(parsed?.summary).toContain("(7%)");
    expect(batteryEventFromLabel("Route deviation: off route")).toBeNull();
    expect(batteryEventFromLabel(null)).toBeNull();
  });
});

describe("Battery-Aware Safety presentation", () => {
  it("uses the yellow → orange → red colour ramp", () => {
    expect(batteryColor("info")).toBe("#B7770D");
    expect(batteryColor("warning")).toBe("#B7770D");
    expect(batteryColor("critical")).toBe("#D9730D");
    expect(batteryColor("emergency")).toBe("#B8324A");
  });

  it("maps guardian gauge emojis to bands", () => {
    expect(batteryGauge(86).emoji).toBe("🟢");
    expect(batteryGauge(34).emoji).toBe("🟡");
    expect(batteryGauge(18).emoji).toBe("🟠");
    expect(batteryGauge(6).emoji).toBe("🔴");
    expect(batteryGauge(null).emoji).toBe("⚪");
  });

  it("summarises battery status for the AI companion", () => {
    expect(batteryContextSummary(80, 10)).toBeNull();
    expect(batteryContextSummary(15, 10)).toContain("battery low");
    expect(batteryContextSummary(7, 10)).toContain("critically low");
    expect(batteryContextSummary(7, 10)).toContain("active Safety Journey");
    expect(batteryContextSummary(3, 10)).toContain("almost dead");
  });
});
