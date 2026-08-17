import { useEffect, useMemo, useState } from "react";
import {
  MapPin,
  Phone,
  PhoneCall,
  CheckCircle2,
  Shield,
  ShieldCheck,
  Users,
  BatteryMedium,
  BatteryLow,
  Clock,
  Navigation,
  MessageSquare,
  MessageCircle,
  UserPlus,
  Loader2,
  Link2,
  Trash2,
  FileText,
  Activity,
  Bell,
  LocateFixed,
} from "lucide-react";
import { motion } from "framer-motion";
import { addGuardianLink, removeLink, renameRelationship } from "@/lib/guardians";
import { RELATIONSHIPS, type GuardianLink } from "@/lib/auth-types";
import type { LiveLocation, SafetyEvent } from "@/lib/safety";
import { AVATAR_COLORS, DEMO_AREAS, initialsOf, timeAgo } from "./helpers";
import { CalmFamilyMap } from "./maps";

/**
 * Normal monitoring dashboard — the calm, premium view shown whenever NO SOS
 * is active. White / soft pink / light lavender / purple palette, clean cards,
 * reassuring readouts (safe, online, battery, location, last seen).
 */
export const NormalDashboard = ({
  links,
  locations,
  events,
  displayName,
  reloadLinks,
}: {
  links: GuardianLink[];
  locations: Record<string, LiveLocation>;
  events: SafetyEvent[];
  displayName: string;
  reloadLinks: () => Promise<void>;
}) => {
  const accepted = links.filter((l) => l.status === "accepted");
  const pending = links.filter((l) => l.status === "pending");
  const firstName = displayName.split(/\s+/)[0] || "Guardian";

  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState("");
  const [relationship, setRelationship] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRelationship, setEditRelationship] = useState("");

  useEffect(() => {
    setLoading(false);
  }, []);

  const hour = new Date().getHours();
  const greeting =
    hour >= 5 && hour < 12
      ? `Good Morning, ${firstName} 👋`
      : hour >= 12 && hour < 17
        ? `Good Afternoon, ${firstName} 👋`
        : `Good Evening, ${firstName} 👋`;

  const userNameFor = (userId: string) =>
    links.find((l) => l.user_id === userId)?.user_name ?? "Linked user";

  const handleAdd = async () => {
    const code = inviteCode.trim();
    if (!code) {
      setError("Enter the user's invite code first.");
      return;
    }
    if (!relationship) {
      setError("Choose how this person is related to you.");
      return;
    }
    setBusy(true);
    setError(null);
    setFeedback(null);
    const res = await addGuardianLink({ inviteCode: code, relationship, guardianName: displayName });
    setBusy(false);
    if (res.ok) {
      setInviteCode("");
      setRelationship("");
      setFeedback("Request sent! They'll see it in their Guardian Management screen.");
      void reloadLinks();
    } else {
      setError(res.message);
    }
  };

  const handleRemove = async (link: GuardianLink) => {
    const ok = await removeLink(link.id);
    if (ok) void reloadLinks();
    else setError("Could not remove this member. Please try again.");
  };

  const handleRename = async (link: GuardianLink) => {
    const value = editRelationship.trim();
    if (!value) {
      setEditingId(null);
      return;
    }
    const ok = await renameRelationship(link.id, value);
    setEditingId(null);
    if (ok) void reloadLinks();
    else setError("Could not update the relationship. Please try again.");
  };

  const memberOnline = (userId: string): boolean => {
    const loc = locations[userId];
    return loc ? Date.now() - new Date(loc.updated_at).getTime() < 300_000 : false;
  };

  const batteries = accepted
    .map((l) => locations[l.user_id]?.battery_level)
    .filter((b): b is number => typeof b === "number");
  const avgBattery = batteries.length ? Math.round(batteries.reduce((a, b) => a + b, 0) / batteries.length) : null;

  const checkinsToday = events.filter(
    (e) =>
      e.type === "checkin" &&
      new Date(e.triggered_at).toDateString() === new Date().toDateString(),
  ).length;

  // ── Recent activity feed (check-ins, location updates, battery, SOS history) ──
  const activity = useMemo(() => {
    type Item = {
      id: string;
      icon: typeof MapPin;
      bg: string;
      color: string;
      title: string;
      sub: string;
      time: string;
      ts: number;
    };
    const items: Item[] = [];

    events.slice(0, 8).forEach((ev) => {
      const name = userNameFor(ev.user_id);
      const ts = new Date(ev.triggered_at).getTime();
      if (ev.type === "checkin") {
        items.push({
          id: ev.id,
          icon: CheckCircle2,
          bg: "rgba(61,153,112,0.12)",
          color: "#2E7D56",
          title: `${name} checked in safely`,
          sub: ev.location_label ?? "Safe check-in",
          time: timeAgo(ev.triggered_at),
          ts,
        });
      } else if (ev.status === "resolved") {
        items.push({
          id: ev.id,
          icon: ShieldCheck,
          bg: "rgba(122,43,115,0.1)",
          color: "#7A2B73",
          title: `SOS from ${name} resolved — they're safe`,
          sub: ev.location_label ?? "Emergency closed",
          time: timeAgo(ev.triggered_at),
          ts,
        });
      } else if (ev.status === "cancelled") {
        items.push({
          id: ev.id,
          icon: Shield,
          bg: "rgba(158,122,106,0.1)",
          color: "#6B4F40",
          title: `SOS from ${name} cancelled`,
          sub: "No emergency",
          time: timeAgo(ev.triggered_at),
          ts,
        });
      }
    });

    accepted.forEach((link) => {
      const loc = locations[link.user_id];
      if (!loc) return;
      const ts = new Date(loc.updated_at).getTime();
      if (Date.now() - ts < 300_000) {
        items.push({
          id: `loc-${link.user_id}`,
          icon: MapPin,
          bg: "rgba(122,43,115,0.08)",
          color: "#7A2B73",
          title: `${link.user_name ?? "Member"}'s location updated`,
          sub: loc.location_label ?? "Live location",
          time: timeAgo(loc.updated_at),
          ts,
        });
      }
      if (typeof loc.battery_level === "number" && loc.battery_level < 20) {
        items.push({
          id: `bat-${link.user_id}`,
          icon: BatteryLow,
          bg: "rgba(243,156,18,0.12)",
          color: "#B7770D",
          title: `${link.user_name ?? "Member"}'s battery is low (${Math.round(loc.battery_level)}%)`,
          sub: "Consider reaching out",
          time: timeAgo(loc.updated_at),
          ts,
        });
      }
    });

    return items.sort((a, b) => b.ts - a.ts).slice(0, 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, locations, accepted, links]);

  const overview = [
    {
      label: "Family Members Linked",
      value: String(accepted.length),
      icon: Users,
      color: "#7A2B73",
      bg: "rgba(122,43,115,0.08)",
    },
    { label: "All Members Safe", value: "Safe", icon: ShieldCheck, color: "#2E7D56", bg: "rgba(61,153,112,0.1)" },
    { label: "Today's Check-ins", value: String(checkinsToday), icon: CheckCircle2, color: "#3D9970", bg: "rgba(61,153,112,0.1)" },
    {
      label: "Battery Status",
      value: avgBattery != null ? `${avgBattery}%` : "—",
      icon: BatteryMedium,
      color: "#B7770D",
      bg: "rgba(243,156,18,0.1)",
    },
  ];

  return (
    <div className="space-y-5">
      {/* ── Greeting hero ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="guardian-gradient-calm relative overflow-hidden rounded-[28px] p-5"
        style={{ boxShadow: "0 10px 34px rgba(122,43,115,0.08)", border: "1px solid rgba(122,43,115,0.08)" }}
      >
        <div
          className="absolute -right-10 -top-14 w-44 h-44 rounded-full opacity-60"
          style={{ background: "radial-gradient(circle, rgba(214,82,163,0.16), transparent 70%)" }}
        />
        <div
          className="absolute -left-8 -bottom-16 w-40 h-40 rounded-full opacity-50"
          style={{ background: "radial-gradient(circle, rgba(122,43,115,0.12), transparent 70%)" }}
        />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 22, color: "#3D2315", lineHeight: 1.15 }}>
                {greeting}
              </h2>
              <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 12, color: "#9E7A6A", marginTop: 4, lineHeight: 1.5 }}>
                Welcome back{accepted.length > 0 ? ` — watching over ${accepted.length} family ${accepted.length === 1 ? "member" : "members"}` : ""}. Everyone is safe. 💜
              </p>
            </div>
            <span
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0"
              style={{ background: "rgba(61,153,112,0.12)", fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 10, color: "#2E7D56", letterSpacing: "0.05em" }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#3D9970" }} /> ALL SAFE
            </span>
          </div>
        </div>
      </motion.div>

      {feedback && (
        <div
          style={{
            background: "rgba(61,153,112,0.08)",
            border: "1px solid rgba(61,153,112,0.25)",
            borderRadius: 12,
            padding: "0.625rem 0.875rem",
            fontFamily: "Nunito,sans-serif",
            fontWeight: 700,
            fontSize: 12,
            color: "#2E7D56",
          }}
        >
          ✓ {feedback}
        </div>
      )}
      {error && (
        <div
          style={{
            background: "rgba(212,69,92,0.08)",
            border: "1px solid rgba(212,69,92,0.25)",
            borderRadius: 12,
            padding: "0.625rem 0.875rem",
            fontFamily: "Nunito,sans-serif",
            fontWeight: 700,
            fontSize: 12,
            color: "#B8324A",
          }}
        >
          {error}
        </div>
      )}

      {/* ── Family Members ── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h3 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 15, color: "#3D2315" }}>
            Family Members
          </h3>
          <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 11, color: "#9E7A6A" }}>
            {accepted.length} linked
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-6">
            <span className="dot-teal" />
          </div>
        ) : accepted.length === 0 ? (
          <div className="rounded-[20px] p-6 text-center" style={{ background: "white", boxShadow: "0 2px 12px rgba(139,58,47,0.05)" }}>
            <Users className="w-10 h-10 text-[#F2956A] mx-auto mb-2.5" />
            <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 14.5, color: "#3D2315" }}>
              No linked members yet
            </p>
            <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 12, color: "#9E7A6A", marginTop: 3, lineHeight: 1.55, maxWidth: 320, marginLeft: "auto", marginRight: "auto" }}>
              Enter a family member's invite code below to request a link. Their live location and SOS alerts will appear here once accepted.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {accepted.map((link, i) => {
              const loc = locations[link.user_id];
              const online = memberOnline(link.user_id);
              const area = loc?.location_label ?? DEMO_AREAS[i % DEMO_AREAS.length];
              const updated = loc ? timeAgo(loc.updated_at) : "no signal yet";
              const lat = loc?.latitude ?? 19.0596;
              const lng = loc?.longitude ?? 72.8295;
              return (
                <motion.div
                  key={link.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="rounded-[22px] p-4 flex flex-col gap-3"
                  style={{ background: "white", boxShadow: "0 4px 18px rgba(139,58,47,0.06)", border: "1px solid rgba(242,149,106,0.12)" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${AVATAR_COLORS[i % AVATAR_COLORS.length]}, ${AVATAR_COLORS[(i + 2) % AVATAR_COLORS.length]})` }}
                    >
                      {initialsOf(link.user_name ?? "U")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 14.5, color: "#3D2315" }} className="truncate">
                          {link.user_name ?? "Linked user"}
                        </p>
                        <span className="guardian-chip flex-shrink-0" style={{ background: "rgba(61,153,112,0.1)", color: "#2E7D56" }}>
                          🟢 Safe
                        </span>
                      </div>
                      <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 11, color: "#9E7A6A", marginTop: 1 }}>
                        {link.relationship || "Family"} · {online ? "online now" : updated === "no signal yet" ? "offline" : `last seen ${updated}`}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl px-3 py-2" style={{ background: "rgba(61,153,112,0.06)" }}>
                      <p className="flex items-center gap-1.5" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 10.5, color: "#3D2315" }}>
                        <BatteryMedium style={{ width: 12, height: 12, color: loc && loc.battery_level != null && loc.battery_level < 20 ? "#B7770D" : "#3D9970" }} />
                        Battery
                      </p>
                      <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 12.5, color: loc && loc.battery_level != null ? "#3D2315" : "#9E7A6A", marginTop: 1 }}>
                        {loc && loc.battery_level != null ? `${Math.round(loc.battery_level)}%` : "—"}
                      </p>
                    </div>
                    <div className="rounded-xl px-3 py-2" style={{ background: "rgba(122,43,115,0.05)" }}>
                      <p className="flex items-center gap-1.5" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 10.5, color: "#3D2315" }}>
                        <MapPin style={{ width: 12, height: 12, color: "#7A2B73" }} />
                        Location
                      </p>
                      <p className="truncate" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 12.5, color: "#3D2315", marginTop: 1 }}>
                        {area}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank")}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 cursor-pointer"
                      style={{ background: "rgba(122,43,115,0.08)", border: "none", fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 11.5, color: "#7A2B73" }}
                    >
                      <Navigation style={{ width: 13, height: 13 }} /> Track
                    </button>
                    <button
                      onClick={() => { window.location.href = "tel:112"; }}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 cursor-pointer"
                      style={{ background: "rgba(37,99,235,0.08)", border: "none", fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 11.5, color: "#2563EB" }}
                    >
                      <Phone style={{ width: 13, height: 13 }} /> Call
                    </button>
                    <button
                      onClick={() => { window.location.href = `sms:112?body=${encodeURIComponent(`Sakhi: ${link.user_name ?? "Aanya"} — how are you doing? Reply to confirm you're safe.`)}`; }}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 cursor-pointer"
                      style={{ background: "rgba(61,153,112,0.08)", border: "none", fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 11.5, color: "#2E7D56" }}
                    >
                      <MessageSquare style={{ width: 13, height: 13 }} /> Message
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.section>

      {/* ── Quick Actions ── */}
      {accepted.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-[24px] p-5"
          style={{ background: "white", boxShadow: "0 4px 20px rgba(139,58,47,0.06)" }}
        >
          <h3 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 15, color: "#3D2315", marginBottom: 12 }}>
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: "View Live Location",
                icon: LocateFixed,
                color: "#7A2B73",
                bg: "rgba(122,43,115,0.07)",
                action: () => document.getElementById("guardian-livemap")?.scrollIntoView({ behavior: "smooth", block: "start" }),
              },
              {
                label: "Call",
                icon: PhoneCall,
                color: "#2563EB",
                bg: "rgba(37,99,235,0.07)",
                action: () => { window.location.href = "tel:112"; },
              },
              {
                label: "Message",
                icon: MessageCircle,
                color: "#2E7D56",
                bg: "rgba(61,153,112,0.07)",
                action: () => { window.location.href = `sms:112?body=${encodeURIComponent(`Sakhi: how are you doing? Reply to confirm you're safe.`)}`; },
              },
              {
                label: "Safe Check-In History",
                icon: Activity,
                color: "#B7770D",
                bg: "rgba(243,156,18,0.08)",
                action: () => document.getElementById("guardian-activity")?.scrollIntoView({ behavior: "smooth", block: "start" }),
              },
            ].map((btn) => (
              <motion.button
                key={btn.label}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={btn.action}
                className="rounded-[18px] p-3.5 flex items-center gap-2.5 cursor-pointer transition-all"
                style={{ background: btn.bg, border: "1px solid transparent" }}
              >
                <btn.icon style={{ width: 16, height: 16, color: btn.color }} />
                <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 12, color: btn.color, textAlign: "left" }}>
                  {btn.label}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.section>
      )}

      {/* ── Live map preview ── */}
      <motion.section
        id="guardian-livemap"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-[24px] overflow-hidden"
        style={{ background: "white", boxShadow: "0 4px 20px rgba(139,58,47,0.06)" }}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h3 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 15, color: "#3D2315" }}>
            Live Map 🗺️
          </h3>
          <span className="flex items-center gap-1.5" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 10.5, color: "#2E7D56" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#3D9970" }} /> Live
          </span>
        </div>
        <div className="px-3 pb-3">
          <CalmFamilyMap members={accepted} locations={locations} />
        </div>
        {accepted.length > 0 && (
          <div className="px-4 pb-2 space-y-2">
            {accepted.map((link, i) => {
              const loc = locations[link.user_id];
              const online = memberOnline(link.user_id);
              const area = loc?.location_label ?? DEMO_AREAS[i % DEMO_AREAS.length];
              const updated = loc ? timeAgo(loc.updated_at) : "no signal yet";
              return (
                <div
                  key={link.id}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2"
                  style={{ background: "rgba(242,149,106,0.06)", border: "1px solid rgba(242,149,106,0.12)" }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0"
                    style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                  >
                    {initialsOf(link.user_name ?? "U")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 12, color: "#3D2315" }}>
                      {link.user_name ?? "Linked user"}
                    </p>
                    <p className="flex items-center gap-1 truncate" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 10.5, color: "#9E7A6A", marginTop: 1 }}>
                      <MapPin style={{ width: 10, height: 10, flexShrink: 0 }} />
                      <span className="truncate">{area}</span>
                      <span style={{ color: "rgba(158,122,106,0.5)" }}>·</span>
                      <span className="flex-shrink-0">updated {updated}</span>
                    </p>
                  </div>
                  <span
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{
                      background: online ? "rgba(61,153,112,0.1)" : "rgba(243,156,18,0.1)",
                      fontFamily: "Nunito,sans-serif",
                      fontWeight: 700,
                      fontSize: 9.5,
                      color: online ? "#2E7D56" : "#B7770D",
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: online ? "#3D9970" : "#F39C12" }} />
                    {online ? "Online" : "Offline"}
                  </span>
                  {loc?.battery_level != null && (
                    <span className="flex items-center gap-1 flex-shrink-0" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 9.5, color: "#9E7A6A" }}>
                      <BatteryMedium style={{ width: 12, height: 12 }} />
                      {Math.round(loc.battery_level)}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <p className="px-4 pb-4" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 11, color: "#9E7A6A" }}>
          {accepted.length > 0
            ? "Live positions from connected devices via Supabase Realtime — updates automatically, no refresh needed."
            : "Linked members will appear here with their live location. Add a member below to get started."}
        </p>
      </motion.section>

      {/* ── Safety overview ── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <h3 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 15, color: "#3D2315", marginBottom: 10, paddingLeft: 2 }}>
          Safety Overview
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {overview.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              className="rounded-[20px] p-4"
              style={{ background: "white", boxShadow: "0 2px 14px rgba(139,58,47,0.06)" }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2.5" style={{ background: s.bg }}>
                <s.icon style={{ width: 17, height: 17, color: s.color }} />
              </div>
              <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 19, color: "#3D2315", lineHeight: 1.1 }}>
                {s.value}
              </p>
              <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 10.5, color: "#9E7A6A", marginTop: 2 }}>
                {s.label}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── Recent activity (colour-coded live feed) ── */}
      <motion.section
        id="guardian-activity"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-[24px] p-5"
        style={{ background: "white", boxShadow: "0 4px 20px rgba(139,58,47,0.06)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 15, color: "#3D2315" }}>
            Recent Activity
          </h3>
          <span className="flex items-center gap-1.5" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 10.5, color: "#2E7D56" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#3D9970" }} /> Live
          </span>
        </div>
        {activity.length === 0 ? (
          <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 12, color: "#9E7A6A", textAlign: "center", padding: "0.75rem 0" }}>
            All quiet — check-ins and location updates will appear here.
          </p>
        ) : (
          <div className="space-y-2">
            {activity.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                style={{ background: "rgba(253,240,233,0.5)", border: "1px solid rgba(242,149,106,0.12)" }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: item.bg }}>
                  <item.icon style={{ width: 14, height: 14, color: item.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 12, color: "#3D2315" }}>
                    {item.title}
                  </p>
                  <p className="truncate" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 10.5, color: "#9E7A6A", marginTop: 1 }}>
                    {item.sub}
                  </p>
                </div>
                <span className="flex-shrink-0" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 10, color: "#9E7A6A" }}>
                  {item.time}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.section>

      {/* ── Recent notifications ── */}
      {events.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-[24px] p-5"
          style={{ background: "white", boxShadow: "0 4px 20px rgba(139,58,47,0.06)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 15, color: "#3D2315" }}>
              Recent Notifications
            </h3>
            <Bell style={{ width: 15, height: 15, color: "#9E7A6A" }} />
          </div>
          <div className="space-y-2">
            {events.slice(0, 5).map((ev) => {
              const isCheckin = ev.type === "checkin";
              const name = userNameFor(ev.user_id);
              const bg = isCheckin ? "rgba(61,153,112,0.08)" : "rgba(122,43,115,0.07)";
              const border = isCheckin ? "rgba(61,153,112,0.22)" : "rgba(122,43,115,0.16)";
              const color = isCheckin ? "#2E7D56" : "#7A2B73";
              return (
                <div
                  key={ev.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                  style={{ background: bg, border: `1px solid ${border}` }}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "white" }}>
                    {isCheckin ? (
                      <CheckCircle2 style={{ width: 14, height: 14, color }} />
                    ) : (
                      <ShieldCheck style={{ width: 14, height: 14, color }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 12, color: "#3D2315" }}>
                      {isCheckin
                        ? `✅ ${name} checked in safely`
                        : ev.status === "resolved"
                          ? `🚨 SOS from ${name} — resolved`
                          : `🚨 SOS from ${name} — ${ev.status}`}
                    </p>
                    <p className="flex items-center gap-1 truncate" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 10.5, color: "#9E7A6A", marginTop: 1 }}>
                      {ev.location_label ? (
                        <>
                          <MapPin style={{ width: 10, height: 10, flexShrink: 0 }} />
                          <span className="truncate">{ev.location_label}</span>
                          <span style={{ color: "rgba(158,122,106,0.5)" }}>·</span>
                        </>
                      ) : null}
                      <span className="flex-shrink-0">{timeAgo(ev.triggered_at)}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.section>
      )}

      {/* ── Add member ── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-[24px] p-5"
        style={{ background: "white", boxShadow: "0 4px 20px rgba(139,58,47,0.06)" }}
      >
        <h3 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 15, color: "#3D2315" }}>
          Add a family member <span style={{ fontWeight: 600, fontSize: 11.5, color: "#9E7A6A" }}>— enter their invite code</span>
        </h3>
        <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 11.5, color: "#9E7A6A", marginTop: 4, lineHeight: 1.5 }}>
          Ask them to open Sakhi → Guardian Management and share the 8-character code. They must accept your request before you can see anything.
        </p>
        <div className="mt-4 space-y-3">
          <div style={{ position: "relative" }}>
            <Link2
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                width: 15,
                height: 15,
                color: "#9E7A6A",
                pointerEvents: "none",
              }}
            />
            <input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="e.g. AB2KQ7XM"
              aria-label="Invite code"
              style={{
                width: "100%",
                paddingLeft: "2.75rem",
                paddingRight: "1rem",
                paddingTop: "0.6875rem",
                paddingBottom: "0.6875rem",
                background: "#FFF6FA",
                border: "1px solid rgba(214,82,163,0.12)",
                borderRadius: 10,
                color: "#7A2B73",
                fontSize: "0.875rem",
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 600,
                letterSpacing: "0.12em",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <select
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            aria-label="Relationship"
            style={{
              width: "100%",
              padding: "0.6875rem 1rem",
              background: "#FFF6FA",
              border: "1px solid rgba(214,82,163,0.12)",
              borderRadius: 10,
              color: "#7A2B73",
              fontSize: "0.875rem",
              fontFamily: "'Poppins', sans-serif",
              outline: "none",
              boxSizing: "border-box",
            }}
          >
            <option value="">How are they related to you?</option>
            {RELATIONSHIPS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button
            onClick={() => void handleAdd()}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-white cursor-pointer disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#F2956A,#D4455C)", border: "none", fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 13.5 }}
          >
            {busy ? (
              <>
                <Loader2 className="animate-spin" style={{ width: 15, height: 15 }} /> Sending request…
              </>
            ) : (
              <>
                <UserPlus style={{ width: 16, height: 16 }} /> Send Guardian Request
              </>
            )}
          </button>
        </div>
      </motion.section>

      {/* ── Pending requests (sent) ── */}
      {pending.length > 0 && (
        <section>
          <h3 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 15, color: "#3D2315", marginBottom: 10 }}>
            Sent requests <span style={{ fontWeight: 600, fontSize: 11.5, color: "#B7770D" }}>— awaiting their acceptance</span>
          </h3>
          <div className="space-y-2.5">
            {pending.map((link) => (
              <div key={link.id} className="rounded-[18px] p-4 flex items-center gap-3" style={{ background: "white", boxShadow: "0 2px 12px rgba(139,58,47,0.05)" }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-xs flex-shrink-0" style={{ background: "#B7770D" }}>
                  {initialsOf(link.user_name ?? "U")}
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 13.5, color: "#3D2315" }}>{link.user_name ?? "User"}</p>
                  <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 11, color: "#9E7A6A" }}>
                    {link.relationship ? `${link.relationship} · ` : ""}pending
                  </p>
                </div>
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ background: "rgba(243,156,18,0.12)", fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 10.5, color: "#B7770D" }}>
                  <Clock style={{ width: 11, height: 11 }} /> Awaiting
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Linked members management ── */}
      {accepted.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2.5 px-1">
            <h3 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 15, color: "#3D2315" }}>
              Manage Members
            </h3>
            <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 11, color: "#9E7A6A" }}>
              {accepted.length} linked
            </span>
          </div>
          <div className="space-y-2.5">
            {accepted.map((link, i) => {
              const linkOnline = memberOnline(link.user_id);
              const linkLoc = locations[link.user_id];
              return (
                <motion.div
                  key={link.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-[20px] p-4 flex items-center gap-3"
                  style={{ background: "white", boxShadow: "0 2px 12px rgba(139,58,47,0.06)" }}
                >
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                    style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                  >
                    {initialsOf(link.user_name ?? "U")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 14, color: "#3D2315" }}>
                      {link.user_name ?? "Linked user"}
                    </p>
                    {editingId === link.id ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          value={editRelationship}
                          onChange={(e) => setEditRelationship(e.target.value)}
                          placeholder="Relationship"
                          aria-label="Edit relationship"
                          style={{
                            width: 120,
                            padding: "0.3rem 0.6rem",
                            background: "#FFF6FA",
                            border: "1px solid rgba(214,82,163,0.2)",
                            borderRadius: 8,
                            fontSize: "0.75rem",
                            fontFamily: "'Poppins', sans-serif",
                            color: "#7A2B73",
                            outline: "none",
                          }}
                        />
                        <button
                          onClick={() => void handleRename(link)}
                          className="cursor-pointer px-2.5 py-1 rounded-lg text-white"
                          style={{ background: "#3D9970", border: "none", fontSize: "0.7rem", fontWeight: 700, fontFamily: "'Poppins', sans-serif" }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="cursor-pointer px-2.5 py-1 rounded-lg"
                          style={{ background: "rgba(158,122,106,0.1)", border: "none", fontSize: "0.7rem", fontWeight: 700, color: "#6B4F40", fontFamily: "'Poppins', sans-serif" }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 11, color: "#3D9970" }}>
                        {link.relationship || "Family"} · {linkOnline ? "online now" : linkLoc ? `last seen ${timeAgo(linkLoc.updated_at)}` : "offline"}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setEditingId(link.id);
                      setEditRelationship(link.relationship ?? "");
                    }}
                    aria-label={`Rename relationship for ${link.user_name ?? "member"}`}
                    title="Rename relationship"
                    className="cursor-pointer p-2.5 rounded-full"
                    style={{ background: "rgba(61,153,112,0.08)", border: "none", color: "#3D9970" }}
                  >
                    <FileText style={{ width: 14, height: 14 }} />
                  </button>
                  <button
                    onClick={() => void handleRemove(link)}
                    aria-label={`Remove ${link.user_name ?? "member"}`}
                    title="Remove member"
                    className="cursor-pointer p-2.5 rounded-full"
                    style={{ background: "rgba(212,69,92,0.08)", border: "none", color: "#D4455C" }}
                  >
                    <Trash2 style={{ width: 14, height: 14 }} />
                  </button>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
