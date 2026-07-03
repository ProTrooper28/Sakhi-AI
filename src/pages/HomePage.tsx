import { ChevronRight, Phone, Sparkles, Shield, AlertTriangle, MapPin, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { useApp } from "@/context/AppContext";

// ── Helpline data ─────────────────────────────────────────────────────────────
const HELPLINES = [
  { label: "Police", num: "112", emoji: "🚔" },
  { label: "Women Helpline", num: "1091", emoji: "🌸" },
  { label: "Ambulance", num: "108", emoji: "🚑" },
  { label: "Cyber Crime", num: "1930", emoji: "💻" },
  { label: "Child Helpline", num: "1098", emoji: "🌼" },
];

// ── Apnewale data ─────────────────────────────────────────────────────────────
const apnewale = [
  { name: "Priya didi", initials: "PR", color: "#F2956A", status: "online" as const, lastActive: "Now" },
  { name: "Rahul bhai", initials: "RK", color: "#3D9970", status: "available" as const, lastActive: "2 min ago" },
  { name: "Maa", initials: "MA", color: "#D4455C", status: "away" as const, lastActive: "1 hr ago" },
];

// ── Area risk levels ──────────────────────────────────────────────────────────
type RiskLevel = "low" | "moderate" | "high";

const RISK_CONFIG = {
  low: {
    label: "Low Risk",
    emoji: "🛡️",
    color: "#3D9970",
    bg: "#D6F5EA",
    border: "rgba(61,153,112,0.25)",
    barColor: "#3D9970",
    message: "Your area is calm and safe right now. Enjoy your evening with peace of mind.",
    indicator: 0.2,
  },
  moderate: {
    label: "Moderate Risk",
    emoji: "⚠️",
    color: "#E67E22",
    bg: "#FEF3CD",
    border: "rgba(230,126,34,0.25)",
    barColor: "#F39C12",
    message: "Stay alert and keep your Apnewale informed of your whereabouts.",
    indicator: 0.55,
  },
  high: {
    label: "High Risk",
    emoji: "🔴",
    color: "#D4455C",
    bg: "#FBDDE3",
    border: "rgba(212,69,92,0.3)",
    barColor: "#D4455C",
    message: "Exercise extra caution. Share your location with a trusted guardian.",
    indicator: 0.88,
  },
};

// ── Dynamic greeting ──────────────────────────────────────────────────────────
const getDynamicGreeting = (): { hindi: string; english: string; emoji: string } => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12)
    return { hindi: "सुप्रभात 🌅", english: "Good Morning, Preeti didi", emoji: "☀️" };
  if (hour >= 12 && hour < 17)
    return { hindi: "नमस्ते 🌸", english: "Good Afternoon, Preeti didi", emoji: "🌺" };
  if (hour >= 17 && hour < 20)
    return { hindi: "शुभ संध्या 🌇", english: "Good Evening, Preeti didi", emoji: "🌸" };
  return { hindi: "रात सुरक्षित हो 🌙", english: "Stay Safe Tonight, Preeti didi", emoji: "🌙" };
};

// ── Guardian status pill ──────────────────────────────────────────────────────
const StatusPill = ({ status, lastActive }: { status: "online" | "available" | "away"; lastActive: string }) => {
  const map = {
    online: { dot: "#3D9970", label: "Online", bg: "rgba(61,153,112,0.1)", color: "#2E7D56" },
    available: { dot: "#F39C12", label: "Available", bg: "rgba(243,156,18,0.1)", color: "#B7770D" },
    away: { dot: "#9E7A6A", label: lastActive, bg: "rgba(158,122,106,0.1)", color: "#6B4F40" },
  };
  const cfg = map[status];
  return (
    <div
      className="flex items-center gap-1 px-2 py-0.5 rounded-full"
      style={{ background: cfg.bg }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{
          background: cfg.dot,
          boxShadow: status === "online" ? `0 0 0 3px ${cfg.dot}22` : "none",
        }}
      />
      <span
        style={{
          fontFamily: "Nunito,sans-serif",
          fontWeight: 700,
          fontSize: 9,
          color: cfg.color,
          whiteSpace: "nowrap",
        }}
      >
        {cfg.label}
      </span>
    </div>
  );
};

