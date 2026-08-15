import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, Lock, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { isValidEmail } from "@/lib/otp";
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
  paddingRight: "2.75rem",
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
 * Sign In — existing accounts only. Email + password (OTP is NOT used for
 * normal login; it's reserved for account creation and password recovery).
 * After Supabase validates the credentials the session flows through
 * AuthContext, and this screen routes by the stored profile role:
 * user → Home (or Complete Profile if Aadhaar is still missing),
 * parent → Guardian dashboard.
 */
const SignInPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { ready, user, guest, role, needsProfileCompletion } = useAuth();

  const roleHint = ((location.state as { role?: Role } | null)?.role ?? "user") as Role;
  const isParent = roleHint === "parent";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Already signed in? Skip authentication and open the right app.
  useEffect(() => {
    if (!ready || guest) return;
    if (!user || role === null) return; // wait for the profile to load
    if (role === "parent") navigate("/guardian", { replace: true });
    else navigate(needsProfileCompletion ? "/complete-profile" : "/home", { replace: true });
  }, [ready, guest, user, role, needsProfileCompletion, navigate]);

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
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      setError("Backend is not configured yet. Ask your developer to connect Supabase, or continue as a Guest.");
      return;
    }
    setError(null);
    setSending(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (signInError) {
        const m = signInError.message.toLowerCase();
        if (m.includes("invalid") || m.includes("credentials")) {
          setError("Incorrect email or password. Try again, or reset your password below.");
        } else if (m.includes("confirm")) {
          setError("Please confirm your email address before signing in.");
        } else {
          setError(signInError.message);
        }
        return;
      }
      // Session + profile load through AuthContext; the effect above navigates.
    } catch {
      setError("Network error. Please check your connection and try again.");
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

        .signin-forgot {
          background: none;
          border: none;
          color: ${C.textMuted};
          font-family: 'Poppins', sans-serif;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          padding: 0.375rem 0 0;
          align-self: flex-start;
        }
        .signin-forgot:hover { color: ${C.mainAccent}; }
      `}</style>

      <div className="sakhi-mountains-bg" />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="signin-card"
      >
        <button className="signin-back" onClick={() => navigate("/auth", { state: { role: roleHint } })} type="button">
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
          Sign in to {isParent ? "your guardian dashboard" : "your safety app"}
        </h2>
        <p style={{ fontSize: "0.8125rem", color: C.textMuted, margin: "0 0 1.25rem", lineHeight: 1.5 }}>
          Enter your email and password. No OTP needed for returning users.
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
                  color: focused === "email" ? C.mainAccent : C.primaryDark,
                  opacity: focused === "email" ? 1 : 0.75,
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
                onFocus={() => setFocused("email")}
                onBlur={() => setFocused(null)}
                required
                style={inputStyle(focused === "email")}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="signin-password"
              style={{
                display: "block",
                color: C.primaryDark,
                fontSize: "0.75rem",
                fontWeight: 500,
                marginBottom: "0.25rem",
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              Password
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
                  color: focused === "password" ? C.mainAccent : C.primaryDark,
                  opacity: focused === "password" ? 1 : 0.75,
                  transition: "opacity 0.2s ease",
                  pointerEvents: "none",
                }}
              />
              <input
                id="signin-password"
                className="sakhi-input"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocused("password")}
                onBlur={() => setFocused(null)}
                required
                style={inputStyle(focused === "password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: C.textMuted,
                  display: "flex",
                  alignItems: "center",
                  padding: 4,
                }}
              >
                {showPassword ? (
                  <EyeOff style={{ width: 16, height: 16 }} />
                ) : (
                  <Eye style={{ width: 16, height: 16 }} />
                )}
              </button>
            </div>
            <button
              type="button"
              className="signin-forgot"
              onClick={() => navigate("/forgot-password", { state: { role: roleHint, email } })}
            >
              Forgot password?
            </button>
          </div>

          <button className="signin-cta" type="submit" disabled={sending}>
            {sending ? (
              <>
                <Loader2 className="animate-spin" style={{ width: 15, height: 15 }} /> Signing in…
              </>
            ) : (
              <>
                Sign In <ArrowRight style={{ width: 15, height: 15 }} />
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
          New to Sakhi AI?{" "}
          <button
            className="signin-switch"
            type="button"
            onClick={() => navigate(isParent ? "/register" : "/login", { state: { role: roleHint, email } })}
          >
            Create Account
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default SignInPage;
