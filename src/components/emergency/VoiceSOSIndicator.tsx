import { motion, AnimatePresence } from "framer-motion";
import { Mic } from "lucide-react";
import { useEmergencyActivation } from "./EmergencyActivationProvider";

/**
 * Floating pill overlay shown when Voice SOS monitoring is active.
 * Displays animated audio waveform bars and the latest transcript.
 */
export function VoiceSOSIndicator() {
  const { voiceListening, voiceTranscript, voiceAudioLevel, voiceIsListening, voiceConfidence } =
    useEmergencyActivation();

  if (!voiceIsListening) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="fixed top-20 left-1/2 -translate-x-1/2 z-[150] flex items-center gap-2.5 px-4 py-2.5 rounded-full"
        style={{
          background: "linear-gradient(135deg, rgba(212,69,92,0.95), rgba(184,50,74,0.95))",
          boxShadow: "0 8px 32px rgba(212,69,92,0.4), 0 0 0 1px rgba(255,255,255,0.15) inset",
          backdropFilter: "blur(12px)",
        }}
      >
        {/* Animated mic icon */}
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="flex items-center justify-center w-7 h-7 rounded-full"
          style={{ background: "rgba(255,255,255,0.2)" }}
        >
          <Mic className="w-3.5 h-3.5 text-white" />
        </motion.div>

        {/* Audio waveform bars */}
        <div className="flex items-center gap-[2px] h-5">
          {Array.from({ length: 7 }).map((_, i) => {
            const barHeight = voiceListening
              ? 6 + Math.sin(Date.now() / 200 + i * 0.8) * (4 + voiceAudioLevel * 12)
              : 4;
            return (
              <motion.div
                key={i}
                animate={{ height: barHeight }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="w-[2px] rounded-full"
                style={{
                  background: `rgba(255,255,255,${0.5 + voiceAudioLevel * 0.5})`,
                  minHeight: 3,
                }}
              />
            );
          })}
        </div>

        {/* Status text */}
        <div className="flex flex-col">
          <span
            className="text-[10px] font-bold text-white/90 leading-tight"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            {voiceListening ? "Listening…" : "Starting…"}
          </span>
          {voiceTranscript && voiceListening && (
            <motion.span
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="text-[9px] text-white/60 leading-tight max-w-[140px] truncate"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              "{voiceTranscript}"
            </motion.span>
          )}
        </div>

        {/* Confidence badge when detection fires */}
        {voiceConfidence > 0 && voiceListening && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="px-1.5 py-0.5 rounded-full text-[8px] font-bold text-white"
            style={{ background: "rgba(52,211,153,0.8)" }}
          >
            {Math.round(voiceConfidence * 100)}%
          </motion.div>
        )}

        {/* Pulsing dot */}
        <motion.span
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: "#6EE7B7" }}
        />
      </motion.div>
    </AnimatePresence>
  );
}
