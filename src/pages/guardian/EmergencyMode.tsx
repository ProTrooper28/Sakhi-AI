import {
  MapPin,
  PhoneCall,
  CheckCircle2,
  BatteryMedium,
  Wifi,
  Clock,
  MessageCircle,
  ExternalLink,
  Siren,
  HeartPulse,
  Satellite,
} from "lucide-react";
import { motion } from "framer-motion";
import { formatElapsed, humanElapsed, initialsOf } from "./helpers";
import { EmergencyMap } from "./maps";

/**
 * Emergency SOS mode — shown ONLY while a linked user's SOS event is active
 * (status = "active" in safety_events via Realtime). Dark deep-red/black
 * theme, pulsing cards, large timer, live tracking map, immediate-response
 * buttons, and a single Mark Safe action that resolves the event (the parent
 * page then animates back to the calm dashboard automatically).
 */
export const EmergencyMode = ({
  userName,
  locationLabel,
  elapsedSecs,
  userLoc,
  onMarkSafe,
}: {
  userName: string;
  locationLabel: string | null;
  elapsedSecs: number;
  userLoc: { lat: number; lng: number; battery: number | null; updatedAgo: number | null } | null;
  onMarkSafe: () => void;
}) => {
  const internetOk = userLoc?.updatedAgo != null && userLoc.updatedAgo < 180;
  const gpsOk = userLoc?.updatedAgo != null && userLoc.updatedAgo < 300;

  const statusChips = [
    { label: "Live Location", value: locationLabel || "Fetching address…", icon: MapPin, ok: true },
    {
      label: "Battery",
      value: userLoc?.battery != null ? `${Math.round(userLoc.battery)}%` : "—",
      icon: BatteryMedium,
      ok: userLoc?.battery == null || userLoc.battery >= 20,
    },
    { label: "Internet Status", value: internetOk ? "Connected" : "Offline", icon: Wifi, ok: internetOk },
    { label: "GPS Status", value: gpsOk ? "GPS Active" : "Acquiring…", icon: Satellite, ok: gpsOk },
    { label: "Time Since SOS", value: humanElapsed(elapsedSecs), icon: Clock, ok: true },
  ];

  const primaryActions = [
    {
      label: "Navigate",
      sub: "Google Maps",
      icon: ExternalLink,
      color: "#F87171",
      bg: "rgba(248,113,113,0.14)",
      border: "rgba(248,113,113,0.35)",
      action: () => {
        const lat = userLoc?.lat ?? 19.0596;
        const lng = userLoc?.lng ?? 72.8295;
        window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
      },
    },
    {
      label: "Call User",
      sub: "Direct call",
      icon: PhoneCall,
      color: "#34D399",
      bg: "rgba(52,211,153,0.14)",
      border: "rgba(52,211,153,0.35)",
      action: () => { window.location.href = "tel:112"; },
    },
    {
      label: "Message User",
      sub: "Alert SMS",
      icon: MessageCircle,
      color: "#C084FC",
      bg: "rgba(167,139,250,0.14)",
      border: "rgba(167,139,250,0.35)",
      action: () => { window.location.href = `sms:112?body=${encodeURIComponent(`Sakhi SOS: ${userName} needs help at ${locationLabel ?? "their current location"}`)}`; },
    },
  ];

  const emergencyCalls = [
    {
      label: "Police (112)",
      icon: Siren,
      color: "#F87171",
      bg: "rgba(248,113,113,0.12)",
      border: "rgba(248,113,113,0.3)",
      action: () => { window.location.href = "tel:112"; },
    },
    {
      label: "Ambulance (108)",
      icon: HeartPulse,
      color: "#FBBF24",
      bg: "rgba(251,146,60,0.12)",
      border: "rgba(251,146,60,0.3)",
      action: () => { window.location.href = "tel:108"; },
    },
  ];

  return (
    <div className="space-y-4">
      {/* ── Active SOS banner ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="guardian-sos-card rounded-[26px] p-5 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, rgba(220,38,38,0.22), rgba(127,29,29,0.35))", border: "1px solid rgba(248,113,113,0.4)" }}
      >
        <div className="absolute top-0 left-0 w-1 h-full" style={{ background: "#EF4444" }} />
        <div className="flex items-center gap-3 mb-3">
          {/* User avatar with pulsing emergency ring */}
          <div className="relative flex-shrink-0">
            <motion.div
              animate={{ opacity: [1, 0.2, 1], scale: [1, 1.25, 1] }}
              transition={{ duration: 1.1, repeat: Infinity }}
              className="absolute inset-0 rounded-full"
              style={{ background: "rgba(239,68,68,0.35)", border: "2px solid rgba(239,68,68,0.6)" }}
            />
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center relative"
              style={{ background: "linear-gradient(135deg, #991B1B, #DC2626)", border: "1px solid rgba(254,202,202,0.5)", boxShadow: "0 0 24px rgba(239,68,68,0.5)" }}
            >
              <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 15, color: "white" }}>
                {initialsOf(userName)}
              </span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 19, color: "white", letterSpacing: "0.01em" }}>
              ACTIVE EMERGENCY
            </p>
            <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 1 }}>
              <span style={{ color: "white", fontWeight: 800 }}>{userName}</span>
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 9.5, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: 1 }}>
              Elapsed
            </p>
            <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 30, color: "white", lineHeight: 1, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
              {formatElapsed(elapsedSecs)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: "rgba(248,113,113,0.18)", border: "1px solid rgba(248,113,113,0.45)" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#F87171", animation: "dot-pulse 0.7s ease-in-out infinite" }} />
            <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 10, color: "#FCA5A5", textTransform: "uppercase" }}>SOS ACTIVE</span>
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: "rgba(52,211,153,0.16)", border: "1px solid rgba(52,211,153,0.35)" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#34D399" }} />
            <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 10, color: "#6EE7B7", textTransform: "uppercase" }}>Live Tracking</span>
          </span>
        </div>
      </motion.div>

      {/* ── Status grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {statusChips.map((chip, i) => (
          <motion.div
            key={chip.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.04, duration: 0.35 }}
            className="rounded-[20px] p-3.5"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <chip.icon style={{ width: 14, height: 14, color: chip.ok ? "#6EE7B7" : "#FBBF24" }} />
              <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 9.5, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: 0.6 }}>
                {chip.label}
              </p>
            </div>
            <p className="truncate" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 12.5, color: "white" }}>
              {chip.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* ── Large live map ── */}
      <motion.div
        id="sos-live-map"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-[26px] overflow-hidden relative"
        style={{ height: 340, border: "1px solid rgba(248,113,113,0.3)", boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}
      >
        <EmergencyMap userLoc={userLoc ? { lat: userLoc.lat, lng: userLoc.lng } : null} />
        <div className="absolute top-3 right-3 z-[400] flex flex-col gap-2">
          <div className="rounded-xl px-3 py-2 flex items-center gap-2" style={{ background: "rgba(10,1,1,0.8)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#34D399", animation: "dot-pulse 1s ease-in-out infinite" }} />
            <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 10.5, color: "white" }}>LIVE</span>
          </div>
        </div>
      </motion.div>

      {/* ── Response actions ── */}
      <div>
        <h3 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 13.5, color: "rgba(255,255,255,0.65)", marginBottom: 10 }}>
          Immediate Response
        </h3>
        <div className="grid grid-cols-3 gap-3 mb-3">
          {primaryActions.map((btn) => (
            <motion.button
              key={btn.label}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              onClick={btn.action}
              className="rounded-[20px] p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer"
              style={{ background: btn.bg, border: `1px solid ${btn.border}` }}
            >
              <btn.icon style={{ width: 22, height: 22, color: btn.color }} />
              <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 12, color: btn.color }}>{btn.label}</span>
              <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 9.5, color: "rgba(255,255,255,0.5)" }}>{btn.sub}</span>
            </motion.button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {emergencyCalls.map((btn) => (
            <motion.button
              key={btn.label}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={btn.action}
              className="rounded-[18px] p-3.5 flex items-center justify-center gap-2 cursor-pointer"
              style={{ background: btn.bg, border: `1px solid ${btn.border}` }}
            >
              <btn.icon style={{ width: 17, height: 17, color: btn.color }} />
              <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 12, color: btn.color }}>{btn.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── Mark safe ── */}
      <motion.button
        whileHover={{ scale: 1.015 }}
        whileTap={{ scale: 0.97 }}
        onClick={onMarkSafe}
        className="w-full flex items-center justify-center gap-2.5 rounded-[22px] py-4 cursor-pointer"
        style={{
          background: "linear-gradient(135deg, #34D399, #10B981)",
          border: "none",
          boxShadow: "0 10px 30px rgba(16,185,129,0.35)",
          fontFamily: "Nunito,sans-serif",
          fontWeight: 900,
          fontSize: 15.5,
          color: "#064E3B",
        }}
      >
        <CheckCircle2 style={{ width: 20, height: 20 }} /> Mark Safe — Resolve SOS
      </motion.button>
    </div>
  );
};
