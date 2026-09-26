import { motion } from "framer-motion";
import { Shield, CheckCircle2, Siren, MessageSquareWarning, Share2, Zap, Users2, Phone, PhoneCall } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  type SafeCheckinState,
  sendJourneyNotification,
} from "@/lib/safety";

/**
 * AI Safe Check-in bottom sheet (Safety Journey).
 *
 * Phases rendered here:
 *   checkin   — "Are you safe?" after ETA + grace period
 *   nudge     — second notice when the first check went unanswered
 *   safe      — "Glad you're safe 😊" acknowledgement (Continue / End journey)
 *   help      — quick emergency actions (user always decides — nothing fires
 *               automatically, in line with Sakhi's prevention-first design)
 *   escalated — guardians were alerted after continued silence
 *
 * Purely presentational: all actions are passed in from SafetyJourneyPage so
 * the sheet stays free of engine/journey logic.
 */
export type SafeCheckinSheetProps = {
  stage: "checkin" | "nudge" | "safe" | "help" | "escalated";
  displayName: string;
  checkin: SafeCheckinState;
  /** User position for guardian/location syncs (lat, lng). */
  position: [number, number];
  /** Whether a real guardian link exists (Supabase configured + signed in). */
  guardianConnected: boolean;
  onConfirmSafe: () => void;
  onTriggerSOS: () => void;
  onShareLocation: () => void;
  onOpenEvidenceLocker: () => void;
  onFakeCall: () => void;
  onContinueJourney: () => void;
  onEndJourney: () => void;
  onDismiss: () => void;
  onBack: () => void;
};

