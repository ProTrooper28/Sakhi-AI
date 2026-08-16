import { useEffect } from "react";
import { motion } from "framer-motion";
import { UserRound, ShieldCheck, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { readPendingSignup } from "@/lib/otp";
import { roleHomePath } from "@/lib/auth-types";

/* ─── Color & Style Tokens (Bright Pink Sunset Palette — matches LoginPage) ── */
const C = {
  primaryDark: "#7A2B73",
  mainAccent: "#D552A3",
  hoverAccent: "#C63B95",
  highlightPink: "#FF70BF",
  canvasBg: "linear-gradient(135deg, #FFF7FC 0%, #FFEAF6 50%, #FFDDF1 100%)",
  cardBg: "#FFFFFF",
  cardBorder: "rgba(214, 82, 163, 0.08)",
  textMuted: "rgba(122, 43, 115, 0.75)",
};

const ROLE_CARDS = [
  {
    key: "user",
    emoji: "👤",
    icon: UserRound,
    title: "Continue as User",
    description: "Create your verified profile with mobile OTP and unlock the full safety companion.",
  },
  {
    key: "parent",
    emoji: "🛡",
    icon: ShieldCheck,
    title: "Continue as Guardian",
    description: "Register to monitor your loved ones and receive real-time SOS updates.",
  },
  {
    key: "guest",
    emoji: "👀",
    icon: Eye,
    title: "Continue as Guest",
    description: "Explore the app instantly with demo data. No account, no OTP required.",
    demo: true,
  },
] as const;

/**
 * Welcome screen — the first thing users see. Choose how to continue:
 * User, Parent/Guardian, or Guest (demo mode).
 */
const WelcomePage = () => {
  const navigate = useNavigate();
  const { ready, user, guest, role, enterGuest } = useAuth();

  // Already signed in (not guest)? Skip straight to their experience. A
  // freshly verified account (verification link just clicked) still owes the
  // Create Password step, so it goes there first.
  useEffect(() => {
    if (!ready || guest || !user) return;
    const pending = readPendingSignup();
    if (pending && pending.email.toLowerCase() === user.email.toLowerCase()) {
      navigate("/create-password", { replace: true });
      return;
    }
    navigate(roleHomePath(role), { replace: true });
  }, [ready, guest, user, role, navigate]);

  const handleSelect = (key: "user" | "parent" | "guest") => {
    if (key === "guest") {
      enterGuest();
      navigate("/home");
      return;
    }
    // Both accounts go through the Welcome Back / Sign In / Create Account
    // screen first — sign-in and registration are separate flows.
    navigate("/auth", { state: { role: key } });
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

        .welcome-nav-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          margin-bottom: 2.25rem;
          position: relative;
          z-index: 3;
        }

        .welcome-hero {
          position: relative;
          z-index: 3;
          max-width: 560px;
          margin: 0 auto;
          text-align: center;
        }
        .welcome-hero h1 {
          font-size: clamp(1.9rem, 4.5vw, 2.6rem);
          color: ${C.primaryDark};
          font-weight: 700;
          letter-spacing: -0.01em;
          margin: 0 0 0.5rem;
          line-height: 1.15;
        }
        .welcome-hero p {
          font-size: 0.9375rem;
          color: ${C.textMuted};
          margin: 0 0 2rem;
        }

        .welcome-cards {
          position: relative;
          z-index: 3;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          max-width: 560px;
          margin: 0 auto;
          width: 100%;
        }

        .welcome-card {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 1rem;
          text-align: left;
          background: ${C.cardBg};
          border: 1px solid ${C.cardBorder};
          border-radius: 14px;
          padding: 1.25rem 1.375rem;
          box-sizing: border-box;
          cursor: pointer;
          box-shadow: 0 18px 44px rgba(122, 43, 115, 0.07);
          transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
          font-family: 'Poppins', sans-serif;
        }
        .welcome-card:hover {
          border-color: ${C.mainAccent};
          box-shadow: 0 22px 52px rgba(214, 82, 163, 0.14);
          transform: translateY(-2px);
        }
        .welcome-card:active { transform: scale(0.985); }

        .welcome-card-icon {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.4rem;
          flex-shrink: 0;
        }

        .welcome-card-title {
          font-size: 0.95rem;
          color: ${C.primaryDark};
          font-weight: 600;
          margin: 0 0 0.2rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .welcome-card-desc {
          font-size: 0.78rem;
          color: ${C.textMuted};
          font-weight: 400;
          margin: 0;
          line-height: 1.45;
        }

        .demo-badge {
          display: inline-flex;
          align-items: center;
          background: rgba(214, 82, 163, 0.1);
          border: 1px solid rgba(214, 82, 163, 0.25);
          color: ${C.mainAccent};
          font-size: 0.6rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          border-radius: 999px;
          padding: 0.15rem 0.55rem;
        }

        .welcome-footer {
          position: relative;
          z-index: 3;
          margin-top: 2.25rem;
          text-align: center;
          font-size: 0.75rem;
          color: ${C.primaryDark};
          opacity: 0.7;
          font-weight: 400;
        }
      `}</style>

      {/* Dreamy mountain visual background */}
      <div className="sakhi-mountains-bg" />

      {/* ── Top Navigation Bar ── */}
      <div className="welcome-nav-bar">
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

      {/* ── Hero ── */}
      <div className="welcome-hero">
        <div
          style={{
            fontSize: "0.75rem",
            color: C.primaryDark,
            fontWeight: 500,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginBottom: "0.5rem",
          }}
        >
          PERSONAL SAFETY <span style={{ fontWeight: 700 }}>COMPANION</span>
        </div>
        <h1>Welcome to Sakhi AI</h1>
        <p>Choose how you'd like to continue.</p>
      </div>

      {/* ── Role cards ── */}
      <div className="welcome-cards">
        {ROLE_CARDS.map((card, i) => {
          const Icon = card.icon;
          const iconBg = [
            "rgba(255, 112, 191, 0.14)",
            "rgba(122, 43, 115, 0.1)",
            "rgba(214, 82, 163, 0.1)",
          ][i];
          const iconColor = ["#D552A3", "#7A2B73", "#C63B95"][i];
          return (
            <motion.button
              key={card.key}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * i, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => handleSelect(card.key)}
              className="welcome-card"
              type="button"
            >
              <div className="welcome-card-icon" style={{ background: iconBg }}>
                <Icon style={{ width: 22, height: 22, color: iconColor }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 className="welcome-card-title">
                  <span>{card.emoji}</span> {card.title}
                  {"demo" in card && card.demo && <span className="demo-badge">Demo Mode</span>}
                </h2>
                <p className="welcome-card-desc">{card.description}</p>
              </div>
              <span
                style={{
                  color: C.mainAccent,
                  fontSize: "1.25rem",
                  fontWeight: 300,
                  flexShrink: 0,
                }}
              >
                ›
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* ── Footer ── */}
      <div className="welcome-footer">
        Your information stays private and encrypted locally.
      </div>
    </div>
  );
};

export default WelcomePage;
