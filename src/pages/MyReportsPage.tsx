import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Search, Filter, Shield, Clock, MapPin, 
  Lock, CheckCircle2, ChevronDown, ChevronUp, Image as ImageIcon,
  Film, FileAudio, File as FileIcon, User, AlertCircle, RefreshCw
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useApp, Report } from "@/context/AppContext";

// ── Helpers & Mocks ─────────────────────────────────────────────────────────

const formatDisplayId = (id: string) => {
  const hash = id.replace("rpt_", "").substring(0, 6).toUpperCase();
  const year = new Date().getFullYear();
  return `SAKHI-${year}-${hash}`;
};

const extractConfidence = (description: string): "High" | "Medium" | "Low" => {
  const lower = description.toLowerCase();
  if (lower.includes("confidence: high")) return "High";
  if (lower.includes("confidence: low")) return "Low";
  return "Medium";
};

const getConfidenceColor = (conf: string) => {
  if (conf === "High") return { color: "#3D9970", bg: "#D6F5EA", border: "rgba(61,153,112,0.3)", emoji: "🟢" };
  if (conf === "Low") return { color: "#C05621", bg: "#FDEBD0", border: "rgba(192,86,33,0.3)", emoji: "🟠" };
  return { color: "#B7770D", bg: "#FEF3CD", border: "rgba(183,119,13,0.3)", emoji: "🟡" };
};

const getFileIcon = (type?: string) => {
  if (!type) return FileIcon;
  if (type.startsWith("image/")) return ImageIcon;
  if (type.startsWith("video/")) return Film;
  if (type.startsWith("audio/")) return FileAudio;
  return FileIcon;
};

type TimelineStatus = "Submitted" | "Under Review" | "Action Taken" | "Closed";

interface TimelineEvent {
  status: TimelineStatus;
  date: string;
  remark: string;
  isCurrent: boolean;
  isPast: boolean;
}

// Generate deterministic mock timeline
const generateTimeline = (report: Report): TimelineEvent[] => {
  const seed = report.id.charCodeAt(report.id.length - 1) + report.id.charCodeAt(report.id.length - 2);
  const baseTime = new Date(report.timestamp).getTime();
  
  const timeline: TimelineEvent[] = [];
  
  // 1. Submitted (always)
  timeline.push({
    status: "Submitted",
    date: new Date(baseTime).toLocaleString(),
    remark: "Report received successfully. Encrypted and securely stored.",
    isCurrent: false,
    isPast: true,
  });

  // Decide current stage (0=Submitted, 1=Review, 2=Action, 3=Closed)
  // Bias newer reports to be earlier in pipeline
  const ageHrs = (Date.now() - baseTime) / (1000 * 60 * 60);
  let stage = 0;
  if (ageHrs > 1) stage = 1;
  if (ageHrs > 24) stage = (seed % 2) + 2; // 2 or 3
  
  // Override with seed for variety if it's very old
  if (ageHrs > 48) stage = seed % 4;

  if (stage >= 1) {
    timeline.push({
      status: "Under Review",
      date: new Date(baseTime + 3600000).toLocaleString(), // +1 hr
      remark: "Forwarded to local authorities. Evidence under review.",
      isCurrent: stage === 1,
      isPast: stage > 1,
    });
  }

  if (stage >= 2 && stage !== 3) {
    timeline.push({
      status: "Action Taken",
      date: new Date(baseTime + 86400000).toLocaleString(), // +1 day
      remark: "Action has been initiated by the assigned authority.",
      isCurrent: true,
      isPast: false,
    });
  }

  if (stage === 3) {
    timeline.push({
      status: "Action Taken",
      date: new Date(baseTime + 86400000).toLocaleString(), // +1 day
      remark: "Action was initiated.",
      isCurrent: false,
      isPast: true,
    });
    timeline.push({
      status: "Closed",
      date: new Date(baseTime + 172800000).toLocaleString(), // +2 days
      remark: "Case closed. Situation resolved successfully.",
      isCurrent: true,
      isPast: false,
    });
  }

  // Mark the last element as current if not already
  if (timeline.length > 0) {
     timeline[timeline.length - 1].isCurrent = true;
     timeline[timeline.length - 1].isPast = false;
  }

  return timeline;
};

