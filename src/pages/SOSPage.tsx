import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { 
  Phone, MapPin, Mic, Video, Users, CheckCircle2, 
  Shield, ArrowLeft, AlertTriangle, Camera, ShieldAlert,
  Settings
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useApp } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";

// ── Hold-to-trigger SOS button ────────────────────────────────────────────────
const SOSButtonArea = ({ onTrigger }: { onTrigger: () => void }) => {
  const [isHeld, setIsHeld]             = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [progress, setProgress]         = useState(0);
  const [ripples, setRipples]           = useState<number[]>([]);
  const holdTimer       = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const progressTimer   = useRef<ReturnType<typeof setInterval> | null>(null);
  const rippleInterval  = useRef<ReturnType<typeof setInterval> | null>(null);
  const activationTimer = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const rippleId        = useRef(0);

  const startHold = useCallback(() => {
    if (isActivating) return;
    setIsHeld(true);
    setProgress(0);

    const start = Date.now();
    progressTimer.current = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.min((elapsed / 1500) * 100, 100));
    }, 30);

    rippleInterval.current = setInterval(() => {
      const id = rippleId.current++;
      setRipples(prev => [...prev, id]);
      setTimeout(() => setRipples(prev => prev.filter(r => r !== id)), 1100);
    }, 380);

    holdTimer.current = setTimeout(() => {
      setIsHeld(false);
      if (progressTimer.current)  { clearInterval(progressTimer.current);  progressTimer.current = null; }
      if (rippleInterval.current) { clearInterval(rippleInterval.current); rippleInterval.current = null; }
      setRipples([]);
      setProgress(100);
      setIsActivating(true);
      activationTimer.current = setTimeout(() => {
        setIsActivating(false);
        setProgress(0);
        onTrigger();
      }, 600);
    }, 1500);
  }, [onTrigger, isActivating]);

  const cleanup = useCallback(() => {
    if (isActivating) return;
    setIsHeld(false);
    setProgress(0);
    if (holdTimer.current)      { clearTimeout(holdTimer.current);       holdTimer.current = null; }
    if (progressTimer.current)  { clearInterval(progressTimer.current);  progressTimer.current = null; }
    if (rippleInterval.current) { clearInterval(rippleInterval.current); rippleInterval.current = null; }
    setRipples([]);
  }, [isActivating]);

  useEffect(() => () => {
    if (holdTimer.current)      clearTimeout(holdTimer.current);
    if (progressTimer.current)  clearInterval(progressTimer.current);
    if (rippleInterval.current) clearInterval(rippleInterval.current);
    if (activationTimer.current) clearTimeout(activationTimer.current);
  }, []);

  return (
    <div className="relative flex items-center justify-center select-none" style={{ height: 300 }}>
      <AnimatePresence>
        {isActivating && (
          <motion.div
            key="burst"
            initial={{ opacity: 0.8, scale: 0.2 }}
            animate={{ opacity: 0, scale: 10 }}
            exit={{}}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="fixed rounded-full pointer-events-none"
            style={{ width: 200, height: 200, top: "50%", left: "50%", marginLeft: -100, marginTop: -100, zIndex: 45, background: "#C0392B" }}
          />
        )}
      </AnimatePresence>

      <motion.div
        animate={isActivating
          ? { scale: 1.7, opacity: 0.5 }
          : isHeld
            ? { scale: 1.15, opacity: 0.35 }
            : { scale: [1, 1.06, 1], opacity: [0.14, 0.05, 0.14] }}
        transition={isActivating || isHeld ? { duration: 0.3 } : { repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
        className="absolute rounded-full pointer-events-none"
        style={{ width: 320, height: 320, background: "radial-gradient(circle, rgba(212,69,92,0.22) 0%, transparent 70%)" }}
      />

      <motion.div
        animate={isHeld ? { scale: 1.12, opacity: 0.45 } : { scale: [1, 1.04, 1], opacity: [0.22, 0.07, 0.22] }}
        transition={{ repeat: isHeld ? 0 : Infinity, duration: 3.5, ease: "easeInOut", delay: 0.3 }}
        className="absolute rounded-full pointer-events-none"
        style={{ width: 258, height: 258, background: "rgba(212,69,92,0.1)", border: "1px solid rgba(212,69,92,0.2)" }}
      />

      <AnimatePresence>
        {ripples.map(id => (
          <motion.div
            key={id}
            initial={{ scale: 0.85, opacity: 0.55 }}
            animate={{ scale: 2.2, opacity: 0 }}
            exit={{}}
            transition={{ duration: 1.05, ease: "easeOut" }}
            className="absolute rounded-full pointer-events-none"
            style={{ width: 200, height: 200, border: "2px solid rgba(212,69,92,0.4)" }}
          />
        ))}
      </AnimatePresence>

      <motion.button
        onMouseDown={startHold}
        onMouseUp={cleanup}
        onMouseLeave={cleanup}
        onTouchStart={startHold}
        onTouchEnd={cleanup}
        onTouchCancel={cleanup}
        animate={isActivating ? { scale: 1.12 } : isHeld ? { scale: 1.06 } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="relative flex items-center justify-center rounded-full select-none cursor-pointer"
        style={{
          width: 200, height: 200,
          background: isActivating
            ? "linear-gradient(135deg,#8B0000,#C0392B)"
            : isHeld
              ? "linear-gradient(135deg,#B8324A,#D4455C)"
              : "linear-gradient(135deg,#D4455C,#B8324A)",
          boxShadow: isHeld || isActivating
            ? "0 0 0 0 rgba(212,69,92,0), 0 16px 60px rgba(212,69,92,0.55)"
            : "0 8px 40px rgba(212,69,92,0.35)",
          zIndex: 10,
        }}
      >
        {isHeld && (
          <svg className="absolute inset-0" width="200" height="200" style={{ transform: "rotate(-90deg)" }}>
            <circle
              cx="100" cy="100" r="96"
              fill="none"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="5"
              strokeDasharray={`${(progress / 100) * (2 * Math.PI * 96)} ${2 * Math.PI * 96}`}
              strokeLinecap="round"
            />
          </svg>
        )}

        <div className="flex flex-col items-center gap-2 z-10">
          <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 36, color: "white", letterSpacing: 2 }}>SOS</span>
          <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 11, color: "rgba(255,255,255,0.8)" }}>
            {isActivating ? "Sending alert…" : isHeld ? "Hold…" : "Hold to send help"}
          </span>
        </div>
      </motion.button>
    </div>
  );
};

