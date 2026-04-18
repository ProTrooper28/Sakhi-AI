import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mic, WifiOff, EyeOff, Phone, MapPin, Video, MicOff, CheckCircle2, AlertTriangle, Radio } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useApp } from "@/context/AppContext";
import { toast } from "@/components/ui/use-toast";

const modes = [
  { id: "voice", icon: Mic, label: "VOICE" },
  { id: "offline", icon: WifiOff, label: "OFFLINE" },
  { id: "silent", icon: EyeOff, label: "SILENT" },
] as const;

const PROTOCOL_STEPS = [
  { label: "Alert sent to emergency contacts", delay: 700 },
  { label: "Live location shared — Rohini, Delhi", delay: 1500 },
  { label: "Emergency recording active", delay: 2300 },
];

const EMERGENCY_KEYWORDS = ["help", "bachao", "save me", "danger"];

// Safe access to SpeechRecognition
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const SOSPage = () => {
  const { sosState, triggerSOS, cancelSOS, addEvidence } = useApp();
  const [activeMode, setActiveMode] = useState<string>("voice");

  // Protocol steps revealed sequentially
  const [visibleSteps, setVisibleSteps] = useState<number>(0);

  // Native MediaRecorder State
  const [isMediaRecording, setIsMediaRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);

  // Speech Detection State
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [showVoicePanel, setShowVoicePanel] = useState(false);
  const [keywordDetected, setKeywordDetected] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const stepsTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Format MM:SS
  const formatDuration = (secs: number) => {
     const m = Math.floor(secs / 60);
     const s = secs % 60;
     return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // ── Native Media Capture Logic ──
  const stopNativeRecording = () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      
      setIsMediaRecording(false);
      setRecordingDuration(0);
  };

  useEffect(() => {
     if (sosState.active) {
         // Start Native Evidence Recording
         const startRecording = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                mediaStreamRef.current = stream;
                
                const recorder = new MediaRecorder(stream);
                mediaChunksRef.current = [];
                
                recorder.ondataavailable = (e) => {
                    if (e.data.size > 0) mediaChunksRef.current.push(e.data);
                };

                recorder.onstop = () => {
                    if (mediaChunksRef.current.length > 0) {
                        const blob = new Blob(mediaChunksRef.current, { type: "video/webm" });
                        const url = URL.createObjectURL(blob);
                        
                        // Push genuine blob URL to the Evidence Locker
                        addEvidence({
                            type: "sos-recording",
                            name: `SOS_Evidence_${new Date().toLocaleTimeString().replace(/:/g, "-")}.webm`,
                            fileType: "video/webm",
                            fileUrl: url,
                            timestamp: new Date().toISOString(),
                            location: sosState.location,
                        });
                    }
                };

                mediaRecorderRef.current = recorder;
                recorder.start();
                setIsMediaRecording(true);
                
                durationTimerRef.current = setInterval(() => {
                    setRecordingDuration(d => d + 1);
                }, 1000);

            } catch (err) {
                console.error("Media permission denied or not available", err);
                toast({ title: "Hardware Access Required", description: "Camera/Mic access is required to capture evidence.", variant: "destructive" });
            }
         };
         
         startRecording();
     } else {
         // Stop Native Recording and spawn chunk to Evidence Locker
         stopNativeRecording();
     }
     
     return stopNativeRecording;
  }, [sosState.active, addEvidence, sosState.location]);

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
      setKeywordDetected(null);
    }
    return () => stepsTimersRef.current.forEach(clearTimeout);
  }, [sosState.active]);

  // Clean up speech recognition on unmount
  useEffect(() => {
     return () => {
         if (recognitionRef.current) {
             recognitionRef.current.stop();
         }
     }
  }, []);

  const startVoiceDetection = () => {
    if (listening) return;
    setTranscript("");
    setKeywordDetected(null);

    if (!SpeechRecognition) {
       toast({ title: "Unsupported Browser", description: "Your browser does not support native speech recognition. Please use Google Chrome or Edge.", variant: "destructive" });
       return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN"; // English-India for better mix of Hindi words

    recognition.onstart = () => {
       setListening(true);
    };

    recognition.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
        }
        
        setTranscript(currentTranscript);
        
        const textToLower = currentTranscript.toLowerCase();
        
        // Scan for keywords
        const found = EMERGENCY_KEYWORDS.find(kw => textToLower.includes(kw));
        
        if (found && !sosState.active) {
            setKeywordDetected(found);
            recognition.stop();
            
            // Auto trigger SOS shortly after keyword detection
            setTimeout(() => {
                triggerSOS();
                setListening(false);
            }, 1000);
        }
    };

    recognition.onerror = (event: any) => {
       console.error("Speech Recognition Error", event.error);
       setListening(false);
       if (event.error !== "no-speech") {
          toast({ title: "Microphone Error", description: "Failed to access microphone. Please ensure permissions are granted.", variant: "destructive" });
       }
    };

    recognition.onend = () => {
       setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoiceDetection = () => {
     if (recognitionRef.current) {
         recognitionRef.current.stop();
     }
     setListening(false);
  }

  // ── ACTIVE FULL-SCREEN STATE ────────────────────────────────────────────────
  if (sosState.active) {
    const triggeredTime = sosState.triggeredAt
      ? new Date(sosState.triggeredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      : "--:--:--";

    return (
      <div
        className="fixed inset-0 flex flex-col z-50 overflow-y-auto"
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
                fontFamily: "var(--font-heading)",
                color: "hsl(var(--sos))",
                letterSpacing: "0.05em",
              }}
            >
              SOS
            </p>
            <p
              className="text-xl font-bold tracking-wide mt-2"
              style={{ fontFamily: "var(--font-heading)", color: "hsl(var(--sos) / 0.9)" }}
            >
              Alert Sent
            </p>
            <p className="text-sm mt-2 font-medium" style={{ color: "hsl(var(--foreground) / 0.6)" }}>
              Emergency protocol is actively managing your safety.
            </p>
          </motion.div>

          {/* Protocol Steps */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: "hsl(var(--foreground) / 0.5)" }}>
              Processing
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
                      <p className="text-xs font-semibold" style={{ color: "hsl(var(--foreground) / 0.85)" }}>
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
                <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                  {sosState.location}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "hsl(var(--foreground) / 0.4)" }}>
                  {sosState.coords.lat.toFixed(4)}°N, {sosState.coords.lng.toFixed(4)}°E
                </p>
              </div>
            </div>
          </div>

          {/* What's active */}
          <div className="space-y-1.5">
             <div
                className="flex items-center justify-between px-4 py-2.5"
                style={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--sos) / 0.5)",
                  borderRadius: "4px",
                }}
              >
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "hsl(var(--sos))" }} />
                    <Video className="w-3.5 h-3.5 text-sos" />
                    <p className="text-xs font-medium" style={{ color: "hsl(var(--foreground) / 0.8)" }}>Recording audio & video</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-sos">{formatDuration(recordingDuration)}</span>
              </div>
            {[
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
                <p className="text-xs font-medium" style={{ color: "hsl(var(--foreground) / 0.8)" }}>{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Cancel button */}
        <div className="px-5 pb-10 pt-4">
          <button
            id="sos-cancel-btn"
            onClick={cancelSOS}
            className="w-full py-4 text-sm font-bold tracking-wider transition-all uppercase flex flex-col gap-1 items-center justify-center relative overflow-hidden group"
            style={{
              backgroundColor: "hsl(var(--sos) / 0.1)",
              border: "1px solid hsl(var(--sos) / 0.5)",
              borderRadius: "4px",
              color: "hsl(var(--sos))",
            }}
          >
            <span>Cancel Emergency</span>
            <span className="text-[9px] font-mono opacity-60">Will save recording to storage</span>
          </button>
        </div>
      </div>
    );
  }

  // ── STANDBY STATE ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-24 flex flex-col" style={{ backgroundColor: "hsl(var(--background))" }}>

      {/* Header */}
      <div className="px-5 pt-8 pb-5 border-b border-border/40 bg-gradient-to-b from-background to-muted/20">
        <p className="section-label mb-1 normal-case tracking-normal font-semibold text-muted-foreground">Emergency System</p>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
          Sakhi is monitoring.
        </h1>
      </div>

      {/* SOS Ready State */}
      <div
        className="mx-5 mt-5 py-12 flex flex-col items-center justify-center transition-all bg-card/50 border border-border/50 rounded-2xl shadow-sm"
      >
        <p
          className="text-5xl font-black tracking-widest"
          style={{ fontFamily: "var(--font-heading)", color: "hsl(var(--foreground))", letterSpacing: "0.05em" }}
        >
          SOS
        </p>
        <p className="text-sm mt-3 font-medium px-8 text-center" style={{ color: "hsl(var(--muted-foreground))" }}>
          Tap the red button below if you ever feel unsafe.
        </p>
      </div>

      <div className="px-5 mt-6 space-y-4">

        {/* Activate Button */}
        <button id="sos-activate-btn" onClick={triggerSOS} className="w-full py-[1.125rem] bg-sos text-white font-bold text-[17px] tracking-wide rounded-2xl shadow-lg transition-transform active:scale-95 flex justify-center items-center gap-3 relative overflow-hidden">
             {/* Pulse effect wrapper */}
             <div className="absolute inset-0 bg-white/20 sos-pulse mix-blend-overlay pointer-events-none" />
             Send Emergency Alert
        </button>

        {/* Mode Selector */}
        <div className="flex gap-2">
          {modes.map((mode) => {
            const active = activeMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setActiveMode(mode.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 text-[11px] font-semibold tracking-wider transition-all border border-border rounded-lg bg-card"
                style={{
                  backgroundColor: active ? "hsl(var(--foreground) / 0.05)" : "transparent",
                  borderColor: active ? "hsl(var(--foreground) / 0.3)" : "hsl(var(--border))",
                  color: active ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                }}
              >
                <mode.icon className="w-4 h-4" />
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
          className="flex items-center gap-3 px-4 py-3 border border-border rounded-lg"
        >
          <div className="p-2 rounded-full bg-muted">
             <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold" style={{ color: "hsl(var(--foreground) / 0.9)" }}>
              DEVICE 2 — GUARDIAN
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
              Open in another window to test dual-device connection.
            </p>
          </div>
        </a>

        {/* Voice Keyword Panel */}
        {activeMode === "voice" && (
          <div className="border border-border rounded-lg overflow-hidden bg-card transition-all">
            <button
              onClick={() => setShowVoicePanel((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-sm text-foreground/80">
                  Keyword Detection
                </span>
              </div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                {showVoicePanel ? "HIDE" : "SHOW"}
              </span>
            </button>

            <AnimatePresence>
              {showVoicePanel && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="px-4 pb-4 pt-2 space-y-4 border-t border-border bg-muted/30">
                    <p className="text-xs text-muted-foreground font-medium">
                      Actively listens for emergency phrases to automatically trigger SOS. Try saying <b>"Help"</b>, <b>"Danger"</b>, or <b>"Bachao"</b>.
                    </p>
                    
                    <button
                      onClick={listening ? stopVoiceDetection : startVoiceDetection}
                      className="flex w-full items-center justify-center gap-2 px-4 py-3 text-xs font-bold transition-all rounded-lg"
                      style={{
                        backgroundColor: listening ? "hsl(var(--sos) / 0.1)" : "hsl(var(--primary))",
                        color: listening ? "hsl(var(--sos))" : "white",
                        border: listening ? "1px solid hsl(var(--sos) / 0.3)" : "none"
                      }}
                    >
                      {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      {listening ? "STOP DETECTION" : "START DETECTING"}
                    </button>

                    {listening && (
                        <div className="px-3 py-3 rounded bg-black/40 border border-border min-h-[60px] flex flex-col justify-end">
                            {keywordDetected ? (
                                <motion.p 
                                    initial={{ scale: 0.9, opacity: 0 }} 
                                    animate={{ scale: 1, opacity: 1 }} 
                                    className="text-center font-bold text-sos tracking-wider text-sm p-1 rounded"
                                >
                                    "{keywordDetected}" DETECTED — TRIGGERING SOS
                                </motion.p>
                             ) : (
                                <p className="text-xs text-safe italic text-center w-full flex items-center justify-center gap-2">
                                     <span className="w-2 h-2 rounded-full bg-safe animate-pulse" />
                                     Listening... {transcript ? `"${transcript}"` : ""}
                                </p>
                             )}
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
