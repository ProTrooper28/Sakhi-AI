import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ShieldCheck, Loader2 } from "lucide-react";
import { sendOtp, verifyOtpCode } from "@/lib/otp";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { OtpFlowState, Role } from "@/lib/auth-types";

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

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

const maskEmail = (email: string) => {
  const [local = "", domain = ""] = email.split("@");
  if (!domain) return email;
  const first = local.slice(0, 1);
  const rest = local.slice(1).replace(/./g, "*");
  return `${first}${rest}@${domain}`;
};

/**
 * OTP verification screen. Receives the pending registration via router
 * location state ({ email, role, profile, mode }) and:
 *  1. Verifies the 6-digit email code with Supabase Auth (signs the user in
 *     directly — no magic link, no confirmation link).
 *  2. Sign-up flows continue to the Create Password step; legacy sign-in
 *     flows route straight to the app by stored role.
 *  3. The session persists across restarts — OTP is only ever asked during
 *     account creation, never for normal sign-in.
 */
const OtpPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const state = useMemo<OtpFlowState | null>(
    () => (location.state as OtpFlowState | null) ?? null,
    [location.state],
  );

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  // Redirect if someone lands here without a pending flow.
  useEffect(() => {
    if (!state) navigate("/", { replace: true });
  }, [state, navigate]);

  // Countdown timer for the "Resend OTP" button.
  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [countdown]);

  if (!state) return null;

  const { email, role, profile, mode = "signup" } = state;

  const handleResend = async () => {
    setResending(true);
    setError(null);
    setSentMessage(null);
    try {
      // Resend in the same mode as the original request: sign-up keeps the
      // onboarding metadata, sign-in never creates an account.
      await sendOtp({
        email,
        role,
        profile,
        shouldCreateUser: mode === "signup" ? undefined : false,
      });
      setCountdown(RESEND_SECONDS);
      setSentMessage("A new OTP has been sent to your email.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend the OTP. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async () => {
    const digits = code.replace(/\D/g, "");
    if (digits.length !== OTP_LENGTH) {
      setError(`Please enter the ${OTP_LENGTH}-digit OTP.`);
      return;
    }
    setError(null);
    setVerifying(true);
    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error(
          "Backend is not configured yet. Ask your developer to connect Supabase, or continue as a Guest.",
        );
      }

      // 1. Verify the code with Supabase Auth — this signs the user in,
      //    persists the session, and (for a brand-new email) creates the auth
      //    user + profile row at verification time.
      const userId = await verifyOtpCode({ email, token: digits });

      // 2. New-account flow: the OTP verification just created this account —
      //    the next step is Create Password (then Complete Profile for users,
      //    or straight to the Guardian dashboard for parents). No OTP is ever
      //    asked again after this point.
      if (mode === "signup") {
        navigate("/create-password", { state: { role, email }, replace: true });
        return;
      }

      // 3. Legacy sign-in-via-OTP (existing account): route by the stored role
      //    so the user lands in their own account type.
      const { data: profileRow } = userId
        ? await supabase.from("profiles").select("email, aadhaar_last4, role").eq("id", userId).maybeSingle()
        : { data: null };
      const incomplete =
        !profileRow || (role === "user" && !profileRow.aadhaar_last4);
      const storedRole = (profileRow?.role as Role | undefined) ?? role;
      navigate(
        incomplete
          ? "/complete-profile"
          : storedRole === "parent"
            ? "/guardian"
            : "/home",
        { replace: true },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setVerifying(false);
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

        .otp-input {
          width: 100%;
          box-sizing: border-box;
          background: ${C.inputBg};
          border: 1px solid ${C.inputBorder};
          border-radius: 8px;
          padding: 0.875rem 1rem;
          color: ${C.primaryDark};
          font-family: 'Poppins', sans-serif;
          font-size: 1.5rem;
          font-weight: 600;
          letter-spacing: 0.6em;
          text-align: center;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .otp-input:focus {
          border-color: ${C.mainAccent};
          box-shadow: 0 0 0 3px rgba(214, 82, 163, 0.12);
        }

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
          <ShieldCheck style={{ width: 22, height: 22, color: C.mainAccent }} />
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
          Enter OTP
        </h2>
        <p style={{ fontSize: "0.8125rem", color: C.textMuted, margin: "0 0 1.25rem", lineHeight: 1.5 }}>
          We sent a {OTP_LENGTH}-digit code to <strong>{maskEmail(email)}</strong>
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

        <input
          className="otp-input"
          inputMode="numeric"
          autoFocus
          maxLength={OTP_LENGTH}
          placeholder="••••••"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleVerify();
          }}
        />

        <button
          className="otp-cta"
          disabled={verifying}
          onClick={() => void handleVerify()}
          type="button"
        >
          {verifying ? (
            <>
              <Loader2 className="animate-spin" style={{ width: 15, height: 15 }} /> Verifying…
            </>
          ) : (
            "Verify"
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
                ? `Resend OTP in ${countdown}s`
                : "Resend OTP"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default OtpPage;