const getStatusBadge = (status: TimelineStatus) => {
  switch (status) {
    case "Submitted": return { color: "#B7770D", bg: "#FEF3CD", icon: Clock };
    case "Under Review": return { color: "#2563EB", bg: "#DEEEFF", icon: Search };
    case "Action Taken": return { color: "#3D9970", bg: "#D6F5EA", icon: Shield };
    case "Closed": return { color: "#9E7A6A", bg: "#F5E4D6", icon: CheckCircle2 };
  }
};

// ── Components ──────────────────────────────────────────────────────────────

const ReportCard = ({ report }: { report: Report }) => {
  const [expanded, setExpanded] = useState(false);
  const displayId = formatDisplayId(report.id);
  const confidence = extractConfidence(report.description);
  const confStyle = getConfidenceColor(confidence);
  const timeline = useMemo(() => generateTimeline(report), [report]);
  const currentEvent = timeline[timeline.length - 1];
  const badgeStyle = getStatusBadge(currentEvent.status);
  const BadgeIcon = badgeStyle.icon;

  const descPreview = report.description.split("|")[0].trim(); // Get first part before | (from previous formatting)
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: "white",
        borderRadius: 24,
        padding: 20,
        boxShadow: "0 4px 20px rgba(139,58,47,0.06)",
        marginBottom: 16,
        border: expanded ? "1.5px solid rgba(242,149,106,0.2)" : "1.5px solid transparent",
        transition: "border 0.3s ease",
      }}
    >
      {/* Header Row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: "pointer" }} onClick={() => setExpanded(!expanded)}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 15, color: "#3D2315", letterSpacing: "0.02em" }}>
              {displayId}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 4, background: badgeStyle.bg, padding: "3px 8px", borderRadius: 99 }}>
              <BadgeIcon style={{ width: 11, height: 11, color: badgeStyle.color }} />
              <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 10, color: badgeStyle.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {currentEvent.status}
              </span>
            </div>
          </div>
          
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 12, color: "#9E7A6A", display: "flex", alignItems: "center", gap: 4 }}>
              <Clock style={{ width: 12, height: 12 }} />
              {new Date(report.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
            {report.location && (
              <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 12, color: "#9E7A6A", display: "flex", alignItems: "center", gap: 4 }}>
                <MapPin style={{ width: 12, height: 12 }} />
                {report.location}
              </span>
            )}
            <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 12, color: "#9E7A6A", display: "flex", alignItems: "center", gap: 4 }}>
              <Shield style={{ width: 12, height: 12 }} />
              {report.reportType === "cyber" ? "Cyber" : "Physical"}
            </span>
          </div>
          
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#D6F5EA", padding: "4px 10px", borderRadius: 99 }}>
              <Lock style={{ width: 11, height: 11, color: "#3D9970" }} />
              <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 11, color: "#3D9970" }}>Anonymous</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, background: confStyle.bg, padding: "4px 10px", borderRadius: 99, border: `1px solid ${confStyle.border}` }}>
              <span style={{ fontSize: 12 }}>{confStyle.emoji}</span>
              <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 11, color: confStyle.color }}>{confidence} Conf.</span>
            </div>
            {report.evidence.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#F5E4D6", padding: "4px 10px", borderRadius: 99 }}>
                <FileIcon style={{ width: 11, height: 11, color: "#8B3A2F" }} />
                <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 11, color: "#8B3A2F" }}>{report.evidence.length} Files</span>
              </div>
            )}
          </div>
        </div>
        
        <button
          style={{
            width: 32,
            height: 32,
            borderRadius: 12,
            background: "rgba(158,122,106,0.1)",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          {expanded ? <ChevronUp style={{ width: 16, height: 16, color: "#8B3A2F" }} /> : <ChevronDown style={{ width: 16, height: 16, color: "#8B3A2F" }} />}
        </button>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 24 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ borderTop: "1.5px dashed rgba(242,149,106,0.2)", paddingTop: 20 }}>
              
              {/* Summary */}
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 11, color: "#8B3A2F", letterSpacing: "0.05em", marginBottom: 6 }}>
                  FULL REPORT SUMMARY
                </p>
                <div style={{ background: "#F5E4D6", borderRadius: 16, padding: 14 }}>
                  <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 13, color: "#5C3D2A", lineHeight: 1.6, marginBottom: 8 }}>
                    {descPreview}
                  </p>
                  <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 11, color: "#9E7A6A", lineHeight: 1.6 }}>
                    {report.description.split("|").slice(1).join(" | ")}
                  </p>
                </div>
              </div>

              {/* Status Timeline */}
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 11, color: "#8B3A2F", letterSpacing: "0.05em", marginBottom: 12 }}>
                  INVESTIGATION TIMELINE
                </p>
                <div style={{ position: "relative", paddingLeft: 10 }}>
                  <div style={{ position: "absolute", left: 16, top: 12, bottom: 20, width: 2, background: "rgba(242,149,106,0.15)", borderRadius: 99 }} />
                  
                  {timeline.map((event, idx) => (
                    <div key={idx} style={{ display: "flex", gap: 14, marginBottom: idx === timeline.length - 1 ? 0 : 20, position: "relative" }}>
                      <div
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          background: event.isCurrent ? "#F2956A" : event.isPast ? "#D6F5EA" : "white",
                          border: event.isCurrent ? "3px solid #FDDCCC" : event.isPast ? "2px solid #3D9970" : "2px solid rgba(242,149,106,0.3)",
                          position: "relative",
                          zIndex: 2,
                          marginTop: 4,
                          boxShadow: event.isCurrent ? "0 0 0 4px rgba(242,149,106,0.1)" : "none",
                        }}
                      />
                      <div>
                        <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 14, color: event.isCurrent ? "#3D2315" : "#9E7A6A", marginBottom: 2 }}>
                          {event.status}
                        </p>
                        <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 11, color: "#9E7A6A", marginBottom: 6 }}>
                          {event.date}
                        </p>
                        <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 500, fontSize: 12, color: event.isCurrent ? "#5C3D2A" : "#9E7A6A", lineHeight: 1.5, background: event.isCurrent ? "rgba(242,149,106,0.06)" : "transparent", padding: event.isCurrent ? "8px 12px" : 0, borderRadius: 10 }}>
                          {event.remark}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Evidence Gallery */}
              {report.evidence.length > 0 && (
                <div>
                  <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 11, color: "#8B3A2F", letterSpacing: "0.05em", marginBottom: 10 }}>
                    ATTACHED EVIDENCE ({report.evidence.length})
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
                    {report.evidence.map(ev => {
                      const Icon = getFileIcon(ev.fileType);
                      return (
                        <div key={ev.id} style={{ background: "#F5E4D6", borderRadius: 14, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                          {ev.fileUrl && ev.fileType?.startsWith("image/") ? (
                            <img src={ev.fileUrl} alt={ev.name} style={{ width: "100%", height: 70, objectFit: "cover", borderRadius: 8 }} />
                          ) : (
                            <div style={{ width: "100%", height: 70, background: "rgba(242,149,106,0.15)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Icon style={{ width: 24, height: 24, color: "#9E7A6A" }} />
                            </div>
                          )}
                          <div>
                            <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 11, color: "#3D2315", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {ev.name}
                            </p>
                            <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 9, color: "#9E7A6A", textTransform: "uppercase" }}>
                              Encrypted
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};


const MyReportsPage = () => {
  const { reports } = useApp();
  const [filter, setFilter] = useState<"All" | "Active" | "Under Review" | "Closed">("All");
  const [search, setSearch] = useState("");

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      // Apply search
      const displayId = formatDisplayId(r.id).toLowerCase();
      if (search && !displayId.includes(search.toLowerCase())) return false;
      
      // Apply filter based on mock timeline status
      const timeline = generateTimeline(r);
      const currentStatus = timeline[timeline.length - 1].status;
      
      if (filter === "All") return true;
      if (filter === "Closed" && currentStatus === "Closed") return true;
      if (filter === "Under Review" && currentStatus === "Under Review") return true;
      if (filter === "Active" && currentStatus !== "Closed") return true;
      
      return false;
    });
  }, [reports, filter, search]);

  return (
    <AppLayout>
      <div style={{ minHeight: "100vh", background: "var(--sakhi-cream)", paddingBottom: "7rem" }}>
        <div className="max-w-3xl mx-auto px-4 pt-4">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  background: "linear-gradient(135deg,#F2956A,#D4455C)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 6px 16px rgba(212,69,92,0.25)"
                }}
              >
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 24, color: "#3D2315", lineHeight: 1.1 }}>
                  My Reports
                </h1>
                <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 12, color: "#9E7A6A" }}>
                  Track your submitted anonymous reports securely.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Filters & Search */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
              
              <div style={{ position: "relative", flex: "1 1 200px" }}>
                <Search style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "#9E7A6A" }} />
                <input
                  type="text"
                  placeholder="Search by Report ID..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: "100%",
                    background: "white",
                    border: "1.5px solid rgba(242,149,106,0.2)",
                    borderRadius: 14,
                    padding: "12px 14px 12px 38px",
                    fontFamily: "Nunito,sans-serif",
                    fontWeight: 700,
                    fontSize: 13,
                    color: "#3D2315",
                    outline: "none",
                    boxShadow: "0 2px 12px rgba(139,58,47,0.04)"
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, flexWrap: "nowrap", flexShrink: 0 }}>
                {(["All", "Active", "Under Review", "Closed"] as const).map(f => {
                  const selected = filter === f;
                  return (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      style={{
                        padding: "10px 16px",
                        borderRadius: 12,
                        border: selected ? "1.5px solid #D4455C" : "1.5px solid rgba(242,149,106,0.2)",
                        background: selected ? "#FBDDE3" : "white",
                        fontFamily: "Nunito,sans-serif",
                        fontWeight: 800,
                        fontSize: 12,
                        color: selected ? "#D4455C" : "#9E7A6A",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        transition: "all 0.2s"
                      }}
                    >
                      {f}
                    </button>
                  )
                })}
              </div>

            </div>
          </motion.div>

          {/* List */}
          <div style={{ position: "relative" }}>
            {filteredReports.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{
                  background: "white",
                  borderRadius: 24,
                  padding: "40px 20px",
                  textAlign: "center",
                  border: "1.5px dashed rgba(242,149,106,0.3)",
                  marginTop: 20
                }}
              >
                <div style={{ width: 64, height: 64, background: "#F5E4D6", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <AlertCircle style={{ width: 28, height: 28, color: "#F2956A" }} />
                </div>
                <h3 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 18, color: "#3D2315", marginBottom: 6 }}>
                  No Reports Found
                </h3>
                <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 13, color: "#9E7A6A" }}>
                  {search || filter !== "All" ? "Try adjusting your filters or search." : "You haven't submitted any anonymous reports yet."}
                </p>
              </motion.div>
            ) : (
              <AnimatePresence>
                {filteredReports.map((report, idx) => (
                  <ReportCard key={report.id} report={report} />
                ))}
              </AnimatePresence>
            )}
          </div>

        </div>
      </div>
    </AppLayout>
  );
};

export default MyReportsPage;
