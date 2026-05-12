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
      className="min-h-screen flex bg-slate-950"
    >
      {/* ── Left panel (branding) — desktop only ── */}
      <div className="hidden lg:flex flex-col justify-between w-[520px] flex-shrink-0 p-16 bg-slate-900/20 backdrop-blur-3xl"
        style={{ borderRight: "1px solid rgba(255,255,255,0.03)" }}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center border border-teal-500/20 shadow-[0_0_20px_rgba(20,184,166,0.15)]"
            style={{ background: "rgba(20,184,166,0.05)" }}>
            <Shield className="w-6 h-6 text-teal-500" />
          </div>
          <span style={{ fontFamily: "Manrope,sans-serif" }} className="text-[14px] font-black text-slate-100 uppercase tracking-[0.25em]">
            Sakhi Protocol
          </span>
        </div>

        <div className="relative">
          <div className="absolute -top-32 -left-32 w-64 h-64 bg-teal-500/5 blur-[100px] rounded-full pointer-events-none" />
          <h1 style={{ fontFamily: "Manrope,sans-serif" }} className="text-5xl font-black text-white leading-[1.05] tracking-tight uppercase">
            Personal Security <br />
            <span className="text-teal-500">Centralized.</span>
          </h1>
          <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em] mt-8 leading-relaxed max-w-[340px]">
            Enterprise-grade safety companion powered by tactical intelligence and real-time encryption.
          </p>
          <div className="mt-14 space-y-6">
            {[
              { icon: Shield, label: "Real-time SOS emergency alerts", color: "text-red-500" },
              { icon: MapPin, label: "Live location sharing with guardians", color: "text-teal-500" },
              { icon: Lock, label: "Evidence locker with PIN protection", color: "text-blue-500" },
            ].map(f => (
              <div key={f.label} className="flex items-center gap-4 group">
                <div className={`w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center transition-all group-hover:border-slate-700`}>
                   <f.icon className={`w-4 h-4 ${f.color}`} />
                </div>
                <span className="text-slate-400 font-black text-[9px] uppercase tracking-[0.2em] group-hover:text-slate-200 transition-colors">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-700 font-black text-[9px] uppercase tracking-[0.3em]">
          © 2026 SAKHI PROTOCOL • NODE: PRIMARY_ACCESS
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
          <div className="flex lg:hidden items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
              <Shield className="w-5 h-5 text-teal-500" />
            </div>
            <span className="text-[12px] font-black text-slate-100 uppercase tracking-[0.2em]">Sakhi Protocol</span>
          </div>

          {/* Heading */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
               <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-1.5 h-1.5 rounded-full bg-teal-500" />
               <p className="text-teal-500 font-black text-[9px] uppercase tracking-[0.3em]">
                 Phase {step === "identity" ? "01" : "02"} Initializing
               </p>
            </div>
            <h1 style={{ fontFamily: "Manrope,sans-serif" }} className="text-3xl font-black text-white uppercase tracking-tight">
              {step === "identity" ? "Identity Input" : "Node Routing"}
            </h1>
            <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] mt-3">
              {step === "identity"
                ? "Locally encrypted profile creation."
                : "Secure contact nodes for relay alerts."}
            </p>
          </div>

          <form onSubmit={handleNext} className="space-y-4">
            {step === "identity" ? (
              <>
                {/* Full Name */}
                <div className="space-y-2">
                  <label className="text-slate-500 font-black text-[9px] uppercase tracking-[0.25em] ml-1">
                    Authorized User Name
                  </label>
                  <div className="relative group">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700 group-focus-within:text-teal-500 transition-colors" />
                    <input
                      id="name"
                      placeholder="ENTER FULL NAME..."
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      required
                      className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-14 pr-6 py-4.5 text-[12px] font-black uppercase tracking-widest text-white outline-none focus:border-teal-500/50 transition-all placeholder:text-slate-800"
                    />
                  </div>
                </div>

                {/* Aadhaar */}
                <div className="space-y-2">
                  <label className="text-slate-500 font-black text-[9px] uppercase tracking-[0.25em] ml-1">
                    Government ID Verification
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700 group-focus-within:text-teal-500 transition-colors" />
                    <input
                      id="aadhaar"
                      type={showAadhaar ? "text" : "password"}
                      placeholder="XXXX XXXX XXXX"
                      maxLength={14}
                      value={form.aadhaar}
                      onChange={e => setForm({ ...form, aadhaar: e.target.value })}
                      required
                      className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-14 pr-14 py-4.5 text-[12px] font-black uppercase tracking-widest text-white outline-none focus:border-teal-500/50 transition-all placeholder:text-slate-800"
                    />
                    <button type="button" onClick={() => setShowAadhaar(v => !v)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-700 hover:text-white transition-colors cursor-pointer">
                      {showAadhaar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Mobile */}
                <div className="space-y-2">
                  <label className="text-slate-500 font-black text-[9px] uppercase tracking-[0.25em] ml-1">
                    Primary Mobile Link
                  </label>
                  <div className="relative group">
                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700 group-focus-within:text-teal-500 transition-colors" />
                    <input
                      id="mobile"
                      type="tel"
                      placeholder="+91 XXXXX XXXXX"
                      value={form.mobile}
                      onChange={e => setForm({ ...form, mobile: e.target.value })}
                      required
                      className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-14 pr-6 py-4.5 text-[12px] font-black uppercase tracking-widest text-white outline-none focus:border-teal-500/50 transition-all placeholder:text-slate-800"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-slate-500 font-black text-[9px] uppercase tracking-[0.25em] ml-1">
                    Secure Email Node
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700 group-focus-within:text-teal-500 transition-colors" />
                    <input
                      id="email"
                      type="email"
                      placeholder="USER@HOST.COM"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      required
                      className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-14 pr-6 py-4.5 text-[12px] font-black uppercase tracking-widest text-white outline-none focus:border-teal-500/50 transition-all placeholder:text-slate-800"
                    />
                  </div>
                </div>
              </>
            )}

            {/* CTA */}
            <motion.button
              whileHover={{ scale: 1.02, backgroundColor: "#14b8a6", color: "#000" }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full flex items-center justify-center gap-3 bg-teal-500 text-slate-950 font-black py-5 rounded-2xl shadow-2xl shadow-teal-500/20 uppercase tracking-[0.25em] text-[12px] transition-all cursor-pointer mt-4"
            >
              {step === "identity" ? "Proceed to Routing" : "Initialize Console"}
              <ArrowRight className="w-4 h-4" />
            </motion.button>

            {step === "contact" && (
              <button type="button" onClick={() => setStep("identity")}
                className="w-full mt-6 text-slate-600 font-black text-[10px] uppercase tracking-widest hover:text-slate-400 transition-colors cursor-pointer">
                ← Return to Identification
              </button>
            )}
          </form>

          <p className="text-slate-800 font-black text-[9px] uppercase tracking-[0.25em] text-center mt-12 leading-relaxed">
            SECURE LINK ESTABLISHED • AES-256 ENCRYPTION ACTIVE <br />
            ZERO-KNOWLEDGE DATA STORAGE PROTOCOL
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