// ── Fade-up animation helper ──────────────────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.42, ease: [0.22, 1, 0.36, 1] },
});

// ── Scrolling helpline ticker ─────────────────────────────────────────────────
const HelplineTicker = () => {
  const items = [...HELPLINES, ...HELPLINES]; // duplicate for seamless loop
  return (
    <div
      className="overflow-hidden flex items-center"
      style={{
        background: "linear-gradient(135deg,#5C2018,#8B3A2F)",
        borderRadius: 14,
        padding: "8px 0",
        boxShadow: "0 2px 12px rgba(92,32,24,0.18)",
      }}
    >
      <div className="ticker-animate">
        {items.map((h, i) => (
          <a
            key={i}
            href={`tel:${h.num}`}
            className="flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
            style={{ textDecoration: "none" }}
            title={`Call ${h.label}: ${h.num}`}
          >
            <span style={{ fontSize: 13 }}>{h.emoji}</span>
            <span
              style={{
                fontFamily: "Nunito,sans-serif",
                fontWeight: 800,
                fontSize: 11,
                color: "rgba(255,255,255,0.95)",
              }}
            >
              {h.label}:
            </span>
            <span
              style={{
                fontFamily: "Nunito,sans-serif",
                fontWeight: 900,
                fontSize: 12,
                color: "#FBCDA8",
                letterSpacing: "0.04em",
              }}
            >
              {h.num}
            </span>
            <Phone style={{ width: 9, height: 9, color: "rgba(255,255,255,0.6)", marginLeft: 1 }} />
            <span style={{ color: "rgba(255,255,255,0.25)", margin: "0 8px" }}>•</span>
          </a>
        ))}
      </div>
    </div>
  );
};

// ── Vertical safety indicator bar ─────────────────────────────────────────────
const SafetyIndicatorBar = ({ level }: { level: RiskLevel }) => {
  const cfg = RISK_CONFIG[level];
  const fillPct = cfg.indicator * 100;

  // Gradient based on risk
  const gradients = {
    low: "linear-gradient(to top, #3D9970, #2ECC71)",
    moderate: "linear-gradient(to top, #F39C12, #E67E22)",
    high: "linear-gradient(to top, #D4455C, #E74C3C)",
  };

  return (
    <div
      className="flex flex-col items-center justify-end"
      style={{
        width: 10,
        height: 90,
        background: "rgba(158,122,106,0.1)",
        borderRadius: 8,
        padding: 2,
        flexShrink: 0,
      }}
    >
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: `${fillPct}%` }}
        transition={{ delay: 0.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: "100%",
          background: gradients[level],
          borderRadius: 6,
          boxShadow: `0 0 8px ${cfg.barColor}66`,
        }}
      />
    </div>
  );
};

