import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield, AlertTriangle, FileText, Clock,
  MapPin, Image, Film, FileAudio, File,
  BookLock, Gavel, ChevronLeft, Lock, CheckCircle2,
  BarChart3, Eye, Sparkles
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useApp } from "@/context/AppContext";
import { toast } from "@/components/ui/use-toast";
import type { Report } from "@/context/AppContext";

// ── AI Legal Detection ────────────────────────────────────────────────────────

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

// ── Confidence extraction from description ────────────────────────────────────

type ConfidenceLevel = "High" | "Medium" | "Low";

const extractConfidence = (description: string): ConfidenceLevel => {
  const lower = description.toLowerCase();
  if (lower.includes("confidence: high")) return "High";
  if (lower.includes("confidence: low")) return "Low";
  return "Medium";
};

const CONFIDENCE_CFG: Record<ConfidenceLevel, {
  emoji: string; label: string; color: string; bg: string; border: string; pct: number; desc: string;
}> = {
  High: {
    emoji: "🟢",
    label: "High Confidence",
    color: "#3D9970",
    bg: "#D6F5EA",
    border: "rgba(61,153,112,0.3)",
    pct: 90,
    desc: "Personally witnessed with strong supporting evidence.",
  },
  Medium: {
    emoji: "🟡",
    label: "Medium Confidence",
    color: "#B7770D",
    bg: "#FEF3CD",
    border: "rgba(183,119,13,0.3)",
    pct: 55,
    desc: "Likely accurate with reasonable but limited evidence.",
  },
  Low: {
    emoji: "🟠",
    label: "Low Confidence",
    color: "#C05621",
    bg: "#FDEBD0",
    border: "rgba(192,86,33,0.3)",
    pct: 22,
    desc: "Suspicious but not fully verified — needs further review.",
  },
};

// ── File icon helper ──────────────────────────────────────────────────────────

const getFileIcon = (type?: string) => {
  if (!type) return File;
  if (type.startsWith("image/")) return Image;
  if (type.startsWith("video/")) return Film;
  if (type.startsWith("audio/")) return FileAudio;
  return File;
};

const getFileLabel = (type?: string) => {
  if (!type) return "Document";
  if (type.startsWith("image/")) return "Photo";
  if (type.startsWith("video/")) return "Video";
  if (type.startsWith("audio/")) return "Audio";
  return "Document";
};

