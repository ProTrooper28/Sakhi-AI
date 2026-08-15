import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { KeyRound, Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  scorePassword,
  passwordStrengthLabel,
  passwordStrengthColor,
  validatePassword,
  MIN_PASSWORD_LENGTH,
} from "@/lib/password";
import { useAuth } from "@/context/AuthContext";

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
 * Set a new password after clicking the recovery link from the reset email.
 * Supabase redirects here with a recovery session; the client parses it on
 * load (detectSessionInUrl) and fires the PASSWORD_RECOVERY auth event, which
 * unlocks this form.
 */
const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const { role } = useAuth();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [recovered, setRecovered] = useState(false);
  const [expired, setExpired] = useState(false);
  const [done, setDone] = useState(false);

  const recoveredRef = useRef(false);
  const markRecovered = () => {
    if (!recoveredRef.current) {
      recoveredRef.current = true;
      setRecovered(true);
    }
  };

  // Detect the recovery session (fired by Supabase when the link is parsed).
  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return;
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") markRecovered();
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) markRecovered();
    });
    const t = setTimeout(() => {
      if (!recoveredRef.current) setExpired(true);
    }, 8000);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validatePassword(password, confirm);
    if (validation) {
      setError(validation);
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      setError("Backend is not configured yet. Ask your developer to connect Supabase.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError("We couldn't update your password. Please try again.");
        return;
      }
      setDone(true);
      setTimeout(() => navigate(role === "parent" ? "/guardian" : "/home", { replace: true }), 1200);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const strength = scorePassword(password);

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

        .rp-card {
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

        .rp-cta {
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
        .rp-cta:hover { background: ${C.hoverAccent}; border-color: ${C.hoverAccent}; }
        .rp-cta:disabled { opacity: 0.65; cursor: not-allowed; }

        .rp-error {
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

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="rp-card"
      >
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
          <KeyRound style={{ width: 22, height: 22, color: C.mainAccent }} />
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
          Account Recovery
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
          {done ? "Password updated" : "Choose a new password"}
        </h2>

        {done ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "rgba(61,153,112,0.08)",
              border: "1px solid rgba(61,153,112,0.25)",
              borderRadius: 8,
              padding: "0.875rem",
              fontFamily: "'Poppins', sans-serif",
              fontSize: "0.8125rem",
              fontWeight: 500,
              color: "#2E7D56",
            }}
          >
            <ShieldCheck style={{ width: 18, height: 18 }} /> Taking you back to your app…
          </div>
        ) : expired ? (
          <div className="rp-error">
            This reset link is invalid or has expired. Please request a new one from the sign-in screen.
          </div>
        ) : !recovered ? (
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", color: C.textMuted, fontFamily: "'Poppins', sans-serif", fontSize: "0.8125rem" }}>
            <Loader2 className="animate-spin" style={{ width: 15, height: 15 }} />
            Verifying your reset link…
          </div>
        ) : (
          <>
            {error && <div className="rp-error">{error}</div>}
            <form onSubmit={(e) => void handleSubmit(e)} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              <div>
                <label
                  htmlFor="rp-password"
                  style={{ display: "block", color: C.primaryDark, fontSize: "0.75rem", fontWeight: 500, marginBottom: "0.25rem", fontFamily: "'Poppins', sans-serif" }}
                >
                  New Password
                </label>
                <div style={{ position: "relative" }}>
                  <KeyRound
                    style={{
                      position: "absolute",
                      left: 14,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 15,
                      height: 15,
                      color: focused === "password" ? C.mainAccent : C.primaryDark,
                      opacity: focused === "password" ? 1 : 0.75,
                      pointerEvents: "none",
                    }}
                  />
                  <input
                    id="rp-password"
                    type={show ? "text" : "password"}
                    placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocused("password")}
                    onBlur={() => setFocused(null)}
                    required
                    style={inputStyle(focused === "password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    aria-label={show ? "Hide password" : "Show password"}
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
                    {show ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                  </button>
                </div>
                {password && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
                    <div style={{ flex: 1, display: "flex", gap: 4 }}>
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          style={{
                            height: 4,
                            flex: 1,
                            borderRadius: 4,
                            background: i <= strength ? passwordStrengthColor(strength) : "rgba(122,43,115,0.12)",
                            transition: "background 0.2s ease",
                          }}
                        />
                      ))}
                    </div>
                    <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: passwordStrengthColor(strength), fontFamily: "'Poppins', sans-serif" }}>
                      {passwordStrengthLabel(strength)}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="rp-confirm"
                  style={{ display: "block", color: C.primaryDark, fontSize: "0.75rem", fontWeight: 500, marginBottom: "0.25rem", fontFamily: "'Poppins', sans-serif" }}
                >
                  Confirm Password
                </label>
                <div style={{ position: "relative" }}>
                  <KeyRound
                    style={{
                      position: "absolute",
                      left: 14,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 15,
                      height: 15,
                      color: focused === "confirm" ? C.mainAccent : C.primaryDark,
                      opacity: focused === "confirm" ? 1 : 0.75,
                      pointerEvents: "none",
                    }}
                  />
                  <input
                    id="rp-confirm"
                    type={show ? "text" : "password"}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    onFocus={() => setFocused("confirm")}
                    onBlur={() => setFocused(null)}
                    required
                    style={inputStyle(focused === "confirm")}
                  />
                </div>
              </div>

              <button className="rp-cta" type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" style={{ width: 15, height: 15 }} /> Updating…
                  </>
                ) : (
                  "Update password"
                )}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;