// ── Main SOS Page ─────────────────────────────────────────────────────────────
const SOSPage = () => {
  const navigate  = useNavigate();
  const { sosState, cancelSOS, resolveSOS, triggerSOS, locationState, addEvidence } = useApp();
  
  const [isMarkingSafe, setIsMarkingSafe] = useState(false);
  const [timeElapsed, setTimeElapsed]     = useState("00:00");
  
  // Recording states
  const [isRecording, setIsRecording]           = useState(false);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef   = useRef<BlobPart[]>([]);
  const streamRef        = useRef<MediaStream | null>(null);

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

  // Handle Recording start/stop
  const startRecording = async () => {
    try {
      setPermissionsError(null);
      
      // Request camera & mic
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: true
      });
      
      streamRef.current = stream;
      videoChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' });
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          videoChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(1000); // chunk every second
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

    } catch (err: any) {
      console.error("Failed to acquire permissions:", err);
      setIsRecording(false);
      setPermissionsError(
        "Camera & Microphone access is needed to secretly record evidence. Please allow permissions when prompted."
      );
    }
  };

  const stopAndSaveRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      
      // Stop all tracks to release camera/mic
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      setIsRecording(false);

      // We use a small timeout to let the last chunk process before creating the blob
      setTimeout(() => {
        if (videoChunksRef.current.length > 0) {
          const blob = new Blob(videoChunksRef.current, { type: "video/webm" });
          const url = URL.createObjectURL(blob);
          
          addEvidence({
            type: "sos-recording",
            name: `SOS_Evidence_${new Date().toISOString().replace(/[:.]/g, "-")}.webm`,
            fileUrl: url,
            fileType: "video/webm",
            timestamp: new Date().toISOString(),
            location: locationState.address || undefined
          });
        }
      }, 500);
    }
  };

  // Auto-start recording when SOS becomes active
  useEffect(() => {
    if (sosState.active) {
      startRecording();
    } else {
      stopAndSaveRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sosState.active]);

  // Clean up on unmount if leaving page during active SOS
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleMarkSafe = () => {
    setIsMarkingSafe(true);
    stopAndSaveRecording();
    setTimeout(() => {
      resolveSOS();
      setIsMarkingSafe(false);
      navigate("/home");
    }, 800);
  };

  const handleCancelSOS = () => {
    stopAndSaveRecording();
    cancelSOS();
    navigate("/home");
  };

  // ── ACTIVE SOS: dark emergency mode ───────────────────────────────────────
  if (sosState.active) {
    return (
      <div
        className="fixed inset-0 flex flex-col z-[200] overflow-y-auto"
        style={{ background: "linear-gradient(180deg,#160404 0%,#2A0707 100%)" }}
      >
        {/* Pulsing rings */}
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 0 }}>
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              animate={{ scale: [1, 2.4, 1], opacity: [0.35, 0, 0.35] }}
              transition={{ duration: 2, delay: i * 0.65, repeat: Infinity, ease: "easeOut" }}
              className="absolute rounded-full"
              style={{ width: 220, height: 220, border: `${2 - i * 0.5}px solid rgba(192,57,43,0.6)` }}
            />
          ))}
        </div>

        <div className="relative z-10 flex flex-col items-center px-5 pt-10 pb-8 max-w-lg mx-auto w-full">

          {/* Back button */}
          <div className="w-full flex items-center mb-6">
            <button onClick={handleCancelSOS} className="flex items-center gap-2 cursor-pointer" style={{ color: "rgba(255,255,255,0.6)", fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 14 }}>
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </button>
          </div>

          {/* Live indicators */}
          <div className="w-full flex flex-wrap justify-center gap-2 mb-6">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(192,57,43,0.3)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.9, repeat: Infinity }} className="w-2 h-2 rounded-full" style={{ background: "#E74C3C" }} />
              <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 11, color: "white", textTransform: "uppercase" }}>SOS Active</span>
            </div>
            
            {isRecording && (
              <>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "rgba(231,76,60,0.15)", border: "1px solid rgba(231,76,60,0.3)" }}>
                  <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                    <Camera className="w-3.5 h-3.5 text-red-400" />
                  </motion.div>
                  <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 11, color: "#FCA5A5", textTransform: "uppercase" }}>Rec Video</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "rgba(231,76,60,0.15)", border: "1px solid rgba(231,76,60,0.3)" }}>
                  <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}>
                    <Mic className="w-3.5 h-3.5 text-red-400" />
                  </motion.div>
                  <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 11, color: "#FCA5A5", textTransform: "uppercase" }}>Rec Audio</span>
                </div>
              </>
            )}

            {!locationState.error && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "rgba(46,204,113,0.15)", border: "1px solid rgba(46,204,113,0.3)" }}>
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 11, color: "#6EE7B7", textTransform: "uppercase" }}>Live Loc</span>
              </div>
            )}
          </div>

          {/* Permissions Error Block */}
          <AnimatePresence>
            {permissionsError && (
              <motion.div 
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full mb-6 overflow-hidden"
              >
                <div className="rounded-[20px] p-4 flex flex-col gap-3" style={{ background: "rgba(243,156,18,0.15)", border: "1px solid rgba(243,156,18,0.4)" }}>
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 13, color: "#FDE047", lineHeight: 1.5 }}>
                      {permissionsError}
                    </p>
                  </div>
                  <button 
                    onClick={startRecording}
                    className="self-start px-4 py-2 rounded-xl"
                    style={{ background: "rgba(243,156,18,0.3)", color: "#FEF08A", fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 12 }}
                  >
                    Grant Permissions
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* SOS indicator */}
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1.1, repeat: Infinity }}
            className="w-40 h-40 rounded-full flex flex-col items-center justify-center mb-6 animate-sos-emergency"
            style={{ background: "linear-gradient(135deg,#C0392B,#922B21)", boxShadow: "0 0 60px rgba(192,57,43,0.6)" }}
          >
            <AlertTriangle className="w-10 h-10 text-white mb-1" />
            <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 22, color: "white" }}>SOS</span>
          </motion.div>

          <h1 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 26, color: "white", textAlign: "center" }} className="mb-1">
            🚨 Alert Sent! Help is coming.
          </h1>
          <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 500, fontSize: 14, color: "rgba(255,255,255,0.7)", textAlign: "center" }} className="mb-6">
            Your Apnewale have been notified.<br />Stay calm. Sakhi is with you.
          </p>

          {/* Status cards */}
          <div className="w-full grid grid-cols-2 gap-3 mb-6">
            {[
              { label: "Time Elapsed", value: timeElapsed, emoji: "⏱️" },
              { label: "Location",     value: locationState.address || sosState.location || "Fetching…", emoji: "📍" },
              { label: "Apnewale",     value: "3 Notified",    emoji: "👥" },
              { label: "Evidence",     value: isRecording ? "Recording..." : "Standby", emoji: "📹" },
            ].map(card => (
              <div key={card.label} className="rounded-[20px] p-4" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div className="text-xl mb-1">{card.emoji}</div>
                <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1 }}>{card.label}</p>
                <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 13, color: "white" }} className="truncate">{card.value}</p>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="w-full space-y-3 mb-6">
            <button onClick={() => { window.location.href = "tel:112"; }}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-[20px] cursor-pointer transition-all"
              style={{ background: "rgba(192,57,43,0.4)", border: "1px solid rgba(192,57,43,0.5)", color: "white", fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 15 }}
            >
              <Phone className="w-5 h-5" /> Call Emergency: 112
            </button>
            <button onClick={() => navigate("/guardian")}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-[20px] cursor-pointer transition-all"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "white", fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 14 }}
            >
              <Users className="w-5 h-5" /> View Apnewale
            </button>
            <button onClick={() => navigate("/location")}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-[20px] cursor-pointer"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "white", fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 14 }}
            >
              <MapPin className="w-5 h-5" /> Live Location Map
            </button>
          </div>

          {/* Mark Safe */}
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={handleMarkSafe}
            disabled={isMarkingSafe}
            className="w-full flex items-center justify-center gap-3 py-5 rounded-[24px] cursor-pointer transition-all"
            style={{ background: "linear-gradient(135deg,#27AE60,#1E8449)", boxShadow: "0 8px 32px rgba(39,174,96,0.35)", fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 17, color: "white" }}
          >
            <CheckCircle2 className="w-6 h-6" />
            {isMarkingSafe ? "Marking safe…" : "✅ Main Theek Hoon — I'm Safe"}
          </motion.button>

          {/* Cancel */}
          <button onClick={handleCancelSOS}
            className="mt-4 cursor-pointer mb-6"
            style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 13, color: "rgba(255,255,255,0.45)", textDecoration: "underline" }}
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
                <h1 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 22, color: "#3D2315" }}>Emergency SOS</h1>
                <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 500, fontSize: 13, color: "#9E7A6A" }}>Sakhi is always ready to help</p>
              </div>
            </div>
            {/* Guardian Mode Shortcut */}
            <button
              onClick={() => navigate("/guardian")}
              className="icon-btn w-10 h-10 flex items-center justify-center text-[#8B3A2F]"
              style={{ background: "rgba(242,149,106,0.08)", borderRadius: "12px" }}
              title="Guardian Dashboard"
            >
              <Users className="w-5 h-5" />
            </button>
          </div>

          {/* Safe status */}
          <div className="rounded-[24px] p-4 flex items-center gap-3 mb-6" style={{ background: "var(--sakhi-green-light)", border: "1px solid rgba(61,153,112,0.2)" }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(61,153,112,0.15)" }}>
              <Shield className="w-5 h-5" style={{ color: "#3D9970" }} />
            </div>
            <div>
              <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 14, color: "#2E7D56" }}>You are safe right now 🌿</p>
              <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 500, fontSize: 12, color: "#3D9970" }}>3 Apnewale are watching over you</p>
            </div>
          </div>

          {/* SOS button */}
          <SOSButtonArea onTrigger={() => { triggerSOS(); }} />

          {/* Instructions */}
          <div className="text-center mb-8 -mt-4">
            <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 13, color: "#9E7A6A" }}>
              Hold the button for <strong style={{ color: "#D4455C" }}>1.5 seconds</strong> to send an alert to your Apnewale
            </p>
          </div>

          {/* Quick actions */}
          <h2 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 16, color: "#3D2315" }} className="mb-3">
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
                <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 12, color: "#3D2315", lineHeight: 1.3 }}>{item.label}</span>
              </motion.button>
            ))}
          </div>

          {/* Emergency numbers */}
          <div className="rounded-[22px] p-4" style={{ background: "white", boxShadow: "0 4px 20px rgba(139,58,47,0.06)" }}>
            <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 13, color: "#8B3A2F" }} className="mb-3">Emergency Numbers</p>
            {[{ num: "112", label: "National Emergency" }, { num: "1091", label: "Women Helpline" }, { num: "100", label: "Police" }].map(h => (
              <button key={h.num} onClick={() => { window.location.href = `tel:${h.num}`; }}
                className="w-full flex items-center justify-between py-2.5 cursor-pointer transition-all"
                style={{ borderBottom: "1px solid rgba(242,149,106,0.1)" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,69,92,0.1)" }}>
                    <Phone className="w-4 h-4" style={{ color: "#D4455C" }} />
                  </div>
                  <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 13, color: "#3D2315" }}>{h.label}</span>
                </div>
                <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 16, color: "#D4455C" }}>{h.num}</span>
              </button>
            ))}
          </div>

        </div>
      </div>
    </AppLayout>
  );
};

export default SOSPage;