// ── Area Status card ──────────────────────────────────────────────────────────
const AreaStatusCard = ({ level, location }: { level: RiskLevel; location: string | null }) => {
  const cfg = RISK_CONFIG[level];

  return (
    <div
      className="flex items-start gap-3 rounded-[22px] p-4"
      style={{
        background: cfg.bg,
        border: `1.5px solid ${cfg.border}`,
        boxShadow: "0 4px 20px rgba(139,58,47,0.07)",
      }}
    >
      {/* Safety Indicator Bar */}
      <SafetyIndicatorBar level={level} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span style={{ fontSize: 18 }}>{cfg.emoji}</span>
          <span
            style={{
              fontFamily: "Nunito,sans-serif",
              fontWeight: 900,
              fontSize: 16,
              color: cfg.color,
            }}
          >
            {cfg.label}
          </span>
          <div
            className="flex items-center gap-1 ml-auto px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: "rgba(158,122,106,0.12)" }}
          >
            <MapPin style={{ width: 9, height: 9, color: "#9E7A6A" }} />
            <span
              style={{
                fontFamily: "Nunito,sans-serif",
                fontWeight: 700,
                fontSize: 9,
                color: "#9E7A6A",
                maxWidth: 80,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {location || "Detecting…"}
            </span>
          </div>
        </div>
        <p
          style={{
            fontFamily: "Nunito,sans-serif",
            fontWeight: 500,
            fontSize: 12,
            color: "#5C3D2A",
            lineHeight: 1.55,
          }}
        >
          {cfg.message}
        </p>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const HomePage = () => {
  const navigate = useNavigate();
  const { triggerSOS, sosState, locationState } = useApp();
  const greeting = getDynamicGreeting();

  // Simulate area risk based on time (rotates every 10 min for demo)
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("low");
  useEffect(() => {
    const levels: RiskLevel[] = ["low", "moderate", "low", "high", "low", "moderate"];
    const idx = Math.floor(new Date().getMinutes() / 10) % levels.length;
    setRiskLevel(levels[idx]);
  }, []);

  // SOS pulse active
  const sosActive = sosState.active;

  return (
    <AppLayout>
      <div style={{ minHeight: "100vh", background: "var(--sakhi-cream)", paddingBottom: "8rem" }}>
        <div className="max-w-lg mx-auto px-4 pt-2">

          {/* ── Scrolling helpline ticker ── */}
          <motion.div {...fadeUp(0)} className="mb-4">
            <HelplineTicker />
          </motion.div>

          {/* ── Dynamic Greeting ── */}
          <motion.div {...fadeUp(0.06)} className="flex items-start justify-between mb-5">
            <div>
              <p
                style={{
                  fontFamily: "var(--font-deva)",
                  fontWeight: 600,
                  fontSize: 14,
                  color: "#9E7A6A",
                }}
                className="mb-0.5"
              >
                {greeting.hindi}
              </p>
              <h1
                style={{
                  fontFamily: "Nunito,sans-serif",
                  fontWeight: 900,
                  fontSize: 27,
                  color: "#3D2315",
                  lineHeight: 1.1,
                }}
              >
                {greeting.english}
              </h1>
              <p
                style={{
                  fontFamily: "Nunito,sans-serif",
                  fontWeight: 500,
                  fontSize: 12,
                  color: "#9E7A6A",
                  marginTop: 4,
                }}
              >
                Sakhi is always here for you 💜
              </p>
            </div>
            {/* Avatar */}
            <div className="relative mt-1 flex-shrink-0">
              <div
                className="w-13 h-13 rounded-full flex items-center justify-center text-white font-black text-sm shadow-lg"
                style={{ width: 52, height: 52, background: "linear-gradient(135deg,#F2956A,#D4455C)" }}
              >
                PS
              </div>
              <div
                className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2"
                style={{ background: "#3D9970", borderColor: "var(--sakhi-cream)" }}
              />
            </div>
          </motion.div>

          {/* ── Area Status Card ── */}
          <motion.div {...fadeUp(0.1)} className="mb-5">
            <div className="flex items-center justify-between mb-2.5">
              <h2
                style={{
                  fontFamily: "Nunito,sans-serif",
                  fontWeight: 900,
                  fontSize: 16,
                  color: "#3D2315",
                }}
              >
                Area Status
              </h2>
              <button
                onClick={() => navigate("/risk-map")}
                className="flex items-center gap-1 cursor-pointer"
                style={{
                  fontFamily: "Nunito,sans-serif",
                  fontWeight: 700,
                  fontSize: 11,
                  color: "#D4455C",
                  background: "none",
                  border: "none",
                }}
              >
                View Map <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <AreaStatusCard level={riskLevel} location={locationState.address} />
          </motion.div>

          {/* ── Talk to Sakhi — prominent CTA ── */}
          <motion.div {...fadeUp(0.14)} className="mb-5">
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: "0 12px 40px rgba(212,69,92,0.22)" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/assistant")}
              className="w-full rounded-[26px] overflow-hidden cursor-pointer relative"
              style={{
                background: "linear-gradient(135deg,#F2956A 0%,#D4455C 100%)",
                padding: "22px 24px",
                boxShadow: "0 8px 32px rgba(212,69,92,0.22)",
                border: "none",
              }}
            >
              {/* Decorative orb */}
              <div
                className="absolute"
                style={{
                  top: -20,
                  right: -20,
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.12)",
                }}
              />
              <div
                className="absolute"
                style={{
                  bottom: -10,
                  right: 50,
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.08)",
                }}
              />

              <div className="relative z-10 flex items-center gap-4 text-left">
                {/* Icon */}
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "rgba(255,255,255,0.22)",
                    backdropFilter: "blur(8px)",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                  }}
                >
                  <Sparkles className="w-7 h-7 text-white" />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p
                    style={{
                      fontFamily: "Nunito,sans-serif",
                      fontWeight: 900,
                      fontSize: 20,
                      color: "white",
                      lineHeight: 1.2,
                    }}
                  >
                    Talk to Sakhi
                  </p>
                  <p
                    style={{
                      fontFamily: "Nunito,sans-serif",
                      fontWeight: 500,
                      fontSize: 12,
                      color: "rgba(255,255,255,0.85)",
                      marginTop: 4,
                    }}
                  >
                    Your AI companion is listening, always 💜
                  </p>
                  <div
                    className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full"
                    style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(6px)" }}
                  >
                    <span style={{ fontSize: 10 }}>●</span>
                    <span
                      style={{
                        fontFamily: "Nunito,sans-serif",
                        fontWeight: 800,
                        fontSize: 11,
                        color: "white",
                      }}
                    >
                      Online & ready to help
                    </span>
                  </div>
                </div>

                <ChevronRight className="w-6 h-6 text-white opacity-70 flex-shrink-0" />
              </div>
            </motion.button>
          </motion.div>

          {/* ── Apnewale section ── */}
          <motion.div {...fadeUp(0.18)} className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <h2
                style={{
                  fontFamily: "Nunito,sans-serif",
                  fontWeight: 900,
                  fontSize: 18,
                  color: "#3D2315",
                }}
              >
                Aapke Apnewale 💛
              </h2>
              <button
                onClick={() => navigate("/guardian")}
                className="flex items-center gap-1 cursor-pointer"
                style={{
                  fontFamily: "Nunito,sans-serif",
                  fontWeight: 700,
                  fontSize: 12,
                  color: "#D4455C",
                  background: "none",
                  border: "none",
                }}
              >
                Sab dekho <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div
              className="rounded-[24px] p-4"
              style={{ background: "white", boxShadow: "0 4px 24px rgba(139,58,47,0.06)" }}
            >
              <div className="flex items-start gap-3 flex-wrap">
                {apnewale.map((p, i) => (
                  <motion.div
                    key={p.name}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.22 + i * 0.06 }}
                    className="flex flex-col items-center gap-1.5"
                    style={{ minWidth: 64 }}
                  >
                    {/* Avatar with online ring */}
                    <div className="relative">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-sm shadow"
                        style={{
                          background: p.color,
                          ring: p.status === "online" ? `2px solid ${p.color}` : "none",
                          boxShadow:
                            p.status === "online"
                              ? `0 0 0 2.5px ${p.color}55, 0 2px 8px rgba(0,0,0,0.08)`
                              : "0 2px 8px rgba(0,0,0,0.08)",
                        }}
                      >
                        {p.initials}
                      </div>
                      {/* Online dot */}
                      {p.status === "online" && (
                        <div
                          className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2"
                          style={{ background: "#3D9970", borderColor: "white" }}
                        />
                      )}
                    </div>

                    {/* Name */}
                    <span
                      style={{
                        fontFamily: "Nunito,sans-serif",
                        fontWeight: 700,
                        fontSize: 10,
                        color: "#3D2315",
                        textAlign: "center",
                      }}
                    >
                      {p.name}
                    </span>

                    {/* Status pill */}
                    <StatusPill status={p.status} lastActive={p.lastActive} />
                  </motion.div>
                ))}

                {/* Add guardian button */}
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => navigate("/guardian")}
                  className="flex flex-col items-center gap-1.5 cursor-pointer"
                  style={{ minWidth: 64, background: "none", border: "none" }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
                    style={{
                      background: "var(--sakhi-cream-deep)",
                      border: "2px dashed rgba(242,149,106,0.5)",
                      color: "#9E7A6A",
                    }}
                  >
                    +
                  </div>
                  <span
                    style={{
                      fontFamily: "Nunito,sans-serif",
                      fontWeight: 700,
                      fontSize: 10,
                      color: "#9E7A6A",
                    }}
                  >
                    Add
                  </span>
                  <div style={{ height: 20 }} />
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* ── Safety feature strip ── */}
          <motion.div {...fadeUp(0.22)} className="grid grid-cols-3 gap-2.5 mb-5">
            {[
              { emoji: "📍", label: "Live Path", path: "/location" },
              { emoji: "🛡️", label: "Evidence", path: "/evidence-locker" },
              { emoji: "⚙️", label: "Settings", path: "/settings" },
            ].map((item) => (
              <motion.button
                key={item.label}
                whileTap={{ scale: 0.93 }}
                whileHover={{ scale: 1.04 }}
                onClick={() => navigate(item.path)}
                className="rounded-[18px] p-3 flex flex-col items-center gap-1.5 cursor-pointer"
                style={{
                  background: "white",
                  boxShadow: "0 2px 12px rgba(139,58,47,0.05)",
                  border: "none",
                }}
              >
                <span style={{ fontSize: 22 }}>{item.emoji}</span>
                <span
                  style={{
                    fontFamily: "Nunito,sans-serif",
                    fontWeight: 700,
                    fontSize: 11,
                    color: "#8B3A2F",
                  }}
                >
                  {item.label}
                </span>
              </motion.button>
            ))}
          </motion.div>

        </div>

        {/* ── Floating Emergency SOS button ── */}
        <AnimatePresence>
          <motion.button
            key="floating-sos"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 260, damping: 20 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => {
              triggerSOS();
              navigate("/sos");
            }}
            className="fixed cursor-pointer"
            style={{
              bottom: "6.5rem",
              right: "1.25rem",
              zIndex: 9000,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              background: "none",
              border: "none",
            }}
            title="Emergency SOS"
            id="floating-sos-btn"
          >
            {/* Pulse rings */}
            {!sosActive && (
              <>
                <motion.div
                  animate={{ scale: [1, 1.55], opacity: [0.4, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                  className="absolute"
                  style={{
                    width: 62,
                    height: 62,
                    borderRadius: "50%",
                    background: "rgba(212,69,92,0.35)",
                    top: 0,
                  }}
                />
                <motion.div
                  animate={{ scale: [1, 1.35], opacity: [0.25, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut", delay: 0.4 }}
                  className="absolute"
                  style={{
                    width: 62,
                    height: 62,
                    borderRadius: "50%",
                    background: "rgba(212,69,92,0.2)",
                    top: 0,
                  }}
                />
              </>
            )}

            {/* Button core */}
            <div
              style={{
                width: 62,
                height: 62,
                borderRadius: "50%",
                background: sosActive
                  ? "linear-gradient(135deg,#C0392B,#922B21)"
                  : "linear-gradient(135deg,#E74C3C,#D4455C)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: sosActive
                  ? "0 0 0 3px rgba(192,57,43,0.5), 0 8px 24px rgba(192,57,43,0.5)"
                  : "0 8px 24px rgba(212,69,92,0.45)",
                position: "relative",
              }}
            >
              {sosActive ? (
                <AlertTriangle className="w-6 h-6 text-white" />
              ) : (
                <Zap className="w-6 h-6 text-white" fill="white" />
              )}
            </div>

            {/* Label */}
            <span
              style={{
                fontFamily: "Nunito,sans-serif",
                fontWeight: 900,
                fontSize: 9,
                color: sosActive ? "#C0392B" : "#D4455C",
                letterSpacing: "0.03em",
                textShadow: "0 1px 4px rgba(255,255,255,0.8)",
              }}
            >
              {sosActive ? "SOS ACTIVE" : "SOS"}
            </span>
          </motion.button>
        </AnimatePresence>

      </div>
    </AppLayout>
  );
};

export default HomePage;
