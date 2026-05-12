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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 style={{ fontFamily: "Manrope,sans-serif", fontSize: "1.75rem", fontWeight: 700 }} className="text-foreground">
              Security Settings
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your safety preferences and account protection.</p>
          </div>
          <ThemeToggle />
        </div>

        <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 360px" }}>
          {/* LEFT — Toggle sections */}
          <div className="space-y-6">
            {sections.map(({ title, icon: Icon, items }) => (
              <div key={title} className="card-surface p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                    <Icon style={{ width: 18, height: 18 }} className="text-foreground" />
                  </div>
                  <h2 style={{ fontFamily: "Manrope,sans-serif", fontWeight: 700, fontSize: "1rem" }} className="text-foreground">{title}</h2>
                </div>
                <div className="space-y-4">
                  {items.map(item => (
                    <div key={item.key} className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground text-sm font-semibold">{item.label}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">{item.description}</p>
                      </div>
                      <button
                        onClick={() => toggle(item.key)}
                        className={`toggle-pill w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 mt-0.5 relative ${toggles[item.key] ? "bg-teal-500" : "bg-slate-200"}`}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${toggles[item.key] ? "translate-x-5" : "translate-x-0.5"}`} />
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
            <div className="card-surface p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <Fingerprint style={{ width: 18, height: 18 }} className="text-foreground" />
                </div>
                <h2 style={{ fontFamily: "Manrope,sans-serif", fontWeight: 700, fontSize: "1rem" }} className="text-foreground">Access PIN</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="section-label mb-2 block">{editingPin ? "New PIN" : "Current PIN"}</label>
                  <div className="relative">
                    <input
                      type={showPin ? "text" : "password"}
                      value={editingPin ? newPin : pin}
                      onChange={e => editingPin ? setNewPin(e.target.value) : undefined}
                      readOnly={!editingPin}
                      maxLength={8}
                      placeholder={editingPin ? "Enter new PIN" : "Enter PIN"}
                      className="input-soft pr-10"
                    />
                    <button
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      {showPin ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleChangePin} className="btn-primary flex-1">
                    {editingPin ? "Save PIN" : "Change PIN"}
                  </button>
                  {editingPin && (
                    <button
                      onClick={() => { setEditingPin(false); setNewPin(""); }}
                      className="btn-secondary px-4"
                    >
                      <X style={{ width: 14, height: 14 }} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Emergency contacts quick view */}
            <div className="card-surface p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <Phone style={{ width: 18, height: 18 }} className="text-foreground" />
                </div>
                <h2 style={{ fontFamily: "Manrope,sans-serif", fontWeight: 700, fontSize: "1rem" }} className="text-foreground">Emergency Contacts</h2>
              </div>
              {[
                { initials: "M", name: "Mom (Sunita)", phone: "+91 98100 00001", color: "bg-blue-100 text-blue-700" },
                { initials: "P", name: "Priya Kapoor", phone: "+91 98100 00002", color: "bg-purple-100 text-purple-700" },
              ].map(c => (
                <button
                  key={c.name}
                  onClick={() => window.location.href = `tel:${c.phone.replace(/\s/g, "")}`}
                  className="w-full flex items-center gap-3 py-3 border-b border-border last:border-0 hover:bg-slate-50 transition-colors cursor-pointer text-left rounded-lg px-1"
                >
                  <div className={`w-9 h-9 rounded-full ${c.color} flex items-center justify-center font-bold text-sm flex-shrink-0`}>{c.initials}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground text-sm font-semibold">{c.name}</p>
                    <p className="text-muted-foreground text-xs">{c.phone}</p>
                  </div>
                  <Phone style={{ width: 14, height: 14 }} className="text-teal-500" />
                </button>
              ))}
              <button 
                onClick={() => window.open("/guardian-live", "_blank", "width=420,height=850,top=100,left=100")} 
                className="btn-secondary w-full mt-4 flex items-center justify-center gap-2"
              >
                <Eye style={{ width: 16, height: 16 }} /> Open Guardian Preview
              </button>
            </div>

            {/* Danger zone */}
            <div className="card-surface p-6" style={{ borderColor: "hsl(var(--sos)/0.3)" }}>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle style={{ width: 16, height: 16, color: "hsl(var(--sos))" }} />
                <h2 className="text-sm font-semibold" style={{ color: "hsl(var(--sos))" }}>Danger Zone</h2>
              </div>
              <p className="text-muted-foreground text-xs mb-4">These actions are irreversible. Proceed with caution.</p>
              <div className="space-y-3">
                {[
                  { label: "Clear All Evidence Data", key: "clear-evidence" },
                  { label: "Reset Account", key: "reset-account" },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <button
                      onClick={() => handleDangerAction(label)}
                      className="btn-secondary w-full text-sm cursor-pointer"
                      style={{ color: "hsl(var(--sos))", borderColor: "hsl(var(--sos)/0.3)" }}
                    >
                      {confirmDanger === label ? "Tap again to confirm" : label}
                    </button>
                    <AnimatePresence>
                      {confirmDanger === label && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-red-500 text-[11px] font-bold mt-1 ml-1"
                        >
                          ⚠ This cannot be undone. Tap button again to confirm.
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>

            {/* Security status */}
            <div className="card-surface p-5 bg-gradient-teal">
              <div className="flex items-center gap-3 mb-3">
                <Shield style={{ width: 20, height: 20, color: "hsl(var(--teal))" }} />
                <p className="text-foreground text-sm font-bold">Security Score</p>
                <span className="ml-auto badge-teal">Good</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mb-2">
                <div className="h-2 rounded-full bg-teal-500" style={{ width: "72%" }} />
              </div>
              <p className="text-muted-foreground text-xs">72 / 100 — Enable biometric & stealth mode to improve</p>
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
