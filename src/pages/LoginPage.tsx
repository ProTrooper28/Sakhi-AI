import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ArrowRight, Eye, EyeOff, Lock, User, Phone, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

/* ─── Color & Style Tokens (Bright Pink Sunset Palette) ──────────────────── */
const C = {
  primaryDark:   "#7A2B73", // Dark Magenta/Purple for headings, logo, features text
  mainAccent:    "#D552A3", // Button background & Active indicators
  hoverAccent:   "#C63B95", // Button hover background
  highlightPink: "#FF70BF", // Top highlight/dot
  indicatorDot:  "#831C91", // Progress dot/accent
  
  canvasBg:      "linear-gradient(135deg, #FFF7FC 0%, #FFEAF6 50%, #FFDDF1 100%)", // Bright, dreamy page background
  cardBg:        "#FFFFFF", // Floating premium onboarding card (White)
  cardBorder:    "rgba(214, 82, 163, 0.08)", // Subtle card border
  inputBg:       "#FFF6FA", // Input field background
  inputBorder:   "rgba(214, 82, 163, 0.12)", // Subtle pink-tinted input border
  
  paper:         "#ffffff", // High-emphasis white text (for buttons)
  textMuted:     "rgba(122, 43, 115, 0.75)", // Secondary muted text
};

/* ─── Feature list ────────────────────────────────────────────────────────── */
const features = [
  {
    title: "Instant SOS Assistance",
    description: "Real-time emergency response and guardian alerts.",
  },
  {
    title: "Live Guardian Tracking",
    description: "Share location securely with trusted contacts.",
  },
  {
    title: "AI Safety Companion",
    description: "Context-aware support whenever needed.",
  },
  {
    title: "Secure Evidence Locker",
    description: "Encrypted storage for important records and reports.",
  },
];

/* ─── Shared Input Style ──────────────────────────────────────────────────── */
const inputStyle = (isFocused: boolean): React.CSSProperties => ({
  width: "100%",
  paddingLeft: "2.875rem",
  paddingRight: "1rem",
  paddingTop: "0.6875rem",
  paddingBottom: "0.6875rem",
  background: C.inputBg,
  border: `1px solid ${isFocused ? C.mainAccent : C.inputBorder}`,
  borderRadius: "8px",
  color: C.primaryDark,
  fontSize: "0.875rem",
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 400,
  outline: "none",
  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
  boxSizing: "border-box",
});

