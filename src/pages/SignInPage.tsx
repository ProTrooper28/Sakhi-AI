import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { sendOtp, isValidEmail } from "@/lib/otp";
import type { Role } from "@/lib/auth-types";

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

/**
 * Sign In — existing accounts only. Asks for the email address, sends a
 * 6-digit Email OTP via Supabase Auth (shouldCreateUser: false — no account
 * is created, no profile metadata is touched), and hands off to the OTP
 * screen. Name / Aadhaar / phone are never asked again: they're already
 * stored on the profile.
 */
const SignInPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { ready, user, guest } = useAuth();

  const role = ((location.state as { role?: Role } | null)?.role ?? "user") as Role;
  const isParent = role === "parent";

  const [email, setEmail] = useState("");
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [showCreateHint, setShowCreateHint] = useState(false);

  // Already signed in? Skip authentication entirely and open the app.
  useEffect(() => {
    if (ready && !guest && user) {
      navigate(isParent ? "/guardian" : "/home", { replace: true });
    }
  }, [ready, guest, user, isParent, navigate]);

  if (!ready) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--sakhi-cream)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span className="dot-teal" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!isValidEmail(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError(null);
    setShowCreateHint(false);

    setSending(true);
    try {
      // Sign-in mode: never create an account, never overwrite stored metadata.
      await sendOtp({ email: cleanEmail, role, shouldCreateUser: false });
      navigate("/otp", { state: { email: cleanEmail, role, mode: "signin" } });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(message);
      setShowCreateHint(message.includes("No Sakhi AI account"));
    } finally {
      setSending(false);
    }
  };

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

        .signin-card {
          position: relative;
          z-index: 3;
          width: 100%;
          max-width: 420px;
          background: ${C.cardBg};
          border: 1px solid ${C.cardBorder};
          border-radius: 14px;
          padding: 1.75rem 1.5rem;
          box-sizing: border-box;
          box-shadow: 0 25px 60px rgba(122, 43, 115, 0.08);
        }

        .signin-back {
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
        .signin-back:hover { opacity: 1; }

        .signin-cta {
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
          letter-spacing: 0.02em;
        }
        .signin-cta:hover { background: ${C.hoverAccent}; border-color: ${C.hoverAccent}; }
        .signin-cta:active { opacity: 0.9; transform: scale(0.985); }
        .signin-cta:disabled { opacity: 0.65; cursor: not-allowed; }

        .signin-error {
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

        .signin-switch {
          background: none;
          border: none;
          color: ${C.mainAccent};
          font-family: 'Poppins', sans-serif;
          font-size: 0.8125rem;
          font-weight: 500;
          cursor: pointer;
          padding: 0;
        }
        .signin-switch:hover { text-decoration: underline; }
      `}</style>

      <div className="sakhi-mountains-bg" />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="signin-card"
      >
        <button className="signin-back" onClick={() => navigate("/auth", { state: { role } })} type="button">
          <ArrowLeft style={{ width: 14, height: 14 }} /> Back
        </button>

        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            background: "rgba(255, 112, 191, 0.14)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "0.875rem",
          }}
        >
          <Lock style={{ width: 22, height: 22, color: C.mainAccent }} />
        </div>

        <span
          style={{
            fontSize: "0.6875rem",
            color: C.mainAccent,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {isParent ? "Guardian Sign In" : "Welcome Back"}
        </span>
        <h2
          style={{
            fontSize: "1.4375rem",
            color: C.primaryDark,
            fontWeight: 300,
            fontFamily: "'Poppins', sans-serif",
            letterSpacing: "0.04em",
            margin: "0.375rem 0 0.5rem",
          }}
        >
          Sign in with your email
        </h2>
        <p style={{ fontSize: "0.8125rem", color: C.textMuted, margin: "0 0 1.25rem", lineHeight: 1.5 }}>
          We'll send a {6}-digit code to your email. No password needed.
        </p>

        {error && <div className="signin-error">{error}</div>}

        <form onSubmit={(e) => void handleSubmit(e)} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          <div>
            <label
              htmlFor="signin-email"
              style={{
                display: "block",
                color: C.primaryDark,
                fontSize: "0.75rem",
                fontWeight: 500,
                marginBottom: "0.25rem",
                fontFamily: "'Poppins', sans-serif",
              }}
            >
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
                  color: focused ? C.mainAccent : C.primaryDark,
                  opacity: focused ? 1 : 0.75,
                  transition: "opacity 0.2s ease",
                  pointerEvents: "none",
                }}
              />
              <input
                id="signin-email"
                className="sakhi-input"
                type="email"
                placeholder="preeti@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                required
                style={inputStyle(focused)}
              />
            </div>
          </div>

          <button className="signin-cta" type="submit" disabled={sending}>
            {sending ? (
              <>
                <Loader2 className="animate-spin" style={{ width: 15, height: 15 }} /> Sending OTP…
              </>
            ) : (
              <>
                Send OTP <ArrowRight style={{ width: 15, height: 15 }} />
              </>
            )}
          </button>
        </form>

        <div
          style={{
            marginTop: "1.25rem",
            textAlign: "center",
            fontSize: "0.8125rem",
            color: C.textMuted,
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          {showCreateHint ? (
            <>
              No account yet?{" "}
              <button
                className="signin-switch"
                type="button"
                onClick={() => navigate(isParent ? "/register" : "/login", { state: { role, email } })}
              >
                Create Account
              </button>
            </>
          ) : (
            <>
              New to Sakhi AI?{" "}
              <button
                className="signin-switch"
                type="button"
                onClick={() => navigate(isParent ? "/register" : "/login", { state: { role, email } })}
              >
                Create Account
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default SignInPage;
