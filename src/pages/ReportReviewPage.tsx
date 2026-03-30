import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield, AlertTriangle, CheckCircle, FileText, Clock,
  MapPin, Image, Film, FileAudio, File, ArrowLeft,
  BookLock, BarChart3, Gavel,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { useApp } from "@/context/AppContext";
import { toast } from "@/components/ui/use-toast";
import type { Report } from "@/context/AppContext";

/* ── Mock AI Logic ───────────────────────────────────────────── */

const LEGAL_KEYWORDS: Record<string, string[]> = {
  "Online Harassment":  ["harass", "abuse", "threat", "message", "dm", "text", "chat"],
  "Cyber Bullying":     ["bully", "bullied", "taunt", "insult", "mock", "troll", "comment"],
  "Stalking":           ["follow", "stalk", "track", "watch", "spy", "followed"],
  "Physical Assault":   ["hit", "punch", "kick", "assault", "attack", "beat", "hurt", "slap"],
  "Sexual Harassment":  ["touch", "grope", "inappropriate", "sexual", "molest", "rape"],
  "Blackmail":          ["blackmail", "extort", "money", "nude", "leak", "expose"],
  "Domestic Violence":  ["husband", "wife", "partner", "family", "home", "domestic", "violence"],
};

const detectLegalCategory = (description: string): string => {
  const lower = description.toLowerCase();
  for (const [category, keywords] of Object.entries(LEGAL_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return "General Safety Incident";
};

const generateSummary = (report: Report): string => {
  const cat = detectLegalCategory(report.description);
  const time = new Date(report.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const evidenceNote = report.evidence.length > 0
    ? `${report.evidence.length} piece(s) of evidence were attached.`
    : "No supporting evidence was uploaded at this time.";
  return `A ${report.reportType} incident was reported at ${time} and flagged as a potential case of ${cat}. ${evidenceNote} ${report.anonymous ? "The reporter chose to remain anonymous." : "The reporter's identity is on record."} This report has been reviewed by Sakhi AI for credibility and legal categorisation.`;
};

type Credibility = "Low" | "Medium" | "High";
const getCredibility = (evidence: Report["evidence"]): { level: Credibility; color: string; bg: string; pct: number; detail: string } => {
  if (evidence.length === 0)  return { level: "Low",    color: "text-sos",     bg: "bg-sos",     pct: 18,  detail: "No supporting files uploaded" };
  if (evidence.length === 1)  return { level: "Medium", color: "text-warning", bg: "bg-warning", pct: 55,  detail: "1 file attached" };
  return                             { level: "High",   color: "text-safe",    bg: "bg-safe",    pct: 90,  detail: `${evidence.length} files attached` };
};

const getFileIcon = (type?: string) => {
  if (!type) return File;
  if (type.startsWith("image/")) return Image;
  if (type.startsWith("video/")) return Film;
  if (type.startsWith("audio/")) return FileAudio;
  return File;
};

/* ── Component ───────────────────────────────────────────────── */

const ReportReviewPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getReport, updateReport } = useApp();

  const report = id ? getReport(id) : undefined;

  if (!report) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-5">
        <AlertTriangle className="w-12 h-12 text-warning" />
        <h2 className="text-lg font-bold">Report Not Found</h2>
        <Button onClick={() => navigate("/report")}>Go Back</Button>
        <BottomNav />
      </div>
    );
  }

  const cred = getCredibility(report.evidence);
  const summary = generateSummary(report);
  const legalCategory = detectLegalCategory(report.description);
  const reportTime = new Date(report.timestamp).toLocaleString();

  const handleAnonymousSave = () => {
    updateReport(report.id, { status: "anonymous" });
    toast({ title: "✅ Saved Anonymously", description: "Your report is stored securely." });
  };

  const handleHighRisk = () => {
    updateReport(report.id, { status: "high-risk", flaggedHighRisk: true });
    toast({
      title: "⚠️ Marked High Risk",
      description: "This no-evidence case has been flagged for monitoring.",
      variant: "destructive",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate("/report")} className="w-9 h-9 rounded-xl glass flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Report Review</h1>
          <p className="text-xs text-muted-foreground">AI-assisted analysis</p>
        </div>
      </div>

      <div className="px-5 space-y-5">

        {/* ── A. Report Details ─────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Incident Details</span>
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">{report.description}</p>
          <div className="flex flex-wrap gap-3 pt-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              {reportTime}
            </div>
            {report.location && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                {report.location}
              </div>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${report.reportType === "cyber" ? "bg-accent/15 text-accent" : "bg-warning/15 text-warning"}`}>
              {report.reportType === "cyber" ? "Cyber" : "General"}
            </span>
            {report.anonymous && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-safe/15 text-safe">Anonymous</span>
            )}
          </div>

          {/* Attached Files */}
          {report.evidence.length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="text-xs font-medium text-muted-foreground">Attached Evidence</p>
              {report.evidence.map((ev) => {
                const Icon = getFileIcon(ev.fileType);
                return (
                  <div key={ev.id} className="flex items-center gap-3 bg-muted/40 rounded-xl px-3 py-2">
                    {ev.fileUrl ? (
                      <img src={ev.fileUrl} alt={ev.name} className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <p className="text-xs truncate flex-1">{ev.name}</p>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* ── B. AI Summary ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl p-5 space-y-3 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--primary)/0.08) 100%)",
            border: "1px solid hsl(var(--primary)/0.25)",
          }}
        >
          {/* Glow accent */}
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-primary/10 blur-2xl -translate-y-8 translate-x-8 pointer-events-none" />

          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Sakhi AI Summary</span>
            <span className="ml-auto text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full font-medium">AI Generated</span>
          </div>
          <p className="text-sm leading-relaxed text-foreground/85 relative z-10">{summary}</p>
          <div className="flex items-center gap-2 pt-1 relative z-10">
            <Gavel className="w-4 h-4 text-accent" />
            <span className="text-xs text-muted-foreground">Legal Category:</span>
            <span className="text-xs font-semibold text-accent">{legalCategory}</span>
          </div>
        </motion.div>

        {/* ── C. Credibility Indicator ──────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-5 space-y-3"
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Credibility Score</span>
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-2xl font-bold ${cred.color}`}>{cred.level}</span>
            <span className="text-xs text-muted-foreground">{cred.detail}</span>
          </div>
          {/* Animated progress bar */}
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${cred.pct}%` }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
              className={`h-full rounded-full ${cred.bg}`}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {cred.level === "Low"    && "Add photos, screenshots, or recordings to increase credibility."}
            {cred.level === "Medium" && "Good start. Adding more evidence will strengthen your case."}
            {cred.level === "High"   && "Strong case. Multiple pieces of evidence significantly help."}
          </p>
        </motion.div>

        {/* ── D. Action Panel ───────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-5 space-y-3"
        >
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-safe" />
            <span className="text-sm font-semibold">Take Action</span>
          </div>

          <Button onClick={handleAnonymousSave} className="w-full" variant="default">
            <BookLock className="w-4 h-4 mr-2" />
            Save as Anonymous Report
          </Button>

          {report.evidence.length === 0 && (
            <Button
              onClick={handleHighRisk}
              className="w-full bg-warning/15 text-warning hover:bg-warning/25 border border-warning/30"
              variant="ghost"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Mark High Risk (No Evidence Case)
            </Button>
          )}

          <Button className="w-full opacity-50 cursor-not-allowed" variant="outline" disabled>
            <Gavel className="w-4 h-4 mr-2" />
            Proceed to Official Complaint
            <span className="ml-2 text-[10px] bg-muted px-1.5 py-0.5 rounded">Soon</span>
          </Button>

          <p className="text-xs text-center text-muted-foreground pt-1">
            All data is stored locally and never shared without your consent
          </p>
        </motion.div>

        {/* View Evidence Locker */}
        <button
          onClick={() => navigate("/evidence-locker")}
          className="w-full glass rounded-xl p-4 flex items-center justify-between hover:border-safe/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-safe/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-safe" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">View Evidence Locker</p>
              <p className="text-xs text-muted-foreground">See all stored recordings & media</p>
            </div>
          </div>
          <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180" />
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default ReportReviewPage;
