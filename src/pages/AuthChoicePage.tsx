import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogIn, UserPlus, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { readPendingSignup } from "@/lib/otp";
import { roleHomePath, type Role } from "@/lib/auth-types";

/* ─── Color & Style Tokens (Bright Pink Sunset Palette — matches onboarding) ── */
const C = {
  primaryDark: "#7A2B73",
  mainAccent: "#D552A3",
  hoverAccent: "#C63B95",
  canvasBg: "linear-gradient(135deg, #FFF7FC 0%, #FFEAF6 50%, #FFDDF1 100%)",
  cardBg: "#FFFFFF",
  cardBorder: "rgba(214, 82, 163, 0.08)",
  paper: "#ffffff",
  textMuted: "rgba(122, 43, 115, 0.75)",
};

/**
 * Role-aware entry screen shown right after choosing a role on the Welcome
 * screen. Modern Sign In / Create Account split (Notion/Spotify style):
 *
 *   Welcome Back
 *   [ Sign In ]          → email-only OTP sign in (existing account)
 *   Don't have an account? Create Account
 *                       → guided registration (name → phone → email → OTP)
 */
const AuthChoicePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { ready, user, guest } = useAuth();

  const role = ((location.state as { role?: Role } | null)?.role ?? "user") as Role;
  const isParent = role === "parent";

  // Already signed in? Skip authentication entirely and open the app. A
  // freshly verified account still owes the Create Password step.
  useEffect(() => {
    if (!ready || guest || !user) return;
    const pending = readPendingSignup();
    if (pending && pending.email.toLowerCase() === user.email.toLowerCase()) {
      navigate("/create-password", { replace: true });
      return;
    }
    navigate(roleHomePath(role), { replace: true });
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
          flex-direction: column;
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

        .auth-choice-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          margin-bottom: 2.25rem;
          position: relative;
          z-index: 3;
        }

        .auth-choice-card {
          position: relative;
          z-index: 3;
          width: 100%;
          max-width: 420px;
          margin: auto;
          background: ${C.cardBg};
          border: 1px solid ${C.cardBorder};
          border-radius: 14px;
          padding: 2rem 1.625rem;
          box-sizing: border-box;
          box-shadow: 0 25px 60px rgba(122, 43, 115, 0.08);
          text-align: center;
        }

        .auth-choice-eyebrow {
          font-size: 0.6875rem;
          color: ${C.mainAccent};
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .auth-choice-title {
          font-size: 1.625rem;
          color: ${C.primaryDark};
          font-weight: 300;
          font-family: 'Poppins', sans-serif;
          letter-spacing: 0.02em;
          margin: 0.5rem 0 0.375rem;
          line-height: 1.15;
        }
        .auth-choice-sub {
          font-size: 0.8125rem;
          color: ${C.textMuted};
          margin: 0 0 1.75rem;
          line-height: 1.5;
        }

        .auth-choice-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          border-radius: 4px;
          padding: 0.75rem 1.5rem;
          font-family: 'Poppins', sans-serif;
          font-weight: 500;
          font-size: 0.875rem;
          cursor: pointer;
          box-sizing: border-box;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          letter-spacing: 0.02em;
        }
        .auth-choice-btn:active { transform: scale(0.985); }

        .auth-choice-signin {
          background: ${C.mainAccent};
          border: 1px solid ${C.mainAccent};
          color: ${C.paper};
          box-shadow: 0 12px 28px rgba(214, 82, 163, 0.24);
        }
        .auth-choice-signin:hover {
          background: ${C.hoverAccent};
          border-color: ${C.hoverAccent};
        }

        .auth-choice-divider {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          margin: 1.375rem 0;
        }
        .auth-choice-divider-line {
          flex: 1;
          height: 1px;
          background: rgba(122, 43, 115, 0.1);
        }
        .auth-choice-divider-text {
          font-size: 0.6875rem;
          color: ${C.textMuted};
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .auth-choice-create {
          background: none;
          border: 1px solid rgba(214, 82, 163, 0.35);
          color: ${C.primaryDark};
        }
        .auth-choice-create:hover {
          border-color: ${C.mainAccent};
          background: rgba(255, 112, 191, 0.06);
          color: ${C.mainAccent};
        }

        .auth-choice-hint {
          font-size: 0.75rem;
          color: ${C.textMuted};
          margin: 1.25rem 0 0;
          line-height: 1.5;
        }
      `}</style>

      <div className="sakhi-mountains-bg" />

      {/* ── Top Navigation Bar ── */}
      <div className="auth-choice-nav">
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
          <span
            style={{
              fontSize: "0.9375rem",
              color: C.primaryDark,
              fontWeight: 600,
              letterSpacing: "0.06em",
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            SAKHI AI
          </span>
        </div>
        <span
          style={{
            fontSize: "0.8125rem",
            color: C.primaryDark,
            opacity: 0.8,
            fontWeight: 500,
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          Privacy First · Local Encryption
        </span>
      </div>

      {/* ── Welcome Back card ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="auth-choice-card"
      >
        <span className="auth-choice-eyebrow">
          {isParent ? "Guardian" : "Your safety companion"}
        </span>
        <h1 className="auth-choice-title">Welcome Back</h1>
        <p className="auth-choice-sub">
          {isParent
            ? "Sign in to monitor your loved ones, or create a guardian account."
            : "Sign in to continue, or create your verified safety profile."}
        </p>

        <button
          className="auth-choice-btn auth-choice-signin"
          type="button"
          onClick={() => navigate("/signin", { state: { role } })}
        >
          <LogIn style={{ width: 15, height: 15 }} /> Sign In
        </button>

        <div className="auth-choice-divider">
          <span className="auth-choice-divider-line" />
          <span className="auth-choice-divider-text">or</span>
          <span className="auth-choice-divider-line" />
        </div>

        <button
          className="auth-choice-btn auth-choice-create"
          type="button"
          onClick={() => navigate(isParent ? "/register" : "/login", { state: { role } })}
        >
          <UserPlus style={{ width: 15, height: 15 }} /> Create Account
        </button>

        <p className="auth-choice-hint">
          Don't have an account? No problem — creating one takes less than a minute.
        </p>

        <button
          className="sakhi-btn-back-link"
          type="button"
          onClick={() => navigate("/")}
          style={{
            background: "none",
            border: "none",
            color: C.primaryDark,
            opacity: 0.8,
            fontFamily: "'Poppins', sans-serif",
            fontSize: "0.8125rem",
            cursor: "pointer",
            width: "100%",
            marginTop: "0.875rem",
            padding: "0.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.375rem",
            transition: "opacity 0.2s ease",
          }}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} /> Back to role selection
        </button>
      </motion.div>
    </div>
  );
};

export default AuthChoicePage;
