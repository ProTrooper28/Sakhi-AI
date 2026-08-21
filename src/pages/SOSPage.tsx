import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Phone, MapPin, Mic, Video, Users, CheckCircle2,
  Shield, ArrowLeft, AlertTriangle, Camera, ShieldAlert,
  Clock, BatteryMedium, Wifi, Satellite, Volume2, VolumeX,
  RotateCcw, Share2, Siren, UserCheck, Activity, PhoneCall, X,
  Vibrate, Settings, ChevronRight,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  getSOSVolume, setSOSVolume,
  startSOSAlarmLoop, stopSOSAlarmLoop,
} from "@/lib/audio";
import { vibrateActivated, vibrateResolved } from "@/lib/haptics";
import { getDeviceBattery, isSharingEnabled, shareLocation } from "@/pages/location/helpers";
import { useEmergencyActivation } from "@/components/emergency/EmergencyActivationProvider";

const FONT = "Nunito,sans-serif";

// ── Instant-trigger SOS button (ripple + haptic, no countdown) ────────────────
const SOSButtonArea = ({ onTrigger }: { onTrigger: () => void }) => {
  const [isActivating, setIsActivating] = useState(false);
  const [ripples, setRipples]           = useState<number[]>([]);
  const rippleId = useRef(0);

  const pushRipple = useCallback(() => {
    const id = rippleId.current++;
    setRipples((prev) => [...prev, id]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r !== id)), 950);
  }, []);

  const handlePress = useCallback(() => {
    if (isActivating) return;
    // Ripple + long vibration, then fire the alert immediately.
    pushRipple();
    setIsActivating(true);
    vibrateActivated();
    setTimeout(() => {
      setIsActivating(false);
      onTrigger();
    }, 300);
  }, [isActivating, onTrigger, pushRipple]);

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      <div className="relative flex items-center justify-center" style={{ height: 300, width: 300 }}>
        {/* Ambient breathing rings */}
        <motion.div
          animate={isActivating
            ? { scale: [1, 1.18, 1], opacity: [0.5, 0.18, 0.5] }
            : { scale: [1, 1.06, 1], opacity: [0.16, 0.05, 0.16] }}
          transition={isActivating
            ? { repeat: Infinity, duration: 0.9, ease: "easeInOut" }
            : { repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
          className="absolute rounded-full pointer-events-none"
          style={{ width: 330, height: 330, background: "radial-gradient(circle, rgba(212,69,92,0.28) 0%, transparent 70%)" }}
        />
        <motion.div
          animate={isActivating
            ? { scale: [1, 1.12, 1], opacity: [0.45, 0.15, 0.45] }
            : { scale: [1, 1.05, 1], opacity: [0.22, 0.08, 0.22] }}
          transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 0.3 }}
          className="absolute rounded-full pointer-events-none"
          style={{ width: 268, height: 268, background: "rgba(212,69,92,0.12)", border: "1px solid rgba(212,69,92,0.22)" }}
        />

        {/* Expanding ripples */}
        <AnimatePresence>
          {ripples.map((id) => (
            <motion.div
              key={id}
              initial={{ scale: 0.85, opacity: 0.6 }}
              animate={{ scale: 2.4, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="absolute rounded-full pointer-events-none"
              style={{ width: 200, height: 200, border: "2px solid rgba(212,69,92,0.45)" }}
            />
          ))}
        </AnimatePresence>

        {/* The button */}
        <motion.button
          onClick={handlePress}
          animate={isActivating ? { scale: 1.15 } : { scale: 1 }}
          transition={isActivating ? { type: "spring", stiffness: 300, damping: 15 } : { type: "spring", stiffness: 300, damping: 20 }}
          className="relative flex items-center justify-center rounded-full select-none cursor-pointer"
          style={{
            width: 200, height: 200,
            background: isActivating
              ? "linear-gradient(135deg, #8B0000, #C0392B)"
              : "linear-gradient(135deg, #D4455C, #B8324A)",
            boxShadow: isActivating
              ? "0 0 0 0 rgba(212,69,92,0), 0 16px 60px rgba(212,69,92,0.6)"
              : "0 8px 40px rgba(212,69,92,0.35)",
            zIndex: 10,
          }}
        >
          <div className="flex flex-col items-center gap-2 z-10">
            <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: 36, color: "white", letterSpacing: 2 }}>SOS</span>
            <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 11, color: "rgba(255,255,255,0.8)" }}>
              {isActivating ? "Sending alert…" : "Tap to send help"}
            </span>
          </div>
        </motion.button>
      </div>
    </div>
  );
};

