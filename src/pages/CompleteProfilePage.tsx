import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Mail, Lock, IdCard, ArrowRight, Loader2 } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Profile Completion — shown only on FIRST login (after Email OTP
 * verification) to a brand-new account. Collects:
 *   • Aadhaar Number (users only — only the LAST FOUR digits are stored)
 *   • Optional Password (for future password-based recovery)
 *
 * The email was already collected during onboarding (it's the auth
 * identifier) and is shown prefilled so it can be corrected if needed. The
 * phone number collected at signup is stored on the auth user metadata and
 * copied into `profiles.phone` for future SMS OTP / SOS alerts.
 *
 * Everything is saved to Supabase: the profile row via the `profiles` table
 * (own-row update/insert, RLS-protected) and the password via Supabase Auth.
 */
const CompleteProfilePage = () => {
  const navigate = useNavigate();
  const { ready, user, guest, profile, refreshProfile } = useAuth();

  // Email is prefilled from the auth user — it was collected during
  // onboarding and is the OTP identifier, so returning users never re-enter it.
  const [form, setForm] = useState({
    email: user?.email ?? "",
    aadhaar: "",
    password: "",
  });
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const role = (profile?.role ?? user?.user_metadata?.role ?? "user") as Role;
  const needsAadhaar = role === "user";

  // Guests have no account — and signed-out visitors have nothing to complete.
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
  if (guest || !user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ── Validation ──
    if (!EMAIL_RE.test(form.email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (needsAadhaar && !/^\d{12}$/.test(form.aadhaar.replace(/\s/g, ""))) {
      setError("Aadhaar must be a valid 12-digit number.");
      return;
    }
    if (form.password && form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError(null);

    if (!isSupabaseConfigured || !supabase) {
      setError("Backend is not configured yet. Ask your developer to connect Supabase.");
      return;
    }

    setSaving(true);
    try {
      const { data: current } = await supabase.auth.getUser();
      const authUser = current.user;
      if (!authUser) throw new Error("Your session expired. Please sign in again.");

      // 1. Save the profile details. The DB trigger created the row with
      //    full_name / phone / role at signup; this upsert fills in the email
      //    and the LAST FOUR Aadhaar digits (never the full number).
      // Phone comes from the signup metadata (collected during onboarding,
      // normalized to E.164) — kept on the profile for future SMS OTP and
      // SOS alerts. Email is prefilled from the auth user.
      const phone =
        (authUser.user_metadata?.phone as string | undefined) ?? authUser.phone ?? null;

      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: authUser.id,
          full_name: (profile?.full_name ?? authUser.user_metadata?.full_name ?? "").trim(),
          phone,
          email: form.email.trim().toLowerCase(),
          aadhaar_last4: needsAadhaar ? form.aadhaar.replace(/\s/g, "").slice(-4) : null,
          role,
        },
        { onConflict: "id" },
      );
      if (profileError) throw new Error("Could not save your profile. Please try again.");

      // 2. Optional password — enables password-based sign-in for recovery.
      if (form.password) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: form.password,
        });
        if (passwordError) throw new Error("Could not set your password. Please try again.");
      }

      // 3. Refresh the in-memory profile so the Protected route guard sees the
      //    completed profile and doesn't bounce the user back here.
      await refreshProfile();

      navigate(role === "parent" ? "/guardian" : "/home", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const fields: {
    id: "email" | "aadhaar" | "password";
    label: string;
    placeholder: string;
    type: string;
    icon: typeof Mail;
    hint?: string;
  }[] = [
    { id: "email", label: "Email Address", placeholder: "preeti@example.com", type: "email", icon: Mail },
    ...(needsAadhaar
      ? [
          {
            id: "aadhaar" as const,
            label: "Aadhaar Number",
            placeholder: "XXXX XXXX XXXX",
            type: "password",
            icon: IdCard,
            hint: "Only the last 4 digits are stored — never the full number.",
          },
        ]
      : []),
    {
      id: "password",
      label: "Password (optional)",
      placeholder: "At least 6 characters",
      type: "password",
      icon: Lock,
      hint: "Used only for future account recovery.",
    },
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

        .complete-card {
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

        .complete-cta {
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
        .complete-cta:hover { background: ${C.hoverAccent}; border-color: ${C.hoverAccent}; }
        .complete-cta:active { opacity: 0.9; transform: scale(0.985); }
        .complete-cta:disabled { opacity: 0.65; cursor: not-allowed; }

        .complete-error {
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
        className="complete-card"
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
          Welcome to Sakhi AI
        </span>
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
          Complete your profile
        </h2>
        <p style={{ fontSize: "0.8125rem", color: C.textMuted, margin: "0 0 1.25rem", lineHeight: 1.4 }}>
          A few more details to keep your account secure.
        </p>

        {error && <div className="complete-error">{error}</div>}

        <form onSubmit={(e) => void handleSubmit(e)} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          {fields.map(({ id, label, placeholder, type, icon: Icon, hint }) => (
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
              {hint && (
                <p style={{ fontSize: "0.6875rem", color: C.textMuted, margin: "0 0 0.375rem", lineHeight: 1.4 }}>
                  {hint}
                </p>
              )}
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
                  required={id !== "password"}
                  style={inputStyle(focusedField === id)}
                />
              </div>
            </div>
          ))}

          <button className="complete-cta" type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="animate-spin" style={{ width: 15, height: 15 }} /> Saving…
              </>
            ) : (
              <>
                Continue <ArrowRight style={{ width: 15, height: 15 }} />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default CompleteProfilePage;
