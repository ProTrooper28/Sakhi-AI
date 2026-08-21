import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Lock, Bell, Fingerprint, Eye, EyeOff, Phone, ChevronRight, AlertTriangle, Check, X, Sparkles, AlertCircle, Radio, Volume2, Watch, Hand, Mic, Vibrate, TestTube2, Trash2, Plus } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { playSOSTriggerSound } from "@/lib/audio";
import {
  TRIGGER_METHODS,
  readTriggerConfig,
  writeTriggerConfig,
  enabledTriggerCount,
  SILENT_TRIGGER_STEPS,
  type TriggerConfig,
  type TriggerMethodId,
} from "@/lib/safety";
import { useEmergencyActivation } from "@/components/emergency/EmergencyActivationProvider";

const TRIGGER_ICONS: Record<TriggerMethodId, typeof Radio> = {
  "voice-phrase": Volume2,
  "hardware-sequence": Phone,
  "watch-button": Watch,
  gesture: Hand,
};

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
    title: "Privacy Settings",
    icon: Eye,
    items: [
      { label: "Stealth Mode", description: "Hide app icon from recent apps", key: "stealth", on: false },
      { label: "Anonymous Reports", description: "Strip identity from all reports", key: "anon", on: true },
      { label: "Fake Shutdown", description: "Appear offline while recording", key: "fakeoff", on: false },
    ],
  },
];

/**
 * Emergency Activation section — Voice SOS + Double Shake SOS.
 * Reads/writes settings via the EmergencyActivationProvider context.
 */