// ── Main SOS Page ─────────────────────────────────────────────────────────────
const SOSPage = () => {
  const navigate = useNavigate();
  const { guest } = useAuth();
  const { sosState, cancelSOS, resolveSOS, triggerSOS, locationState, addEvidence } = useApp();

  const [isMarkingSafe, setIsMarkingSafe] = useState(false);
  const [timeElapsed, setTimeElapsed]     = useState("00:00");

  // Live data (clock / battery / network)
  const [clock, setClock]       = useState(() => new Date());
  const [battery, setBattery]   = useState<number | null>(null);
  const [online, setOnline]     = useState<boolean>(typeof navigator === "undefined" ? true : navigator.onLine);

  // Siren controls
  const [sirenMuted, setSirenMuted] = useState(false);
  const [sirenVolume, setSirenVolume] = useState(getSOSVolume());

  // Recording states
  const [isRecording, setIsRecording]           = useState(false);
  const [isAudioRecording, setIsAudioRecording] = useState(false);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);

  const mediaRecorderRef   = useRef<MediaRecorder | null>(null);
  const videoChunksRef     = useRef<BlobPart[]>([]);
  const streamRef          = useRef<MediaStream | null>(null);
  const audioRecorderRef   = useRef<MediaRecorder | null>(null);
  const audioStreamRef     = useRef<MediaStream | null>(null);
  const audioChunksRef     = useRef<BlobPart[]>([]);

  const { voiceListening, shakeListening, voiceSupported, shakeSupported } = useEmergencyActivation();

  const guardianConnected = isSupabaseConfigured && !guest;

  // Timer
  useEffect(() => {
    if (!sosState.active) return;
    const calc = () => {
      if (!sosState.triggeredAt) return "00:00";
      const diff = Math.floor((Date.now() - new Date(sosState.triggeredAt).getTime()) / 1000);
      return `${String(Math.floor(diff / 60)).padStart(2, "0")}:${String(diff % 60).padStart(2, "0")}`;
    };
    setTimeElapsed(calc());
    const id = setInterval(() => setTimeElapsed(calc()), 1000);
    return () => clearInterval(id);
  }, [sosState.active, sosState.triggeredAt]);

  // Clock + battery + network while an emergency is live
  useEffect(() => {
    if (!sosState.active) return;
    setClock(new Date());
    const id = setInterval(() => setClock(new Date()), 1000);
    void getDeviceBattery().then(setBattery);
    return () => clearInterval(id);
  }, [sosState.active]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // Haptic confirmation when the SOS resolves
  const wasActiveRef = useRef(sosState.active);
  useEffect(() => {
    if (wasActiveRef.current && !sosState.active) vibrateResolved();
    wasActiveRef.current = sosState.active;
  }, [sosState.active]);

  // Siren: loop while active, respect mute. (AppContext owns the loop
  // lifecycle — this only overrides for the mute/restart controls.)
  useEffect(() => {
    if (!sosState.active) return;
    if (sirenMuted) stopSOSAlarmLoop();
    else startSOSAlarmLoop(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sosState.active, sirenMuted]);

  // ── Video recording (camera + mic evidence) ──
  const startRecording = async () => {
    try {
      setPermissionsError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: true,
      });
      streamRef.current = stream;
      videoChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8,opus" });
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) videoChunksRef.current.push(e.data);
      };
      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to acquire camera permissions:", err);
      setIsRecording(false);
      setPermissionsError(
        "Camera & Microphone access is needed to secretly record evidence. Please allow permissions when prompted.",
      );
    }
  };

  const stopAndSaveRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      setTimeout(() => {
        if (videoChunksRef.current.length > 0) {
          const blob = new Blob(videoChunksRef.current, { type: "video/webm" });
          addEvidence({
            type: "sos-recording",
            name: `SOS_Evidence_${new Date().toISOString().replace(/[:.]/g, "-")}.webm`,
            fileUrl: URL.createObjectURL(blob),
            fileType: "video/webm",
            timestamp: new Date().toISOString(),
            location: locationState.address || undefined,
          });
        }
      }, 500);
    }
  };

  // ── Audio-only recording (quick action) ──
  const startAudioRecording = async () => {
    try {
      setPermissionsError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      rec.start(1000);
      audioRecorderRef.current = rec;
      setIsAudioRecording(true);
    } catch (err) {
      console.error("Failed to acquire microphone permissions:", err);
      setPermissionsError("Microphone access is needed to record audio evidence. Please allow permissions when prompted.");
    }
  };

  const stopAudioRecording = () => {
    const rec = audioRecorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.stop();
      if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach((track) => track.stop());
      setIsAudioRecording(false);
      setTimeout(() => {
        if (audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          addEvidence({
            type: "sos-recording",
            name: `SOS_Audio_${new Date().toISOString().replace(/[:.]/g, "-")}.webm`,
            fileUrl: URL.createObjectURL(blob),
            fileType: "audio/webm",
            timestamp: new Date().toISOString(),
            location: locationState.address || undefined,
          });
        }
      }, 400);
    }
  };

  // Auto-start camera recording when SOS becomes active
  useEffect(() => {
    if (sosState.active) {
      startRecording();
    } else {
      stopAndSaveRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sosState.active]);

  // Clean up streams on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
      if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const handleMarkSafe = () => {
    setIsMarkingSafe(true);
    stopAndSaveRecording();
    stopAudioRecording();
    setTimeout(() => {
      resolveSOS();
      setIsMarkingSafe(false);
      navigate("/home");
    }, 800);
  };

  const handleCancelSOS = () => {
    stopAndSaveRecording();
    stopAudioRecording();
    cancelSOS();
    navigate("/home");
  };

  const handleVolume = (v: number) => {
    setSirenVolume(v);
    setSOSVolume(v);
  };

  const handleRestartSiren = () => {
    setSirenMuted(false);
    startSOSAlarmLoop(false);
  };

  // ── ACTIVE SOS: premium emergency mode ───────────────────────────────────
  if (sosState.active) {
    const sharing = isSharingEnabled();
    const gpsActive = !!locationState.coords && !locationState.error;

    const statusCards = [
      { label: "Guardian Status", value: guardianConnected ? "Connected" : "Demo Mode", icon: UserCheck, ok: true },
      { label: "Location Sharing", value: sharing ? "Active" : "Paused", icon: Share2, ok: sharing },
      { label: "GPS Status", value: gpsActive ? "GPS Active" : "Acquiring…", icon: Satellite, ok: gpsActive },
      { label: "Battery", value: battery != null ? `${battery}%` : "—", icon: BatteryMedium, ok: battery == null || battery >= 20 },
      { label: "Network", value: online ? "Online" : "Offline", icon: Wifi, ok: online },
      { label: "Recording", value: isRecording ? "Camera" : isAudioRecording ? "Audio" : "Standby", icon: Activity, ok: isRecording || isAudioRecording },
    ];

    const quickActions = [
      {
        icon: PhoneCall, label: "Call Guardian", sub: "Open contacts",
        color: "#F87171", bg: "rgba(248,113,113,0.14)", border: "rgba(248,113,113,0.35)",
        action: () => navigate("/guardian"),
      },
      {
        icon: Share2, label: "Share Location", sub: "Send live location",
        color: "#38BDF8", bg: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.35)",
        action: () => {
          const c = sosState.coords || { lat: 19.0596, lng: 72.8295 };
          void shareLocation(c.lat, c.lng, sosState.location);
        },
      },
      {
        icon: Siren, label: "Call 112", sub: "Emergency services",
        color: "#FBBF24", bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.35)",
        action: () => { window.location.href = "tel:112"; },
      },
      {
        icon: Mic, label: "Audio Record", sub: isAudioRecording ? "Stop recording" : "Start recording",
        color: "#C084FC", bg: "rgba(192,132,252,0.12)", border: "rgba(192,132,252,0.35)",
        action: () => (isAudioRecording ? stopAudioRecording() : void startAudioRecording()),
      },
      {
        icon: Camera, label: "Open Camera", sub: isRecording ? "Stop video" : "Record video evidence",
        color: "#34D399", bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.35)",
        action: () => (isRecording ? stopAndSaveRecording() : void startRecording()),
      },
      {
        icon: X, label: "Cancel SOS", sub: "Stop the alert",
        color: "#94A3B8", bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.35)",
        action: handleCancelSOS,
      },
    ];

    return (
      <div className="fixed inset-0 flex flex-col z-[200] overflow-y-auto sos-page-emergency">
        {/* Ambient red pulse rings */}
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none sos-red-pulse" style={{ zIndex: 0 }}>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ scale: [1, 2.6, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 2.2, delay: i * 0.7, repeat: Infinity, ease: "easeOut" }}
              className="absolute rounded-full"
              style={{ width: 260, height: 260, border: `${2 - i * 0.5}px solid rgba(220,38,38,0.5)` }}
            />
          ))}
        </div>

        <div className="relative z-10 flex flex-col mx-auto w-full max-w-lg px-4 pt-4 pb-10">
          {/* Top warning banner slides down */}
          <motion.div
            initial={{ y: -90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 120, damping: 13 }}
            className="sos-warning-banner"
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#F87171", animation: "dot-pulse 0.8s ease-in-out infinite" }} />
            <span>EMERGENCY MODE — SOS ACTIVE</span>
          </motion.div>

          {/* Top row: exit + current time */}
          <div className="flex items-center justify-between mt-5 mb-6">
            <button onClick={handleCancelSOS} className="flex items-center gap-2 cursor-pointer" style={{ color: "rgba(255,255,255,0.65)", fontFamily: FONT, fontWeight: 700, fontSize: 13 }}>
              <ArrowLeft className="w-4 h-4" /> Cancel &amp; Exit
            </button>
            <div className="text-right">
              <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 10, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: 1 }}>Current Time</p>
              <p style={{ fontFamily: FONT, fontWeight: 800, fontSize: 15, color: "white", fontVariantNumeric: "tabular-nums" }}>
                {clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </p>
            </div>
          </div>

          {/* Hero: SOS ACTIVE + elapsed */}
          <div className="text-center mb-7">
            <motion.div
              animate={{ scale: [1, 1.06, 1], boxShadow: ["0 0 40px rgba(239,68,68,0.45)", "0 0 70px rgba(239,68,68,0.75)", "0 0 40px rgba(239,68,68,0.45)"] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              className="mx-auto rounded-full px-6 py-2.5 flex items-center gap-2.5 w-fit"
              style={{ background: "linear-gradient(135deg, rgba(220,38,38,0.85), rgba(153,27,27,0.95))", border: "1px solid rgba(248,113,113,0.6)" }}
            >
              <AlertTriangle className="w-4 h-4 text-white" />
              <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: 15, color: "white", letterSpacing: 3, textTransform: "uppercase" }}>SOS Active</span>
            </motion.div>

            <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1.5, marginTop: 22 }}>Elapsed Time</p>
            <p style={{ fontFamily: FONT, fontWeight: 900, fontSize: 58, color: "white", lineHeight: 1.05, fontVariantNumeric: "tabular-nums", textShadow: "0 0 40px rgba(239,68,68,0.5)" }}>
              {timeElapsed}
            </p>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <MapPin className="w-3.5 h-3.5 text-red-300 flex-shrink-0" />
              <p className="truncate max-w-xs" style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12.5, color: "rgba(255,255,255,0.65)" }}>
                {locationState.address || sosState.location || "Fetching location…"}
              </p>
            </div>
          </div>

          {/* Live status grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {statusCards.map((card) => (
              <div key={card.label} className="sos-glass rounded-[20px] p-3.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <card.icon style={{ width: 14, height: 14, color: card.ok ? "#6EE7B7" : "#FBBF24" }} />
                  <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: 9.5, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: 0.6 }}>{card.label}</p>
                </div>
                <p className="truncate" style={{ fontFamily: FONT, fontWeight: 800, fontSize: 12.5, color: "white" }}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Permissions error */}
          <AnimatePresence>
            {permissionsError && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full mb-6 overflow-hidden"
              >
                <div className="sos-glass rounded-[20px] p-4 flex flex-col gap-3" style={{ borderColor: "rgba(251,191,36,0.4)" }}>
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12.5, color: "#FDE68A", lineHeight: 1.5 }}>{permissionsError}</p>
                  </div>
                  <button
                    onClick={() => (isRecording ? stopAndSaveRecording() : void startRecording())}
                    className="self-start px-4 py-2 rounded-xl cursor-pointer"
                    style={{ background: "rgba(251,191,36,0.25)", color: "#FEF3C7", fontFamily: FONT, fontWeight: 800, fontSize: 12 }}
                  >
                    Grant Permissions
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Siren controls */}
          <div className="sos-glass rounded-[22px] p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {sirenMuted ? <VolumeX className="w-4 h-4 text-red-300" /> : <Volume2 className="w-4 h-4 text-emerald-300" />}
                <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 13, color: "white" }}>Emergency Siren</span>
                {!sirenMuted && (
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#EF4444", animation: "dot-pulse 0.7s ease-in-out infinite" }} />
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSirenMuted((m) => !m)}
                  className="px-3 py-1.5 rounded-xl cursor-pointer"
                  style={{ background: sirenMuted ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.18)", border: `1px solid ${sirenMuted ? "rgba(52,211,153,0.4)" : "rgba(248,113,113,0.4)"}`, fontFamily: FONT, fontWeight: 800, fontSize: 11, color: sirenMuted ? "#6EE7B7" : "#FCA5A5" }}
                >
                  {sirenMuted ? "Unmute" : "Mute"}
                </button>
                <button
                  onClick={handleRestartSiren}
                  className="px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", fontFamily: FONT, fontWeight: 800, fontSize: 11, color: "rgba(255,255,255,0.85)" }}
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Restart
                </button>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(sirenVolume * 100)}
              onChange={(e) => handleVolume(Number(e.target.value) / 100)}
              className="w-full"
              style={{ accentColor: "#EF4444" }}
              aria-label="Siren volume"
            />
            <div className="flex justify-between mt-1">
              <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 10, color: "rgba(255,255,255,0.4)" }}>0%</span>
              <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 11, color: "rgba(255,255,255,0.85)" }}>{Math.round(sirenVolume * 100)}%</span>
              <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 10, color: "rgba(255,255,255,0.4)" }}>100%</span>
            </div>
          </div>

          {/* Quick actions */}
          <h2 style={{ fontFamily: FONT, fontWeight: 800, fontSize: 14, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: 1.2 }} className="mb-3">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3 mb-8">
            {quickActions.map((btn) => (
              <motion.button
                key={btn.label}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={btn.action}
                className="rounded-[20px] p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer"
                style={{ background: btn.bg, border: `1px solid ${btn.border}` }}
              >
                <btn.icon style={{ width: 22, height: 22, color: btn.color }} />
                <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 12, color: "white" }}>{btn.label}</span>
                <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 9.5, color: "rgba(255,255,255,0.5)" }}>{btn.sub}</span>
              </motion.button>
            ))}
          </div>

          {/* Mark safe */}
          <motion.button
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleMarkSafe}
            disabled={isMarkingSafe}
            className="w-full flex items-center justify-center gap-2.5 rounded-[22px] py-4 cursor-pointer"
            style={{
              background: "linear-gradient(135deg, #34D399, #10B981)",
              border: "none",
              boxShadow: "0 10px 30px rgba(16,185,129,0.35)",
              fontFamily: FONT, fontWeight: 900, fontSize: 15.5, color: "#064E3B",
            }}
          >
            <CheckCircle2 className="w-5 h-5" />
            {isMarkingSafe ? "Marking Safe…" : "I'm Safe — Mark Safe"}
          </motion.button>

          <button
            onClick={handleCancelSOS}
            className="mt-4 cursor-pointer"
            style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12.5, color: "rgba(255,255,255,0.45)", textDecoration: "underline" }}
          >
            Cancel Alert
          </button>
        </div>
      </div>
    );
  }

  // ── NORMAL MODE: warm pre-trigger view ────────────────────────────────────
  return (
    <AppLayout>
      <div style={{ minHeight: "100vh", background: "var(--sakhi-cream)", paddingBottom: "7rem" }}>
        <div className="max-w-lg mx-auto px-4 pt-4">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate("/home")} className="icon-btn w-9 h-9" style={{ color: "#8B3A2F" }}>
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 style={{ fontFamily: FONT, fontWeight: 900, fontSize: 22, color: "#3D2315" }}>Emergency SOS</h1>
                <p style={{ fontFamily: FONT, fontWeight: 500, fontSize: 13, color: "#9E7A6A" }}>Sakhi is always ready to help</p>
              </div>
            </div>
            {/* Guardian Mode Shortcut */}
            <button
              onClick={() => {
                if (window.innerWidth > 768) {
                  window.open("/guardian", "_blank");
                } else {
                  navigate("/guardian");
                }
              }}
              className="flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95"
              style={{ background: "rgba(242,149,106,0.15)", borderRadius: "99px", border: "1px solid rgba(242,149,106,0.3)" }}
              title="Open Guardian Dashboard"
            >
              <Users className="w-4 h-4 text-[#8B3A2F]" />
              <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 12, color: "#8B3A2F" }}>Guardian View</span>
            </button>
          </div>

          {/* Safe status */}
          <div className="rounded-[24px] p-4 flex items-center gap-3 mb-6" style={{ background: "var(--sakhi-green-light)", border: "1px solid rgba(61,153,112,0.2)" }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(61,153,112,0.15)" }}>
              <Shield className="w-5 h-5" style={{ color: "#3D9970" }} />
            </div>
            <div>
              <p style={{ fontFamily: FONT, fontWeight: 800, fontSize: 14, color: "#2E7D56" }}>You are safe right now</p>
              <p style={{ fontFamily: FONT, fontWeight: 500, fontSize: 12, color: "#3D9970" }}>3 Apnewale are watching over you</p>
            </div>
          </div>

          {/* SOS button */}
          <SOSButtonArea onTrigger={() => { triggerSOS(); }} />

          {/* Instructions */}
          <div className="text-center mb-8 -mt-2">
            <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 13, color: "#9E7A6A" }}>
              Tap the button to <strong style={{ color: "#D4455C" }}>immediately</strong> send an alert to your Apnewale
            </p>
          </div>

          {/* Quick actions */}
          <h2 style={{ fontFamily: FONT, fontWeight: 800, fontSize: 16, color: "#3D2315" }} className="mb-3">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { icon: Mic,    label: "Record Evidence",   color: "#FDDCCC", iconColor: "#8B3A2F",  action: () => navigate("/evidence-locker") },
              { icon: MapPin, label: "Share My Location", color: "#DEEEFF", iconColor: "#2563EB",  action: () => navigate("/location") },
              { icon: Video,  label: "Start Recording",   color: "#FEF3CD", iconColor: "#B7770D",  action: () => navigate("/evidence-locker") },
              { icon: Phone,  label: "Call Helpline 1091",color: "#FBDDE3", iconColor: "#D4455C",  action: () => { window.location.href = "tel:1091"; } },
            ].map(item => (
              <motion.button key={item.label} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                onClick={item.action}
                className="rounded-[20px] p-4 flex flex-col items-start gap-2.5 text-left cursor-pointer"
                style={{ background: item.color }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.6)" }}>
                  <item.icon className="w-5 h-5" style={{ color: item.iconColor }} />
                </div>
                <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 12, color: "#3D2315", lineHeight: 1.3 }}>{item.label}</span>
              </motion.button>
            ))}
          </div>

          {/* Emergency Activation Methods */}
          <div className="rounded-[22px] p-4 mb-4" style={{ background: "white", boxShadow: "0 4px 20px rgba(139,58,47,0.06)" }}>
            <div className="flex items-center justify-between mb-3">
              <p style={{ fontFamily: FONT, fontWeight: 800, fontSize: 13, color: "#8B3A2F" }}>Emergency Activation</p>
              <button
                onClick={() => navigate("/settings")}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full cursor-pointer"
                style={{ background: "rgba(212,69,92,0.08)", fontFamily: FONT, fontWeight: 700, fontSize: 10, color: "#D4455C" }}
              >
                <Settings className="w-3 h-3" /> Configure
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  icon: Mic,
                  label: "Voice SOS",
                  active: voiceListening,
                  supported: voiceSupported,
                  color: "#D4455C",
                  tip: voiceListening ? "Listening…" : "Speak to trigger",
                },
                {
                  icon: Vibrate,
                  label: "Shake SOS",
                  active: shakeListening,
                  supported: shakeSupported,
                  color: "#7A2B73",
                  tip: shakeListening ? "Monitoring…" : "Shake 2× to trigger",
                },
                {
                  icon: Phone,
                  label: "SOS Button",
                  active: true,
                  supported: true,
                  color: "#D4455C",
                  tip: "Tap big red button",
                },
              ].map((m) => (
                <div
                  key={m.label}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl"
                  style={{ background: m.active ? `${m.color}10` : "#FBF0E9" }}
                >
                  <div className="relative">
                    <m.icon className="w-5 h-5" style={{ color: m.active ? m.color : "#9E7A6A" }} />
                    {m.active && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full" style={{ background: m.color, animation: "dot-pulse 1s ease-in-out infinite" }} />
                    )}
                  </div>
                  <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 10, color: "#3D2315", textAlign: "center", lineHeight: 1.2 }}>{m.label}</span>
                  <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 8, color: "#9E7A6A", textAlign: "center", lineHeight: 1.2 }}>{m.tip}</span>
                </div>
              ))}
            </div>
            {(!voiceListening && !shakeListening) && (
              <p className="text-center mt-2.5" style={{ fontFamily: FONT, fontWeight: 600, fontSize: 10, color: "#9E7A6A" }}>
                Tap <strong style={{ color: "#D4455C" }}>Configure</strong> to enable voice or shake activation
              </p>
            )}
          </div>

          {/* Emergency numbers */}
          <div className="rounded-[22px] p-4" style={{ background: "white", boxShadow: "0 4px 20px rgba(139,58,47,0.06)" }}>
            <p style={{ fontFamily: FONT, fontWeight: 800, fontSize: 13, color: "#8B3A2F" }} className="mb-3">Emergency Numbers</p>
            {[{ num: "112", label: "National Emergency" }, { num: "1091", label: "Women Helpline" }, { num: "100", label: "Police" }].map(h => (
              <button key={h.num} onClick={() => { window.location.href = `tel:${h.num}`; }}
                className="w-full flex items-center justify-between py-2.5 cursor-pointer transition-all"
                style={{ borderBottom: "1px solid rgba(242,149,106,0.1)" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,69,92,0.1)" }}>
                    <Phone className="w-4 h-4" style={{ color: "#D4455C" }} />
                  </div>
                  <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 13, color: "#3D2315" }}>{h.label}</span>
                </div>
                <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: 16, color: "#D4455C" }}>{h.num}</span>
              </button>
            ))}
          </div>

        </div>
      </div>
    </AppLayout>
  );
};

export default SOSPage;