/* ─── Progress Indicator Component ────────────────────────────────────────── */
const ProgressIndicator = ({ current }: { current: "identity" | "contact" }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
    {(["identity", "contact"] as const).map((s) => (
      <div
        key={s}
        style={{
          width: current === s ? "18px" : "6px",
          height: "6px",
          borderRadius: "9999px",
          background: current === s ? C.mainAccent : "rgba(214, 82, 163, 0.2)",
          transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      />
    ))}
  </div>
);

/* ─── Main Onboarding Component ───────────────────────────────────────────── */
const LoginPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", aadhaar: "", mobile: "", email: "" });
  const [showAadhaar, setShowAadhaar] = useState(false);
  const [step, setStep] = useState<"identity" | "contact">("identity");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === "identity") { setStep("contact"); return; }
    navigate("/home");
  };

  return (
    <div
      className="sakhi-grain-overlay"
      style={{
        height: "100vh",
        background: C.canvasBg,
        fontFamily: "'Poppins', sans-serif",
        padding: "1.75rem 1.5rem",
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {/* ── Poppins Font Injection & Custom CSS classes ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

        .sakhi-input::placeholder { color: rgba(122, 43, 115, 0.45) !important; }
        .sakhi-input:focus { outline: none !important; }

        .sakhi-btn-cta {
          background: ${C.mainAccent};
          border: 1px solid ${C.mainAccent};
          color: ${C.paper};
          border-radius: 4px;
          padding: 0.6875rem 1.5rem;
          font-family: 'Poppins', sans-serif;
          font-weight: 500;
          font-size: 0.875rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          margin-top: 0.5rem;
          letter-spacing: 0.02em;
        }
        .sakhi-btn-cta:hover {
          background: ${C.hoverAccent};
          border-color: ${C.hoverAccent};
        }
        .sakhi-btn-cta:active {
          opacity: 0.9;
          transform: scale(0.985);
        }

        .sakhi-btn-back-link {
          background: none;
          border: none;
          color: ${C.primaryDark};
          opacity: 0.8;
          font-family: 'Poppins', sans-serif;
          font-size: 0.8125rem;
          cursor: pointer;
          width: 100%;
          margin-top: 0.625rem;
          padding: 0.5rem;
          transition: opacity 0.2s ease;
          letter-spacing: 0.01em;
          text-align: center;
        }
        .sakhi-btn-back-link:hover { opacity: 1; }

        /* Grain texture overlay to maintain developer-grade cleanliness */
        .sakhi-grain-overlay::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.02'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 2;
        }
      `}</style>

      {/* Dreamy mountain visual background on the right side (30% reduced opacity) */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: "55%",
          height: "60%",
          backgroundImage: "url('/sakhi_sunset_bg.png')",
          backgroundSize: "contain",
          backgroundPosition: "bottom right",
          backgroundRepeat: "no-repeat",
          pointerEvents: "none",
          zIndex: 1,
          opacity: 0.7, // Reduced opacity by 30% (70% remaining)
        }}
      />

      {/* ── Spaced Centered Wrapper ── */}
      <div
        style={{
          width: "100%",
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          flex: 1,
          position: "relative",
          zIndex: 3,
        }}
      >
        {/* ── Top Navigation Bar ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            marginBottom: "1.75rem",
          }}
        >
          {/* Logo brand signature */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <svg
              width="16"
              height="18"
              viewBox="0 0 16 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ flexShrink: 0 }}
            >
              <path
                d="M8 0L1 2.5V8.5C1 12.8 3.9 16.5 8 18C12.1 16.5 15 12.8 15 8.5V2.5L8 0Z"
                fill="#8C3A86"
              />
            </svg>
            <span style={{ fontSize: "0.9375rem", color: C.primaryDark, fontWeight: 600, letterSpacing: "0.06em", fontFamily: "'Poppins', sans-serif" }}>
              SAKHI AI
            </span>
          </div>

          {/* Top-right menu items & Progress state indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <span className="hidden sm:inline" style={{ fontSize: "0.8125rem", color: C.primaryDark, opacity: 0.8, fontWeight: 500 }}>
              Privacy First
            </span>
            <span className="hidden sm:inline" style={{ fontSize: "0.8125rem", color: C.primaryDark, opacity: 0.8, fontWeight: 500 }}>
              Local Encryption
            </span>
            <div
              style={{
                background: C.cardBg,
                color: C.primaryDark,
                borderRadius: "9999px",
                padding: "0.25rem 0.875rem",
                fontSize: "0.8125rem",
                fontWeight: 500,
                letterSpacing: "0.02em",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                border: `1px solid ${C.cardBorder}`,
                boxShadow: "0 4px 12px rgba(122, 43, 115, 0.03)",
              }}
            >
              <span style={{ color: C.primaryDark }}>Step {step === "identity" ? "1" : "2"} of 2</span>
              <ProgressIndicator current={step} />
            </div>
          </div>
        </div>

        {/* ── Two-Column Layout ── */}
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "row",
            flexWrap: "wrap",
            gap: "2rem",
            alignItems: "center",
            width: "100%",
          }}
        >
          {/* LEFT SIDE (Branding & Feature terminal container) */}
          <div
            style={{
              flex: "1 1 500px",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              maxWidth: "580px",
            }}
          >
            {/* Eyebrow Label */}
            <div style={{ fontSize: "0.75rem", color: C.primaryDark, fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase" }}>
              PERSONAL SAFETY <span style={{ fontWeight: 700 }}>COMPANION</span>
            </div>

            {/* Headline with weight 300 and weight 700 contrast */}
            <h1
              style={{
                fontSize: "2.375rem",
                color: C.primaryDark,
                fontWeight: 300,
                lineHeight: 1.05,
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              Your <span style={{ fontWeight: 700 }}>safety</span>,<br />
              always by your side.
            </h1>

            {/* Soft Premium Feature Card (Apple Health/Wellness style) */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.45)",
                border: "1px solid rgba(255, 255, 255, 0.55)",
                borderRadius: "16px",
                padding: "1.25rem 1.75rem",
                position: "relative",
                width: "100%",
                maxWidth: "480px",
                boxSizing: "border-box",
                boxShadow: "0 12px 32px rgba(213, 82, 163, 0.04)",
              }}
            >
              {/* Feature List (Minimal Premium Typography) */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.875rem",
                }}
              >
                {features.map((f, idx) => (
                  <div
                    key={f.title}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.875rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.2rem",
                      }}
                    >
                      <h3
                        style={{
                          fontSize: "0.875rem",
                          color: C.primaryDark,
                          fontWeight: 500,
                          fontFamily: "'Poppins', sans-serif",
                          margin: 0,
                          letterSpacing: "0.01em",
                          lineHeight: "1.3",
                        }}
                      >
                        {f.title}
                      </h3>
                      <p
                        style={{
                          fontSize: "0.775rem",
                          color: C.textMuted,
                          fontWeight: 400,
                          fontFamily: "'Poppins', sans-serif",
                          margin: 0,
                          lineHeight: "1.4",
                        }}
                      >
                        {f.description}
                      </p>
                    </div>
                    {idx < features.length - 1 && (
                      <div
                        style={{
                          height: "1px",
                          background: "rgba(122, 43, 115, 0.06)",
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Description Subtext */}
            <p
              style={{
                fontSize: "0.875rem",
                color: C.primaryDark,
                opacity: 0.8,
                lineHeight: 1.5,
                margin: 0,
                maxWidth: "460px",
              }}
            >
              Sakhi AI is your personal safety companion — helping you stay connected with loved ones, reach help quickly during emergencies, and feel safer wherever life takes you.
            </p>
          </div>

          {/* RIGHT SIDE (Create Profile Card Hero Element - White Floating Card) */}
          <div
            style={{
              flex: "1 1 360px",
              maxWidth: "420px",
              background: C.cardBg,
              border: `1px solid ${C.cardBorder}`,
              borderRadius: "12px",
              padding: "1.75rem 1.5rem",
              boxSizing: "border-box",
              boxShadow: "0 25px 60px rgba(122, 43, 115, 0.08)",
              display: "flex",
              flexDirection: "column",
              gap: "1.125rem",
            }}
          >
            {/* Step Header */}
            <div>
              <span
                style={{
                  fontSize: "0.6875rem",
                  color: C.mainAccent,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {step === "identity" ? "Verification Details" : "Emergency Contact"}
              </span>
              <h2
                style={{
                  fontSize: "1.4375rem",
                  color: C.primaryDark,
                  fontWeight: 300,
                  fontFamily: "'Poppins', sans-serif",
                  letterSpacing: "0.04em",
                  margin: "0.375rem 0 0.625rem 0",
                }}
              >
                {step === "identity" ? "Create your profile" : "Contact details"}
              </h2>
              <p style={{ fontSize: "0.8125rem", color: C.textMuted, margin: 0, lineHeight: 1.4 }}>
                {step === "identity"
                  ? "Your identity is stored locally and never shared."
                  : "Used only for emergency notifications."}
              </p>
            </div>

            {/* Action Form */}
            <form onSubmit={handleNext} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              <AnimatePresence mode="wait">
                {step === "identity" ? (
                  <motion.div
                    key="identity"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}
                  >
                    {/* Full Name */}
                    <div>
                      <label style={{ display: "block", color: C.primaryDark, fontSize: "0.75rem", fontWeight: 500, marginBottom: "0.25rem" }}>
                        Full Name
                      </label>
                      <div style={{ position: "relative" }}>
                        <User
                          style={{
                            position: "absolute",
                            left: 14,
                            top: "50%",
                            transform: "translateY(-50%)",
                            width: 15,
                            height: 15,
                            color: focusedField === "name" ? C.mainAccent : C.primaryDark,
                            opacity: focusedField === "name" ? 1 : 0.75,
                            transition: "opacity 0.2s ease",
                            pointerEvents: "none",
                          }}
                        />
                        <input
                          id="name"
                          className="sakhi-input"
                          placeholder="Preeti Sharma"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          onFocus={() => setFocusedField("name")}
                          onBlur={() => setFocusedField(null)}
                          required
                          style={inputStyle(focusedField === "name")}
                        />
                      </div>
                    </div>

                    {/* Aadhaar Number */}
                    <div>
                      <label style={{ display: "block", color: C.primaryDark, fontSize: "0.75rem", fontWeight: 500, marginBottom: "0.25rem" }}>
                        Aadhaar Number
                      </label>
                      <div style={{ position: "relative" }}>
                        <Lock
                          style={{
                            position: "absolute",
                            left: 14,
                            top: "50%",
                            transform: "translateY(-50%)",
                            width: 15,
                            height: 15,
                            color: focusedField === "aadhaar" ? C.mainAccent : C.primaryDark,
                            opacity: focusedField === "aadhaar" ? 1 : 0.75,
                            transition: "opacity 0.2s ease",
                            pointerEvents: "none",
                          }}
                        />
                        <input
                          id="aadhaar"
                          className="sakhi-input"
                          type={showAadhaar ? "text" : "password"}
                          placeholder="XXXX XXXX XXXX"
                          maxLength={14}
                          value={form.aadhaar}
                          onChange={(e) => setForm({ ...form, aadhaar: e.target.value })}
                          onFocus={() => setFocusedField("aadhaar")}
                          onBlur={() => setFocusedField(null)}
                          required
                          style={inputStyle(focusedField === "aadhaar")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowAadhaar((v) => !v)}
                          style={{
                            position: "absolute",
                            right: 14,
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: C.primaryDark,
                            opacity: 0.75,
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 0,
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          {showAadhaar ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="contact"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}
                  >
                    {/* Mobile Number */}
                    <div>
                      <label style={{ display: "block", color: C.primaryDark, fontSize: "0.75rem", fontWeight: 500, marginBottom: "0.25rem" }}>
                        Mobile Number
                      </label>
                      <div style={{ position: "relative" }}>
                        <Phone
                          style={{
                            position: "absolute",
                            left: 14,
                            top: "50%",
                            transform: "translateY(-50%)",
                            width: 15,
                            height: 15,
                            color: C.primaryDark,
                            opacity: focusedField === "mobile" ? 1 : 0.75,
                            transition: "opacity 0.2s ease",
                            pointerEvents: "none",
                          }}
                        />
                        <input
                          id="mobile"
                          className="sakhi-input"
                          type="tel"
                          placeholder="+91 98765 43210"
                          value={form.mobile}
                          onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                          onFocus={() => setFocusedField("mobile")}
                          onBlur={() => setFocusedField(null)}
                          required
                          style={inputStyle(focusedField === "mobile")}
                        />
                      </div>
                    </div>

                    {/* Email Address */}
                    <div>
                      <label style={{ display: "block", color: C.primaryDark, fontSize: "0.75rem", fontWeight: 500, marginBottom: "0.25rem" }}>
                        Email Address
                      </label>
                      <div style={{ position: "relative" }}>
                        <Mail
                          style={{
                            position: "absolute",
                            left: 14,
                            top: "50%",
                            transform: "translateY(-50%)",
                            width: 15,
                            height: 15,
                            color: C.primaryDark,
                            opacity: focusedField === "email" ? 1 : 0.75,
                            transition: "opacity 0.2s ease",
                            pointerEvents: "none",
                          }}
                        />
                        <input
                          id="email"
                          className="sakhi-input"
                          type="email"
                          placeholder="preeti@example.com"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          onFocus={() => setFocusedField("email")}
                          onBlur={() => setFocusedField(null)}
                          required
                          style={inputStyle(focusedField === "email")}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions */}
              <div>
                <button
                  id="onboarding-continue"
                  type="submit"
                  className="sakhi-btn-cta"
                >
                  {step === "identity" ? "Continue" : "Enter Sakhi"}
                  <ArrowRight style={{ width: 15, height: 15 }} />
                </button>

                {step === "contact" && (
                  <button
                    type="button"
                    className="sakhi-btn-back-link"
                    onClick={() => setStep("identity")}
                  >
                    ← Go back
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* ── Footer Info ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            width: "100%",
            marginTop: "1.5rem",
            justifyContent: "flex-start",
          }}
        >
          <Lock style={{ width: 12, height: 12, color: C.primaryDark, opacity: 0.6 }} />
          <span style={{ fontSize: "0.75rem", color: C.primaryDark, opacity: 0.7, fontWeight: 400 }}>
            Your information stays private and encrypted locally.
          </span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
