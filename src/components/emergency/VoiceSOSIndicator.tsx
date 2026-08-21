import { motion, AnimatePresence } from "framer-motion";
import { Mic } from "lucide-react";
import { useEmergencyActivation } from "./EmergencyActivationProvider";

/**
 * Small floating pill that shows when Voice SOS is actively monitoring.
 * Non-intrusive, positioned at top of screen.
 */
export default function VoiceSOSIndicator() {
  const { voiceListening, testMode, voiceTranscript } = useEmergencyActivation();

  if (!voiceListening) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-2 left-1/2 -translate-x-1/2 z-[150] flex items-center gap-2 px-3 py-1.5 rounded-full"
        style={{
          background: testMode.active
            ? "linear-gradient(135deg, rgba(122,43,115,0.9), rgba(122,43,115,0.75))"
            : "linear-gradient(135deg, rgba(212,69,92,0.9), rgba(184,50,74,0.85))",
          backdropFilter: "blur(10px)",
          boxShadow: "0 4px 20px rgba(212,69,92,0.3)",
          fontFamily: "Nunito,sans-serif",
        }}
      >
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#FFF", animation: "dot-pulse 1s ease-in-out infinite" }} />
        <Mic className="w-3 h-3 text-white flex-shrink-0" />
        <span style={{ fontWeight: 700, fontSize: 11, color: "white", letterSpacing: 0.3 }}>
          {testMode.active ? "TEST MODE" : "VOICE SOS ACTIVE"}
        </span>
        {testMode.active && testMode.timestamp && (
          <span style={{ fontWeight: 600, fontSize: 9, color: "rgba(255,255,255,0.7)", marginLeft: 4 }}>
            ✓ Detected
          </span>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
