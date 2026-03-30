import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, Mic, WifiOff, EyeOff, Phone, MapPin,
  Video, Shield, MicOff, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { useApp } from "@/context/AppContext";
import { toast } from "@/components/ui/use-toast";

const modes = [
  { id: "voice", icon: Mic, label: "Voice", desc: 'Say "Hey Sakhi, help me" or detect your emotion' },
  { id: "offline", icon: WifiOff, label: "Offline", desc: "SMS alerts when no internet" },
  { id: "silent", icon: EyeOff, label: "Silent", desc: "Discreet SOS activation" },
] as const;

type Emotion = "calm" | "neutral" | "stress" | "panic";

const emotionConfig: Record<Emotion, { label: string; color: string; bg: string; bar: string }> = {
  calm:    { label: "😌 Calm",    color: "text-safe",    bg: "bg-safe/15",    bar: "bg-safe" },
  neutral: { label: "😐 Neutral", color: "text-primary", bg: "bg-primary/15", bar: "bg-primary" },
  stress:  { label: "😰 Stress",  color: "text-warning", bg: "bg-warning/15", bar: "bg-warning" },
  panic:   { label: "😱 Panic",   color: "text-sos",     bg: "bg-sos/15",     bar: "bg-sos" },
};

/** Weighted random mock emotion: calm 35%, neutral 30%, stress 25%, panic 10% */
const detectEmotion = (): Emotion => {
  const r = Math.random();
  if (r < 0.35) return "calm";
  if (r < 0.65) return "neutral";
  if (r < 0.90) return "stress";
  return "panic";
};

