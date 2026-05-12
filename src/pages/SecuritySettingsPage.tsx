import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Lock, Bell, Fingerprint, Eye, EyeOff, Phone, ChevronRight, AlertTriangle, Check, X } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";

const sections = [
  {
    title: "Authentication",
    icon: Lock,
    items: [
      { label: "PIN Protection", description: "Require PIN to access Evidence Locker", key: "pin", on: true },
      { label: "Biometric Login", description: "Use fingerprint or face ID", key: "bio", on: true },
      { label: "Auto-lock (2 min)", description: "Lock app after inactivity", key: "lock", on: false },
    ],
  },
  {
    title: "Emergency Alerts",
    icon: Bell,
    items: [
      { label: "Silent SOS Mode", description: "Trigger SOS without sound", key: "silent", on: false },
      { label: "Auto SMS Alert", description: "Send location SMS on SOS trigger", key: "sms", on: true },
      { label: "Shake to SOS", description: "Triple shake activates emergency", key: "shake", on: true },
    ],
  },
  {
    title: "Privacy",
    icon: Eye,
    items: [
      { label: "Stealth Mode", description: "Hide app icon from recent apps", key: "stealth", on: false },
      { label: "Anonymous Reports", description: "Strip identity from all reports", key: "anon", on: true },
      { label: "Fake Shutdown", description: "Appear offline while recording", key: "fakeoff", on: false },
    ],
  },
];