function EmergencyActivationSection() {
  const {
    voiceListening, voiceToggle, voicePhrases, voiceAddPhrase, voiceRemovePhrase,
    voiceSupported, voiceTranscript, voicePermissionError,
    shakeListening, shakeToggle, shakeSensitivity, shakeSetSensitivity,
    shakeSupported, shakePermissionError,
    testMode, enterTestMode, exitTestMode,
  } = useEmergencyActivation();

  const [newPhrase, setNewPhrase] = useState("");
  const [testToast, setTestToast] = useState<string | null>(null);

  const showTestToast = (msg: string) => {
    setTestToast(msg);
    setTimeout(() => setTestToast(null), 3000);
  };

  return (
    <div className="bg-white rounded-[28px] border border-[#F9C5B0]/20 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-1">
        <div className="p-2.5 rounded-2xl bg-[#D4455C]/10 text-[#D4455C]">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-extrabold text-base text-[#3D2315] font-heading">Emergency Activation</h2>
          <p className="text-[10px] font-bold text-[#D4455C] uppercase">
            {(voiceListening ? 1 : 0) + (shakeListening ? 1 : 0)} method{(voiceListening ? 1 : 0) + (shakeListening ? 1 : 0) === 1 ? "" : "s"} active
          </p>
        </div>
      </div>
      <p className="text-[#9E7A6A] text-xs mt-2 leading-relaxed">
        Trigger SOS hands-free with voice phrases or shake gestures. Both invoke the exact same
        emergency workflow as the SOS button — no duplicate logic.
      </p>

      {/* ── Voice SOS ── */}
      <div className="mt-5 pt-4 border-t border-[#F5E4D6]">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: voiceListening ? "rgba(212,69,92,0.1)" : "#FBF0E9" }}>
              <Mic className="w-4 h-4" style={{ color: voiceListening ? "#D4455C" : "#9E7A6A" }} />
            </div>
            <div>
              <p className="text-[#3D2315] text-sm font-bold">Voice SOS</p>
              <p className="text-[#9E7A6A] text-[10px] leading-relaxed">
                {voiceSupported ? (voiceListening ? "Monitoring active" : "Off — enable to start") : "Not supported on this device"}
              </p>
            </div>
          </div>
          <button
            onClick={voiceToggle}
            disabled={!voiceSupported}
            className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 mt-0.5 cursor-pointer ${
              voiceListening ? "bg-[#D4455C]" : "bg-[#F5E4D6]"
            } ${!voiceSupported ? "opacity-50" : ""}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
              voiceListening ? "translate-x-5.5" : "translate-x-0.5"
            }`} />
          </button>
        </div>

        {voiceListening && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
            {/* Listening indicator */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3" style={{ background: "rgba(212,69,92,0.06)" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: "#D4455C", animation: "dot-pulse 1s ease-in-out infinite" }} />
              <span className="text-[10px] font-bold text-[#D4455C] uppercase tracking-wide">
                Listening for phrases...
              </span>
              {voiceTranscript && (
                <span className="text-[9px] font-semibold text-[#9E7A6A] ml-auto truncate max-w-[120px]">
                  &quot;{voiceTranscript}&quot;
                </span>
              )}
            </div>

            {/* Default phrases */}
            <p className="text-[10px] font-black uppercase tracking-widest text-[#9E7A6A] mb-2">
              Activation Phrases
            </p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {voicePhrases.slice(0, 7).map((p) => (
                <span key={p} className="px-2.5 py-1 rounded-full text-[10px] font-bold text-[#D4455C]" style={{ background: "rgba(212,69,92,0.08)" }}>
                  &quot;{p}&quot;
                </span>
              ))}
            </div>

            {/* Custom phrase input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newPhrase}
                onChange={(e) => setNewPhrase(e.target.value)}
                placeholder="Add custom phrase..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newPhrase.trim()) {
                    voiceAddPhrase(newPhrase);
                    setNewPhrase("");
                  }
                }}
                className="flex-1 bg-[#FBF0E9] border border-[#F5E4D6] rounded-xl px-3 py-2 text-xs font-bold text-[#3D2315] focus:outline-none focus:border-[#F2956A]"
              />
              <button
                onClick={() => { if (newPhrase.trim()) { voiceAddPhrase(newPhrase); setNewPhrase(""); } }}
                disabled={!newPhrase.trim()}
                className="px-3 py-2 rounded-xl text-xs font-bold text-white bg-[#D4455C] disabled:opacity-40 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}

        {voicePermissionError && (
          <p className="text-[10px] font-bold text-[#D4455C] mt-2">{voicePermissionError}</p>
        )}

        {/* Test Voice Detection */}
        <div className="mt-3 pt-3 border-t border-[#F5E4D6]">
          <button
            onClick={() => {
              if (testMode.active && testMode.method === "voice") {
                exitTestMode();
                showTestToast("Test mode ended");
              } else {
                enterTestMode("voice");
                showTestToast("Speak a phrase — SOS will NOT be triggered");
              }
            }}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              testMode.active && testMode.method === "voice"
                ? "text-white bg-[#D4455C]"
                : "text-[#D4455C] bg-[#FBDDED]/50 hover:bg-[#FBDDED]"
            }`}
          >
            <TestTube2 className="w-3.5 h-3.5" />
            {testMode.active && testMode.method === "voice" ? "Stop Testing" : "Test Voice Detection"}
          </button>
          {testMode.active && testMode.method === "voice" && testMode.timestamp && (
            <p className="text-[10px] font-bold text-[#3D9970] mt-2 text-center">
              ✓ Phrase detected — no alert sent (test mode)
            </p>
          )}
        </div>
      </div>

      {/* ── Double Shake SOS ── */}
      <div className="mt-5 pt-4 border-t border-[#F5E4D6]">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: shakeListening ? "rgba(122,43,115,0.1)" : "#FBF0E9" }}>
              <Vibrate className="w-4 h-4" style={{ color: shakeListening ? "#7A2B73" : "#9E7A6A" }} />
            </div>
            <div>
              <p className="text-[#3D2315] text-sm font-bold">Double Shake SOS</p>
              <p className="text-[#9E7A6A] text-[10px] leading-relaxed">
                {shakeSupported ? (shakeListening ? "Monitoring active" : "Off — enable to start") : "Not supported on this device"}
              </p>
            </div>
          </div>
          <button
            onClick={shakeToggle}
            disabled={!shakeSupported}
            className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 mt-0.5 cursor-pointer ${
              shakeListening ? "bg-[#7A2B73]" : "bg-[#F5E4D6]"
            } ${!shakeSupported ? "opacity-50" : ""}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
              shakeListening ? "translate-x-5.5" : "translate-x-0.5"
            }`} />
          </button>
        </div>

        {shakeListening && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
            {/* Sensitivity selector */}
            <p className="text-[10px] font-black uppercase tracking-widest text-[#9E7A6A] mb-2">
              Sensitivity
            </p>
            <div className="flex gap-2 mb-3">
              {(["low", "medium", "high"] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => shakeSetSensitivity(level)}
                  className={`flex-1 py-2 rounded-xl text-[11px] font-bold capitalize cursor-pointer transition-all ${
                    shakeSensitivity === level
                      ? "bg-[#7A2B73] text-white"
                      : "bg-[#FBF0E9] text-[#9E7A6A] hover:bg-[#F5E4D6]"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>

            {/* How it works */}
            <div className="px-3 py-2 rounded-xl mb-3" style={{ background: "rgba(122,43,115,0.06)" }}>
              <p className="text-[10px] font-bold text-[#7A2B73] leading-relaxed">
                Shake your phone twice rapidly (within 2.5s). A 3-second countdown will appear
                with Cancel and Trigger Now buttons.
              </p>
            </div>
          </motion.div>
        )}

        {shakePermissionError && (
          <p className="text-[10px] font-bold text-[#D4455C] mt-2">{shakePermissionError}</p>
        )}

        {/* Test Shake Detection */}
        <div className="mt-3 pt-3 border-t border-[#F5E4D6]">
          <button
            onClick={() => {
              if (testMode.active && testMode.method === "shake") {
                exitTestMode();
                showTestToast("Test mode ended");
              } else {
                enterTestMode("shake");
                showTestToast("Shake your phone — SOS will NOT be triggered");
              }
            }}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              testMode.active && testMode.method === "shake"
                ? "text-white bg-[#7A2B73]"
                : "text-[#7A2B73] bg-[#7A2B73]/8 hover:bg-[#7A2B73]/15"
            }`}
          >
            <TestTube2 className="w-3.5 h-3.5" />
            {testMode.active && testMode.method === "shake" ? "Stop Testing" : "Test Shake Detection"}
          </button>
          {testMode.active && testMode.method === "shake" && testMode.timestamp && (
            <p className="text-[10px] font-bold text-[#3D9970] mt-2 text-center">
              ✓ Shake detected — no alert sent (test mode)
            </p>
          )}
        </div>
      </div>

      {/* ── Privacy notice ── */}
      <div className="mt-4 pt-4 border-t border-[#F5E4D6]">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#9E7A6A] mb-2">
          Privacy
        </p>
        <ul className="space-y-1.5">
          {[
            "Voice monitoring is active only when Voice SOS is enabled.",
            "Audio is not stored or uploaded — speech recognition runs locally.",
            "Motion data is processed only for shake detection.",
            "Both methods invoke the same SOS workflow as the button.",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Check className="w-3 h-3 text-[#3D9970] mt-0.5 flex-shrink-0" />
              <span className="text-[10px] font-semibold text-[#9E7A6A] leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Test toast */}
      <AnimatePresence>
        {testToast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-3 px-3 py-2 rounded-xl text-[11px] font-bold text-center"
            style={{ background: "rgba(61,153,112,0.1)", color: "#3D9970" }}
          >
            {testToast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SecuritySettingsPage() {
  const navigate = useNavigate();
  const { triggerSOS } = useApp();
  const [triggers, setTriggers] = useState<TriggerConfig>(() => readTriggerConfig());
  const toggleTrigger = (id: TriggerMethodId) => {
    setTriggers((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      writeTriggerConfig(next);
      return next;
    });
  };
  const [toggles, setToggles] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem("sakhi_security_settings");
      return stored ? JSON.parse(stored) : {
        pin: true, bio: true, lock: false, silent: false, sms: true, shake: true,
        stealth: false, anon: true, fakeoff: false,
      };
    } catch {
      return {
        pin: true, bio: true, lock: false, silent: false, sms: true, shake: true,
        stealth: false, anon: true, fakeoff: false,
      };
    }
  });

  useEffect(() => {
    localStorage.setItem("sakhi_security_settings", JSON.stringify(toggles));
  }, [toggles]);

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
        showToast("PIN updated successfully!");
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
      <div className="bg-[#FDF6EE] min-h-screen text-[#3D2315] font-sans pb-24 md:pb-10">
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="px-4 md:px-8 max-w-[1200px] mx-auto pt-6"
        >
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-xs font-bold text-[#9E7A6A] tracking-wider uppercase mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#F2956A]" />
              Manage your companion settings
            </div>
            <h1 className="text-3xl font-extrabold text-[#3D2315] font-heading tracking-tight">
              Safety Preferences
            </h1>
            <p className="text-[#9E7A6A] text-sm mt-1">Configure your personal security triggers, PINs, and options.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
            {/* Left Section: Preference Toggles */}
            <div className="space-y-6">
              {sections.map(({ title, icon: Icon, items }) => (
                <div 
                  key={title} 
                  className="bg-white rounded-[28px] border border-[#F9C5B0]/20 shadow-sm p-6"
                >
                  <div className="flex items-center gap-3 mb-5">
                    <div className="p-2.5 rounded-2xl bg-[#FBDDD0] text-[#D4455C]">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h2 className="font-extrabold text-base text-[#3D2315] font-heading">{title}</h2>
                  </div>
                  
                  <div className="space-y-5">
                    {items.map(item => (
                      <div key={item.key} className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-[#3D2315] text-sm font-bold">{item.label}</p>
                          <p className="text-[#9E7A6A] text-xs mt-0.5 leading-relaxed">{item.description}</p>
                        </div>
                        <button
                          onClick={() => toggle(item.key)}
                          className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 mt-0.5 cursor-pointer ${
                            toggles[item.key] ? "bg-[#3D9970]" : "bg-[#F5E4D6]"
                          }`}
                        >
                          <span 
                            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                              toggles[item.key] ? "translate-x-5.5" : "translate-x-0.5"
                            }`} 
                          />
                        </button>
                      </div>
                    ))}
                  </div>

                  {title === "Emergency Alerts" && (
                    <div className="mt-5 pt-4 border-t border-[#F5E4D6] flex gap-2">
                      <button
                        onClick={() => playSOSTriggerSound()}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-[#D4455C] bg-[#FBDDED]/50 hover:bg-[#FBDDED] transition-colors cursor-pointer"
                      >
                        <Bell className="w-4 h-4 text-[#D4455C] animate-pulse" />
                        Test Emergency Siren
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* ── Silent Safety Triggers (Feature 4) ── */}
              <div className="bg-white rounded-[28px] border border-[#F9C5B0]/20 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2.5 rounded-2xl bg-[#7A2B73]/10 text-[#7A2B73]">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-base text-[#3D2315] font-heading">Silent Safety Trigger</h2>
                    <p className="text-[10px] font-bold text-[#7A2B73] uppercase">
                      {enabledTriggerCount(triggers)} method{enabledTriggerCount(triggers) === 1 ? "" : "s"} armed
                    </p>
                  </div>
                </div>
                <p className="text-[#9E7A6A] text-xs mt-2 leading-relaxed">
                  When a trigger fires, Sakhi quietly starts live location sharing, notifies your guardian,
                  prepares evidence capture and arms SOS — with no siren.
                </p>

                <div className="mt-4 space-y-3">
                  {TRIGGER_METHODS.map((m) => {
                    const Icon = TRIGGER_ICONS[m.id];
                    const on = triggers[m.id] && m.available;
                    return (
                      <div key={m.id} className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0 flex gap-3">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: on ? "rgba(122,43,115,0.1)" : "#FBF0E9" }}>
                            <Icon className="w-4 h-4" style={{ color: on ? "#7A2B73" : "#9E7A6A" }} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[#3D2315] text-sm font-bold flex items-center gap-2">
                              {m.label}
                              {!m.available && (
                                <span className="text-[8px] font-black uppercase tracking-wider text-[#B7770D] bg-[#FFF3C7] px-1.5 py-0.5 rounded-full">
                                  Coming soon
                                </span>
                              )}
                            </p>
                            <p className="text-[#9E7A6A] text-xs mt-0.5 leading-relaxed">{m.description}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => m.available && toggleTrigger(m.id)}
                          disabled={!m.available}
                          className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 mt-0.5 cursor-pointer ${m.available ? (on ? "bg-[#7A2B73]" : "bg-[#F5E4D6]") : "bg-[#F5E4D6] opacity-50"}`}
                        >
                          <span
                            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                              on ? "translate-x-5.5" : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-4 border-t border-[#F5E4D6]">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#9E7A6A] mb-2">
                    What happens when it fires
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {SILENT_TRIGGER_STEPS.map((step) => (
                      <span key={step} className="px-2.5 py-1 rounded-full text-[10px] font-bold text-[#7A2B73] bg-[#7A2B73]/8" style={{ background: "rgba(122,43,115,0.08)" }}>
                        {step}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] font-semibold text-[#9E7A6A] mt-3 leading-relaxed">
                    Voice and gesture triggers never listen in the background — they arm only when you
                    turn them on, and no microphone/sensor data is collected otherwise.
                  </p>
                </div>
              </div>

              {/* ── Emergency Activation (Voice SOS + Double Shake SOS) ── */}
              <EmergencyActivationSection />
            </div>

            {/* Right Section: Access PIN & Contacts */}
            <div className="space-y-6">
              {/* Access PIN Card */}
              <div className="bg-white rounded-[28px] border border-[#F9C5B0]/20 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-2xl bg-[#FBDDD0] text-[#D4455C]">
                    <Fingerprint className="w-5 h-5" />
                  </div>
                  <h2 className="font-extrabold text-base text-[#3D2315] font-heading">Locker PIN</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-[#9E7A6A] uppercase tracking-wider block mb-2">
                      {editingPin ? "Create New PIN" : "Current Active PIN"}
                    </label>
                    <div className="relative">
                      <input
                        type={showPin ? "text" : "password"}
                        value={editingPin ? newPin : pin}
                        onChange={e => editingPin ? setNewPin(e.target.value) : undefined}
                        readOnly={!editingPin}
                        maxLength={8}
                        placeholder={editingPin ? "Enter 4+ digits" : "PIN Active"}
                        className="w-full bg-[#FBF0E9] border border-[#F5E4D6] rounded-xl px-4 py-2.5 text-sm font-bold text-[#3D2315] focus:outline-none focus:border-[#F2956A] pr-10"
                      />
                      <button
                        onClick={() => setShowPin(!showPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9E7A6A] hover:text-[#3D2315] cursor-pointer"
                      >
                        {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleChangePin} 
                      className="flex-1 bg-[#D4455C] hover:bg-[#b8324a] text-white py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      {editingPin ? "Save PIN" : "Change PIN"}
                    </button>
                    {editingPin && (
                      <button
                        onClick={() => { setEditingPin(false); setNewPin(""); }}
                        className="bg-[#FBF0E9] hover:bg-[#F5E4D6] text-[#9E7A6A] px-3.5 rounded-xl transition-all cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Security Score Banner */}
              <div className="bg-white rounded-[28px] border border-[#F9C5B0]/20 shadow-sm p-6 bg-gradient-to-br from-white to-[#FDF6EE]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-2xl bg-[#D6F5EA] text-[#3D9970]">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-sm text-[#3D2315] font-heading">Security Level</h2>
                    <p className="text-[10px] font-bold text-[#3D9970] uppercase">Secure Companion</p>
                  </div>
                  <span className="ml-auto text-xs font-bold text-[#3D9970] bg-[#D6F5EA] px-2.5 py-1 rounded-full">
                    Good
                  </span>
                </div>
                <div className="w-full bg-[#F5E4D6] rounded-full h-2.5 mb-2.5">
                  <div className="h-2.5 rounded-full bg-[#3D9970]" style={{ width: "75%" }} />
                </div>
                <p className="text-[#9E7A6A] text-[11px] leading-relaxed">
                  Turn on <strong>Stealth Mode</strong> and update your locker lock sequence to reach 100%.
                </p>
              </div>

              {/* Danger Zone */}
              <div className="bg-white rounded-[28px] border border-[#D4455C]/20 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-3 text-[#D4455C]">
                  <AlertTriangle className="w-4 h-4" />
                  <h2 className="font-extrabold text-sm font-heading">Caution Zone</h2>
                </div>
                <p className="text-[#9E7A6A] text-[11px] leading-relaxed mb-4">
                  These changes instantly delete stored evidence and local safety logs.
                </p>
                <div className="space-y-2.5">
                  {[
                    { label: "Clear Safety Logs", key: "clear-evidence" },
                    { label: "Reset Sakhi Config", key: "reset-account" },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <button
                        onClick={() => handleDangerAction(label)}
                        className="w-full py-2.5 border border-[#D4455C]/20 text-[#D4455C] hover:bg-[#FBDDED]/40 transition-colors rounded-xl text-xs font-bold cursor-pointer"
                      >
                        {confirmDanger === label ? "Tap again to reset" : label}
                      </button>
                      <AnimatePresence>
                        {confirmDanger === label && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="text-[#D4455C] text-[10px] font-bold mt-1 text-center"
                          >
                            Resets safety configurations instantly.
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
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
                className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] bg-[#3D2315] text-[#FDF6EE] text-xs font-bold px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2"
              >
                <Check className="w-4 h-4 text-[#3D9970]" />
                {toast}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AppLayout>
  );
}