const SOSPage = () => {
  const { addEvidence } = useApp();
  const [activeMode, setActiveMode] = useState<string>("voice");
  const [sosActive, setSosActive] = useState(false);

  // Emotion detection state
  const [recording, setRecording] = useState(false);
  const [detectedEmotion, setDetectedEmotion] = useState<Emotion | null>(null);
  const [panicCountdown, setPanicCountdown] = useState<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activateSOS = () => {
    setSosActive(true);
    // Store a mock SOS recording entry in the evidence locker
    addEvidence({
      type: "sos-recording",
      name: `SOS_Recording_${new Date().toLocaleTimeString().replace(/:/g, "-")}.webm`,
      fileType: "audio/webm",
      timestamp: new Date().toISOString(),
    });
  };
  const deactivateSOS = () => {
    setSosActive(false);
    // Cancel any panic countdown
    if (countdownRef.current) clearInterval(countdownRef.current);
    setPanicCountdown(null);
  };

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
        // Simulate processing delay then reveal emotion
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
                activateSOS();
              } else {
                setPanicCountdown(count);
              }
            }, 1000);

            toast({
              title: "⚠️ Panic Detected",
              description: "SOS will activate automatically in 3 seconds. Tap Cancel to abort.",
              variant: "destructive",
            });
          }
        }, 600);
      };

      recorder.start();
      setRecording(true);

      // Record for 3 seconds
      setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, 3000);
    } catch {
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to use emotion detection.",
        variant: "destructive",
      });
    }
  };

  const cancelPanic = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setPanicCountdown(null);
    setDetectedEmotion(null);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-xl font-bold">Emergency SOS</h1>
        <p className="text-sm text-muted-foreground">Choose your activation mode</p>
      </div>

      <div className="px-5 space-y-5">
        {/* Mode Selector */}
        <div className="flex gap-2">
          {modes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              className={`flex-1 rounded-xl p-3 text-center transition-all ${
                activeMode === mode.id ? "bg-primary text-primary-foreground" : "glass"
              }`}
            >
              <mode.icon className="w-5 h-5 mx-auto mb-1" />
              <p className="text-xs font-semibold">{mode.label}</p>
            </button>
          ))}
        </div>

        {/* Mode Description */}
        <div className="glass rounded-xl p-4">
          <p className="text-sm text-muted-foreground">
            {modes.find((m) => m.id === activeMode)?.desc}
          </p>
        </div>

        {/* SOS Button */}
        <div className="flex justify-center py-6">
          <AnimatePresence mode="wait">
            {!sosActive ? (
              <motion.button
                key="inactive"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                whileTap={{ scale: 0.9 }}
                onClick={activateSOS}
                className="w-44 h-44 rounded-full bg-sos text-sos-foreground flex flex-col items-center justify-center sos-pulse shadow-2xl"
              >
                <AlertTriangle className="w-10 h-10 mb-2" />
                <span className="text-lg font-bold">SOS</span>
                <span className="text-xs opacity-80">Hold to activate</span>
              </motion.button>
            ) : (
              <motion.div
                key="active"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center space-y-4"
              >
                <div className="w-44 h-44 rounded-full bg-sos/20 border-4 border-sos flex flex-col items-center justify-center mx-auto animate-pulse">
                  <Shield className="w-10 h-10 text-sos mb-1" />
                  <span className="text-sm font-bold text-sos">SOS Active</span>
                </div>
                <Button variant="outline" onClick={deactivateSOS} className="mt-4">
                  Cancel SOS
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Active SOS Info */}
        <AnimatePresence>
          {sosActive && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {[
                { Icon: Video,  color: "text-sos",     bg: "bg-sos/10",     text: "Recording audio & video..." },
                { Icon: MapPin, color: "text-primary", bg: "bg-primary/10", text: "Sharing live location with contacts" },
                { Icon: Phone,  color: "text-safe",    bg: "bg-safe/10",    text: "Alerting nearby authorities" },
              ].map(({ Icon, color, bg, text }) => (
                <div key={text} className="glass rounded-xl p-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <p className="text-sm">{text}</p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Voice Emotion Detection */}
        {activeMode === "voice" && !sosActive && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-xl p-4 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Voice Emotion Detection</h3>
                <p className="text-xs text-muted-foreground">Record 3s of voice — AI detects your emotional state</p>
              </div>
              <button
                onClick={startEmotionDetection}
                disabled={recording}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-md ${
                  recording
                    ? "bg-sos/20 border-2 border-sos animate-pulse"
                    : "bg-primary text-primary-foreground hover:opacity-90"
                }`}
              >
                {recording ? <MicOff className="w-5 h-5 text-sos" /> : <Mic className="w-5 h-5" />}
              </button>
            </div>

            {/* Waveform while recording */}
            <AnimatePresence>
              {recording && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center gap-1 h-10"
                >
                  {Array.from({ length: 16 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-1 rounded-full bg-primary"
                      animate={{ height: ["8px", `${12 + Math.random() * 20}px`, "8px"] }}
                      transition={{ duration: 0.4 + Math.random() * 0.3, repeat: Infinity, delay: i * 0.05 }}
                    />
                  ))}
                  <span className="ml-2 text-xs text-muted-foreground">Listening...</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Emotion Bars */}
            <div className="flex gap-2">
              {(["calm", "neutral", "stress", "panic"] as Emotion[]).map((emotion) => {
                const cfg = emotionConfig[emotion];
                const isDetected = detectedEmotion === emotion;
                return (
                  <motion.div
                    key={emotion}
                    animate={isDetected ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                    transition={{ duration: 0.4 }}
                    className={`flex-1 text-center py-2 rounded-lg text-xs font-semibold transition-all ${
                      isDetected ? `${cfg.bg} ${cfg.color} ring-2 ring-current` : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isDetected ? cfg.label : emotion.charAt(0).toUpperCase() + emotion.slice(1)}
                  </motion.div>
                );
              })}
            </div>

            {/* Panic countdown */}
            <AnimatePresence>
              {panicCountdown !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-sos/10 border border-sos/30 rounded-xl p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-sos animate-pulse" />
                    <p className="text-sm font-semibold text-sos">
                      SOS activating in {panicCountdown}s…
                    </p>
                  </div>
                  <button
                    onClick={cancelPanic}
                    className="text-xs bg-sos text-white px-3 py-1.5 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {detectedEmotion && !panicCountdown && (
              <p className="text-xs text-muted-foreground text-center">
                {detectedEmotion === "calm" || detectedEmotion === "neutral"
                  ? "You seem okay. Sakhi is watching over you. 💙"
                  : detectedEmotion === "stress"
                  ? "Stress detected. Take a breath — SOS is ready if needed."
                  : "SOS was triggered automatically due to detected panic."}
              </p>
            )}
          </motion.div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default SOSPage;
