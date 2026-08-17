import { useEffect, useMemo, useState } from "react";
import {
  MapPin,
  Phone,
  CheckCircle2,
  Shield,
  ShieldCheck,
  Users,
  BatteryMedium,
  BatteryLow,
  Clock,
  Navigation,
  MessageSquare,
  Pencil,
  UserPlus,
  Loader2,
  Link2,
  Trash2,
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { addGuardianLink, removeLink, renameRelationship } from "@/lib/guardians";
import { RELATIONSHIPS, type GuardianLink } from "@/lib/auth-types";
import type { LiveLocation, SafetyEvent } from "@/lib/safety";
import { AVATAR_COLORS, initialsOf, timeAgo } from "./helpers";
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
  const navigate = useNavigate();

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
      ? `Good Morning, ${firstName}`
      : hour >= 12 && hour < 17
        ? `Good Afternoon, ${firstName}`
        : `Good Evening, ${firstName}`;

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

  // ── Recent activity feed (check-ins, location updates, battery, SOS history) ──
  const activity = useMemo(() => {
    type Item = {
      id: string;
      icon: typeof MapPin;
      bg: string;
      color: string;
      title: string;
      sub?: string;
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
          sub: ev.location_label ?? undefined,
          time: timeAgo(ev.triggered_at),
          ts,
        });
      } else if (ev.status === "resolved") {
        items.push({
          id: ev.id,
          icon: ShieldCheck,
          bg: "rgba(122,43,115,0.1)",
          color: "#7A2B73",
          title: `SOS from ${name} resolved`,
          sub: ev.location_label ?? undefined,
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
          sub: ev.location_label ?? undefined,
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
          sub: loc.location_label ?? undefined,
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
          time: timeAgo(loc.updated_at),
          ts,
        });
      }
    });

    return items.sort((a, b) => b.ts - a.ts).slice(0, 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, locations, accepted, links]);

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
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 22, color: "#3D2315", lineHeight: 1.15 }}>
                {greeting}
              </h2>
              <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 12, color: "#9E7A6A", marginTop: 4, lineHeight: 1.5 }}>
                {accepted.length > 0
                  ? `Watching over ${accepted.length} family ${accepted.length === 1 ? "member" : "members"} — everyone is safe.`
                  : "Everyone is safe."}
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
          className="flex items-center gap-2"
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
          <CheckCircle2 style={{ width: 14, height: 14, flexShrink: 0 }} />
          {feedback}
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
              const updated = loc ? timeAgo(loc.updated_at) : null;
              const battery = loc?.battery_level;
              const lowBattery = battery != null && battery < 20;
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
                      <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 14.5, color: "#3D2315" }} className="truncate">
                        {link.user_name ?? "Member"}
                      </p>
                      <p className="flex items-center gap-1.5" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 11, color: "#9E7A6A", marginTop: 1 }}>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: online ? "#3D9970" : "#B7770D" }} />
                        {online ? "Online now" : updated ? `Last seen ${updated}` : "Offline"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: "rgba(61,153,112,0.1)", color: "#2E7D56" }}>
                        <ShieldCheck style={{ width: 11, height: 11 }} />
                        <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 9.5 }}>Safe</span>
                      </span>
                      <button
                        onClick={() => {
                          setEditingId(link.id);
                          setEditRelationship(link.relationship ?? "");
                        }}
                        aria-label={`Edit relationship for ${link.user_name ?? "member"}`}
                        title="Edit relationship"
                        className="cursor-pointer p-2 rounded-full"
                        style={{ background: "rgba(61,153,112,0.08)", border: "none", color: "#3D9970" }}
                      >
                        <Pencil style={{ width: 13, height: 13 }} />
                      </button>
                      <button
                        onClick={() => void handleRemove(link)}
                        aria-label={`Remove ${link.user_name ?? "member"}`}
                        title="Remove member"
                        className="cursor-pointer p-2 rounded-full"
                        style={{ background: "rgba(212,69,92,0.08)", border: "none", color: "#D4455C" }}
                      >
                        <Trash2 style={{ width: 13, height: 13 }} />
                      </button>
                    </div>
                  </div>

                  {editingId === link.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={editRelationship}
                        onChange={(e) => setEditRelationship(e.target.value)}
                        placeholder="Relationship"
                        aria-label="Edit relationship"
                        style={{
                          flex: 1,
                          minWidth: 0,
                          padding: "0.4rem 0.7rem",
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
                        className="cursor-pointer px-3 py-1.5 rounded-lg text-white"
                        style={{ background: "#3D9970", border: "none", fontSize: "0.7rem", fontWeight: 700, fontFamily: "'Poppins', sans-serif" }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="cursor-pointer px-3 py-1.5 rounded-lg"
                        style={{ background: "rgba(158,122,106,0.1)", border: "none", fontSize: "0.7rem", fontWeight: 700, color: "#6B4F40", fontFamily: "'Poppins', sans-serif" }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 11, color: "#9E7A6A" }}>
                      {link.relationship || "Family"}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl px-3 py-2" style={{ background: "rgba(61,153,112,0.06)" }}>
                      <p className="flex items-center gap-1.5" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 10.5, color: "#3D2315" }}>
                        <BatteryMedium style={{ width: 12, height: 12, color: lowBattery ? "#B7770D" : "#3D9970" }} />
                        Battery
                      </p>
                      <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 12.5, color: battery != null ? "#3D2315" : "#9E7A6A", marginTop: 1 }}>
                        {battery != null ? `${Math.round(battery)}%` : "—"}
                      </p>
                    </div>
                    <div className="rounded-xl px-3 py-2" style={{ background: "rgba(122,43,115,0.05)" }}>
                      <p className="flex items-center gap-1.5" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 10.5, color: "#3D2315" }}>
                        <MapPin style={{ width: 12, height: 12, color: "#7A2B73" }} />
                        Location
                      </p>
                      <p className="truncate" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 12.5, color: loc?.location_label ? "#3D2315" : "#9E7A6A", marginTop: 1 }}>
                        {loc?.location_label ?? "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/guardian/track/${link.user_id}`)}
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

      {/* ── Live map preview ── */}
      <motion.section
        id="guardian-livemap"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-[24px] overflow-hidden"
        style={{ background: "white", boxShadow: "0 4px 20px rgba(139,58,47,0.06)" }}
      >
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <MapPin style={{ width: 15, height: 15, color: "#7A2B73" }} />
          <h3 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 15, color: "#3D2315" }}>
            Live Map
          </h3>
        </div>
        <div className="px-3 pb-4">
          <CalmFamilyMap members={accepted} locations={locations} />
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
        <h3 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 15, color: "#3D2315", marginBottom: 12 }}>
          Recent Activity
        </h3>
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
                  {item.sub && (
                    <p className="truncate" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 10.5, color: "#9E7A6A", marginTop: 1 }}>
                      {item.sub}
                    </p>
                  )}
                </div>
                <span className="flex-shrink-0" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 10, color: "#9E7A6A" }}>
                  {item.time}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.section>

      {/* ── Add member ── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-[24px] p-5"
        style={{ background: "white", boxShadow: "0 4px 20px rgba(139,58,47,0.06)" }}
      >
        <h3 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 15, color: "#3D2315" }}>
          Add a family member
        </h3>
        <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 11.5, color: "#9E7A6A", marginTop: 4, lineHeight: 1.5 }}>
          Enter their 8-character invite code from Sakhi → Guardian Management, then choose how they're related to you.
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

    </div>
  );
};
