import { motion, AnimatePresence } from "framer-motion";
import { X, Zap } from "lucide-react";
import { useEmergencyActivation } from "./EmergencyActivationProvider";

/**
 * Discreet 3-second countdown displayed after shake (or voice) detection
 * and before the actual SOS fires. Gives the user a chance to cancel
 * accidental triggers or fire immediately.
 */
export default function ShakeCountdown() {
  const { countdown, cancelCountdown, triggerNow } = useEmergencyActivation();

  if (!countdown.active) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[180] flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="rounded-[28px] p-8 mx-4 max-w-sm w-full text-center"
          style={{
            background: "linear-gradient(135deg, rgba(40,20,15,0.95), rgba(60,30,25,0.95))",
            border: "1px solid rgba(212,69,92,0.4)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(212,69,92,0.2)",
            fontFamily: "Nunito,sans-serif",
          }}
        >
          {/* Source label */}
          <p style={{ fontWeight: 700, fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>
            {countdown.source === "shake" ? "Shake Detected" : "Voice Phrase Detected"}
          </p>

          {/* Countdown number */}
          <motion.div
            key={countdown.secondsLeft}
            initial={{ scale: 1.3, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            <span
              style={{
                fontWeight: 900,
                fontSize: 72,
                color: "#D4455C",
                lineHeight: 1,
                textShadow: "0 0 30px rgba(212,69,92,0.5)",
              }}
            >
              {countdown.secondsLeft}
            </span>
          </motion.div>

          <p style={{ fontWeight: 700, fontSize: 14, color: "rgba(255,255,255,0.85)", marginTop: 8, marginBottom: 28 }}>
            SOS will activate...
          </p>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={cancelCountdown}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                fontFamily: "Nunito,sans-serif",
                fontWeight: 800,
                fontSize: 13,
                color: "rgba(255,255,255,0.85)",
              }}
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={triggerNow}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #D4455C, #B8324A)",
                border: "none",
                boxShadow: "0 8px 30px rgba(212,69,92,0.4)",
                fontFamily: "Nunito,sans-serif",
                fontWeight: 800,
                fontSize: 13,
                color: "white",
              }}
            >
              <Zap className="w-4 h-4" />
              Trigger Now
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