export default function SecuritySettingsPage() {
  const navigate = useNavigate();
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    pin: true, bio: true, lock: false, silent: false, sms: true, shake: true,
    stealth: false, anon: true, fakeoff: false,
  });
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("1234");
  const [editingPin, setEditingPin] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmDanger, setConfirmDanger] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const toggle = (key: string) => setToggles(prev => ({ ...prev, [key]: !prev[key] }));

  const handleChangePin = () => {
    if (editingPin) {
      if (newPin.length >= 4) {
        setPin(newPin);
        setNewPin("");
        setEditingPin(false);
        showToast("PIN updated successfully");
      } else {
        showToast("PIN must be at least 4 digits");
      }
    } else {
      setEditingPin(true);
    }
  };

  const handleDangerAction = (action: string) => {
    if (confirmDanger === action) {
      setConfirmDanger(null);
      showToast(`${action} completed`);
    } else {
      setConfirmDanger(action);
    }
  };

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {/* Header */}
        <div className="mb-10 flex items-center justify-between">
          <motion.div initial={{ x: -20 }} animate={{ x: 0 }}>
            <h1 style={{ fontFamily: "Manrope,sans-serif" }} className="text-3xl font-black text-slate-100 uppercase tracking-tight">
              Security Protocol Hub
            </h1>
            <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em] mt-2">Managing End-to-End Encryption & Node Access</p>
          </motion.div>
          <div className="flex items-center gap-4">
             <div className="px-4 py-2 bg-teal-500/10 rounded-xl border border-teal-500/20 flex items-center gap-2">
                <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                <span className="text-[10px] font-black text-teal-500 uppercase tracking-widest">Vault Secure</span>
             </div>
             <ThemeToggle />
          </div>
        </div>

        <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 360px" }}>
          {/* LEFT — Toggle sections */}
          <div className="space-y-6">
            {sections.map(({ title, icon: Icon, items }) => (
              <div key={title} className="bg-slate-900/40 backdrop-blur-md p-8 rounded-[32px] border border-slate-800/50 shadow-2xl">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-11 h-11 rounded-2xl bg-slate-950 flex items-center justify-center border border-slate-800">
                    <Icon className="w-5 h-5 text-slate-400" />
                  </div>
                  <h2 style={{ fontFamily: "Manrope,sans-serif" }} className="text-[14px] font-black text-slate-100 uppercase tracking-[0.15em]">{title}</h2>
                </div>
                <div className="space-y-6">
                  {items.map(item => (
                    <div key={item.key} className="flex items-start justify-between gap-6 group">
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-100 text-[13px] font-black uppercase tracking-tight mb-1 group-hover:text-teal-500 transition-colors">{item.label}</p>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest leading-relaxed">{item.description}</p>
                      </div>
                      <button
                        onClick={() => toggle(item.key)}
                        className={`w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 mt-1 relative border ${toggles[item.key] ? "bg-teal-500 border-teal-400" : "bg-slate-800 border-slate-700"}`}
                      >
                        <span className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow-2xl transition-transform duration-300 ${toggles[item.key] ? "translate-x-6" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* RIGHT — PIN + contacts */}
          <div className="space-y-5">
            {/* Change PIN */}
            <div className="bg-slate-900/40 backdrop-blur-md p-8 rounded-[32px] border border-slate-800/50 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-11 h-11 rounded-2xl bg-slate-950 flex items-center justify-center border border-slate-800">
                  <Fingerprint className="w-5 h-5 text-slate-400" />
                </div>
                <h2 style={{ fontFamily: "Manrope,sans-serif" }} className="text-[14px] font-black text-slate-100 uppercase tracking-[0.15em]">Access PIN</h2>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3 block">{editingPin ? "SET NEW PASSKEY" : "ACTIVE PASSKEY"}</label>
                  <div className="relative">
                    <input
                      type={showPin ? "text" : "password"}
                      value={editingPin ? newPin : pin}
                      onChange={e => editingPin ? setNewPin(e.target.value) : undefined}
                      readOnly={!editingPin}
                      maxLength={8}
                      placeholder={editingPin ? "Enter digits..." : "Stored Securely"}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-[13px] font-black uppercase tracking-widest text-slate-100 focus:outline-none focus:border-teal-500/50 transition-all pr-14"
                    />
                    <button
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-teal-500 transition-all cursor-pointer p-2"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-3">
                  <motion.button 
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={handleChangePin} 
                    className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-100 font-black text-[11px] uppercase tracking-widest rounded-2xl border border-slate-700 transition-all cursor-pointer"
                  >
                    {editingPin ? "Save Node PIN" : "Update PIN"}
                  </motion.button>
                  {editingPin && (
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => { setEditingPin(false); setNewPin(""); }}
                      className="px-6 py-4 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </motion.button>
                  )}
                </div>
              </div>
            </div>

            {/* Emergency contacts quick view */}
            <div className="bg-slate-900/40 backdrop-blur-md p-8 rounded-[32px] border border-slate-800/50 shadow-2xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-11 h-11 rounded-2xl bg-slate-950 flex items-center justify-center border border-slate-800">
                  <Phone className="w-5 h-5 text-slate-400" />
                </div>
                <h2 style={{ fontFamily: "Manrope,sans-serif" }} className="text-[14px] font-black text-slate-100 uppercase tracking-[0.15em]">Contact Nodes</h2>
              </div>
              <div className="space-y-2 mb-6">
                {[
                  { initials: "M", name: "Sunita (Home)", phone: "+91 98100 00001", color: "bg-teal-500/10 text-teal-500 border-teal-500/20" },
                  { initials: "P", name: "Priya K.", phone: "+91 98100 00002", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
                ].map(c => (
                  <button
                    key={c.name}
                    onClick={() => window.location.href = `tel:${c.phone.replace(/\s/g, "")}`}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-950/50 transition-all cursor-pointer text-left border border-transparent hover:border-slate-800/50 group"
                  >
                    <div className={`w-11 h-11 rounded-xl ${c.color} flex items-center justify-center font-black text-xs border shrink-0`}>{c.initials}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-100 text-[13px] font-black uppercase tracking-tight group-hover:text-teal-500 transition-colors">{c.name}</p>
                      <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{c.phone}</p>
                    </div>
                    <Phone className="w-4 h-4 text-slate-700 group-hover:text-teal-500 transition-all" />
                  </button>
                ))}
              </div>
              <motion.button 
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => window.open("/guardian-live", "_blank", "width=420,height=850")} 
                className="w-full py-4 bg-teal-500/5 border border-teal-500/20 text-teal-500 font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl hover:bg-teal-500/10 transition-all cursor-pointer flex items-center justify-center gap-3"
              >
                <Eye className="w-4 h-4" /> Tactical Link Preview
              </motion.button>
            </div>

            {/* Danger zone */}
            <div className="bg-red-500/5 backdrop-blur-md p-8 rounded-[32px] border border-red-500/20 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                   <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <h2 className="text-[13px] font-black text-red-500 uppercase tracking-[0.2em]">Danger Node</h2>
              </div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-6 leading-relaxed">Structural modifications detected. Authorization required for destructive actions.</p>
              <div className="space-y-3">
                {[
                  { label: "Purge All Evidence Data", key: "clear-evidence" },
                  { label: "Wipe System & Resync", key: "reset-account" },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <motion.button
                      whileHover={{ backgroundColor: "rgba(239, 68, 68, 0.15)" }}
                      onClick={() => handleDangerAction(label)}
                      className="w-full py-4 bg-transparent border border-red-500/30 text-red-500 font-black text-[10px] uppercase tracking-[0.25em] rounded-2xl transition-all cursor-pointer"
                    >
                      {confirmDanger === label ? "CONFIRM INJECTION" : label}
                    </motion.button>
                    <AnimatePresence>
                      {confirmDanger === label && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="text-red-600 text-[9px] font-black uppercase tracking-widest mt-3 text-center"
                        >
                          ⚠ CRITICAL: ACTION IS IRREVERSIBLE
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>

            {/* Security status */}
            <div className="bg-slate-900/60 backdrop-blur-md p-8 rounded-[32px] border border-slate-800/50 shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 blur-[40px] rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="flex items-center gap-4 mb-6 relative z-10">
                <div className="w-11 h-11 rounded-2xl bg-teal-500/10 flex items-center justify-center border border-teal-500/20">
                   <Shield className="w-5 h-5 text-teal-500" />
                </div>
                <div>
                   <p className="text-[13px] font-black text-slate-100 uppercase tracking-tight leading-none mb-2">Integrity Score</p>
                   <span className="text-[9px] font-black text-teal-500 uppercase tracking-widest bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">Optimizing</span>
                </div>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 mb-4 border border-slate-800 shadow-inner relative z-10 overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: "72%" }} className="h-full bg-gradient-to-r from-teal-600 to-teal-400 rounded-full" />
              </div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest relative z-10">72% Protection Level • Enable Multi-Node Biometrics</p>
            </div>
          </div>
        </div>

        {/* Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] bg-slate-900 text-white text-[13px] font-bold px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2"
            >
              <Check className="w-4 h-4 text-teal-400" />
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AppLayout>
  );
}
