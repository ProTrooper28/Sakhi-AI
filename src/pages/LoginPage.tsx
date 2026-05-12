import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, ArrowRight, Eye, EyeOff, Lock, User, Phone, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

const LoginPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", aadhaar: "", mobile: "", email: "" });
  const [showAadhaar, setShowAadhaar] = useState(false);
  const [step, setStep] = useState<"identity" | "contact">("identity");

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === "identity") { setStep("contact"); return; }
    navigate("/home");
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f2332 100%)" }}
    >
      {/* ── Left panel (branding) — desktop only ── */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] flex-shrink-0 p-14"
        style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(20,184,166,0.2)" }}>
            <Shield style={{ width: 20, height: 20, color: "#14b8a6" }} />
          </div>
          <span style={{ fontFamily: "Manrope,sans-serif", fontWeight: 800, color: "white", fontSize: "1.125rem" }}>
            Sakhi AI
          </span>
        </div>

        <div>
          <p style={{ fontFamily: "Manrope,sans-serif", fontWeight: 800, fontSize: "2.5rem", color: "white", lineHeight: 1.1 }}>
            Your safety,<br />
            <span style={{ color: "#14b8a6" }}>always with you.</span>
          </p>
          <p style={{ color: "rgba(255,255,255,0.5)", marginTop: "1.25rem", lineHeight: 1.7, fontSize: "0.9375rem" }}>
            Sakhi is a personal safety companion powered by AI — helping you stay safe, document incidents, and stay connected with people who care.
          </p>
          <div className="mt-10 space-y-4">
            {[
              { icon: "🛡️", label: "Real-time SOS emergency alerts" },
              { icon: "📍", label: "Live location sharing with guardians" },
              { icon: "🤖", label: "AI companion monitoring" },
              { icon: "🔒", label: "Evidence locker with PIN protection" },
            ].map(f => (
              <div key={f.label} className="flex items-center gap-3">
                <span style={{ fontSize: "1.125rem" }}>{f.icon}</span>
                <span style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.875rem" }}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.75rem" }}>
          © 2025 Sakhi AI. All data is encrypted and never shared.
        </p>
      </div>

      {/* ── Right panel (form) ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[400px]"
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-10">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(20,184,166,0.2)" }}>
              <Shield style={{ width: 16, height: 16, color: "#14b8a6" }} />
            </div>
            <span style={{ fontFamily: "Manrope,sans-serif", fontWeight: 800, color: "white" }}>Sakhi AI</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <p style={{ color: "#14b8a6", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Step {step === "identity" ? "1" : "2"} of 2
            </p>
            <h1 style={{ fontFamily: "Manrope,sans-serif", fontWeight: 800, color: "white", fontSize: "1.75rem", marginTop: "0.5rem" }}>
              {step === "identity" ? "Create your profile" : "Contact details"}
            </h1>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.875rem", marginTop: "0.5rem" }}>
              {step === "identity"
                ? "Your identity is stored locally and never shared."
                : "Used only for emergency notifications."}
            </p>
          </div>

          <form onSubmit={handleNext} className="space-y-4">
            {step === "identity" ? (
              <>
                {/* Full Name */}
                <div>
                  <label style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>
                    Full Name
                  </label>
                  <div className="relative">
                    <User style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "rgba(255,255,255,0.3)" }} />
                    <input
                      id="name"
                      placeholder="Preeti Sharma"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      required
                      style={{
                        width: "100%", paddingLeft: "2.75rem", paddingRight: "1rem", paddingTop: "0.75rem", paddingBottom: "0.75rem",
                        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10,
                        color: "white", fontSize: "0.9375rem", outline: "none",
                      }}
                    />
                  </div>
                </div>

                {/* Aadhaar */}
                <div>
                  <label style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>
                    Aadhaar Number
                  </label>
                  <div className="relative">
                    <Lock style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "rgba(255,255,255,0.3)" }} />
                    <input
                      id="aadhaar"
                      type={showAadhaar ? "text" : "password"}
                      placeholder="XXXX XXXX XXXX"
                      maxLength={14}
                      value={form.aadhaar}
                      onChange={e => setForm({ ...form, aadhaar: e.target.value })}
                      required
                      style={{
                        width: "100%", paddingLeft: "2.75rem", paddingRight: "3rem", paddingTop: "0.75rem", paddingBottom: "0.75rem",
                        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10,
                        color: "white", fontSize: "0.9375rem", outline: "none",
                      }}
                    />
                    <button type="button" onClick={() => setShowAadhaar(v => !v)}
                      style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)", background: "none", border: "none", cursor: "pointer" }}>
                      {showAadhaar ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Mobile */}
                <div>
                  <label style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>
                    Mobile Number
                  </label>
                  <div className="relative">
                    <Phone style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "rgba(255,255,255,0.3)" }} />
                    <input
                      id="mobile"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={form.mobile}
                      onChange={e => setForm({ ...form, mobile: e.target.value })}
                      required
                      style={{
                        width: "100%", paddingLeft: "2.75rem", paddingRight: "1rem", paddingTop: "0.75rem", paddingBottom: "0.75rem",
                        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10,
                        color: "white", fontSize: "0.9375rem", outline: "none",
                      }}
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "rgba(255,255,255,0.3)" }} />
                    <input
                      id="email"
                      type="email"
                      placeholder="preeti@example.com"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      required
                      style={{
                        width: "100%", paddingLeft: "2.75rem", paddingRight: "1rem", paddingTop: "0.75rem", paddingBottom: "0.75rem",
                        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10,
                        color: "white", fontSize: "0.9375rem", outline: "none",
                      }}
                    />
                  </div>
                </div>
              </>
            )}

            {/* CTA */}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 font-bold transition-all duration-250 hover:opacity-90 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #14b8a6, #0d9488)",
                color: "white", borderRadius: 10, padding: "0.875rem 1.5rem",
                fontSize: "0.9375rem", marginTop: "0.75rem",
                boxShadow: "0 4px 20px rgba(20,184,166,0.35)", border: "none", cursor: "pointer",
              }}
            >
              {step === "identity" ? "Continue" : "Enter Sakhi"}
              <ArrowRight style={{ width: 18, height: 18 }} />
            </button>

            {step === "contact" && (
              <button type="button" onClick={() => setStep("identity")}
                style={{ width: "100%", marginTop: "0.5rem", color: "rgba(255,255,255,0.4)", background: "none", border: "none", fontSize: "0.875rem", cursor: "pointer" }}>
                ← Go back
              </button>
            )}
          </form>

          <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.75rem", textAlign: "center", marginTop: "2rem" }}>
            All data is encrypted locally. We never sell or share your information.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
