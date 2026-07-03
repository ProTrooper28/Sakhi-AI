import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Upload, X, Image, Film, FileAudio, File,
  Shield, Check, MapPin, Calendar, Camera, ChevronRight,
  ChevronLeft, AlertTriangle, Zap, Eye, User, Globe,
  MessageSquare, Laptop, Heart, Navigation, Lock, Sparkles,
  BookLock, CheckCircle2
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import type { EvidenceItem } from "@/context/AppContext";

// ── Types ─────────────────────────────────────────────────────────────────────

type CategoryId =
  | "physical" | "cyber" | "harassment" | "stalking"
  | "suspicious" | "unsafe-location";

type ConfidenceLevel = "high" | "medium" | "low";
type UploadedFile = { file: File; previewUrl?: string; id: string };

// ── Category definitions ───────────────────────────────────────────────────────

const CATEGORIES: {
  id: CategoryId;
  label: string;
  emoji: string;
  desc: string;
  color: string;
  bg: string;
  border: string;
}[] = [
  {
    id: "physical",
    label: "Physical Threat",
    emoji: "🚨",
    desc: "Assault, attack, physical harm or real-world danger.",
    color: "#D4455C",
    bg: "#FBDDE3",
    border: "rgba(212,69,92,0.25)",
  },
  {
    id: "cyber",
    label: "Cyber Crime",
    emoji: "💻",
    desc: "Online scams, fake profiles, cyberbullying, blackmail.",
    color: "#2563EB",
    bg: "#DEEEFF",
    border: "rgba(37,99,235,0.2)",
  },
  {
    id: "harassment",
    label: "Harassment",
    emoji: "😤",
    desc: "Verbal, emotional, or sexual harassment in any setting.",
    color: "#E67E22",
    bg: "#FEF3CD",
    border: "rgba(230,126,34,0.25)",
  },
  {
    id: "stalking",
    label: "Stalking",
    emoji: "👁️",
    desc: "Being followed, tracked, or monitored without consent.",
    color: "#8B5CF6",
    bg: "#EDE9FE",
    border: "rgba(139,92,246,0.2)",
  },
  {
    id: "suspicious",
    label: "Suspicious Activity",
    emoji: "🔍",
    desc: "Unusual behaviour, unverified threat, or odd situation.",
    color: "#0F766E",
    bg: "#D6F5EA",
    border: "rgba(15,118,110,0.2)",
  },
  {
    id: "unsafe-location",
    label: "Unsafe Location",
    emoji: "📍",
    desc: "Area, venue, or route that feels or is known to be unsafe.",
    color: "#9E7A6A",
    bg: "#F5E4D6",
    border: "rgba(158,122,106,0.25)",
  },
];

// ── Dynamic form fields by category ──────────────────────────────────────────

const CYBER_SUBTYPES = ["Scam", "Fake Profile", "Cyberbullying", "Blackmail", "Hacking", "Impersonation"];
const PHYSICAL_SUBTYPES = ["Assault", "Mugging", "Forced Entry", "Threatening Behavior", "Other"];
const HARASSMENT_SUBTYPES = ["Verbal", "Sexual", "Emotional / Mental", "Workplace", "Public Space"];

// ── Confidence config ─────────────────────────────────────────────────────────

