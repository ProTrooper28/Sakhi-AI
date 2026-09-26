import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Phone, PhoneOff, PhoneCall, X, Shield, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDeviceBattery } from "@/hooks/useDeviceBattery";
import { Button } from "@/components/ui/button";
import {
  FAKE_CALLERS,
  FAKE_CALL_DELAYS,
  FAKE_CALL_AUDIOS,
  fakeCallerFor,
  fakeCallCountdownSec,
  readFakeCallSettings,
  writeFakeCallSettings,
  scheduleFakeCall,
  advanceFakeCall,
  initialFakeCallState,
  type FakeCallState,
  type FakeCallRequest,
} from "@/lib/safety/fakeCall";
import { startFakeRingtone, stopFakeRingtone, startFakeVibration, stopFakeVibration, playFakeConversation, stopFakeConversation } from "@/lib/safety/fakeCallAudio";
import HelpDialog from "@/components/safety/HelpDialog";

/**
 * Fake Call — provider + UI (bottom sheet config, full-screen incoming call).
 *
 * Mounted once in App.tsx. Any screen calls `openFakeCall()` to open the
 * config sheet; the scheduled call then rings full-screen. Preventive only:
 * no guardian notification, no SOS, no network.
 */

type FakeCallContextType = {
  /** Open the configuration bottom sheet. */
  openFakeCall: () => void;
  /** Schedule a call immediately with current defaults (no sheet). */
  quickFakeCall: () => void;
};

const FakeCallContext = createContext<FakeCallContextType | null>(null);

export const useFakeCall = (): FakeCallContextType => {
  const ctx = useContext(FakeCallContext);
  if (!ctx) throw new Error("useFakeCall must be used inside FakeCallProvider");
  return ctx;
};