const SafeCheckinSheet = ({
  stage,
  displayName,
  checkin,
  position,
  guardianConnected,
  onConfirmSafe,
  onTriggerSOS,
  onShareLocation,
  onOpenEvidenceLocker,
  onFakeCall,
  onContinueJourney,
  onEndJourney,
  onDismiss,
  onBack,
}: SafeCheckinSheetProps) => {
  const notifyGuardianFromSheet = () => {
    if (guardianConnected) {
      void sendJourneyNotification({
        lat: position[0],
        lng: position[1],
        label: "User requested guardian notification from AI Safety Check",
      });
    }
    toast({ title: "Guardian Notified", description: "Your guardians have been alerted." });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-slate-950/45 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        className="w-full max-w-md bg-white rounded-[28px] shadow-2xl p-6 max-h-[86vh] overflow-y-auto"
      >
        {stage === "checkin" || stage === "nudge" ? (
          <>
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#F2956A,#D4455C)" }}
              >
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#F2956A]">
                  AI Safe Check-in
                </p>
                <h3
                  className="text-xl font-black text-[#3D2315] leading-tight"
                  style={{ fontFamily: "Nunito,sans-serif" }}
                >
                  AI Safety Check
                </h3>
              </div>
            </div>

            <p className="text-[13px] font-bold text-[#3D2315] leading-relaxed mt-3">
              Hi {displayName || "there"} 👋
            </p>
            <p className="text-[13px] font-bold text-[#9E7A6A] leading-relaxed">
              {stage === "checkin"
                ? "We noticed you haven't reached your destination yet."
                : "We haven't heard from you. Do you need assistance?"}{" "}
              Are you safe?
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={onConfirmSafe}
                className="py-3.5 rounded-2xl bg-[#3D9970] text-white text-xs font-black cursor-pointer"
                style={{ fontFamily: "Nunito,sans-serif" }}
              >
                ✅ I'm Safe
              </button>
              <button
                onClick={onTriggerSOS}
                className="py-3.5 rounded-2xl text-white text-xs font-black cursor-pointer"
                style={{ background: "linear-gradient(135deg,#E74C3C,#B8324A)", fontFamily: "Nunito,sans-serif" }}
              >
                🚨 Need Help
              </button>
            </div>

            <button
              onClick={onDismiss}
              className="w-full py-2.5 mt-2 rounded-2xl bg-[#FDF6EE] text-[#9E7A6A] text-[11px] font-black cursor-pointer"
              style={{ fontFamily: "Nunito,sans-serif" }}
            >
              Dismiss
            </button>
            <p className="text-[10px] font-bold text-[#9E7A6A]/80 text-center mt-2 leading-relaxed">
              If we don't hear from you, we'll check again — and alert your guardians if you stay
              silent. We never trigger SOS automatically.
            </p>
          </>
        ) : stage === "safe" ? (
          <>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-[#3D9970]/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-[#3D9970]" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#3D9970]">
                  AI Safe Check-in
                </p>
                <h3
                  className="text-xl font-black text-[#3D2315] leading-tight"
                  style={{ fontFamily: "Nunito,sans-serif" }}
                >
                  Glad you're safe 😊
                </h3>
              </div>
            </div>
            <p className="text-[12px] font-bold text-[#9E7A6A] mt-2 leading-relaxed">
              Your confirmation has been recorded
              {guardianConnected ? " and your guardian has been notified that you're okay" : ""}.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={onContinueJourney}
                className="py-3.5 rounded-2xl text-white text-xs font-black cursor-pointer"
                style={{ background: "linear-gradient(135deg,#F2956A,#D4455C)", fontFamily: "Nunito,sans-serif" }}
              >
                Continue Journey
              </button>
              <button
                onClick={onEndJourney}
                className="py-3.5 rounded-2xl bg-[#FDF6EE] text-[#8B3A2F] text-xs font-black cursor-pointer"
                style={{ fontFamily: "Nunito,sans-serif" }}
              >
                End Journey
              </button>
            </div>
          </>
        ) : stage === "help" ? (
          <>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-[#B8324A]/10 flex items-center justify-center">
                <Siren className="w-5 h-5 text-[#B8324A]" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#B8324A]">
                  AI Safe Check-in
                </p>
                <h3
                  className="text-xl font-black text-[#3D2315] leading-tight"
                  style={{ fontFamily: "Nunito,sans-serif" }}
                >
                  Quick emergency actions
                </h3>
              </div>
            </div>
            <p className="text-[12px] font-bold text-[#9E7A6A] mt-2 mb-4 leading-relaxed">
              You're in control — choose what happens next. Nothing is triggered automatically.
            </p>
            <div className="space-y-2">
              <button
                onClick={onTriggerSOS}
                className="w-full py-3.5 rounded-2xl text-white text-xs font-black cursor-pointer flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg,#E74C3C,#B8324A)", fontFamily: "Nunito,sans-serif" }}
              >
                <Siren className="w-4 h-4" /> 🚨 Trigger SOS
              </button>
              <button
                onClick={notifyGuardianFromSheet}
                className="w-full py-3.5 rounded-2xl bg-[#FDF6EE] text-[#8B3A2F] text-xs font-black cursor-pointer flex items-center justify-center gap-2"
                style={{ fontFamily: "Nunito,sans-serif" }}
              >
                <Users2 className="w-4 h-4" /> 👥 Notify Guardian
              </button>
              <button
                onClick={onShareLocation}
                className="w-full py-3.5 rounded-2xl bg-[#DEEEFF] text-blue-800 text-xs font-black cursor-pointer flex items-center justify-center gap-2"
                style={{ fontFamily: "Nunito,sans-serif" }}
              >
                <Share2 className="w-4 h-4" /> 📍 Share Live Location
              </button>
              <button
                onClick={() => { window.location.href = "tel:112"; }}
                className="w-full py-3.5 rounded-2xl bg-[#FFF3C7] text-[#B7770D] text-xs font-black cursor-pointer flex items-center justify-center gap-2"
                style={{ fontFamily: "Nunito,sans-serif" }}
              >
                <Phone className="w-4 h-4" /> 📞 Call Emergency Services
              </button>
              <button
                onClick={onFakeCall}
                className="w-full py-3.5 rounded-2xl bg-[#3D9970]/10 text-[#2E7D56] text-xs font-black cursor-pointer flex items-center justify-center gap-2"
                style={{ fontFamily: "Nunito,sans-serif" }}
              >
                <PhoneCall className="w-4 h-4" /> 📞 Fake Call (exit politely)
              </button>
              <button
                onClick={onOpenEvidenceLocker}
                className="w-full py-3.5 rounded-2xl bg-[#F5E4D6] text-[#3D2315] text-xs font-black cursor-pointer flex items-center justify-center gap-2"
                style={{ fontFamily: "Nunito,sans-serif" }}
              >
                <Zap className="w-4 h-4" /> 📂 Open Evidence Locker
              </button>
            </div>
            <button
              onClick={onBack}
              className="w-full py-2.5 mt-3 rounded-2xl bg-[#FDF6EE] text-[#9E7A6A] text-[11px] font-black cursor-pointer"
              style={{ fontFamily: "Nunito,sans-serif" }}
            >
              ← Back
            </button>
          </>
        ) : (
          /* escalated — guardians were alerted after continued silence */
          <>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-[#FFF3C7] flex items-center justify-center">
                <MessageSquareWarning className="w-5 h-5 text-[#B7770D]" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#B7770D]">
                  AI Safety Alert
                </p>
                <h3
                  className="text-xl font-black text-[#3D2315] leading-tight"
                  style={{ fontFamily: "Nunito,sans-serif" }}
                >
                  Your guardians have been alerted
                </h3>
              </div>
            </div>
            <p className="text-[12px] font-bold text-[#9E7A6A] mt-2 mb-4 leading-relaxed">
              We didn't hear from you after your expected arrival time, so your guardians were
              notified with your live location and journey status. You can still confirm you're
              safe.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onConfirmSafe}
                className="py-3.5 rounded-2xl bg-[#3D9970] text-white text-xs font-black cursor-pointer"
                style={{ fontFamily: "Nunito,sans-serif" }}
              >
                ✅ I'm Safe
              </button>
              <button
                onClick={onTriggerSOS}
                className="py-3.5 rounded-2xl text-white text-xs font-black cursor-pointer"
                style={{ background: "linear-gradient(135deg,#E74C3C,#B8324A)", fontFamily: "Nunito,sans-serif" }}
              >
                🚨 Need Help
              </button>
            </div>
            <p className="text-[10px] font-bold text-[#9E7A6A]/80 text-center mt-3 leading-relaxed">
              {checkin.escalatedAt
                ? `Alert sent at ${new Date(checkin.escalatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`
                : ""}
            </p>
          </>
        )}
      </motion.div>
    </motion.div>
  );
};

export default SafeCheckinSheet;
