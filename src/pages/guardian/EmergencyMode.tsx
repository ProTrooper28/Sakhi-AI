import {
  MapPin,
  PhoneCall,
  CheckCircle2,
  BatteryMedium,
  Wifi,
  Clock,
  ExternalLink,
  Siren,
  HeartPulse,
  Satellite,
  Shield,
  Navigation,
  Phone,
  FileText,
  UserCircle2,
} from "lucide-react";
import { motion } from "framer-motion";
import { formatElapsed, humanElapsed, initialsOf, timeAgo } from "./helpers";
import { EmergencyMap } from "./maps";

/**
 * Emergency SOS mode — shown ONLY while a linked user's SOS event is active.
 * Compact layout: card → map → location details → quick actions → system status.
 * Single SOS indicator (no duplicates). Dark deep-red/black theme.
 */
export const EmergencyMode = ({
  userName,
  locationLabel,
  elapsedSecs,
  triggeredAt,
  userLoc,
  onMarkSafe,
}: {
  userName: string;
  locationLabel: string | null;
  elapsedSecs: number;
  triggeredAt?: string;
  userLoc: { lat: number; lng: number; battery: number | null; updatedAgo: number | null } | null;
  onMarkSafe: () => void;
}) => {
  const internetOk = userLoc?.updatedAgo != null && userLoc.updatedAgo < 180;
  const gpsOk = userLoc?.updatedAgo != null && userLoc.updatedAgo < 300;

  const triggeredTimeStr = triggeredAt
    ? new Date(triggeredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "—";

  const lastUpdateStr = userLoc?.updatedAgo != null
    ? userLoc.updatedAgo < 5 ? "Just now" : humanElapsed(Math.floor(userLoc.updatedAgo)) + " ago"
    : "Unknown";

  // ── Primary location/address card data ──
  const locationInfo = [
    {
      label: "Current Address",
      value: locationLabel || "Fetching address…",
      icon: MapPin,
      color: "#FCA5A5",
      prominent: true,
    },
    {
      label: "Triggered At",
      value: triggeredTimeStr,
      icon: Clock,
      color: "#FBBF24",
      prominent: false,
    },
    {
      label: "Elapsed",
      value: humanElapsed(elapsedSecs),
      icon: Clock,
      color: "#F87171",
      prominent: false,
    },
    {
      label: "Last Update",
      value: lastUpdateStr,
      icon: Satellite,
      color: "#6EE7B7",
      prominent: false,
    },
  ];

  // ── System status (compact, bottom) ──
  const systemStatus = [
    { label: "Battery", value: userLoc?.battery != null ? `${Math.round(userLoc.battery)}%` : "—", icon: BatteryMedium, ok: userLoc?.battery == null || userLoc.battery >= 20 },
    { label: "Internet", value: internetOk ? "Online" : "Offline", icon: Wifi, ok: internetOk },
    { label: "GPS", value: gpsOk ? "Active" : "Acquiring", icon: Satellite, ok: gpsOk },
  ];

  // ── Quick actions ──
  const quickActions = [
    {
      label: "Call User",
      sub: "Direct call",
      icon: Phone,
      color: "#34D399",
      bg: "rgba(52,211,153,0.14)",
      border: "rgba(52,211,153,0.35)",
      action: () => { window.location.href = "tel:112"; },
    },
    {
      label: "Call Emergency",
      sub: "Police · Ambulance",
      icon: Siren,
      color: "#F87171",
      bg: "rgba(248,113,113,0.14)",
      border: "rgba(248,113,113,0.35)",
      action: () => { window.location.href = "tel:112"; },
    },
    {
      label: "Navigate",
      sub: "Google Maps",
      icon: Navigation,
      color: "#C084FC",
      bg: "rgba(167,139,250,0.14)",
      border: "rgba(167,139,250,0.35)",
      action: () => {
        const lat = userLoc?.lat ?? 19.0596;
        const lng = userLoc?.lng ?? 72.8295;
        window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
      },
    },
    {
      label: "Evidence Locker",
      sub: "Photos & recordings",
      icon: FileText,
      color: "#FBBF24",
      bg: "rgba(251,191,36,0.14)",
      border: "rgba(251,191,36,0.35)",
      action: () => { window.location.href = "/guardian/evidence-locker"; },
    },
  ];

  return (
    <div className="space-y-3">
      {/* ── 1. Compact emergency card (reduced height) ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-[22px] p-4 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, rgba(220,38,38,0.18), rgba(127,29,29,0.3))", border: "1px solid rgba(248,113,113,0.35)" }}
      >
        <div className="absolute top-0 left-0 w-1 h-full" style={{ background: "#EF4444" }} />
        <div className="flex items-center gap-3">
          {/* User avatar with pulsing ring */}
          <div className="relative flex-shrink-0">
            <motion.div
              animate={{ opacity: [1, 0.2, 1], scale: [1, 1.25, 1] }}
              transition={{ duration: 1.1, repeat: Infinity }}
              className="absolute inset-0 rounded-full"
              style={{ background: "rgba(239,68,68,0.35)", border: "2px solid rgba(239,68,68,0.6)" }}
            />
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center relative"
              style={{ background: "linear-gradient(135deg, #991B1B, #DC2626)", border: "1px solid rgba(254,202,202,0.5)", boxShadow: "0 0 20px rgba(239,68,68,0.45)" }}
            >
              <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 14, color: "white" }}>
                {initialsOf(userName)}
              </span>
            </div>
          </div>

          {/* User info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ background: "rgba(248,113,113,0.18)", border: "1px solid rgba(248,113,113,0.4)" }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#F87171", animation: "dot-pulse 0.7s ease-in-out infinite" }} />
                <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 9, color: "#FCA5A5", textTransform: "uppercase" }}>SOS Active</span>
              </span>
            </div>
            <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 16, color: "white", marginTop: 3, lineHeight: 1.2 }}>
              {userName}
            </p>
            {locationLabel && (
              <p className="flex items-center gap-1 mt-0.5" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 11, color: "rgba(255,255,255,0.6)" }}>
                <MapPin style={{ width: 11, height: 11, color: "#FCA5A5", flexShrink: 0 }} />
                <span className="truncate">{locationLabel}</span>
              </p>
            )}
          </div>

          {/* Elapsed timer */}
          <div className="text-right flex-shrink-0">
            <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 9, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: 0.8 }}>
              Elapsed
            </p>
            <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 26, color: "white", lineHeight: 1, marginTop: 1, fontVariantNumeric: "tabular-nums" }}>
              {formatElapsed(elapsedSecs)}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── 2. Live map (moved higher — immediately visible) ── */}
      <motion.div
        id="sos-live-map"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-[22px] overflow-hidden relative"
        style={{ height: 300, border: "1px solid rgba(248,113,113,0.3)", boxShadow: "0 10px 35px rgba(0,0,0,0.45)" }}
      >
        <EmergencyMap userLoc={userLoc ? { lat: userLoc.lat, lng: userLoc.lng } : null} />
        <div className="absolute top-3 right-3 z-[400] flex flex-col gap-2">
          <div className="rounded-xl px-3 py-1.5 flex items-center gap-2" style={{ background: "rgba(10,1,1,0.8)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#34D399", animation: "dot-pulse 1s ease-in-out infinite" }} />
            <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 10, color: "white" }}>LIVE</span>
          </div>
        </div>
      </motion.div>

      {/* ── 3. Location & time details (prominent) ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="rounded-[20px] p-4"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        {/* Address — prominent, full width */}
        <div className="flex items-start gap-2.5 mb-3 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(252,165,165,0.15)" }}>
            <MapPin style={{ width: 16, height: 16, color: "#FCA5A5" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 0.6 }}>Current Address</p>
            <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 13.5, color: "white", marginTop: 2, lineHeight: 1.35 }}>
              {locationLabel || "Fetching address…"}
            </p>
          </div>
        </div>

        {/* Time grid */}
        <div className="grid grid-cols-3 gap-3">
          {locationInfo.slice(1).map((item, i) => (
            <div key={item.label} className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <item.icon style={{ width: 12, height: 12, color: item.color }} />
                <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 9, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {item.label}
                </span>
              </div>
              <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 12.5, color: "white" }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── 4. Quick action buttons ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <h3 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6 }}>
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {quickActions.map((btn) => (
            <motion.button
              key={btn.label}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              onClick={btn.action}
              className="rounded-[18px] p-3.5 flex flex-col items-center justify-center gap-1.5 cursor-pointer"
              style={{ background: btn.bg, border: `1px solid ${btn.border}` }}
            >
              <btn.icon style={{ width: 20, height: 20, color: btn.color }} />
              <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 11.5, color: btn.color }}>{btn.label}</span>
              <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 9, color: "rgba(255,255,255,0.45)" }}>{btn.sub}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* ── 5. System status (compact) ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.35 }}
        className="grid grid-cols-3 gap-2.5"
      >
        {systemStatus.map((chip) => (
          <div
            key={chip.label}
            className="rounded-[14px] px-3 py-2.5 flex items-center gap-2"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <chip.icon style={{ width: 13, height: 13, color: chip.ok ? "#6EE7B7" : "#FBBF24" }} />
            <div className="min-w-0">
              <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 8.5, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                {chip.label}
              </p>
              <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 11.5, color: "white" }}>
                {chip.value}
              </p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── 6. Mark Safe — resolve ── */}
      <motion.button
        whileHover={{ scale: 1.015 }}
        whileTap={{ scale: 0.97 }}
        onClick={onMarkSafe}
        className="w-full flex items-center justify-center gap-2.5 rounded-[20px] py-3.5 cursor-pointer"
        style={{
          background: "linear-gradient(135deg, #34D399, #10B981)",
          border: "none",
          boxShadow: "0 10px 28px rgba(16,185,129,0.35)",
          fontFamily: "Nunito,sans-serif",
          fontWeight: 900,
          fontSize: 15,
          color: "#064E3B",
        }}
      >
        <CheckCircle2 style={{ width: 20, height: 20 }} /> Mark Safe — Resolve SOS
      </motion.button>
    </div>
  );
};
