import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ShieldCheck, User, Phone, Mail, ArrowRight, Loader2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { sendOtp, normalizePhone, isValidIndianMobile, isValidEmail } from "@/lib/otp";

/* ─── Color & Style Tokens (Bright Pink Sunset Palette — matches onboarding) ── */
const C = {
  primaryDark: "#7A2B73",
  mainAccent: "#D552A3",
  hoverAccent: "#C63B95",
  canvasBg: "linear-gradient(135deg, #FFF7FC 0%, #FFEAF6 50%, #FFDDF1 100%)",
  cardBg: "#FFFFFF",
  cardBorder: "rgba(214, 82, 163, 0.08)",
  inputBg: "#FFF6FA",
  inputBorder: "rgba(214, 82, 163, 0.12)",
  paper: "#ffffff",
  textMuted: "rgba(122, 43, 115, 0.75)",
};

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

/* ─── Progress Indicator (matches the user onboarding) ──────────────────────── */
const STEPS = ["identity", "email"] as const;
type Step = (typeof STEPS)[number];

const ProgressIndicator = ({ current }: { current: Step }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
    {STEPS.map((s) => (
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

/**
 * Parent / Guardian registration (Create Account flow) — Step 1 collects the
 * Full Name + Mobile Number (kept on the profile for future SMS OTP / SOS
 * alerts), Step 2 collects the Email Address (the OTP channel). On submit it
 * requests a 6-digit Email OTP via Supabase Auth (no magic links, no
 * confirmation links) and continues to the OTP screen.
 */
const ParentRegisterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Email handed off from the Sign In screen ("No account found → Create
  // Account") is prefilled so the guardian doesn't have to retype it.
  const prefilledEmail = ((location.state as { email?: string } | null)?.email ?? "") as string;
  const [form, setForm] = useState({ name: "", mobile: "", email: prefilledEmail });
  const [step, setStep] = useState<Step>("identity");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ── Step 1: Full Name + Mobile (clean, user-facing errors) ──
    if (step === "identity") {
      if (form.name.trim().length < 2) {
        setError("Please enter the guardian's full name.");
        return;
      }
      if (!isValidIndianMobile(form.mobile)) {
        setError("Please enter a valid 10-digit Indian mobile number.");
        return;
      }
      setError(null);
      setStep("email");
      return;
    }

    // ── Step 2: Email (the OTP channel) ──
    if (!isValidEmail(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError(null);

    setSending(true);
    try {
      const phone = normalizePhone(form.mobile);
      const email = form.email.trim().toLowerCase();
      const profile = { full_name: form.name.trim(), phone };
      await sendOtp({ email, role: "parent", profile });
      navigate("/otp", { state: { email, role: "parent", profile, mode: "signup" } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const fields: {
    id: "name" | "mobile" | "email";
    label: string;
    placeholder: string;
    type: string;
    icon: typeof User;
  }[] = [
    { id: "name", label: "Full Name", placeholder: "Rakesh Sharma", type: "text", icon: User },
    { id: "mobile", label: "Mobile Number", placeholder: "+91 98765 43210", type: "tel", icon: Phone },
    { id: "email", label: "Email Address", placeholder: "rakesh@example.com", type: "email", icon: Mail },
  ];

  return (
    <div className="sakhi-grain-overlay sakhi-onboarding-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

        .sakhi-grain-overlay::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.02'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 2;
        }

        .sakhi-onboarding-root {
          min-height: 100vh;
          min-height: 100dvh;
          background: ${C.canvasBg};
          font-family: 'Poppins', sans-serif;
          padding: max(1.75rem, env(safe-area-inset-top)) max(1.5rem, env(safe-area-inset-right))
                     max(2rem, env(safe-area-inset-bottom)) max(1.5rem, env(safe-area-inset-left));
          box-sizing: border-box;
          position: relative;
          overflow-x: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sakhi-mountains-bg {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 55%;
          height: 60%;
          background-image: url('/sakhi_sunset_bg.png');
          background-size: contain;
          background-position: bottom right;
          background-repeat: no-repeat;
          pointer-events: none;
          z-index: 1;
          opacity: 0.5;
        }
        @media (max-width: 1023px) {
          .sakhi-mountains-bg { width: 100%; height: 180px; opacity: 0.3; }
        }

        .parent-card {
          position: relative;
          z-index: 3;
          width: 100%;
          max-width: 420px;
          background: ${C.cardBg};
          border: 1px solid ${C.cardBorder};
          border-radius: 12px;
          padding: 1.75rem 1.5rem;
          box-sizing: border-box;
          box-shadow: 0 25px 60px rgba(122, 43, 115, 0.08);
        }

        .parent-back {
          background: none;
          border: none;
          color: ${C.primaryDark};
          opacity: 0.8;
          font-family: 'Poppins', sans-serif;
          font-size: 0.8125rem;
          cursor: pointer;
          padding: 0;
          margin-bottom: 1.125rem;
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }
        .parent-back:hover { opacity: 1; }

        .parent-cta {
          width: 100%;
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
          transition: background 0.2s ease;
          margin-top: 0.5rem;
        }
        .parent-cta:hover { background: ${C.hoverAccent}; border-color: ${C.hoverAccent}; }
        .parent-cta:active { opacity: 0.9; transform: scale(0.985); }
        .parent-cta:disabled { opacity: 0.65; cursor: not-allowed; }

        .parent-error {
          background: rgba(212, 69, 92, 0.08);
          border: 1px solid rgba(212, 69, 92, 0.25);
          border-radius: 8px;
          padding: 0.625rem 0.75rem;
          font-family: 'Poppins', sans-serif;
          font-size: 0.75rem;
          font-weight: 500;
          color: #B8324A;
          line-height: 1.4;
          margin-bottom: 0.875rem;
        }
      `}</style>

      <div className="sakhi-mountains-bg" />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="parent-card"
      >
        <button className="parent-back" onClick={() => navigate("/")} type="button">
          <ArrowLeft style={{ width: 14, height: 14 }} /> Back
        </button>

        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            background: "rgba(122, 43, 115, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "0.875rem",
          }}
        >
          <ShieldCheck style={{ width: 22, height: 22, color: C.primaryDark }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span
            style={{
              fontSize: "0.6875rem",
              color: C.mainAccent,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Guardian Registration
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <span style={{ fontSize: "0.6875rem", color: C.primaryDark, opacity: 0.7, fontWeight: 500 }}>
              Step {STEPS.indexOf(step) + 1} of {STEPS.length}
            </span>
            <ProgressIndicator current={step} />
          </div>
        </div>
        <h2
          style={{
            fontSize: "1.4375rem",
            color: C.primaryDark,
            fontWeight: 300,
            fontFamily: "'Poppins', sans-serif",
            letterSpacing: "0.04em",
            margin: "0.375rem 0 0.625rem",
          }}
        >
          Create guardian profile
        </h2>
        <p style={{ fontSize: "0.8125rem", color: C.textMuted, margin: "0 0 1.25rem", lineHeight: 1.4 }}>
          {step === "identity"
            ? "Stored privately on your profile — used for future safety alerts."
            : "We'll send a 6-digit OTP code to your email."}
        </p>

        {error && <div className="parent-error">{error}</div>}

        <form onSubmit={(e) => void handleSubmit(e)} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
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
                {fields
                  .filter((f) => f.id !== "email")
                  .map(({ id, label, placeholder, type, icon: Icon }) => (
                    <div key={id}>
                      <label
                        style={{
                          display: "block",
                          color: C.primaryDark,
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          marginBottom: "0.25rem",
                          fontFamily: "'Poppins', sans-serif",
                        }}
                      >
                        {label}
                      </label>
                      <div style={{ position: "relative" }}>
                        <Icon
                          style={{
                            position: "absolute",
                            left: 14,
                            top: "50%",
                            transform: "translateY(-50%)",
                            width: 15,
                            height: 15,
                            color: focusedField === id ? C.mainAccent : C.primaryDark,
                            opacity: focusedField === id ? 1 : 0.75,
                            transition: "opacity 0.2s ease",
                            pointerEvents: "none",
                          }}
                        />
                        <input
                          id={id}
                          type={type}
                          placeholder={placeholder}
                          value={form[id]}
                          onChange={(e) => setForm({ ...form, [id]: e.target.value })}
                          onFocus={() => setFocusedField(id)}
                          onBlur={() => setFocusedField(null)}
                          required
                          style={inputStyle(focusedField === id)}
                        />
                      </div>
                    </div>
                  ))}
              </motion.div>
            ) : (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}
              >
                {fields
                  .filter((f) => f.id === "email")
                  .map(({ id, label, placeholder, type, icon: Icon }) => (
                    <div key={id}>
                      <label
                        style={{
                          display: "block",
                          color: C.primaryDark,
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          marginBottom: "0.25rem",
                          fontFamily: "'Poppins', sans-serif",
                        }}
                      >
                        {label}
                      </label>
                      <div style={{ position: "relative" }}>
                        <Icon
                          style={{
                            position: "absolute",
                            left: 14,
                            top: "50%",
                            transform: "translateY(-50%)",
                            width: 15,
                            height: 15,
                            color: focusedField === id ? C.mainAccent : C.primaryDark,
                            opacity: focusedField === id ? 1 : 0.75,
                            transition: "opacity 0.2s ease",
                            pointerEvents: "none",
                          }}
                        />
                        <input
                          id={id}
                          type={type}
                          placeholder={placeholder}
                          value={form[id]}
                          onChange={(e) => setForm({ ...form, [id]: e.target.value })}
                          onFocus={() => setFocusedField(id)}
                          onBlur={() => setFocusedField(null)}
                          required
                          style={inputStyle(focusedField === id)}
                        />
                      </div>
                    </div>
                  ))}
              </motion.div>
            )}
          </AnimatePresence>

          <button className="parent-cta" type="submit" disabled={sending}>
            {sending ? (
              <>
                <Loader2 className="animate-spin" style={{ width: 15, height: 15 }} /> Sending OTP…
              </>
            ) : step === "email" ? (
              "Send OTP"
            ) : (
              <>
                Continue <ArrowRight style={{ width: 15, height: 15 }} />
              </>
            )}
          </button>

          {step === "email" && (
            <button
              type="button"
              style={{
                background: "none",
                border: "none",
                color: C.primaryDark,
                opacity: 0.8,
                fontFamily: "'Poppins', sans-serif",
                fontSize: "0.8125rem",
                cursor: "pointer",
                width: "100%",
                marginTop: "0.625rem",
                padding: "0.5rem",
                textAlign: "center",
              }}
              onClick={() => setStep("identity")}
            >
              ← Go back
            </button>
          )}
        </form>
      </motion.div>
    </div>
  );
};

export default ParentRegisterPage;
