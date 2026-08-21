import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, Vibrate } from "lucide-react";
import { useEmergencyActivation } from "./EmergencyActivationProvider";

const COUNTDOWN_TOTAL = 3;

/**
 * 3-second countdown overlay after shake/voice detection.
 * Shows animated progress ring, Cancel and Trigger Now buttons.
 */
export function ShakeCountdown() {
  const { countdown, cancelCountdown, triggerNow } = useEmergencyActivation();

  if (!countdown.active) return null;

  const progress = 1 - countdown.secondsLeft / COUNTDOWN_TOTAL;
  const circumference = 2 * Math.PI * 52;
  const strokeDashoffset = circumference * (1 - progress);
  const sourceLabel = countdown.source === "shake" ? "Shake" : "Voice";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="flex flex-col items-center gap-6 p-8 rounded-[28px] mx-4"
          style={{
            background: "linear-gradient(145deg, #1a0a0f, #2d1520)",
            border: "1px solid rgba(212,69,92,0.4)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 80px rgba(212,69,92,0.15)",
            maxWidth: 320,
            width: "100%",
          }}
        >
          {/* Source badge */}
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: "rgba(212,69,92,0.15)", border: "1px solid rgba(212,69,92,0.3)" }}
          >
            {countdown.source === "shake" ? (
              <Vibrate className="w-3 h-3 text-[#D4455C]" />
            ) : (
              <AlertTriangle className="w-3 h-3 text-[#D4455C]" />
            )}
            <span className="text-[10px] font-bold text-[#FCA5A5] uppercase tracking-wider"
              style={{ fontFamily: "var(--font-sans)" }}>
              {sourceLabel} Detected
            </span>
          </motion.div>

          {/* Animated countdown ring */}
          <div className="relative flex items-center justify-center">
            {/* Outer glow */}
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute w-[130px] h-[130px] rounded-full"
              style={{ background: "radial-gradient(circle, rgba(212,69,92,0.2) 0%, transparent 70%)" }}
            />

            {/* SVG ring */}
            <svg width="120" height="120" className="transform -rotate-90">
              {/* Background ring */}
              <circle
                cx="60" cy="60" r="52"
                fill="none"
                stroke="rgba(212,69,92,0.15)"
                strokeWidth="6"
              />
              {/* Progress ring */}
              <motion.circle
                cx="60" cy="60" r="52"
                fill="none"
                stroke="#D4455C"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                animate={{ strokeDashoffset }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </svg>

            {/* Center number */}
            <div className="absolute flex flex-col items-center">
              <motion.span
                key={countdown.secondsLeft}
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-4xl font-black text-white"
                style={{ fontFamily: "var(--font-sans)", fontVariantNumeric: "tabular-nums" }}
              >
                {countdown.secondsLeft}
              </motion.span>
            </div>
          </div>

          {/* Message */}
          <p className="text-center text-[13px] font-bold text-white/70 leading-snug"
            style={{ fontFamily: "var(--font-sans)" }}>
            SOS will activate in{" "}
            <span className="text-[#D4455C]">{countdown.secondsLeft}s</span>
            {" "}unless cancelled
          </p>

          {/* Buttons */}
          <div className="flex gap-3 w-full">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              onClick={cancelCountdown}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[16px] cursor-pointer"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <X className="w-4 h-4 text-white/70" />
              <span className="text-[12px] font-bold text-white/80"
                style={{ fontFamily: "var(--font-sans)" }}>
                Cancel
              </span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              onClick={triggerNow}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[16px] cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #D4455C, #B8324A)",
                boxShadow: "0 4px 20px rgba(212,69,92,0.4)",
              }}
            >
              <AlertTriangle className="w-4 h-4 text-white" />
              <span className="text-[12px] font-bold text-white"
                style={{ fontFamily: "var(--font-sans)" }}>
                Trigger Now
              </span>
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