export const FakeCallProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const { level: batteryLevel } = useDeviceBattery();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [settings, setSettings] = useState(() => readFakeCallSettings());
  const [callerId, setCallerId] = useState(settings.defaultCallerId);
  const [customName, setCustomName] = useState(settings.customCallerName);
  const [delaySec, setDelaySec] = useState(settings.defaultDelaySec);
  const [audioId, setAudioId] = useState(settings.defaultAudioId);
  const [state, setState] = useState<FakeCallState>(initialFakeCallState);
  const [, forceTick] = useState(0);
  const convoStartedRef = useRef(false);

  const updateSettings = (patch: Partial<typeof settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      writeFakeCallSettings(next);
      return next;
    });
  };

  const openFakeCall = useCallback(() => {
    const s = readFakeCallSettings();
    setSettings(s);
    setCallerId(s.defaultCallerId);
    setCustomName(s.customCallerName);
    setDelaySec(s.defaultDelaySec);
    setAudioId(s.defaultAudioId);
    setSheetOpen(true);
  }, []);

  const startCall = useCallback(
    (request: FakeCallRequest) => {
      setSheetOpen(false);
      setState(scheduleFakeCall(request));
      convoStartedRef.current = false;
      toast({
        title: "📞 Fake Call scheduled",
        description: request.delaySec === 0 ? "Your phone is ringing now." : `Your phone will ring in ${request.delaySec < 60 ? `${request.delaySec}s` : `${request.delaySec / 60} min`}.`,
      });
    },
    [toast],
  );

  const quickFakeCall = useCallback(() => {
    const s = readFakeCallSettings();
    const name = s.defaultCallerId === "custom" ? s.customCallerName || "Custom" : FAKE_CALLERS.find((c) => c.id === s.defaultCallerId)?.name ?? "Mom";
    startCall({ callerId: s.defaultCallerId, callerName: name, delaySec: s.defaultDelaySec, audioId: s.defaultAudioId });
  }, [startCall]);

  // Tick loop: pending → ringing, re-render every 500ms while a call exists.
  useEffect(() => {
    if (state.status === "idle") return;
    const id = setInterval(() => {
      setState((prev) => {
        const { state: next, fired } = advanceFakeCall(prev);
        if (fired) {
          if (settings.ringtone) startFakeRingtone();
          if (settings.vibration) startFakeVibration();
        }
        return next;
      });
      forceTick((t) => t + 1);
    }, 500);
    return () => clearInterval(id);
  }, [state.status, settings.ringtone, settings.vibration]);

  const request = state.request;
  const caller = useMemo(() => fakeCallerFor(request), [request]);

  const endCall = useCallback(
    (accepted: boolean) => {
      stopFakeRingtone();
      stopFakeVibration();
      stopFakeConversation();
      setState((prev) => ({ ...prev, status: accepted ? "active" : "ended", acceptedAt: accepted ? Date.now() : prev.acceptedAt, endedAt: Date.now() }));
      if (accepted) {
        convoStartedRef.current = true;
        const line = FAKE_CALL_AUDIOS.find((a) => a.id === request?.audioId)?.line ?? "";
        void playFakeConversation(line).then(() => {
          setState((prev) => (prev.status === "active" ? { ...prev, status: "ended", endedAt: Date.now() } : prev));
        });
      } else {
        setTimeout(() => setState(initialFakeCallState()), 900);
      }
    },
    [request?.audioId],
  );

  // Auto-reset after the call ends.
  useEffect(() => {
    if (state.status !== "ended") return;
    const id = setTimeout(() => setState(initialFakeCallState()), 1600);
    return () => clearTimeout(id);
  }, [state.status]);

  // Stop all audio if the provider unmounts mid-call.
  useEffect(() => () => {
    stopFakeRingtone();
    stopFakeVibration();
    stopFakeConversation();
  }, []);

  const value = useMemo(() => ({ openFakeCall, quickFakeCall }), [openFakeCall, quickFakeCall]);

  const ringtoneOrBatteryNote = batteryLevel != null && batteryLevel < 15 && !sheetOpen && state.status !== "idle"
    ? "Battery is low — the ringtone may stop early."
    : null;

  return (
    <FakeCallContext.Provider value={value}>
      {children}

      {/* ── Config bottom sheet ── */}
      <AnimatePresence>
        {sheetOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] bg-slate-950/45 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
            onClick={() => setSheetOpen(false)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-[28px] shadow-2xl p-6 max-h-[86vh] overflow-y-auto"
            >
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#F2956A,#D4455C)" }}>
                  <PhoneCall className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#F2956A]">Preventive Safety</p>
                  <h3 className="text-lg font-black text-[#3D2315] leading-tight" style={{ fontFamily: "Nunito,sans-serif" }}>
                    Fake Call
                  </h3>
                </div>
                <HelpDialog topic="fake-call" />
                <button onClick={() => setSheetOpen(false)} className="p-2 rounded-full hover:bg-[#FDF6EE] cursor-pointer" aria-label="Close">
                  <X className="w-4 h-4 text-[#9E7A6A]" />
                </button>
              </div>
              <p className="text-[12px] font-bold text-[#9E7A6A] leading-relaxed mb-4">
                Get a realistic incoming call so you can politely step away. Nothing is sent to anyone — no guardian alert, no SOS.
              </p>

              {/* Caller */}
              <p className="text-[10px] font-black uppercase tracking-widest text-[#9E7A6A] mb-2">Caller</p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {FAKE_CALLERS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCallerId(c.id)}
                    className={`py-2.5 rounded-2xl text-xs font-black transition-colors cursor-pointer ${
                      callerId === c.id ? "bg-[#D4455C] text-white" : "bg-[#FDF6EE] text-[#9E7A6A] hover:bg-[#FBDDD0]/60"
                    }`}
                    style={{ fontFamily: "Nunito,sans-serif" }}
                  >
                    {c.emoji} {c.name}
                  </button>
                ))}
              </div>
              {callerId === "custom" && (
                <input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Custom caller name"
                  maxLength={24}
                  className="w-full bg-[#FDF6EE] border border-[#F5E4D6] rounded-2xl px-3.5 py-2.5 text-xs font-bold text-[#3D2315] outline-none focus:border-[#F2956A]/50 placeholder:text-[#C9B7A8] mb-3"
                />
              )}

              {/* Delay */}
              <p className="text-[10px] font-black uppercase tracking-widest text-[#9E7A6A] mb-2">Call Delay</p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {FAKE_CALL_DELAYS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDelaySec(d.value)}
                    className={`py-2.5 rounded-2xl text-xs font-black transition-colors cursor-pointer ${
                      delaySec === d.value ? "bg-[#D4455C] text-white" : "bg-[#FDF6EE] text-[#9E7A6A] hover:bg-[#FBDDD0]/60"
                    }`}
                    style={{ fontFamily: "Nunito,sans-serif" }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              {/* Conversation audio */}
              <p className="text-[10px] font-black uppercase tracking-widest text-[#9E7A6A] mb-2">What they say</p>
              <div className="space-y-2 mb-4">
                {FAKE_CALL_AUDIOS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAudioId(a.id)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-2xl border-2 transition-colors cursor-pointer ${
                      audioId === a.id ? "border-[#F2956A] bg-[#FFF6F2]" : "border-[#F5E4D6] bg-white hover:bg-[#FDF6EE]"
                    }`}
                  >
                    <p className="text-xs font-black text-[#3D2315]" style={{ fontFamily: "Nunito,sans-serif" }}>{a.label}</p>
                    {a.line && <p className="text-[10px] font-bold text-[#9E7A6A] mt-0.5">"{a.line}"</p>}
                  </button>
                ))}
              </div>

              <Button
                onClick={() => {
                  updateSettings({ defaultCallerId: callerId, customCallerName: customName, defaultDelaySec: delaySec, defaultAudioId: audioId });
                  const name = callerId === "custom" ? customName.trim() || "Custom" : FAKE_CALLERS.find((c) => c.id === callerId)?.name ?? "Mom";
                  startCall({ callerId, callerName: name, delaySec, audioId });
                }}
                disabled={callerId === "custom" && !customName.trim()}
                className="w-full py-3.5 rounded-2xl text-xs font-black text-white cursor-pointer"
                style={{ background: "linear-gradient(135deg,#F2956A,#D4455C)", fontFamily: "Nunito,sans-serif" }}
              >
                📞 Start Fake Call
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Full-screen incoming call ── */}
      <AnimatePresence>
        {(state.status === "ringing" || state.status === "active" || state.status === "ended") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-between px-8 py-14"
            style={{ background: "linear-gradient(180deg,#2B1A12 0%,#3D2315 55%,#1C100A 100%)" }}
          >
            {/* Header */}
            <div className="text-center">
              <p className="text-[11px] font-bold tracking-widest text-white/50 uppercase">
                {state.status === "ringing" ? "Incoming Call" : state.status === "active" ? "Ongoing Call" : "Call Ended"}
              </p>
            </div>

            {/* Avatar */}
            <div className="flex flex-col items-center gap-5 -mt-6">
              <motion.div
                animate={state.status === "ringing" ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                className="relative w-36 h-36 rounded-full flex items-center justify-center shadow-2xl"
                style={{ background: "linear-gradient(135deg,#F2956A,#D4455C)" }}
              >
                {state.status === "ringing" && (
                  <>
                    <motion.div
                      animate={{ scale: [1, 1.45], opacity: [0.5, 0] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
                      className="absolute inset-0 rounded-full"
                      style={{ background: "rgba(242,149,106,0.35)" }}
                    />
                    <motion.div
                      animate={{ scale: [1, 1.3], opacity: [0.35, 0] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                      className="absolute inset-0 rounded-full"
                      style={{ background: "rgba(242,149,106,0.25)" }}
                    />
                  </>
                )}
                <span className="text-5xl relative z-10">{caller?.emoji ?? "👤"}</span>
              </motion.div>
              <div className="text-center">
                <h2 className="text-2xl font-black text-white" style={{ fontFamily: "Nunito,sans-serif" }}>
                  {caller?.name ?? "Unknown"}
                </h2>
                <p className="text-[12px] font-bold text-white/50 mt-1">
                  {state.status === "active" ? "00:0" + Math.max(0, Math.floor((Date.now() - (state.acceptedAt ?? Date.now())) / 1000)) : "Sakhi AI · Mobile"}
                </p>
              </div>

              {/* Script caption while the conversation plays */}
              {state.status === "active" && request?.audioId !== "none" && (
                <p className="text-[12px] font-bold text-white/70 text-center max-w-[260px] italic">
                  "{FAKE_CALL_AUDIOS.find((a) => a.id === request?.audioId)?.line}"
                </p>
              )}
              {state.status === "ringing" && (
                <p className="text-[11px] font-bold text-white/40 text-center flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Private — nothing is shared with anyone
                </p>
              )}
              {ringtoneOrBatteryNote && (
                <p className="text-[10px] font-bold text-[#F39C12] flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> {ringtoneOrBatteryNote}
                </p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-center gap-14">
              <div className="flex flex-col items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => endCall(false)}
                  className="w-16 h-16 rounded-full flex items-center justify-center cursor-pointer shadow-xl"
                  style={{ background: "#EF4444" }}
                  aria-label="Decline call"
                >
                  <PhoneOff className="w-7 h-7 text-white" />
                </motion.button>
                <span className="text-[10px] font-bold text-white/60">Decline</span>
              </div>
              {state.status === "ringing" && (
                <motion.div
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="flex flex-col items-center gap-2"
                >
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => endCall(true)}
                    className="w-16 h-16 rounded-full flex items-center justify-center cursor-pointer shadow-xl"
                    style={{ background: "#3D9970" }}
                    aria-label="Accept call"
                  >
                    <Phone className="w-7 h-7 text-white" />
                  </motion.button>
                  <span className="text-[10px] font-bold text-white/60">Accept</span>
                </motion.div>
              )}
              {state.status === "active" && (
                <div className="flex flex-col items-center gap-2">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setState(initialFakeCallState())}
                    className="w-16 h-16 rounded-full flex items-center justify-center cursor-pointer shadow-xl"
                    style={{ background: "#EF4444" }}
                    aria-label="End call"
                  >
                    <PhoneOff className="w-7 h-7 text-white" />
                  </motion.button>
                  <span className="text-[10px] font-bold text-white/60">End</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </FakeCallContext.Provider>
  );
};
