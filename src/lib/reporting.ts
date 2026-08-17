/**
 * Reporting module — incident categories, official reporting channels, and
 * report-package helpers for the Sakhi Reports module.
 *
 * OFFICIAL INTEGRATION NOTE (researched, see task requirement #10):
 *   As of this build there is NO public government API for filing incident
 *   reports / complaints in India. Official channels are web portals and
 *   helplines (cybercrime.gov.in, NCW e-complaint, state police e-FIR, and
 *   helplines 112 / 1091 / 1930). Sakhi therefore NEVER attempts unofficial
 *   automation: it prepares a complete report package and hands the user to
 *   the matching official portal with the details pre-filled for manual
 *   submission. Every channel below is flagged `official` and
 *   `apiAvailable: false` — that is deliberate and documented in the UI.
 */
import {
  Eye, MessageSquare, Home, Wallet, ShieldAlert, Laptop,
  UserSearch, AlertTriangle, FileText, type LucideIcon,
} from "lucide-react";
import type { Report, ReportCategory } from "@/context/AppContext";

// ── Categories ────────────────────────────────────────────────────────────────

export type PortalId =
  | "cybercrime"
  | "ncw"
  | "police"
  | "helpline-1091"
  | "helpline-112"
  | "helpline-1930";

export const REPORT_CATEGORIES: {
  id: ReportCategory;
  label: string;
  icon: LucideIcon;
  desc: string;
  color: string;
  bg: string;
  border: string;
  channels: PortalId[];
}[] = [
  {
    id: "stalking", label: "Stalking", icon: Eye,
    desc: "Being followed, tracked, or monitored without consent.",
    color: "#8B5CF6", bg: "#EDE9FE", border: "rgba(139,92,246,0.25)",
    channels: ["police", "ncw"],
  },
  {
    id: "harassment", label: "Harassment", icon: MessageSquare,
    desc: "Verbal, emotional, or sexual harassment in any setting.",
    color: "#E67E22", bg: "#FEF3CD", border: "rgba(230,126,34,0.25)",
    channels: ["ncw", "police"],
  },
  {
    id: "domestic-violence", label: "Domestic Violence", icon: Home,
    desc: "Violence or abuse by a family member or partner.",
    color: "#D4455C", bg: "#FBDDE3", border: "rgba(212,69,92,0.25)",
    channels: ["ncw", "helpline-1091"],
  },
  {
    id: "theft", label: "Theft", icon: Wallet,
    desc: "Property stolen or taken without consent.",
    color: "#B7770D", bg: "#FEF3CD", border: "rgba(183,119,13,0.25)",
    channels: ["police", "helpline-112"],
  },
  {
    id: "assault", label: "Assault", icon: ShieldAlert,
    desc: "Physical attack, force, or threat of bodily harm.",
    color: "#C0392B", bg: "#FDE2E2", border: "rgba(192,57,43,0.25)",
    channels: ["police", "helpline-112"],
  },
  {
    id: "cyber", label: "Cyber Crime", icon: Laptop,
    desc: "Scams, fake profiles, cyberbullying, blackmail, hacking.",
    color: "#2563EB", bg: "#DEEEFF", border: "rgba(37,99,235,0.25)",
    channels: ["cybercrime", "helpline-1930"],
  },
  {
    id: "missing-person", label: "Missing Person", icon: UserSearch,
    desc: "Someone has gone missing and needs to be found.",
    color: "#0F766E", bg: "#D6F5EA", border: "rgba(15,118,110,0.25)",
    channels: ["police", "helpline-112"],
  },
  {
    id: "suspicious-activity", label: "Suspicious Activity", icon: AlertTriangle,
    desc: "Unusual behaviour or an unverified threat.",
    color: "#9E7A6A", bg: "#F5E4D6", border: "rgba(158,122,106,0.25)",
    channels: ["police"],
  },
  {
    id: "other", label: "Other", icon: FileText,
    desc: "Any incident that doesn't fit the categories above.",
    color: "#6B4F40", bg: "#F5E4D6", border: "rgba(107,79,64,0.25)",
    channels: ["ncw", "police"],
  },
];

export const categoryById = (id: string) =>
  REPORT_CATEGORIES.find((c) => c.id === id) ?? REPORT_CATEGORIES[REPORT_CATEGORIES.length - 1]!;

/** Category label with fallback for legacy reports (reportType cyber/general). */
export const categoryLabelOf = (report: Pick<Report, "category" | "reportType">): string => {
  if (report.category) return categoryById(report.category).label;
  return report.reportType === "cyber" ? "Cyber Crime" : "Other";
};

