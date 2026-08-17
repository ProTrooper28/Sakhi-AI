/**
 * Post-Incident Support — practical next steps after an incident.
 *
 * Recovery is a process, not a storage bin. This service builds a guided
 * checklist from what the user actually has (evidence, reports, guardians)
 * and links each step to the right place in the app.
 */

export type PostIncidentStepId =
  | "review-evidence"
  | "contact-guardian"
  | "helplines"
  | "nearby-police"
  | "prepare-report";

export type PostIncidentStep = {
  id: PostIncidentStepId;
  title: string;
  description: string;
  path: string;
  /** Short CTA label. */
  cta: string;
  /** Priority order — 1 is done first. */
  priority: number;
};

export type PostIncidentContext = {
  evidenceCount: number;
  hasGuardians: boolean;
  reportCount: number;
};

export const HELPLINES = [
  { label: "Police", num: "112" },
  { label: "Women Helpline", num: "1091" },
  { label: "Ambulance", num: "108" },
  { label: "Cyber Crime", num: "1930" },
  { label: "Child Helpline", num: "1098" },
] as const;

export const buildPostIncidentChecklist = (ctx: PostIncidentContext): PostIncidentStep[] => {
  const steps: PostIncidentStep[] = [
    {
      id: "review-evidence",
      title: "Review Your Evidence",
      description:
        ctx.evidenceCount > 0
          ? `${ctx.evidenceCount} item${ctx.evidenceCount === 1 ? "" : "s"} saved in your locker. Check recordings and photos while they're fresh.`
          : "No evidence saved yet. If you have photos, videos or audio, add them to your locker — they stay private.",
      path: "/evidence-locker",
      cta: "Open Evidence Locker",
      priority: 1,
    },
    {
      id: "contact-guardian",
      title: "Contact Your Guardian",
      description: ctx.hasGuardians
        ? "Tell a trusted person what happened. They can keep watching your location while you recover."
        : "Reach out to someone you trust — a family member or friend — and share your location.",
      path: "/guardians",
      cta: "Contact Guardian",
      priority: 2,
    },
    {
      id: "helplines",
      title: "Emergency Helplines",
      description: "Women Helpline 1091, Police 112, Ambulance 108, Cyber Crime 1930.",
      path: "/post-incident",
      cta: "View Helplines",
      priority: 3,
    },
    {
      id: "nearby-police",
      title: "Find a Police Station",
      description: "Locate the nearest police station and file a complaint in person if you're ready.",
      path: "/risk-map",
      cta: "Open Safety Map",
      priority: 4,
    },
    {
      id: "prepare-report",
      title: "Prepare a Report",
      description: ctx.reportCount > 0
        ? "You have a report in progress. You can add evidence and submit it anonymously."
        : "Create a report of the incident. You can submit it anonymously — your identity stays protected.",
      path: "/report",
      cta: ctx.reportCount > 0 ? "Continue Report" : "Start Report",
      priority: 5,
    },
  ];
  return steps;
};
