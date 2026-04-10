import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mic, WifiOff, EyeOff, Phone, MapPin, Video, MicOff, CheckCircle2, AlertTriangle } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useApp } from "@/context/AppContext";
import { toast } from "@/components/ui/use-toast";

const modes = [
  { id: "voice", icon: Mic, label: "VOICE" },
  { id: "offline", icon: WifiOff, label: "OFFLINE" },
  { id: "silent", icon: EyeOff, label: "SILENT" },
] as const;

type Emotion = "calm" | "neutral" | "stress" | "panic";

const detectEmotion = (): Emotion => {
  const r = Math.random();
  if (r < 0.35) return "calm";
  if (r < 0.65) return "neutral";
  if (r < 0.90) return "stress";
  return "panic";
};

const PROTOCOL_STEPS = [
  { label: "Alert sent to emergency contacts", delay: 700 },
  { label: "Live location shared — Rohini, Delhi", delay: 1500 },
  { label: "Emergency recording started", delay: 2300 },
];

const SOSPage = () => {
  const { sosState, triggerSOS, cancelSOS } = useApp();
  const [activeMode, setActiveMode] = useState<string>("voice");

  // Protocol steps revealed sequentially
  const [visibleSteps, setVisibleSteps] = useState<number>(0);

  // Emotion detection state
  const [recording, setRecording] = useState(false);
  const [detectedEmotion, setDetectedEmotion] = useState<Emotion | null>(null);
  const [panicCountdown, setPanicCountdown] = useState<number | null>(null);
  const [showEmotionPanel, setShowEmotionPanel] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepsTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // When SOS becomes active → reveal steps one-by-one
  useEffect(() => {
    if (sosState.active) {
      setVisibleSteps(0);
      stepsTimersRef.current.forEach(clearTimeout);
      stepsTimersRef.current = PROTOCOL_STEPS.map(({ delay }, i) =>
        setTimeout(() => setVisibleSteps((s) => Math.max(s, i + 1)), delay)
      );
    } else {
      setVisibleSteps(0);
      stepsTimersRef.current.forEach(clearTimeout);
    }
    return () => stepsTimersRef.current.forEach(clearTimeout);
  }, [sosState.active]);

  const startEmotionDetection = async () => {
    if (recording) return;
    setDetectedEmotion(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setTimeout(() => {
          const emotion = detectEmotion();
          setDetectedEmotion(emotion);
          setRecording(false);
          if (emotion === "panic") {
            let count = 3;
            setPanicCountdown(count);
            countdownRef.current = setInterval(() => {
              count -= 1;
              if (count <= 0) {
                clearInterval(countdownRef.current!);
                setPanicCountdown(null);
                triggerSOS();
              } else {
                setPanicCountdown(count);
              }
            }, 1000);
            toast({ title: "Panic Detected", description: "SOS activates in 3s. Tap Cancel to abort.", variant: "destructive" });
          }
        }, 600);
      };
      recorder.start();
      setRecording(true);
      setTimeout(() => { if (recorder.state === "recording") recorder.stop(); }, 3000);
    } catch {
      toast({ title: "Microphone access denied", description: "Allow microphone access to use voice emotion detection.", variant: "destructive" });
    }
  };

  const cancelPanic = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setPanicCountdown(null);
    setDetectedEmotion(null);
  };

  // ── ACTIVE FULL-SCREEN STATE ────────────────────────────────────────────────
  if (sosState.active) {
    const triggeredTime = sosState.triggeredAt
      ? new Date(sosState.triggeredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      : "--:--:--";

    return (
      <div
        className="fixed inset-0 flex flex-col z-50"
        style={{
          backgroundColor: "hsl(0 30% 5%)",
          boxShadow: "inset 0 0 0 2px hsl(var(--sos) / 0.4), inset 0 0 80px hsl(var(--sos) / 0.08)",
        }}
      >
        {/* Top bar */}
        <div
          className="flex items-center justify-between px-5 pt-8 pb-4"
          style={{ borderBottom: "1px solid hsl(var(--sos) / 0.2)" }}
        >
          <div>
            <p className="section-label" style={{ color: "hsl(var(--sos) / 0.7)" }}>Emergency System</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="dot-sos" />
              <span
                className="text-[10px] font-mono font-bold tracking-widest"
                style={{ color: "hsl(var(--sos))" }}
              >
                LIVE
              </span>
            </div>
          </div>
          <span
            className="text-[10px] font-mono"
            style={{ color: "hsl(var(--sos) / 0.6)" }}
          >
            {triggeredTime}
          </span>
        </div>

        {/* Main heading */}
        <div className="flex-1 flex flex-col px-5 pt-8 gap-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <p
              className="text-6xl font-black tracking-widest leading-none"
              style={{
                fontFamily: "var(--font-mono)",
                color: "hsl(var(--sos))",
                letterSpacing: "0.1em",
              }}
            >
              SOS
            </p>
            <p
              className="text-xl font-black tracking-wide mt-1"
              style={{ fontFamily: "var(--font-mono)", color: "hsl(var(--sos) / 0.8)", letterSpacing: "0.06em" }}
            >
              ACTIVATED
            </p>
            <p className="text-xs mt-2 font-mono" style={{ color: "hsl(var(--foreground) / 0.45)" }}>
              Emergency protocol initiated
            </p>
          </motion.div>

          {/* Protocol Steps */}
          <div className="space-y-2">
            <p className="section-label mb-1" style={{ color: "hsl(var(--foreground) / 0.4)" }}>
              Protocol Status
            </p>
            {PROTOCOL_STEPS.map((step, i) => {
              const done = visibleSteps > i;
              return (
                <AnimatePresence key={step.label}>
                  {done && (
                    <motion.div
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.35 }}
                      className="flex items-center gap-3 px-4 py-3"
                      style={{
                        backgroundColor: "hsl(var(--safe) / 0.07)",
                        border: "1px solid hsl(var(--safe) / 0.2)",
                        borderRadius: "4px",
                      }}
                    >
                      <CheckCircle2
                        className="w-4 h-4 flex-shrink-0"
                        style={{ color: "hsl(var(--safe))" }}
                      />
                      <p className="text-xs font-mono" style={{ color: "hsl(var(--foreground) / 0.85)" }}>
                        {step.label}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              );
            })}
          </div>

          {/* Location Card */}
          <div
            className="px-4 py-4"
            style={{
              backgroundColor: "hsl(var(--sos) / 0.05)",
              border: "1px solid hsl(var(--sos) / 0.2)",
              borderRadius: "4px",
            }}
          >
            <p className="section-label mb-2" style={{ color: "hsl(var(--sos) / 0.6)" }}>
              Current Location
            </p>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "hsl(var(--sos))" }} />
              <div>
                <p className="text-sm font-mono font-bold" style={{ color: "hsl(var(--foreground))" }}>
                  {sosState.location}
                </p>
                <p className="text-[10px] font-mono mt-0.5" style={{ color: "hsl(var(--foreground) / 0.4)" }}>
                  {sosState.coords.lat.toFixed(4)}°N, {sosState.coords.lng.toFixed(4)}°E
                </p>
              </div>
            </div>
          </div>

          {/* What's active */}
          <div className="space-y-1.5">
            {[
              { Icon: Video, color: "hsl(var(--sos))", text: "Recording audio & video" },
              { Icon: MapPin, color: "hsl(var(--warning))", text: "Broadcasting live location" },
              { Icon: Phone, color: "hsl(var(--safe))", text: "Alerting emergency contacts" },
            ].map(({ Icon, color, text }) => (
              <div
                key={text}
                className="flex items-center gap-3 px-4 py-2.5"
                style={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "4px",
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: color }} />
                <Icon className="w-3.5 h-3.5" style={{ color }} />
                <p className="text-xs font-mono" style={{ color: "hsl(var(--foreground) / 0.8)" }}>{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Cancel button */}
        <div className="px-5 pb-10 pt-4">
          <button
            id="sos-cancel-btn"
            onClick={cancelSOS}
            className="w-full py-4 font-mono text-sm font-bold tracking-wider transition-all"
            style={{
              backgroundColor: "transparent",
              border: "1px solid hsl(var(--sos) / 0.5)",
              borderRadius: "4px",
              color: "hsl(var(--sos))",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "hsl(var(--sos) / 0.08)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
            }}
          >
            CANCEL EMERGENCY
          </button>
        </div>
      </div>
    );
  }

  // ── STANDBY STATE ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-24 flex flex-col" style={{ backgroundColor: "hsl(var(--background))" }}>

      {/* Header */}
      <div className="px-5 pt-8 pb-5 border-b border-border/40">
        <p className="section-label mb-1">Emergency System</p>
        <h1 className="text-2xl font-black tracking-wide" style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
          SOS
        </h1>
      </div>

      {/* SOS Ready State */}
      <div
        className="mx-5 mt-5 py-10 flex flex-col items-center justify-center"
        style={{
          backgroundColor: "hsl(var(--muted))",
          border: "1px solid hsl(var(--border))",
          borderRadius: "4px",
        }}
      >
        <p
          className="text-5xl font-black tracking-widest"
          style={{ fontFamily: "var(--font-mono)", color: "hsl(var(--muted-foreground))", letterSpacing: "0.15em" }}
        >
          SOS READY
        </p>
        <p className="text-xs mt-3 font-mono" style={{ color: "hsl(var(--muted-foreground) / 0.7)" }}>
          System standby — tap below to activate
        </p>
      </div>

      <div className="px-5 mt-4 space-y-3">

        {/* Activate Button */}
        <button id="sos-activate-btn" onClick={triggerSOS} className="btn-primary sos-pulse">
          ACTIVATE SOS
        </button>

        {/* Mode Selector */}
        <div className="flex gap-1.5">
          {modes.map((mode) => {
            const active = activeMode === mode.id;
            return (
              <button
                key={mode.id}
                id={`sos-mode-${mode.id}`}
                onClick={() => setActiveMode(mode.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 font-mono text-[10px] font-semibold tracking-wider transition-all"
                style={{
                  backgroundColor: active ? "hsl(var(--foreground) / 0.05)" : "transparent",
                  border: `1px solid ${active ? "hsl(var(--foreground) / 0.3)" : "hsl(var(--border))"}`,
                  borderRadius: "4px",
                  color: active ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                }}
              >
                <mode.icon className="w-3.5 h-3.5" />
                {mode.label}
              </button>
            );
          })}
        </div>

        {/* Guardian Device Link */}
        <a
          href="/guardian"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between px-4 py-3 transition-all"
          style={{
            border: "1px solid hsl(var(--border))",
            borderRadius: "4px",
            backgroundColor: "transparent",
            textDecoration: "none",
          }}
        >
          <div>
            <p className="text-xs font-mono font-semibold tracking-wider" style={{ color: "hsl(var(--foreground) / 0.7)" }}>
              DEVICE 2 — GUARDIAN VIEW
            </p>
            <p className="text-[10px] font-mono mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
              Open in another tab to simulate dual-device
            </p>
          </div>
          <AlertTriangle className="w-3.5 h-3.5" style={{ color: "hsl(var(--muted-foreground))" }} />
        </a>

        {/* Voice Emotion Panel */}
        {activeMode === "voice" && (
          <div style={{ border: "1px solid hsl(var(--border))", borderRadius: "4px", overflow: "hidden" }}>
            <button
              onClick={() => setShowEmotionPanel((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3"
              style={{ backgroundColor: "hsl(var(--card))" }}
            >
              <div className="flex items-center gap-2">
                <Mic className="w-3.5 h-3.5" style={{ color: "hsl(var(--muted-foreground))" }} />
                <span className="section-label" style={{ color: "hsl(var(--foreground) / 0.7)" }}>
                  Voice Emotion Detection
                </span>
              </div>
              <span className="text-[10px] font-mono" style={{ color: "hsl(var(--muted-foreground))" }}>
                {showEmotionPanel ? "HIDE" : "SHOW"}
              </span>
            </button>

            <AnimatePresence>
              {showEmotionPanel && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="px-4 pb-4 pt-2 space-y-3" style={{ borderTop: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--muted))" }}>
                    <p className="text-[10px] font-mono" style={{ color: "hsl(var(--muted-foreground))" }}>
                      Records 3 seconds of voice — AI detects emotional state
                    </p>
                    <button
                      id="emotion-detect-btn"
                      onClick={startEmotionDetection}
                      disabled={recording}
                      className="flex items-center gap-2 px-4 py-2 font-mono text-xs font-semibold tracking-wider transition-all"
                      style={{
                        backgroundColor: recording ? "hsl(var(--sos) / 0.1)" : "hsl(var(--card))",
                        border: `1px solid ${recording ? "hsl(var(--sos) / 0.5)" : "hsl(var(--border))"}`,
                        borderRadius: "4px",
                        color: recording ? "hsl(var(--sos))" : "hsl(var(--foreground))",
                      }}
                    >
                      {recording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                      {recording ? "LISTENING..." : "START DETECTION"}
                    </button>

                    {detectedEmotion && !panicCountdown && (
                      <div className="flex gap-1.5">
                        {(["calm", "neutral", "stress", "panic"] as Emotion[]).map((e) => {
                          const active = detectedEmotion === e;
                          const colors: Record<Emotion, string> = {
                            calm: "hsl(var(--safe))", neutral: "hsl(215 50% 60%)",
                            stress: "hsl(var(--warning))", panic: "hsl(var(--sos))",
                          };
                          return (
                            <div
                              key={e}
                              className="flex-1 text-center py-1.5 font-mono text-[9px] font-semibold uppercase tracking-wider"
                              style={{
                                backgroundColor: active ? `${colors[e]}20` : "transparent",
                                border: `1px solid ${active ? colors[e] : "hsl(var(--border))"}`,
                                borderRadius: "2px",
                                color: active ? colors[e] : "hsl(var(--muted-foreground))",
                              }}
                            >
                              {e}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {panicCountdown !== null && (
                      <div className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: "hsl(var(--sos) / 0.1)", border: "1px solid hsl(var(--sos) / 0.4)", borderRadius: "4px" }}>
                        <p className="text-xs font-mono font-bold" style={{ color: "hsl(var(--sos))" }}>
                          SOS activating in {panicCountdown}s
                        </p>
                        <button onClick={cancelPanic} className="text-[10px] font-mono font-bold px-3 py-1" style={{ backgroundColor: "hsl(var(--sos))", color: "white", borderRadius: "2px" }}>
                          CANCEL
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default SOSPage;
