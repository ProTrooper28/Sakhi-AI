/**
 * Feature registry — single source of truth for feature discoverability.
 *
 * Powers the Settings "Features" list, the in-app tour and the onboarding
 * flow, so every capability always has an icon, a name, a one-line
 * description, a live status and a one-tap "Configure" destination. Add a
 * feature here and it becomes discoverable everywhere at once.
 */

import {
  MessageSquare, Navigation2, Users, AlertTriangle, Mic, Vibrate, Archive,
  FileWarning, MapPinned, Sparkles, ShieldCheck, ShieldAlert, BatteryCharging,
  PhoneCall, Phone, Building2, Watch,
} from "lucide-react";
import {
  readTriggerConfig,
  readSafeCheckinSettings,
  readBatterySettings,
  readFakeCallSettings,
  readCoachSettings,
} from "@/lib/safety";

export type FeatureStatus = { enabled: boolean; text: string };

export type FeatureEntry = {
  id: string;
  name: string;
  description: string;
  icon: typeof MessageSquare;
  /** Route where the feature lives (or its setup screen). */
  path: string;
  /** Where its settings/configure controls are. */
  configurePath: string;
  /** "core" features are surfaced more prominently in the tour. */
  tier: "core" | "pro" | "setup";
  /** Live on/off status for the Settings list. */
  status: () => FeatureStatus;
};

const triggerStatus = (id: "voice-phrase" | "gesture"): FeatureStatus => {
  const on = !!readTriggerConfig()[id];
  return on ? { enabled: true, text: "Armed" } : { enabled: false, text: "Off" };
};

export const FEATURES: FeatureEntry[] = [
  {
    id: "assistant",
    name: "AI Companion",
    description: "24/7 chat that answers safety questions and coaches you proactively.",
    icon: MessageSquare,
    path: "/assistant",
    configurePath: "/settings",
    tier: "core",
    status: () => ({ enabled: true, text: "Always on" }),
  },
  {
    id: "journey",
    name: "Safety Journey",
    description: "Share your live route with guardians while AI monitors your ETA.",
    icon: Navigation2,
    path: "/journey",
    configurePath: "/journey",
    tier: "core",
    status: () => ({ enabled: true, text: "Ready" }),
  },
  {
    id: "sos",
    name: "Emergency SOS",
    description: "One tap alerts guardians, shares location and records evidence.",
    icon: AlertTriangle,
    path: "/sos",
    configurePath: "/settings",
    tier: "core",
    status: () => ({ enabled: true, text: "Always on" }),
  },
  {
    id: "guardian",
    name: "Guardian Dashboard",
    description: "Your trusted person sees live location, battery, ETA and alerts.",
    icon: Users,
    path: "/guardians",
    configurePath: "/guardians",
    tier: "core",
    status: () => ({ enabled: true, text: "Link via invite" }),
  },
  {
    id: "voice-sos",
    name: "Voice SOS",
    description: "Say \"Help me\" or \"Bachao\" — Sakhi triggers SOS hands-free.",
    icon: Mic,
    path: "/assistant",
    configurePath: "/settings",
    tier: "pro",
    status: () => triggerStatus("voice-phrase"),
  },
  {
    id: "shake-sos",
    name: "Shake SOS",
    description: "Shake your phone firmly to trigger an emergency, no buttons needed.",
    icon: Vibrate,
    path: "/assistant",
    configurePath: "/settings",
    tier: "pro",
    status: () => triggerStatus("gesture"),
  },
  {
    id: "evidence",
    name: "Evidence Locker",
    description: "PIN-protected storage for photos, audio and documents.",
    icon: Archive,
    path: "/evidence-locker",
    configurePath: "/settings",
    tier: "core",
    status: () => ({ enabled: true, text: "PIN protected" }),
  },
  {
    id: "report",
    name: "Anonymous Reporting",
    description: "File harassment reports anonymously — your identity stays hidden.",
    icon: FileWarning,
    path: "/report",
    configurePath: "/my-reports",
    tier: "core",
    status: () => ({ enabled: true, text: "Ready" }),
  },
  {
    id: "community",
    name: "Community Safety Map",
    description: "See risk zones and incident reports around you on a live map.",
    icon: MapPinned,
    path: "/risk-map",
    configurePath: "/risk-map",
    tier: "core",
    status: () => ({ enabled: true, text: "Live" }),
  },
  {
    id: "safety-score",
    name: "AI Safety Score",
    description: "Every route scores 0–100 with colour-coded risk and reasons.",
    icon: ShieldCheck,
    path: "/journey",
    configurePath: "/journey",
    tier: "pro",
    status: () => ({ enabled: true, text: "Auto" }),
  },
  {
    id: "coach",
    name: "AI Safety Coach",
    description: "Proactive, context-aware advice before an emergency happens.",
    icon: Sparkles,
    path: "/assistant",
    configurePath: "/settings",
    tier: "pro",
    status: () => {
      const s = readCoachSettings();
      return s.enabled ? { enabled: true, text: `On · ${s.frequency}` } : { enabled: false, text: "Off" };
    },
  },
  {
    id: "checkin",
    name: "AI Safe Check-in",
    description: "If you miss your ETA, Sakhi checks on you and can alert guardians.",
    icon: ShieldAlert,
    path: "/journey",
    configurePath: "/settings",
    tier: "pro",
    status: () => {
      const s = readSafeCheckinSettings();
      return s.enabled ? { enabled: true, text: `On · ${s.graceMinutes} min grace` } : { enabled: false, text: "Off" };
    },
  },
  {
    id: "fake-call",
    name: "Fake Call",
    description: "A realistic incoming call so you can politely leave any situation.",
    icon: PhoneCall,
    path: "/home",
    configurePath: "/settings",
    tier: "pro",
    status: () => {
      const s = readFakeCallSettings();
      return { enabled: true, text: `Ready · ${s.defaultDelaySec === 0 ? "instant" : `${s.defaultDelaySec}s`}` };
    },
  },
  {
    id: "battery",
    name: "Battery-Aware Safety",
    description: "Low-battery alerts so live tracking never dies silently.",
    icon: BatteryCharging,
    path: "/journey",
    configurePath: "/settings",
    tier: "pro",
    status: () => {
      const s = readBatterySettings();
      return s.enabled ? { enabled: true, text: `On · ${s.thresholdPercent}%` } : { enabled: false, text: "Off" };
    },
  },
  {
    id: "helpline",
    name: "Emergency Helplines",
    description: "112, 1091 and more — one tap from anywhere, plus aftercare guidance.",
    icon: Phone,
    path: "/post-incident",
    configurePath: "/post-incident",
    tier: "core",
    status: () => ({ enabled: true, text: "24/7" }),
  },
  {
    id: "guardian-sms",
    name: "Guardian SMS Alerts",
    description: "SOS can text your guardian when data is unavailable.",
    icon: MessageSquare,
    path: "/settings",
    configurePath: "/settings",
    tier: "setup",
    status: () => ({ enabled: true, text: "Auto on SOS" }),
  },
  {
    id: "wearable",
    name: "Wearable Integration",
    description: "Sakhi smart watch with SOS button and live vitals on your wrist.",
    icon: Watch,
    path: "/wearable",
    configurePath: "/wearable-demo",
    tier: "setup",
    status: () => ({ enabled: true, text: "Demo" }),
  },
];

/** The five onboarding slides map to these core features. */
export const ONBOARDING_HIGHLIGHTS = FEATURES.filter((f) => f.tier === "core");