// ── Label style ───────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontFamily: "Nunito,sans-serif",
  fontWeight: 800,
  fontSize: 11,
  color: "#8B3A2F",
  letterSpacing: "0.05em",
  marginBottom: 6,
  display: "block",
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const ReportReviewPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getReport, updateReport } = useApp();

  const report = id ? getReport(id) : undefined;

  if (!report) {
    return (
      <AppLayout>
        <div
          style={{
            minHeight: "100vh",
            background: "var(--sakhi-cream)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: "0 20px",
          }}
        >
          <AlertTriangle style={{ width: 48, height: 48, color: "#E67E22" }} />
          <h2
            style={{
              fontFamily: "Nunito,sans-serif",
              fontWeight: 900,
              fontSize: 20,
              color: "#3D2315",
            }}
          >
            Report Not Found
          </h2>
          <button
            onClick={() => navigate("/report")}
            style={{
              padding: "11px 24px",
              borderRadius: 14,
              border: "none",
              background: "linear-gradient(135deg,#F2956A,#D4455C)",
              color: "white",
              fontFamily: "Nunito,sans-serif",
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Back to Reporting
          </button>
        </div>
      </AppLayout>
    );
  }

  const confidenceLevel = extractConfidence(report.description);
  const confCfg = CONFIDENCE_CFG[confidenceLevel];
  const summary = generateSummary(report);
  const legalCategory = detectLegalCategory(report.description);
  const reportTime = new Date(report.timestamp).toLocaleString();

  // Counts by type
  const photosCount = report.evidence.filter((e) => e.fileType?.startsWith("image/")).length;
  const videosCount = report.evidence.filter((e) => e.fileType?.startsWith("video/")).length;
  const audiosCount = report.evidence.filter((e) => e.fileType?.startsWith("audio/")).length;
  const docsCount   = report.evidence.filter((e) => !e.fileType?.startsWith("image/") && !e.fileType?.startsWith("video/") && !e.fileType?.startsWith("audio/")).length;

  const handleAnonymousSave = () => {
    updateReport(report.id, { status: "anonymous" });
    toast({ title: "✅ Saved Anonymously", description: "Your report is stored securely." });
    navigate("/evidence-locker");
  };

  const handleHighRisk = () => {
    updateReport(report.id, { status: "high-risk", flaggedHighRisk: true });
    toast({
      title: "⚠️ Marked High Risk",
      description: "This case has been flagged for priority monitoring.",
      variant: "destructive",
    });
    navigate("/evidence-locker");
  };

  return (
    <AppLayout>
      <div style={{ minHeight: "100vh", background: "var(--sakhi-cream)", paddingBottom: "7rem" }}>
        <div className="max-w-lg mx-auto px-4 pt-4">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5"
          >
            <button
              onClick={() => navigate("/report")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontFamily: "Nunito,sans-serif",
                fontWeight: 700,
                fontSize: 13,
                color: "#9E7A6A",
                background: "none",
                border: "none",
                cursor: "pointer",
                marginBottom: 12,
                padding: 0,
              }}
            >
              <ChevronLeft style={{ width: 16, height: 16 }} /> Back to Reports
            </button>

            <div className="flex items-center gap-3">
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 14,
                  background: "linear-gradient(135deg,#F2956A,#D4455C)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Eye className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1
                  style={{
                    fontFamily: "Nunito,sans-serif",
                    fontWeight: 900,
                    fontSize: 22,
                    color: "#3D2315",
                    lineHeight: 1.1,
                  }}
                >
                  Report Review
                </h1>
                <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 11, color: "#9E7A6A" }}>
                  Step 4 of 4 · Final Review
                </p>
              </div>
            </div>

            {/* Completed step bar */}
            <div style={{ marginTop: 16 }}>
              <div
                style={{
                  height: 6,
                  borderRadius: 99,
                  background: "rgba(158,122,106,0.15)",
                  overflow: "hidden",
                }}
              >
                <motion.div
                  initial={{ width: "75%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    height: "100%",
                    borderRadius: 99,
                    background: "linear-gradient(90deg,#3D9970,#2ECC71)",
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                {["Category ✓", "Details ✓", "Evidence ✓", "Review"].map((s, i) => (
                  <span
                    key={s}
                    style={{
                      fontFamily: "Nunito,sans-serif",
                      fontWeight: i < 3 ? 700 : 900,
                      fontSize: 10,
                      color: i < 3 ? "#3D9970" : "#3D2315",
                      flex: 1,
                      textAlign: i === 0 ? "left" : i === 3 ? "right" : "center",
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* ── Evidence Summary bar ── */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            style={{
              background: "white",
              borderRadius: 20,
              padding: "14px 16px",
              boxShadow: "0 4px 20px rgba(139,58,47,0.06)",
              marginBottom: 14,
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 13, color: "#3D2315", flex: 1, minWidth: 100 }}>
              📎 Evidence Summary
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { count: photosCount, label: "Photos", color: "#2563EB", bg: "#DEEEFF" },
                { count: videosCount, label: "Videos", color: "#D4455C", bg: "#FBDDE3" },
                { count: audiosCount, label: "Audio", color: "#3D9970", bg: "#D6F5EA" },
                { count: docsCount, label: "Docs", color: "#8B5CF6", bg: "#EDE9FE" },
              ]
                .filter((e) => e.count > 0)
                .map((e) => (
                  <div
                    key={e.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      background: e.bg,
                      borderRadius: 99,
                      padding: "4px 10px",
                    }}
                  >
                    <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 12, color: e.color }}>
                      {e.count}
                    </span>
                    <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 11, color: e.color }}>
                      {e.label}
                    </span>
                  </div>
                ))}
              {report.evidence.length === 0 && (
                <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 12, color: "#9E7A6A" }}>
                  No files attached
                </span>
              )}
            </div>
          </motion.div>

          {/* ── Confidence Badge ── */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              background: confCfg.bg,
              border: `1.5px solid ${confCfg.border}`,
              borderRadius: 20,
              padding: "14px 16px",
              marginBottom: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 20 }}>{confCfg.emoji}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 14, color: confCfg.color }}>
                  {confCfg.label}
                </p>
                <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 500, fontSize: 11, color: "#9E7A6A" }}>
                  {confCfg.desc}
                </p>
              </div>
            </div>
            {/* Progress bar */}
            <div style={{ height: 5, borderRadius: 99, background: "rgba(255,255,255,0.5)", overflow: "hidden" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${confCfg.pct}%` }}
                transition={{ delay: 0.3, duration: 0.7, ease: "easeOut" }}
                style={{ height: "100%", borderRadius: 99, background: confCfg.color }}
              />
            </div>
          </motion.div>

          {/* ── Sakhi AI Summary ── */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            style={{
              background: "linear-gradient(135deg,#EDE9FE,white)",
              border: "1.5px solid rgba(139,92,246,0.15)",
              borderRadius: 22,
              padding: "18px 18px",
              marginBottom: 14,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -20,
                right: -20,
                width: 100,
                height: 100,
                borderRadius: "50%",
                background: "rgba(139,92,246,0.06)",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: "linear-gradient(135deg,#8B5CF6,#6D28D9)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Sparkles style={{ width: 15, height: 15, color: "white" }} />
              </div>
              <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 14, color: "#3D2315", flex: 1 }}>
                Sakhi AI Summary
              </p>
              <span
                style={{
                  background: "#EDE9FE",
                  color: "#6D28D9",
                  fontFamily: "Nunito,sans-serif",
                  fontWeight: 800,
                  fontSize: 10,
                  borderRadius: 99,
                  padding: "3px 9px",
                }}
              >
                AI Generated
              </span>
            </div>
            <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 500, fontSize: 13, color: "#4C3D5A", lineHeight: 1.65, marginBottom: 10 }}>
              {summary}
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                paddingTop: 10,
                borderTop: "1px solid rgba(139,92,246,0.1)",
              }}
            >
              <Gavel style={{ width: 14, height: 14, color: "#9E7A6A" }} />
              <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 12, color: "#9E7A6A" }}>
                Legal Category:
              </span>
              <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 12, color: "#6D28D9" }}>
                {legalCategory}
              </span>
            </div>
          </motion.div>

          {/* ── Incident Details ── */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            style={{
              background: "white",
              borderRadius: 22,
              padding: 18,
              boxShadow: "0 4px 20px rgba(139,58,47,0.06)",
              marginBottom: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <FileText style={{ width: 17, height: 17, color: "#D4455C" }} />
              <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 14, color: "#3D2315" }}>
                Incident Details
              </p>
            </div>

            <p
              style={{
                fontFamily: "Nunito,sans-serif",
                fontWeight: 500,
                fontSize: 13,
                color: "#5C3D2A",
                lineHeight: 1.65,
                marginBottom: 14,
              }}
            >
              {report.description}
            </p>

            {/* Meta chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingTop: 12, borderTop: "1px solid rgba(242,149,106,0.1)" }}>
              {/* Timestamp */}
              <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#F5E4D6", borderRadius: 99, padding: "5px 10px" }}>
                <Clock style={{ width: 11, height: 11, color: "#9E7A6A" }} />
                <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 11, color: "#8B3A2F" }}>
                  {reportTime}
                </span>
              </div>

              {/* Location */}
              {report.location && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#F5E4D6", borderRadius: 99, padding: "5px 10px" }}>
                  <MapPin style={{ width: 11, height: 11, color: "#D4455C" }} />
                  <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 11, color: "#8B3A2F" }}>
                    {report.location}
                  </span>
                </div>
              )}

              {/* Report type */}
              <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#DEEEFF", borderRadius: 99, padding: "5px 10px" }}>
                <Shield style={{ width: 11, height: 11, color: "#2563EB" }} />
                <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 11, color: "#2563EB" }}>
                  {report.reportType === "cyber" ? "Cyber Crime" : "Physical / General"}
                </span>
              </div>

              {/* Anonymous status */}
              {report.anonymous && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#D6F5EA", borderRadius: 99, padding: "5px 10px" }}>
                  <Lock style={{ width: 11, height: 11, color: "#3D9970" }} />
                  <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 11, color: "#3D9970" }}>
                    Anonymous
                  </span>
                </div>
              )}
            </div>

            {/* Attached files */}
            {report.evidence.length > 0 && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(242,149,106,0.1)" }}>
                <label style={labelStyle}>ATTACHED EVIDENCE ({report.evidence.length} files)</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {report.evidence.map((ev) => {
                    const Icon = getFileIcon(ev.fileType);
                    return (
                      <div
                        key={ev.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          background: "#F5E4D6",
                          borderRadius: 14,
                          padding: "10px 12px",
                        }}
                      >
                        {ev.fileUrl && ev.fileType?.startsWith("image/") ? (
                          <img
                            src={ev.fileUrl}
                            alt={ev.name}
                            style={{
                              width: 40,
                              height: 40,
                              objectFit: "cover",
                              borderRadius: 10,
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 10,
                              background: "rgba(242,149,106,0.15)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Icon style={{ width: 18, height: 18, color: "#9E7A6A" }} />
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 12, color: "#3D2315", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {ev.name}
                          </p>
                          <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 10, color: "#9E7A6A" }}>
                            {getFileLabel(ev.fileType)} · Encrypted
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>

          {/* ── Final Actions ── */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            style={{
              background: "white",
              borderRadius: 22,
              padding: 18,
              boxShadow: "0 4px 20px rgba(139,58,47,0.06)",
              marginBottom: 14,
            }}
          >
            <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 14, color: "#3D2315", marginBottom: 14 }}>
              Final Actions
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleAnonymousSave}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 16,
                  border: "none",
                  background: "linear-gradient(135deg,#3D9970,#2ECC71)",
                  color: "white",
                  fontFamily: "Nunito,sans-serif",
                  fontWeight: 900,
                  fontSize: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 6px 20px rgba(61,153,112,0.3)",
                }}
              >
                <BookLock style={{ width: 17, height: 17 }} />
                Save Anonymously
              </motion.button>

              {report.evidence.length === 0 && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleHighRisk}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    borderRadius: 16,
                    border: "1.5px solid rgba(212,69,92,0.25)",
                    background: "#FBDDE3",
                    color: "#D4455C",
                    fontFamily: "Nunito,sans-serif",
                    fontWeight: 900,
                    fontSize: 14,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <AlertTriangle style={{ width: 17, height: 17 }} />
                  Mark as High Risk (No Evidence)
                </motion.button>
              )}

              <button
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 16,
                  border: "1.5px solid rgba(242,149,106,0.2)",
                  background: "#F5E4D6",
                  color: "#9E7A6A",
                  fontFamily: "Nunito,sans-serif",
                  fontWeight: 900,
                  fontSize: 14,
                  cursor: "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  opacity: 0.65,
                }}
              >
                <Gavel style={{ width: 17, height: 17 }} />
                Proceed to Official Complaint
                <span
                  style={{
                    fontFamily: "Nunito,sans-serif",
                    fontWeight: 700,
                    fontSize: 9,
                    background: "rgba(158,122,106,0.2)",
                    borderRadius: 6,
                    padding: "2px 6px",
                    color: "#9E7A6A",
                  }}
                >
                  Coming Soon
                </span>
              </button>
            </div>

            <p
              style={{
                fontFamily: "Nunito,sans-serif",
                fontWeight: 500,
                fontSize: 10,
                color: "#9E7A6A",
                textAlign: "center",
                marginTop: 12,
                lineHeight: 1.5,
              }}
            >
              All data is stored locally and never shared without your consent.
            </p>
          </motion.div>

        </div>
      </div>
    </AppLayout>
  );
};

export default ReportReviewPage;
