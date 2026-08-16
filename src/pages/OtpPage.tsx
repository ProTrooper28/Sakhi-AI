import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MailCheck, Loader2, ArrowRight } from "lucide-react";
import {
  OtpError,
  readPendingSignup,
  resendVerificationEmail,
  signUpWithEmail,
} from "@/lib/otp";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { Role, OtpProfilePayload } from "@/lib/auth-types";

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

const RESEND_SECONDS = 60;

/** Surface the real backend error (message + HTTP status + GoTrue code). */
const describeError = (err: unknown): string => {
  if (err instanceof OtpError && (err.status !== undefined || err.supabaseCode)) {
    const extra = [
      err.status !== undefined ? `status ${err.status}` : null,
      err.supabaseCode ? `code ${err.supabaseCode}` : null,
    ]
      .filter(Boolean)
      .join(", ");
    return `${err.message} (backend ${extra})`;
  }
  return err instanceof Error ? err.message : "Something went wrong. Please try again.";
};

const maskEmail = (email: string) => {
  const [local = "", domain = ""] = email.split("@");
  if (!domain) return email;
  const first = local.slice(0, 1);
  const rest = local.slice(1).replace(/./g, "*");
  return `${first}${rest}@${domain}`;
};

/**
 * Email verification screen (route: /otp). Shown right after Create Account
 * submits. Supabase's built-in email provider has sent a "Confirm signup"
 * email containing a verification LINK (not a numeric code — no OTP is used
 * anywhere in the app).
 *
 * The screen waits for the verification to land:
 *   - the user clicks the link in the email → implicit flow signs them in and
 *     redirects to the app; this screen (and the Welcome screen) detect the
 *     new session and continue automatically;
 *   - a "I've verified — Continue" button offers a manual path;
 *   - "Resend email" re-sends the verification link after 60s.
 *
 * Once verified, the user continues to Create Password, then their dashboard.
 * The session persists across restarts — email verification is only ever
 * needed once during account creation.
 */
const OtpPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { ready, user, guest } = useAuth();
  const navigatedRef = useRef(false);

  // Registration details come from router state (fresh submit) or, when this
  // screen is re-opened (e.g. after the verification link redirect), from the
  // pending-signup marker saved at submit time.
  const state = useMemo<{
    email?: string;
    role?: Role;
    profile?: OtpProfilePayload;
  } | null>(() => (location.state as { email?: string; role?: Role; profile?: OtpProfilePayload } | null) ?? null, [location.state]);
  const pending = useMemo(() => readPendingSignup(), []);

  const email = state?.email ?? pending?.email ?? "";
  const role = state?.role ?? pending?.role ?? "user";
  const profile = state?.profile;

  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  // Redirect if someone lands here without any pending flow.
  useEffect(() => {
    if (!email) navigate("/", { replace: true });
  }, [email, navigate]);

  // Countdown for the "Resend email" button.
  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [countdown]);

  const continueIfVerified = (sessionEmail: string | undefined) => {
    if (navigatedRef.current) return;
    if (!email || !sessionEmail || sessionEmail.toLowerCase() !== email.toLowerCase()) return;
    navigatedRef.current = true;
    navigate("/create-password", { state: { role }, replace: true });
  };

  // Auto-continue the moment the verification session appears (context
  // covers the same tab; the poll covers the link being opened in another
  // tab / device while this screen is still open).
  useEffect(() => {
    if (!ready || guest) return;
    if (user) continueIfVerified(user.email);
  }, [ready, guest, user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!email || !isSupabaseConfigured || !supabase) return;
    const id = setInterval(() => {
      void supabase.auth.getSession().then(({ data }) => {
        continueIfVerified(data.session?.user?.email);
      });
    }, 2000);
    return () => clearInterval(id);
  }, [email]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!email) return null;

  const handleResend = async () => {
    setResending(true);
    setError(null);
    setSentMessage(null);
    try {
      await resendVerificationEmail({ email });
      setCountdown(RESEND_SECONDS);
      setSentMessage("A new verification email has been sent. Check your inbox.");
    } catch (err) {
      setError(describeError(err));
    } finally {
      setResending(false);
    }
  };

  const handleContinue = async () => {
    setChecking(true);
    setError(null);
    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error(
          "Backend is not configured yet. Ask your developer to connect Supabase, or continue as a Guest.",
        );
      }
      const { data } = await supabase.auth.getSession();
      const sessionEmail = data.session?.user?.email;
      if (!sessionEmail || sessionEmail.toLowerCase() !== email.toLowerCase()) {
        setError(
          "We couldn't find a verified session in this browser. Open the verification link from the email on this device to continue.",
        );
        return;
      }
      continueIfVerified(sessionEmail);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setChecking(false);
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

        .otp-card {
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

        .otp-back {
          background: none;
          border: none;
          color: ${C.primaryDark};
          opacity: 0.8;
          font-family: 'Poppins', sans-serif;
          font-size: 0.8125rem;
          cursor: pointer;
          padding: 0;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }
        .otp-back:hover { opacity: 1; }

        .otp-cta {
          width: 100%;
          background: ${C.mainAccent};
          border: 1px solid ${C.mainAccent};
          color: ${C.paper};
          border-radius: 4px;
          padding: 0.75rem 1.5rem;
          font-family: 'Poppins', sans-serif;
          font-weight: 500;
          font-size: 0.875rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: background 0.2s ease;
          margin-top: 1rem;
        }
        .otp-cta:hover { background: ${C.hoverAccent}; border-color: ${C.hoverAccent}; }
        .otp-cta:disabled { opacity: 0.65; cursor: not-allowed; }

        .otp-resend {
          background: none;
          border: none;
          color: ${C.mainAccent};
          font-family: 'Poppins', sans-serif;
          font-size: 0.8125rem;
          font-weight: 500;
          cursor: pointer;
          padding: 0;
        }
        .otp-resend:disabled { color: ${C.textMuted}; cursor: not-allowed; }

        .otp-error {
          background: rgba(212, 69, 92, 0.08);
          border: 1px solid rgba(212, 69, 92, 0.25);
          border-radius: 8px;
          padding: 0.625rem 0.75rem;
          font-family: 'Poppins', sans-serif;
          font-size: 0.75rem;
          font-weight: 500;
          color: #B8324A;
          line-height: 1.4;
        }

        .otp-info {
          background: rgba(255, 112, 191, 0.08);
          border: 1px solid rgba(255, 112, 191, 0.25);
          border-radius: 8px;
          padding: 0.625rem 0.75rem;
          font-family: 'Poppins', sans-serif;
          font-size: 0.75rem;
          font-weight: 500;
          color: ${C.primaryDark};
          line-height: 1.4;
          margin-bottom: 0.875rem;
        }
      `}</style>

      <div className="sakhi-mountains-bg" />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="otp-card"
      >
        <button className="otp-back" onClick={() => navigate(-1)} type="button">
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
          <MailCheck style={{ width: 22, height: 22, color: C.mainAccent }} />
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
          {role === "parent" ? "Guardian Verification" : "Email Verification"}
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
          Verify your email
        </h2>
        <p style={{ fontSize: "0.8125rem", color: C.textMuted, margin: "0 0 1.25rem", lineHeight: 1.5 }}>
          We sent a verification link to <strong>{maskEmail(email)}</strong>. Open it in
          this browser to confirm your account — we'll take it from there.
        </p>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="otp-error"
              style={{ marginBottom: "0.875rem" }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {sentMessage && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                fontSize: "0.75rem",
                color: "#3D9970",
                fontWeight: 500,
                margin: "0 0 0.875rem",
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              {sentMessage}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="otp-info">
          No 6-digit code needed — clicking the link in the email is all it takes.
          This screen continues automatically once your email is verified.
        </div>

        <button
          className="otp-cta"
          disabled={checking}
          onClick={() => void handleContinue()}
          type="button"
        >
          {checking ? (
            <>
              <Loader2 className="animate-spin" style={{ width: 15, height: 15 }} /> Checking…
            </>
          ) : (
            <>
              I've verified — Continue <ArrowRight style={{ width: 15, height: 15 }} />
            </>
          )}
        </button>

        <div
          style={{
            marginTop: "1.25rem",
            textAlign: "center",
            fontSize: "0.8125rem",
            color: C.textMuted,
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          Didn't receive it?{" "}
          <button
            className="otp-resend"
            disabled={countdown > 0 || resending}
            onClick={() => void handleResend()}
            type="button"
          >
            {resending
              ? "Resending…"
              : countdown > 0
                ? `Resend email in ${countdown}s`
                : "Resend email"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default OtpPage;