const CONFIDENCE: {
  id: ConfidenceLevel;
  emoji: string;
  label: string;
  desc: string;
  color: string;
  bg: string;
  border: string;
}[] = [
  {
    id: "high",
    emoji: "🟢",
    label: "High Confidence",
    desc: "Personally witnessed with strong supporting evidence.",
    color: "#3D9970",
    bg: "#D6F5EA",
    border: "rgba(61,153,112,0.3)",
  },
  {
    id: "medium",
    emoji: "🟡",
    label: "Medium Confidence",
    desc: "Likely accurate with reasonable but limited evidence.",
    color: "#B7770D",
    bg: "#FEF3CD",
    border: "rgba(183,119,13,0.3)",
  },
  {
    id: "low",
    emoji: "🟠",
    label: "Low Confidence",
    desc: "Suspicious but not fully verified — needs further review.",
    color: "#C05621",
    bg: "#FDEBD0",
    border: "rgba(192,86,33,0.3)",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const getFileIcon = (type: string) => {
  if (type.startsWith("image/")) return Image;
  if (type.startsWith("video/")) return Film;
  if (type.startsWith("audio/")) return FileAudio;
  return File;
};
const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

// ── Step progress bar ─────────────────────────────────────────────────────────

const STEPS = ["Category", "Details", "Evidence", "Review"];

const StepBar = ({ current }: { current: number }) => (
  <div className="w-full mb-7">
    {/* Label row */}
    <div className="flex justify-between mb-2.5">
      {STEPS.map((s, i) => (
        <span
          key={s}
          style={{
            fontFamily: "Nunito,sans-serif",
            fontWeight: i <= current ? 800 : 600,
            fontSize: 11,
            color: i < current ? "#3D9970" : i === current ? "#3D2315" : "#9E7A6A",
            flex: 1,
            textAlign: i === 0 ? "left" : i === STEPS.length - 1 ? "right" : "center",
          }}
        >
          {i < current ? "✓ " : ""}{s}
        </span>
      ))}
    </div>
    {/* Progress bar */}
    <div
      style={{
        height: 6,
        borderRadius: 99,
        background: "rgba(158,122,106,0.15)",
        overflow: "hidden",
      }}
    >
      <motion.div
        animate={{ width: `${((current) / (STEPS.length - 1)) * 100}%` }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        style={{
          height: "100%",
          borderRadius: 99,
          background: "linear-gradient(90deg,#F2956A,#D4455C)",
        }}
      />
    </div>
    {/* Step counter */}
    <p
      style={{
        fontFamily: "Nunito,sans-serif",
        fontWeight: 700,
        fontSize: 11,
        color: "#9E7A6A",
        textAlign: "right",
        marginTop: 5,
      }}
    >
      Step {current + 1} of {STEPS.length}
    </p>
  </div>
);

// ── fadeUp helper ─────────────────────────────────────────────────────────────

const slideIn = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
  transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
};

// ── Input helpers ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#F5E4D6",
  border: "1.5px solid rgba(242,149,106,0.3)",
  borderRadius: 14,
  padding: "12px 14px",
  fontFamily: "Nunito,sans-serif",
  fontSize: 13,
  fontWeight: 600,
  color: "#3D2315",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "Nunito,sans-serif",
  fontWeight: 800,
  fontSize: 12,
  color: "#8B3A2F",
  letterSpacing: "0.04em",
  marginBottom: 6,
  display: "block",
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const ReportPage = () => {
  const navigate = useNavigate();
  const { addReport, locationState } = useApp();

  // ── Step state ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  // ── Step 1: Category ────────────────────────────────────────────────────────
  const [category, setCategory] = useState<CategoryId | null>(null);

  // ── Step 2: Details ─────────────────────────────────────────────────────────
  const [subtype, setSubtype] = useState("");
  const [description, setDescription] = useState("");
  const [locationStr, setLocationStr] = useState("");
  const [timeStr, setTimeStr] = useState("");
  const [platform, setPlatform] = useState(""); // cyber only
  const [autoDetectLoc, setAutoDetectLoc] = useState(true);

  // ── Step 3: Evidence ────────────────────────────────────────────────────────
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [confidence, setConfidence] = useState<ConfidenceLevel>("medium");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Draft auto-save ──────────────────────────────────────────────────────────
  useEffect(() => {
    const draft = { category, subtype, description, locationStr, timeStr, platform, confidence };
    localStorage.setItem("sakhi_report_draft", JSON.stringify(draft));
  }, [category, subtype, description, locationStr, timeStr, platform, confidence]);

  // Restore draft on mount
  useEffect(() => {
    const raw = localStorage.getItem("sakhi_report_draft");
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      if (d.category) setCategory(d.category);
      if (d.subtype) setSubtype(d.subtype);
      if (d.description) setDescription(d.description);
      if (d.locationStr) setLocationStr(d.locationStr);
      if (d.timeStr) setTimeStr(d.timeStr);
      if (d.platform) setPlatform(d.platform);
      if (d.confidence) setConfidence(d.confidence);
    } catch { /* ignore */ }
  }, []);

  // Populate location from context
  useEffect(() => {
    if (autoDetectLoc && locationState.address) {
      setLocationStr(locationState.address);
    }
  }, [autoDetectLoc, locationState.address]);

  // ── File handlers ────────────────────────────────────────────────────────────
  const processFiles = (files: FileList | File[]) => {
    Array.from(files).forEach((file) => {
      const id = `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
      setUploadedFiles((prev) => [...prev, { file, previewUrl, id }]);
    });
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
    e.target.value = "";
  };
  const removeFile = (id: string) => {
    setUploadedFiles((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  // ── Submission ───────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!category || !description.trim()) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1100));

    const evidence: EvidenceItem[] = uploadedFiles.map((uf) => ({
      id: uf.id,
      type: "report-media" as const,
      name: uf.file.name,
      fileUrl: uf.previewUrl,
      fileType: uf.file.type,
      timestamp: new Date().toISOString(),
      location: locationStr || undefined,
    }));

    const fullDesc = [
      description,
      subtype ? `Subtype: ${subtype}` : "",
      platform ? `Platform: ${platform}` : "",
      `Confidence: ${confidence}`,
      timeStr ? `Time: ${timeStr}` : "",
    ].filter(Boolean).join(" | ");

    const id = addReport({
      reportType: category === "cyber" ? "cyber" : "general",
      description: fullDesc,
      anonymous: true,
      location: locationStr || undefined,
      evidence,
      status: "pending",
    });

    localStorage.removeItem("sakhi_report_draft");
    setSubmitting(false);
    setSubmitted(true);

    // Navigate after success animation
    setTimeout(() => navigate(`/report-review/${id}`), 2200);
  };

  // ── Category icon map ─────────────────────────────────────────────────────────
  const catCfg = category ? CATEGORIES.find((c) => c.id === category) : null;
  const confCfg = CONFIDENCE.find((c) => c.id === confidence)!;

  // ── Success screen ────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <AppLayout>
        <div
          style={{
            minHeight: "100vh",
            background: "var(--sakhi-cream)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 20 }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
              padding: "48px 32px",
              background: "white",
              borderRadius: 32,
              boxShadow: "0 20px 60px rgba(139,58,47,0.12)",
              maxWidth: 360,
              width: "90%",
              textAlign: "center",
            }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.15 }}
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "linear-gradient(135deg,#3D9970,#2ECC71)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 28px rgba(61,153,112,0.35)",
              }}
            >
              <CheckCircle2 className="w-10 h-10 text-white" />
            </motion.div>
            <div>
              <h2
                style={{
                  fontFamily: "Nunito,sans-serif",
                  fontWeight: 900,
                  fontSize: 24,
                  color: "#3D2315",
                  marginBottom: 8,
                }}
              >
                Report Submitted!
              </h2>
              <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 500, fontSize: 13, color: "#9E7A6A", lineHeight: 1.6 }}>
                Your anonymous report has been securely saved. Redirecting to review…
              </p>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#D6F5EA",
                borderRadius: 99,
                padding: "8px 16px",
              }}
            >
              <Lock style={{ width: 13, height: 13, color: "#3D9970" }} />
              <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 12, color: "#3D9970" }}>
                Encrypted & Anonymous
              </span>
            </div>
          </motion.div>
        </div>
      </AppLayout>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN LAYOUT
  // ─────────────────────────────────────────────────────────────────────────────

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
            <div className="flex items-center gap-3 mb-1">
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
                <Shield className="w-5 h-5 text-white" />
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
                  Anonymous Report
                </h1>
                <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 11, color: "#9E7A6A" }}>
                  Safe • Encrypted • Untraceable
                </p>
              </div>
            </div>
          </motion.div>

          {/* Step progress bar */}
          <StepBar current={step} />

          {/* Step panels */}
          <AnimatePresence mode="wait">

            {/* ─── STEP 0: Category Selection ─── */}
            {step === 0 && (
              <motion.div key="step0" {...slideIn}>
                <h2
                  style={{
                    fontFamily: "Nunito,sans-serif",
                    fontWeight: 900,
                    fontSize: 17,
                    color: "#3D2315",
                    marginBottom: 16,
                  }}
                >
                  What happened? 🔍
                </h2>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  {CATEGORIES.map((cat, i) => {
                    const selected = category === cat.id;
                    return (
                      <motion.button
                        key={cat.id}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setCategory(cat.id)}
                        style={{
                          background: selected ? cat.bg : "white",
                          border: `2px solid ${selected ? cat.border : "rgba(242,149,106,0.12)"}`,
                          borderRadius: 22,
                          padding: "16px 14px",
                          textAlign: "left",
                          cursor: "pointer",
                          position: "relative",
                          boxShadow: selected
                            ? `0 6px 20px ${cat.color}22`
                            : "0 2px 10px rgba(139,58,47,0.05)",
                          transition: "all 0.2s ease",
                        }}
                      >
                        {selected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            style={{
                              position: "absolute",
                              top: 10,
                              right: 10,
                              width: 20,
                              height: 20,
                              borderRadius: "50%",
                              background: cat.color,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Check style={{ width: 11, height: 11, color: "white" }} />
                          </motion.div>
                        )}
                        <div style={{ fontSize: 26, marginBottom: 8 }}>{cat.emoji}</div>
                        <p
                          style={{
                            fontFamily: "Nunito,sans-serif",
                            fontWeight: 900,
                            fontSize: 13,
                            color: selected ? cat.color : "#3D2315",
                            lineHeight: 1.3,
                            marginBottom: 4,
                          }}
                        >
                          {cat.label}
                        </p>
                        <p
                          style={{
                            fontFamily: "Nunito,sans-serif",
                            fontWeight: 500,
                            fontSize: 10,
                            color: "#9E7A6A",
                            lineHeight: 1.45,
                          }}
                        >
                          {cat.desc}
                        </p>
                      </motion.button>
                    );
                  })}
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  disabled={!category}
                  onClick={() => setStep(1)}
                  style={{
                    width: "100%",
                    padding: "15px",
                    borderRadius: 18,
                    border: "none",
                    cursor: category ? "pointer" : "not-allowed",
                    background: category
                      ? "linear-gradient(135deg,#F2956A,#D4455C)"
                      : "rgba(158,122,106,0.15)",
                    color: category ? "white" : "#9E7A6A",
                    fontFamily: "Nunito,sans-serif",
                    fontWeight: 900,
                    fontSize: 15,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    boxShadow: category ? "0 6px 20px rgba(212,69,92,0.25)" : "none",
                    transition: "all 0.2s ease",
                  }}
                >
                  Continue <ChevronRight style={{ width: 18, height: 18 }} />
                </motion.button>
              </motion.div>
            )}

            {/* ─── STEP 1: Dynamic Details Form ─── */}
            {step === 1 && (
              <motion.div key="step1" {...slideIn}>
                {/* Category badge */}
                {catCfg && (
                  <div
                    className="flex items-center gap-2 mb-5 px-3 py-2 rounded-2xl"
                    style={{
                      background: catCfg.bg,
                      border: `1.5px solid ${catCfg.border}`,
                      display: "inline-flex",
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{catCfg.emoji}</span>
                    <span
                      style={{
                        fontFamily: "Nunito,sans-serif",
                        fontWeight: 800,
                        fontSize: 13,
                        color: catCfg.color,
                      }}
                    >
                      {catCfg.label}
                    </span>
                  </div>
                )}

                <h2
                  style={{
                    fontFamily: "Nunito,sans-serif",
                    fontWeight: 900,
                    fontSize: 17,
                    color: "#3D2315",
                    marginBottom: 18,
                  }}
                >
                  Tell us what happened 📝
                </h2>

                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                  {/* Sub-type selector — Physical */}
                  {category === "physical" && (
                    <div>
                      <label style={labelStyle}>INCIDENT TYPE</label>
                      <div className="flex flex-wrap gap-2">
                        {PHYSICAL_SUBTYPES.map((s) => (
                          <button
                            key={s}
                            onClick={() => setSubtype(s)}
                            style={{
                              padding: "7px 14px",
                              borderRadius: 99,
                              border: `1.5px solid ${subtype === s ? "#D4455C" : "rgba(242,149,106,0.3)"}`,
                              background: subtype === s ? "#FBDDE3" : "white",
                              fontFamily: "Nunito,sans-serif",
                              fontWeight: 700,
                              fontSize: 12,
                              color: subtype === s ? "#D4455C" : "#8B3A2F",
                              cursor: "pointer",
                              transition: "all 0.15s",
                            }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sub-type selector — Cyber */}
                  {category === "cyber" && (
                    <>
                      <div>
                        <label style={labelStyle}>CYBER CRIME TYPE</label>
                        <div className="flex flex-wrap gap-2">
                          {CYBER_SUBTYPES.map((s) => (
                            <button
                              key={s}
                              onClick={() => setSubtype(s)}
                              style={{
                                padding: "7px 14px",
                                borderRadius: 99,
                                border: `1.5px solid ${subtype === s ? "#2563EB" : "rgba(37,99,235,0.2)"}`,
                                background: subtype === s ? "#DEEEFF" : "white",
                                fontFamily: "Nunito,sans-serif",
                                fontWeight: 700,
                                fontSize: 12,
                                color: subtype === s ? "#2563EB" : "#8B3A2F",
                                cursor: "pointer",
                                transition: "all 0.15s",
                              }}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Platform */}
                      <div>
                        <label style={labelStyle}>PLATFORM</label>
                        <div className="flex flex-wrap gap-2">
                          {["Instagram", "WhatsApp", "Facebook", "Twitter/X", "Telegram", "Email", "Other"].map((p) => (
                            <button
                              key={p}
                              onClick={() => setPlatform(p)}
                              style={{
                                padding: "7px 14px",
                                borderRadius: 99,
                                border: `1.5px solid ${platform === p ? "#2563EB" : "rgba(37,99,235,0.2)"}`,
                                background: platform === p ? "#DEEEFF" : "white",
                                fontFamily: "Nunito,sans-serif",
                                fontWeight: 700,
                                fontSize: 12,
                                color: platform === p ? "#2563EB" : "#8B3A2F",
                                cursor: "pointer",
                                transition: "all 0.15s",
                              }}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Sub-type — Harassment */}
                  {category === "harassment" && (
                    <div>
                      <label style={labelStyle}>HARASSMENT TYPE</label>
                      <div className="flex flex-wrap gap-2">
                        {HARASSMENT_SUBTYPES.map((s) => (
                          <button
                            key={s}
                            onClick={() => setSubtype(s)}
                            style={{
                              padding: "7px 14px",
                              borderRadius: 99,
                              border: `1.5px solid ${subtype === s ? "#E67E22" : "rgba(230,126,34,0.25)"}`,
                              background: subtype === s ? "#FEF3CD" : "white",
                              fontFamily: "Nunito,sans-serif",
                              fontWeight: 700,
                              fontSize: 12,
                              color: subtype === s ? "#E67E22" : "#8B3A2F",
                              cursor: "pointer",
                              transition: "all 0.15s",
                            }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  <div>
                    <label style={labelStyle}>DESCRIPTION *</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe what happened with as much detail as you're comfortable sharing…"
                      rows={5}
                      style={{
                        ...inputStyle,
                        resize: "none",
                        lineHeight: 1.6,
                      }}
                    />
                  </div>

                  {/* Location row */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <label style={{ ...labelStyle, marginBottom: 0 }}>LOCATION</label>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 11, color: "#9E7A6A" }}>
                          Auto-detect
                        </span>
                        <button
                          onClick={() => setAutoDetectLoc((v) => !v)}
                          style={{
                            width: 36,
                            height: 20,
                            borderRadius: 99,
                            border: "none",
                            background: autoDetectLoc ? "#D4455C" : "rgba(158,122,106,0.2)",
                            position: "relative",
                            cursor: "pointer",
                            transition: "background 0.2s",
                          }}
                        >
                          <motion.div
                            animate={{ x: autoDetectLoc ? 18 : 2 }}
                            style={{
                              width: 16,
                              height: 16,
                              background: "white",
                              borderRadius: "50%",
                              position: "absolute",
                              top: 2,
                              boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                            }}
                          />
                        </button>
                      </div>
                    </div>
                    <div style={{ position: "relative" }}>
                      <MapPin
                        style={{
                          position: "absolute",
                          left: 13,
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: 15,
                          height: 15,
                          color: "#D4455C",
                        }}
                      />
                      <input
                        type="text"
                        value={locationStr}
                        onChange={(e) => setLocationStr(e.target.value)}
                        placeholder={autoDetectLoc ? "Detecting your location…" : "Enter location manually…"}
                        disabled={autoDetectLoc}
                        style={{ ...inputStyle, paddingLeft: 36, opacity: autoDetectLoc ? 0.75 : 1 }}
                      />
                    </div>
                  </div>

                  {/* Time */}
                  <div>
                    <label style={labelStyle}>TIME OF INCIDENT</label>
                    <div style={{ position: "relative" }}>
                      <Calendar
                        style={{
                          position: "absolute",
                          left: 13,
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: 15,
                          height: 15,
                          color: "#9E7A6A",
                        }}
                      />
                      <input
                        type="text"
                        value={timeStr}
                        onChange={(e) => setTimeStr(e.target.value)}
                        placeholder="e.g. Today, 6:30 PM"
                        style={{ ...inputStyle, paddingLeft: 36 }}
                      />
                    </div>
                  </div>

                </div>

                {/* Navigation */}
                <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                  <button
                    onClick={() => setStep(0)}
                    style={{
                      padding: "13px 18px",
                      borderRadius: 16,
                      border: "1.5px solid rgba(242,149,106,0.3)",
                      background: "white",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontFamily: "Nunito,sans-serif",
                      fontWeight: 700,
                      fontSize: 13,
                      color: "#9E7A6A",
                    }}
                  >
                    <ChevronLeft style={{ width: 16, height: 16 }} /> Back
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    disabled={!description.trim()}
                    onClick={() => setStep(2)}
                    style={{
                      flex: 1,
                      padding: "13px",
                      borderRadius: 16,
                      border: "none",
                      cursor: description.trim() ? "pointer" : "not-allowed",
                      background: description.trim()
                        ? "linear-gradient(135deg,#F2956A,#D4455C)"
                        : "rgba(158,122,106,0.15)",
                      color: description.trim() ? "white" : "#9E7A6A",
                      fontFamily: "Nunito,sans-serif",
                      fontWeight: 900,
                      fontSize: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      boxShadow: description.trim() ? "0 6px 20px rgba(212,69,92,0.25)" : "none",
                      transition: "all 0.2s ease",
                    }}
                  >
                    Add Evidence <ChevronRight style={{ width: 17, height: 17 }} />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ─── STEP 2: Evidence & Confidence ─── */}
            {step === 2 && (
              <motion.div key="step2" {...slideIn}>
                <h2
                  style={{
                    fontFamily: "Nunito,sans-serif",
                    fontWeight: 900,
                    fontSize: 17,
                    color: "#3D2315",
                    marginBottom: 18,
                  }}
                >
                  Add Evidence 🗂️
                </h2>

                {/* Evidence upload zone */}
                <div
                  style={{
                    background: "white",
                    borderRadius: 24,
                    padding: 20,
                    boxShadow: "0 4px 20px rgba(139,58,47,0.06)",
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 14, color: "#3D2315" }}>
                      Upload Evidence Files
                    </p>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        background: "#D6F5EA",
                        borderRadius: 99,
                        padding: "4px 10px",
                      }}
                    >
                      <Lock style={{ width: 10, height: 10, color: "#3D9970" }} />
                      <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 10, color: "#3D9970" }}>
                        Secure Upload
                      </span>
                    </div>
                  </div>

                  {/* Supported types */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                    {[
                      { icon: Image, label: "Photos", color: "#2563EB", bg: "#DEEEFF" },
                      { icon: Film, label: "Videos", color: "#D4455C", bg: "#FBDDE3" },
                      { icon: FileAudio, label: "Audio", color: "#3D9970", bg: "#D6F5EA" },
                      { icon: File, label: "Docs", color: "#8B5CF6", bg: "#EDE9FE" },
                    ].map(({ icon: Icon, label, color, bg }) => (
                      <div
                        key={label}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          background: bg,
                          borderRadius: 99,
                          padding: "5px 10px",
                        }}
                      >
                        <Icon style={{ width: 11, height: 11, color }} />
                        <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 10, color }}>
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,audio/*,video/*,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {/* Drop zone */}
                  <motion.div
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragging(false);
                      processFiles(Array.from(e.dataTransfer.files));
                    }}
                    animate={{
                      borderColor: dragging ? "#D4455C" : "rgba(242,149,106,0.3)",
                      background: dragging ? "#FBDDE3" : "#F5E4D6",
                    }}
                    style={{
                      borderRadius: 18,
                      border: "2px dashed rgba(242,149,106,0.3)",
                      padding: "24px 16px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 14,
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 16,
                        background: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 4px 14px rgba(139,58,47,0.1)",
                      }}
                    >
                      <Upload style={{ width: 22, height: 22, color: "#D4455C" }} />
                    </div>
                    <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 13, color: "#3D2315" }}>
                      Drop files here
                    </p>
                    <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 500, fontSize: 11, color: "#9E7A6A" }}>
                      or use the buttons below
                    </p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          padding: "9px 16px",
                          borderRadius: 12,
                          border: "1.5px solid rgba(242,149,106,0.3)",
                          background: "white",
                          fontFamily: "Nunito,sans-serif",
                          fontWeight: 800,
                          fontSize: 12,
                          color: "#8B3A2F",
                          cursor: "pointer",
                        }}
                      >
                        Select Files
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          padding: "9px 16px",
                          borderRadius: 12,
                          border: "none",
                          background: "linear-gradient(135deg,#F2956A,#D4455C)",
                          fontFamily: "Nunito,sans-serif",
                          fontWeight: 800,
                          fontSize: 12,
                          color: "white",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <Camera style={{ width: 13, height: 13 }} /> Camera
                      </button>
                    </div>
                  </motion.div>

                  {/* File list */}
                  <AnimatePresence>
                    {uploadedFiles.map((uf) => {
                      const Icon = getFileIcon(uf.file.type);
                      return (
                        <motion.div
                          key={uf.id}
                          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                          animate={{ opacity: 1, height: "auto", marginBottom: 8 }}
                          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            background: "#F5E4D6",
                            borderRadius: 14,
                            padding: "10px 12px",
                          }}
                        >
                          {uf.previewUrl ? (
                            <img
                              src={uf.previewUrl}
                              alt={uf.file.name}
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
                              {uf.file.name}
                            </p>
                            <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 10, color: "#9E7A6A" }}>
                              {formatSize(uf.file.size)} · Encrypted
                            </p>
                          </div>
                          <button
                            onClick={() => removeFile(uf.id)}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 8,
                              background: "rgba(212,69,92,0.1)",
                              border: "none",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <X style={{ width: 14, height: 14, color: "#D4455C" }} />
                          </button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                {/* Confidence Level */}
                <div
                  style={{
                    background: "white",
                    borderRadius: 24,
                    padding: 20,
                    boxShadow: "0 4px 20px rgba(139,58,47,0.06)",
                    marginBottom: 20,
                  }}
                >
                  <p
                    style={{
                      fontFamily: "Nunito,sans-serif",
                      fontWeight: 800,
                      fontSize: 14,
                      color: "#3D2315",
                      marginBottom: 14,
                    }}
                  >
                    Confidence Level
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {CONFIDENCE.map((c) => {
                      const selected = confidence === c.id;
                      return (
                        <motion.button
                          key={c.id}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setConfidence(c.id)}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 12,
                            padding: "12px 14px",
                            borderRadius: 16,
                            border: `2px solid ${selected ? c.border : "rgba(242,149,106,0.12)"}`,
                            background: selected ? c.bg : "white",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "all 0.15s",
                          }}
                        >
                          <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{c.emoji}</span>
                          <div style={{ flex: 1 }}>
                            <p
                              style={{
                                fontFamily: "Nunito,sans-serif",
                                fontWeight: 900,
                                fontSize: 13,
                                color: selected ? c.color : "#3D2315",
                                marginBottom: 2,
                              }}
                            >
                              {c.label}
                            </p>
                            <p
                              style={{
                                fontFamily: "Nunito,sans-serif",
                                fontWeight: 500,
                                fontSize: 11,
                                color: "#9E7A6A",
                                lineHeight: 1.45,
                              }}
                            >
                              {c.desc}
                            </p>
                          </div>
                          {selected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: "50%",
                                background: c.color,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <Check style={{ width: 11, height: 11, color: "white" }} />
                            </motion.div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Navigation */}
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setStep(1)}
                    style={{
                      padding: "13px 18px",
                      borderRadius: 16,
                      border: "1.5px solid rgba(242,149,106,0.3)",
                      background: "white",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontFamily: "Nunito,sans-serif",
                      fontWeight: 700,
                      fontSize: 13,
                      color: "#9E7A6A",
                    }}
                  >
                    <ChevronLeft style={{ width: 16, height: 16 }} /> Back
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setStep(3)}
                    style={{
                      flex: 1,
                      padding: "13px",
                      borderRadius: 16,
                      border: "none",
                      cursor: "pointer",
                      background: "linear-gradient(135deg,#F2956A,#D4455C)",
                      color: "white",
                      fontFamily: "Nunito,sans-serif",
                      fontWeight: 900,
                      fontSize: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      boxShadow: "0 6px 20px rgba(212,69,92,0.25)",
                    }}
                  >
                    Review Report <ChevronRight style={{ width: 17, height: 17 }} />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ─── STEP 3: Review & Submit ─── */}
            {step === 3 && (
              <motion.div key="step3" {...slideIn}>
                <h2
                  style={{
                    fontFamily: "Nunito,sans-serif",
                    fontWeight: 900,
                    fontSize: 17,
                    color: "#3D2315",
                    marginBottom: 18,
                  }}
                >
                  Review & Submit ✅
                </h2>

                {/* Summary card */}
                <div
                  style={{
                    background: "white",
                    borderRadius: 24,
                    overflow: "hidden",
                    boxShadow: "0 4px 24px rgba(139,58,47,0.07)",
                    marginBottom: 14,
                  }}
                >
                  {/* Header band */}
                  <div
                    style={{
                      background: catCfg
                        ? catCfg.bg
                        : "var(--sakhi-cream-deep)",
                      padding: "14px 18px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      borderBottom: "1px solid rgba(242,149,106,0.1)",
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{catCfg?.emoji}</span>
                    <div>
                      <p
                        style={{
                          fontFamily: "Nunito,sans-serif",
                          fontWeight: 900,
                          fontSize: 15,
                          color: catCfg?.color ?? "#3D2315",
                        }}
                      >
                        {catCfg?.label}
                      </p>
                      {subtype && (
                        <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 11, color: "#9E7A6A" }}>
                          {subtype}{platform ? ` · ${platform}` : ""}
                        </p>
                      )}
                    </div>
                    <div
                      style={{
                        marginLeft: "auto",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        background: "rgba(255,255,255,0.7)",
                        borderRadius: 99,
                        padding: "4px 10px",
                      }}
                    >
                      <Lock style={{ width: 10, height: 10, color: "#3D9970" }} />
                      <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 10, color: "#3D9970" }}>
                        Anonymous
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>

                    {/* Description */}
                    <div>
                      <p style={{ ...labelStyle, marginBottom: 4 }}>DESCRIPTION</p>
                      <p
                        style={{
                          fontFamily: "Nunito,sans-serif",
                          fontWeight: 500,
                          fontSize: 13,
                          color: "#5C3D2A",
                          lineHeight: 1.6,
                        }}
                      >
                        {description || "(no description)"}
                      </p>
                    </div>

                    {/* Meta row */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {locationStr && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            background: "#F5E4D6",
                            borderRadius: 99,
                            padding: "5px 10px",
                          }}
                        >
                          <MapPin style={{ width: 11, height: 11, color: "#D4455C" }} />
                          <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 11, color: "#8B3A2F" }}>
                            {locationStr}
                          </span>
                        </div>
                      )}
                      {timeStr && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            background: "#F5E4D6",
                            borderRadius: 99,
                            padding: "5px 10px",
                          }}
                        >
                          <Calendar style={{ width: 11, height: 11, color: "#9E7A6A" }} />
                          <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 11, color: "#8B3A2F" }}>
                            {timeStr}
                          </span>
                        </div>
                      )}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          background: "#F5E4D6",
                          borderRadius: 99,
                          padding: "5px 10px",
                        }}
                      >
                        <span style={{ fontSize: 11 }}>🕐</span>
                        <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 11, color: "#8B3A2F" }}>
                          {new Date().toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Evidence summary */}
                    <div>
                      <p style={{ ...labelStyle, marginBottom: 6 }}>
                        EVIDENCE ({uploadedFiles.length} file{uploadedFiles.length !== 1 ? "s" : ""})
                      </p>
                      {uploadedFiles.length === 0 ? (
                        <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 500, fontSize: 12, color: "#9E7A6A" }}>
                          No files attached
                        </p>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {uploadedFiles.map((uf) => {
                            const Icon = getFileIcon(uf.file.type);
                            return (
                              <div
                                key={uf.id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 5,
                                  background: "#F5E4D6",
                                  borderRadius: 10,
                                  padding: "5px 9px",
                                }}
                              >
                                {uf.previewUrl ? (
                                  <img
                                    src={uf.previewUrl}
                                    alt=""
                                    style={{ width: 22, height: 22, borderRadius: 6, objectFit: "cover" }}
                                  />
                                ) : (
                                  <Icon style={{ width: 13, height: 13, color: "#9E7A6A" }} />
                                )}
                                <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 10, color: "#8B3A2F", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {uf.file.name}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Confidence badge */}
                    <div>
                      <p style={{ ...labelStyle, marginBottom: 6 }}>CONFIDENCE LEVEL</p>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          background: confCfg.bg,
                          border: `1.5px solid ${confCfg.border}`,
                          borderRadius: 14,
                          padding: "9px 14px",
                        }}
                      >
                        <span style={{ fontSize: 16 }}>{confCfg.emoji}</span>
                        <div>
                          <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 13, color: confCfg.color }}>
                            {confCfg.label}
                          </p>
                          <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 500, fontSize: 11, color: "#9E7A6A" }}>
                            {confCfg.desc}
                          </p>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Privacy notice */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    background: "#D6F5EA",
                    borderRadius: 16,
                    padding: "12px 14px",
                    marginBottom: 18,
                  }}
                >
                  <Shield style={{ width: 16, height: 16, color: "#3D9970", flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 11, color: "#2E7D56", lineHeight: 1.55 }}>
                    All data is encrypted and stored locally on your device. Your identity is never revealed without your explicit consent.
                  </p>
                </div>

                {/* Navigation */}
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setStep(2)}
                    style={{
                      padding: "13px 18px",
                      borderRadius: 16,
                      border: "1.5px solid rgba(242,149,106,0.3)",
                      background: "white",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontFamily: "Nunito,sans-serif",
                      fontWeight: 700,
                      fontSize: 13,
                      color: "#9E7A6A",
                    }}
                  >
                    <ChevronLeft style={{ width: 16, height: 16 }} /> Back
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    disabled={submitting}
                    onClick={handleSubmit}
                    style={{
                      flex: 1,
                      padding: "13px",
                      borderRadius: 16,
                      border: "none",
                      cursor: submitting ? "not-allowed" : "pointer",
                      background: submitting
                        ? "rgba(158,122,106,0.15)"
                        : "linear-gradient(135deg,#3D9970,#2ECC71)",
                      color: submitting ? "#9E7A6A" : "white",
                      fontFamily: "Nunito,sans-serif",
                      fontWeight: 900,
                      fontSize: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      boxShadow: submitting ? "none" : "0 6px 20px rgba(61,153,112,0.3)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {submitting ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          style={{
                            width: 16,
                            height: 16,
                            border: "2px solid rgba(158,122,106,0.3)",
                            borderTopColor: "#9E7A6A",
                            borderRadius: "50%",
                          }}
                        />
                        Submitting…
                      </>
                    ) : (
                      <>
                        <BookLock style={{ width: 16, height: 16 }} />
                        Submit Anonymously
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </AppLayout>
  );
};

export default ReportPage;