// ── Official channels / portals ───────────────────────────────────────────────

export const OFFICIAL_PORTALS: Record<
  PortalId,
  {
    id: PortalId;
    name: string;
    authority: string;
    url?: string;
    helpline?: string;
    official: boolean;
    apiAvailable: boolean;
    note: string;
  }
> = {
  cybercrime: {
    id: "cybercrime",
    name: "National Cyber Crime Reporting Portal",
    authority: "Ministry of Home Affairs (I4C)",
    url: "https://cybercrime.gov.in/",
    helpline: "1930",
    official: true,
    apiAvailable: false,
    note: "Official government portal. No public API — submit manually with your report package pre-filled.",
  },
  ncw: {
    id: "ncw",
    name: "NCW e-Complaint",
    authority: "National Commission for Women",
    url: "https://ncwapps.nic.in/",
    helpline: "1091",
    official: true,
    apiAvailable: false,
    note: "Official NCW portal for complaints of violence / harassment against women. Manual submission.",
  },
  police: {
    id: "police",
    name: "Nearest Police Station / State e-FIR",
    authority: "State Police",
    helpline: "112",
    official: true,
    apiAvailable: false,
    note: "File at your nearest police station or your state's e-FIR portal. No public API.",
  },
  "helpline-1091": {
    id: "helpline-1091",
    name: "Women Helpline 1091",
    authority: "Govt. of India",
    helpline: "1091",
    official: true,
    apiAvailable: false,
    note: "Call 1091 for immediate help and guidance from the women helpline.",
  },
  "helpline-112": {
    id: "helpline-112",
    name: "Emergency Response Support 112",
    authority: "Govt. of India",
    helpline: "112",
    official: true,
    apiAvailable: false,
    note: "Call 112 only in an active emergency requiring immediate response.",
  },
  "helpline-1930": {
    id: "helpline-1930",
    name: "Cyber Fraud Helpline 1930",
    authority: "I4C / Ministry of Home Affairs",
    helpline: "1930",
    official: true,
    apiAvailable: false,
    note: "Call 1930 immediately after a financial cyber fraud to report and block transfers.",
  },
};

export const portalsFor = (category: ReportCategory): PortalId[] =>
  categoryById(category).channels;

// ── Report numbers ────────────────────────────────────────────────────────────

export const generateReportNumber = (id: string): string => {
  const hash = id.replace("rpt_", "").substring(0, 6).toUpperCase();
  const year = new Date().getFullYear();
  return `SAKHI-${year}-${hash}`;
};

// ── Report package (for manual official submission) ───────────────────────────

export const buildReportPackage = (report: Report): string => {
  const lines: string[] = [
    "SAKHI AI — INCIDENT REPORT PACKAGE",
    "===================================",
    "",
    `Report Number:  ${report.reportNumber ?? generateReportNumber(report.id)}`,
    `Category:       ${categoryLabelOf(report)}`,
    `Severity:       ${report.severity ? report.severity.toUpperCase() : "—"}`,
    `Reported At:    ${new Date(report.timestamp).toLocaleString()}`,
    `Incident Date:  ${report.incidentDate || "—"}`,
    `Incident Time:  ${report.incidentTime || "—"}`,
    `Location:       ${report.location || "—"}`,
    `Coordinates:    ${report.coords ? `${report.coords.lat.toFixed(5)}, ${report.coords.lng.toFixed(5)}` : "—"}`,
    `Reporter:       ${report.anonymous ? "Anonymous" : "Identified"}`,
    "",
    "DESCRIPTION",
    "-----------",
    report.description,
    "",
  ];

  if (report.peopleInvolved) {
    lines.push("PEOPLE INVOLVED", "---------------", report.peopleInvolved, "");
  }
  if (report.witnesses) {
    lines.push("WITNESSES", "---------", report.witnesses, "");
  }

  lines.push(
    "EVIDENCE",
    "--------",
    report.evidence.length === 0
      ? "None attached."
      : report.evidence.map((e) => `• ${e.name} (${e.fileType || "file"}${e.location ? ` — ${e.location}` : ""})`).join("\n"),
    "",
    "NOTE: This package is prepared for manual submission. No official public API",
    "exists for filing this report automatically; submit it on the official portal",
    "shown in the app or at your nearest police station.",
  );
  return lines.join("\n");
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export const downloadTextFile = (filename: string, text: string): void => {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

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

export const severityLabel = (s?: Report["severity"]): string =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : "—";
