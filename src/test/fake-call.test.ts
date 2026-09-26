import { describe, it, expect } from "vitest";
import {
  FAKE_CALLERS,
  FAKE_CALL_DELAYS,
  FAKE_CALL_AUDIOS,
  fakeCallerFor,
  fakeCallAudioFor,
  scheduleFakeCall,
  advanceFakeCall,
  fakeCallCountdownSec,
  initialFakeCallState,
  readFakeCallSettings,
  writeFakeCallSettings,
  DEFAULT_FAKE_CALL_SETTINGS,
} from "@/lib/safety/fakeCall";

describe("Fake Call engine", () => {
  it("offers the required caller presets with a custom option", () => {
    const ids = FAKE_CALLERS.map((c) => c.id);
    expect(ids).toEqual(["mom", "dad", "brother", "office", "friend", "custom"]);
    expect(FAKE_CALLERS.find((c) => c.id === "mom")?.name).toBe("Mom");
  });

  it("offers the required delays including Immediately", () => {
    expect(FAKE_CALL_DELAYS.map((d) => d.value)).toEqual([0, 10, 30, 60, 120]);
    expect(FAKE_CALL_DELAYS[0].label).toBe("Immediately");
  });

  it("ships the three scripted conversations plus a silent option", () => {
    expect(FAKE_CALL_AUDIOS.map((a) => a.id)).toEqual(["waiting", "almost", "cab", "none"]);
    expect(fakeCallAudioFor("waiting")).toContain("waiting outside");
    expect(fakeCallAudioFor("almost")).toContain("almost there");
    expect(fakeCallAudioFor("cab")).toContain("cab has arrived");
    expect(fakeCallAudioFor("none")).toBe("");
    expect(fakeCallAudioFor("bogus" as never)).toBe("");
  });

  it("schedules a call with the chosen delay and rings when time is up", () => {
    const now = 1_000_000;
    const scheduled = scheduleFakeCall(
      { callerId: "mom", callerName: "Mom", delaySec: 30, audioId: "waiting" },
      now,
    );
    expect(scheduled.status).toBe("pending");
    expect(scheduled.ringAt).toBe(now + 30_000);

    // Not yet.
    const early = advanceFakeCall(scheduled, now + 29_999);
    expect(early.fired).toBe(false);
    expect(early.state.status).toBe("pending");

    // Ring!
    const ring = advanceFakeCall(scheduled, now + 30_000);
    expect(ring.fired).toBe(true);
    expect(ring.state.status).toBe("ringing");

    // Immediate calls ring on the very first tick.
    const immediate = scheduleFakeCall(
      { callerId: "office", callerName: "Office", delaySec: 0, audioId: "cab" },
      now,
    );
    expect(advanceFakeCall(immediate, now).fired).toBe(true);
  });

  it("counts down the seconds while pending and stays quiet otherwise", () => {
    const now = 1_000_000;
    const scheduled = scheduleFakeCall(
      { callerId: "dad", callerName: "Dad", delaySec: 120, audioId: "almost" },
      now,
    );
    expect(fakeCallCountdownSec(scheduled, now + 1000)).toBe(119);
    expect(fakeCallCountdownSec(scheduled, now + 120_000)).toBe(0);
    expect(fakeCallCountdownSec(initialFakeCallState(), now)).toBeNull();
  });

  it("resolves custom caller names with a derived avatar initial", () => {
    const caller = fakeCallerFor({
      callerId: "custom",
      callerName: "Priya",
      delaySec: 0,
      audioId: "waiting",
    });
    expect(caller?.name).toBe("Priya");
    expect(caller?.initials).toBe("P");
    // Custom with an empty name falls back to the preset list.
    expect(fakeCallerFor({ callerId: "custom", callerName: "", delaySec: 0, audioId: "waiting" })?.id).toBe("custom");
    expect(fakeCallerFor(null)).toBeNull();
  });

  it("never arms emergency machinery — the request carries no SOS/guardian fields", () => {
    const scheduled = scheduleFakeCall(
      { callerId: "friend", callerName: "Friend", delaySec: 10, audioId: "waiting" },
      Date.now(),
    );
    expect(Object.keys(scheduled.request ?? {})).toEqual(["callerId", "callerName", "delaySec", "audioId"]);
  });
});

describe("Fake Call settings", () => {
  it("falls back to defaults and round-trips customisation", () => {
    expect(readFakeCallSettings()).toEqual(DEFAULT_FAKE_CALL_SETTINGS);
    writeFakeCallSettings({
      ...DEFAULT_FAKE_CALL_SETTINGS,
      defaultCallerId: "office",
      defaultDelaySec: 60,
      defaultAudioId: "cab",
      vibration: false,
    });
    const stored = readFakeCallSettings();
    expect(stored.defaultCallerId).toBe("office");
    expect(stored.defaultDelaySec).toBe(60);
    expect(stored.defaultAudioId).toBe("cab");
    expect(stored.vibration).toBe(false);
    expect(stored.ringtone).toBe(true);
  });
});
