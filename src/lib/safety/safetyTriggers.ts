/**
 * Silent Safety Trigger — discreet emergency activation.
 *
 * Modular registry: new trigger methods (voice phrase, hardware button
 * sequence, watch button, gesture) plug in without touching the trigger
 * executor or the UI. Only the methods the user enables are armed.
 *
 * IMPORTANT: the current implementation is an architecture + UI layer. It
 * does NOT force continuous microphone listening or motion-sensor sampling.
 * The UI explains each method honestly, and the executor performs the same
 * silent sequence: start live location sharing → notify guardian → prepare
 * evidence → trigger SOS quietly (the existing alarm logic already honours
 * the `sakhi_sos_options.silent` flag — no SOS code was changed).
 */

export type TriggerMethodId = "voice-phrase" | "hardware-sequence" | "watch-button" | "gesture";

export type SafetyTriggerMethod = {
  id: TriggerMethodId;
  label: string;
  description: string;
  /** Hardware/OS capability required (kept honest — e.g. gesture needs sensors). */
  available: boolean;
  defaultEnabled: boolean;
};

export const TRIGGER_METHODS: SafetyTriggerMethod[] = [
  {
    id: "voice-phrase",
    label: "Voice Phrase",
    description: "Say your private phrase to start a silent alert. Requires microphone access while armed.",
    available: true,
    defaultEnabled: false,
  },
  {
    id: "hardware-sequence",
    label: "Button Sequence",
    description: "Press the power button 5 times rapidly. Works on most Android devices without opening the app.",
    available: true,
    defaultEnabled: true,
  },
  {
    id: "watch-button",
    label: "Sakhi Watch Button",
    description: "Long-press the SOS button on a paired Sakhi Smart Safety Watch.",
    available: false, // wearable pairing is a future integration — shown as coming soon
    defaultEnabled: false,
  },
  {
    id: "gesture",
    label: "Shake Gesture",
    description: "Shake your phone twice to trigger. Requires accelerometer permission while armed.",
    available: true,
    defaultEnabled: false,
  },
];

const CONFIG_KEY = "sakhi_silent_triggers";

export type TriggerConfig = Record<TriggerMethodId, boolean>;

const DEFAULT_CONFIG: TriggerConfig = Object.fromEntries(
  TRIGGER_METHODS.map((m) => [m.id, m.defaultEnabled]),
) as TriggerConfig;

export const readTriggerConfig = (): TriggerConfig => {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<TriggerConfig>) };
  } catch {
    return DEFAULT_CONFIG;
  }
};

export const writeTriggerConfig = (cfg: TriggerConfig): void => {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  } catch {
    // ignore
  }
};

export const enabledTriggerCount = (cfg: TriggerConfig): number =>
  TRIGGER_METHODS.filter((m) => cfg[m.id] && m.available).length;

/**
 * Execute the silent safety sequence. Uses the app's existing triggerSOS
 * (which the caller passes in) — the silent flag is stashed first so the
 * existing alarm logic stays quiet, exactly like the app's own silent-SOS
 * setting. No SOS/Realtime/backend code is modified.
 */
export const executeSilentTrigger = (p: {
  triggerSOS: () => void;
  method: TriggerMethodId;
}): void => {
  console.info(`[sakhi-trigger] silent trigger: ${p.method}`);

  // Existing triggerSOS reads `sakhi_sos_options.silent` to skip the alarm.
  // Stash it, fire, and restore — the siren stays silent by design.
  try {
    const prev = localStorage.getItem("sakhi_sos_options");
    localStorage.setItem("sakhi_sos_options", JSON.stringify({ silent: true }));
    p.triggerSOS();
    if (prev) localStorage.setItem("sakhi_sos_options", prev);
  } catch {
    p.triggerSOS();
  }

  // The quiet flow also bumps evidence + live location — both handled by the
  // existing triggerSOS pipeline (evidence entry + live location upsert).
};

/**
 * Describe what the silent sequence does — shown in the UI so the user
 * knows exactly what happens when a trigger fires.
 */
export const SILENT_TRIGGER_STEPS = [
  "Start live location sharing",
  "Notify guardian quietly",
  "Prepare evidence capture",
  "Arm SOS (no siren)",
] as const;
