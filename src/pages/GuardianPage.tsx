import { useState, useEffect, useRef, useCallback } from "react";
import { 
  MapPin, Phone, CheckCircle2, Shield, RefreshCw, 
  Users, AlertTriangle, BatteryMedium, Wifi, Camera, 
  Mic, Clock, Navigation, Stethoscope, CarFront, MessageSquare, 
  FileText, ChevronRight, UserPlus, Bell, Trash2, Loader2, Link2
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { fetchMyLinks, addGuardianLink, removeLink, renameRelationship } from "@/lib/guardians";
import { RELATIONSHIPS, type GuardianLink } from "@/lib/auth-types";

// ── Icons & Map Helpers ────────────────────────────────────────────────────────

const createUserMarker = () => L.divIcon({
  className: "custom-user-marker",
  html: `<div class="relative flex items-center justify-center w-full h-full">
          <div class="absolute w-14 h-14 rounded-full" style="background:rgba(212,69,92,0.3);animation:ping 2s cubic-bezier(0,0,0.2,1) infinite"></div>
          <div class="relative w-5 h-5 rounded-full border-2 border-white z-10 shadow-md" style="background:#D4455C"></div>
         </div>`,
  iconSize: [72, 72],
  iconAnchor: [36, 36],
});

const createGuardianMarker = () => L.divIcon({
  className: "custom-guardian-marker",
  html: `<div class="relative">
          <div class="w-9 h-9 bg-blue-500 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg></div>
         </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const createPoiMarker = (emoji: string, color: string) => L.divIcon({
  className: "custom-poi-marker",
  html: `<div class="w-8 h-8 rounded-full border-2 border-white shadow-md flex items-center justify-center text-sm" style="background:${color}">${emoji}</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const AVATAR_COLORS = ["#F2956A", "#3D9970", "#D4455C", "#6B4F40", "#B7770D", "#2E7D56"];

const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "M";

// Deterministic demo readouts for the family live map (real-time GPS arrives
// with the SOS pipeline — these keep the dashboard honest and stable across
// renders instead of flickering random values).
const DEMO_AREAS = ["Bandra West, Mumbai", "Andheri East, Mumbai", "Powai, Mumbai", "Kurla, Mumbai", "Juhu, Mumbai", "Dadar, Mumbai"];
const DEMO_UPDATED = ["Just now", "1 min ago", "2 min ago", "3 min ago", "4 min ago", "5 min ago"];

// ── Family live map (parent dashboard) ────────────────────────────────────────

const FamilyMap = ({ members }: { members: GuardianLink[] }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, {
      center: [19.0596, 72.8295],
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png").addTo(map);

    // The guardian themself (blue), around whom the demo family positions orbit.
    L.marker([19.0596, 72.8295], { icon: createGuardianMarker() }).addTo(map);
    members.forEach((m, i) => {
      const lat = 19.0596 + (i % 3) * 0.012 - 0.012;
      const lng = 72.8295 + Math.floor(i / 3) * 0.012 - 0.006;
      L.marker([lat, lng], { icon: createUserMarker() }).addTo(map);
    });

    return () => {
      map.remove();
    };
  }, [members]);

  return <div ref={containerRef} style={{ height: 220, width: "100%", borderRadius: 20 }} />;
};

// ── Guardian dashboard (parent app home) ──────────────────────────────────────

const GuardianDashboard = () => {
  const { displayName } = useAuth();
  const { sosState } = useApp();

  const [links, setLinks] = useState<GuardianLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState("");
  const [relationship, setRelationship] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRelationship, setEditRelationship] = useState("");

  const load = useCallback(async () => {
    const fetched = await fetchMyLinks("parent");
    setLinks(fetched);
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const accepted = links.filter((l) => l.status === "accepted");
  const pending = links.filter((l) => l.status === "pending");
  const firstName = displayName.split(/\s+/)[0] || "Guardian";

  const hour = new Date().getHours();
  const greeting =
    hour >= 5 && hour < 12
      ? `Good Morning, ${firstName} 👋`
      : hour >= 12 && hour < 17
        ? `Good Afternoon, ${firstName} 👋`
        : `Good Evening, ${firstName} 👋`;

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
      void load();
    } else {
      setError(res.message);
    }
  };

  const handleRemove = async (link: GuardianLink) => {
    const ok = await removeLink(link.id);
    if (ok) void load();
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
    if (ok) void load();
    else setError("Could not update the relationship. Please try again.");
  };

  // Recent Notifications = the guardian's live alerts right now: pending link
  // requests plus any active SOS. Details stay in the Sent Requests section.
  const notificationCount = pending.length + (sosState.active ? 1 : 0);
  const stats = [
    { label: "Family Members Linked", value: String(accepted.length), icon: Users, color: "#3D9970", bg: "rgba(61,153,112,0.12)" },
    { label: "Current Safety Status", value: sosState.active ? "Emergency" : "All Safe", icon: Shield, color: sosState.active ? "#D4455C" : "#3D9970", bg: sosState.active ? "rgba(212,69,92,0.12)" : "rgba(61,153,112,0.12)" },
    { label: "Active SOS Alerts", value: String(sosState.active ? 1 : 0), icon: AlertTriangle, color: "#D4455C", bg: "rgba(212,69,92,0.12)" },
    { label: "Recent Notifications", value: String(notificationCount), icon: Bell, color: "#B7770D", bg: "rgba(243,156,18,0.12)" },
  ];

  return (
    <div className="space-y-5">
      {/* ── Greeting ── */}
      <div>
        <h2 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 24, color: "#3D2315", lineHeight: 1.15 }}>
          {greeting}
        </h2>
        <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 500, fontSize: 12.5, color: "#9E7A6A", marginTop: 4, lineHeight: 1.5 }}>
          You're watching over {accepted.length > 0 ? `${accepted.length} family ${accepted.length === 1 ? "member" : "members"}` : "your family"} — Sakhi keeps you updated in real time. 💜
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + i * 0.05 }}
            className="rounded-[20px] p-4"
            style={{ background: "white", boxShadow: "0 2px 14px rgba(139,58,47,0.06)" }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2.5" style={{ background: s.bg }}>
              <s.icon style={{ width: 17, height: 17, color: s.color }} />
            </div>
            <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 20, color: "#3D2315", lineHeight: 1.1 }}>
              {s.value}
            </p>
            <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 10.5, color: "#9E7A6A", marginTop: 2 }}>
              {s.label}
            </p>
          </motion.div>
        ))}
      </div>

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

      {/* ── Live map ── */}
      <div className="rounded-[24px] overflow-hidden" style={{ background: "white", boxShadow: "0 4px 20px rgba(139,58,47,0.06)" }}>
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h3 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 15, color: "#3D2315" }}>
            Live Map 🗺️
          </h3>
          <span className="flex items-center gap-1.5" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 10.5, color: "#3D9970" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#3D9970]" /> Live
          </span>
        </div>
        <div className="px-3 pb-3">
          <FamilyMap members={accepted} />
        </div>
        {/* Per-member readouts: current location, movement status, last updated */}
        {accepted.length > 0 && (
          <div className="px-4 pb-2 space-y-2">
            {accepted.map((link, i) => {
              const moving = i % 2 === 0;
              const area = DEMO_AREAS[i % DEMO_AREAS.length];
              const updated = DEMO_UPDATED[i % DEMO_UPDATED.length];
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
                      background: moving ? "rgba(61,153,112,0.1)" : "rgba(243,156,18,0.1)",
                      fontFamily: "Nunito,sans-serif",
                      fontWeight: 700,
                      fontSize: 9.5,
                      color: moving ? "#2E7D56" : "#B7770D",
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: moving ? "#3D9970" : "#F39C12" }}
                    />
                    {moving ? "Moving" : "Stationary"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <p className="px-4 pb-4" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 11, color: "#9E7A6A" }}>
          {accepted.length > 0
            ? "Showing linked family members' last known positions (demo coordinates — real-time GPS arrives with the SOS pipeline)."
            : "Linked members will appear here with their live location. Add a member below to get started."}
        </p>
      </div>

      {/* ── Add member ── */}
      <div className="rounded-[24px] p-5" style={{ background: "white", boxShadow: "0 4px 20px rgba(139,58,47,0.06)" }}>
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
      </div>

      {/* ── Pending requests (sent) ── */}
      {pending.length > 0 && (
        <div>
          <h3 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 15, color: "#3D2315", marginBottom: 10 }}>
            Sent requests{" "}
            <span style={{ fontWeight: 600, fontSize: 11.5, color: "#B7770D" }}>
              — awaiting their acceptance
            </span>
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
        </div>
      )}

      {/* ── Linked family members ── */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
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
              No linked users yet
            </p>
            <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 12, color: "#9E7A6A", marginTop: 3, lineHeight: 1.55, maxWidth: 320, marginLeft: "auto", marginRight: "auto" }}>
              Enter the invite code above to request a link. Once {firstName}'s family accepts,
              their live location and real-time SOS alerts will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {accepted.map((link, i) => (
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
                      {link.relationship || "Family"} · online just now
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────

const GuardianPage = () => {
  const navigate = useNavigate();
  const { sosState, locationState, resolveSOS } = useApp();
  // Parents get the full monitoring dashboard; users/guests keep the legacy
  // demo view (users are redirected to /guardians at the route level).
  const { role, displayName } = useAuth();
  const isParent = role === "parent";
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isResolved, setIsResolved] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState("00:00");
  
  // Real-time map refs
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);

  // Mocks
  const userLat = sosState.active ? sosState.coords.lat : (locationState.coords?.lat || 28.5355);
  const userLng = sosState.active ? sosState.coords.lng : (locationState.coords?.lng || 77.3910);
  const guardianLat = userLat - 0.008;
  const guardianLng = userLng + 0.006;
  
  const isSOS = sosState.active;

  // Actions
  const handleAction = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 2800);
  };

  useEffect(() => {
    if (sosState.active) setIsResolved(false);
  }, [sosState.active]);

  // Timer
  useEffect(() => {
    if (!sosState.active) return;
    const calc = () => {
      if (!sosState.triggeredAt) return "00:00";
      const d = Math.floor((Date.now() - new Date(sosState.triggeredAt).getTime()) / 1000);
      return `${String(Math.floor(d / 60)).padStart(2, "0")}:${String(d % 60).padStart(2, "0")}`;
    };
    setTimeElapsed(calc());
    const id = setInterval(() => setTimeElapsed(calc()), 1000);
    return () => clearInterval(id);
  }, [sosState.active, sosState.triggeredAt]);

  // Map Initialization
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) mapRef.current.remove();

    const map = L.map(mapContainerRef.current, { 
      center: [userLat - 0.002, userLng + 0.002], // Offset center slightly to fit both
      zoom: 15, 
      zoomControl: false, 
      attributionControl: false 
    });
    
    // Use dark theme tiles if SOS is active, else light
    const tileUrl = isSOS 
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
    L.tileLayer(tileUrl).addTo(map);

    // Markers
    L.marker([userLat, userLng], { icon: createUserMarker(), zIndexOffset: 1000 }).addTo(map);
    
    if (isSOS) {
      L.marker([guardianLat, guardianLng], { icon: createGuardianMarker() }).addTo(map);
      
      // POIs
      L.marker([userLat + 0.004, userLng - 0.002], { icon: createPoiMarker("🚔", "#2563EB") }).addTo(map);
      L.marker([userLat - 0.002, userLng - 0.005], { icon: createPoiMarker("🏥", "#E74C3C") }).addTo(map);

      // Route Polyline
      const route = L.polyline([
        [guardianLat, guardianLng],
        [guardianLat + 0.003, guardianLng - 0.002],
        [userLat - 0.002, userLng + 0.001],
        [userLat, userLng]
      ], { color: "#3B82F6", weight: 4, dashArray: "10, 10", opacity: 0.8 }).addTo(map);
      routeLineRef.current = route;
      
      // Fit bounds
      map.fitBounds(route.getBounds(), { padding: [30, 30] });
    }

    // Safety zones (only in non-sos for cleaner view, or keep them? instructions say "Keep risk zones")
    const zones = [
      { lat: userLat + 0.002, lng: userLng - 0.002, radius: 400, color: "#3D9970", fillColor: "#3D9970", fillOpacity: isSOS ? 0.08 : 0.12 },
      { lat: userLat - 0.004, lng: userLng + 0.003, radius: 600, color: "#F39C12", fillColor: "#F39C12", fillOpacity: isSOS ? 0.08 : 0.12 },
      { lat: userLat + 0.005, lng: userLng + 0.005, radius: 500, color: "#E74C3C", fillColor: "#E74C3C", fillOpacity: isSOS ? 0.08 : 0.12 },
    ];
    zones.forEach(z => {
      L.circle([z.lat, z.lng], { radius: z.radius, color: z.color, fillColor: z.fillColor, fillOpacity: z.fillOpacity, weight: isSOS ? 1 : 1.5 }).addTo(map);
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [userLat, userLng, guardianLat, guardianLng, isSOS]);

  // Mock Timeline Generation
  const timelineEvents = [
    { time: "14:22", msg: "SOS Triggered", active: false },
    { time: "14:22", msg: "Guardians Notified", active: false },
    { time: "14:23", msg: "Live Location Shared", active: false },
    { time: "14:23", msg: "Video Recording Started", active: false },
    { time: "14:24", msg: "You opened the alert", active: true },
  ];

  return (
    <AppLayout>
      <div style={{ background: isSOS ? "#110303" : "var(--sakhi-cream)", minHeight: "100vh", transition: "background 0.5s ease", paddingBottom: "7rem" }}>
        
        {/* Toast */}
        <AnimatePresence>
          {actionFeedback && (
            <motion.div
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-5 py-3 rounded-full shadow-xl"
              style={{ background: "#3D9970", color: "white", fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 13 }}
            >
              <CheckCircle2 className="w-4 h-4" /> {actionFeedback}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-3xl mx-auto px-4 pt-4">

          {/* ── Dashboard Header ── */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {isSOS && <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.8, repeat: Infinity }} className="w-2.5 h-2.5 rounded-full bg-red-500" />}
                <h1 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 22, color: isSOS ? "white" : "#3D2315" }}>
                  {isSOS ? "Emergency Active" : isParent ? "Guardian Dashboard" : "Aapke Apnewale 💛"}
                </h1>
              </div>
              <div className="flex items-center gap-3">
                {isSOS && (
                  <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 12, color: "#E74C3C" }}>
                    Duration: {timeElapsed}
                  </span>
                )}
                <span className="flex items-center gap-1.5" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 11, color: isSOS ? "rgba(255,255,255,0.4)" : "#9E7A6A" }}>
                  <RefreshCw className="w-3 h-3" /> Last Updated: Just now
                </span>
              </div>
            </div>
            
            {isSOS && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(46,204,113,0.15)", border: "1px solid rgba(46,204,113,0.3)" }}>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 10, color: "#6EE7B7", textTransform: "uppercase" }}>Live Tracking</span>
              </div>
            )}
          </div>

          {!isSOS ? (
            isParent ? (
              /* ── Parent: full Guardian monitoring dashboard ── */
              <GuardianDashboard />
            ) : (
              /* Non-SOS state placeholder (simplified for requirements focusing on SOS) */
              <div className="rounded-[24px] p-6 text-center" style={{ background: "white", boxShadow: "0 4px 20px rgba(139,58,47,0.05)" }}>
                <Users className="w-12 h-12 text-[#D4455C] mx-auto mb-3" />
                <h2 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 18, color: "#3D2315" }}>No Active Emergencies</h2>
                <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 13, color: "#9E7A6A", marginTop: 4 }}>
                  Preeti is safe. You will be notified if an SOS is triggered.
                </p>
              </div>
            )
          ) : (
            
            /* ── EMERGENCY DASHBOARD GRID ── */
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              
              {/* Main Column (Left) */}
              <div className="md:col-span-8 flex flex-col gap-4">
                
                {/* User Info Card */}
                <div className="rounded-[24px] p-5 relative overflow-hidden" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                  
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>User at Risk</p>
                      <h2 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 20, color: "white" }}>{sosState.userName || "Preeti Sharma"}</h2>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.1)" }}>
                        <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                        <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 11, color: "white" }}>Online</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.1)" }}>
                        <BatteryMedium className="w-3.5 h-3.5 text-yellow-400" />
                        <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 11, color: "white" }}>42%</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-500/20 text-red-400"><Camera className="w-4 h-4" /></div>
                      <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 13, color: "white" }}>Video Recording Active</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-500/20 text-red-400"><Mic className="w-4 h-4" /></div>
                      <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 13, color: "white" }}>Audio Recording Active</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-500/20 text-emerald-400"><MapPin className="w-4 h-4" /></div>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 13, color: "white" }}>Live Location Sharing</p>
                        <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 11, color: "rgba(255,255,255,0.5)" }} className="truncate">{sosState.location || "Tracking precise location..."}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Map View */}
                <div className="rounded-[24px] overflow-hidden relative" style={{ height: 280, border: "1px solid rgba(255,255,255,0.15)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                  <div ref={mapContainerRef} className="absolute inset-0" />
                  
                  {/* Map Overlay HUD */}
                  <div className="absolute top-3 right-3 z-[400] flex flex-col gap-2">
                    <div className="bg-[#110303]/80 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 shadow-xl flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <div>
                        <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 10, color: "rgba(255,255,255,0.6)", textTransform: "uppercase" }}>Your ETA</p>
                        <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 13, color: "white" }}>4 mins (1.2km)</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions (2x3 Grid) */}
                <h3 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 14, color: "rgba(255,255,255,0.6)" }} className="mt-1">Immediate Response</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Call User", icon: Phone, bg: "rgba(59,130,246,0.15)", color: "#60A5FA", border: "rgba(59,130,246,0.3)" },
                    { label: "Navigate", icon: Navigation, bg: "rgba(167,139,250,0.15)", color: "#C084FC", border: "rgba(167,139,250,0.3)" },
                    { label: "Call Police (112)", icon: CarFront, bg: "rgba(248,113,113,0.15)", color: "#F87171", border: "rgba(248,113,113,0.3)" },
                    { label: "Ambulance (108)", icon: Stethoscope, bg: "rgba(251,146,60,0.15)", color: "#FBBF24", border: "rgba(251,146,60,0.3)" },
                    { label: "Send Msg", icon: MessageSquare, bg: "rgba(255,255,255,0.1)", color: "white", border: "rgba(255,255,255,0.15)" },
                    { label: "Mark Safe", icon: CheckCircle2, bg: "rgba(52,211,153,0.15)", color: "#34D399", border: "rgba(52,211,153,0.3)", action: () => { setIsResolved(true); resolveSOS(); handleAction("Emergency Resolved"); navigate("/home"); } },
                  ].map(btn => (
                    <motion.button 
                      key={btn.label}
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
                      onClick={btn.action ? btn.action : () => handleAction(`Action: ${btn.label}`)}
                      className="rounded-[20px] p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all"
                      style={{ background: btn.bg, border: `1px solid ${btn.border}` }}
                    >
                      <btn.icon className="w-6 h-6" style={{ color: btn.color }} />
                      <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 13, color: btn.color }}>{btn.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Sidebar Column (Right) */}
              <div className="md:col-span-4 flex flex-col gap-4 mt-2 md:mt-0">
                
                {/* Status Panel */}
                <div className="rounded-[24px] p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 13, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>
                    Current Situation
                  </p>
                  <div className="space-y-4">
                    {[
                      { label: "Live Tracking", active: true, color: "emerald" },
                      { label: "Recording Active", active: true, color: "emerald" },
                      { label: "3 Guardians Notified", active: true, color: "emerald" },
                      { label: "Police Not Contacted", active: false, color: "yellow" },
                      { label: "Ambulance Not Contacted", active: false, color: "yellow" }
                    ].map((s, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${s.active ? 'bg-emerald-400' : 'bg-yellow-400'}`} />
                        <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 13, color: s.active ? "white" : "rgba(255,255,255,0.6)" }}>
                          {s.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Evidence Summary */}
                <div className="rounded-[24px] p-5" style={{ background: "linear-gradient(135deg, rgba(220,38,38,0.1), rgba(153,27,27,0.1))", border: "1px solid rgba(220,38,38,0.2)" }}>
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-4 h-4 text-red-400" />
                    <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 13, color: "white" }}>Evidence Collected</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-black/30 rounded-xl p-3 flex flex-col items-center justify-center">
                      <Camera className="w-4 h-4 text-white/70 mb-1" />
                      <span className="text-white font-bold text-sm">1 Video</span>
                    </div>
                    <div className="bg-black/30 rounded-xl p-3 flex flex-col items-center justify-center">
                      <Mic className="w-4 h-4 text-white/70 mb-1" />
                      <span className="text-white font-bold text-sm">1 Audio</span>
                    </div>
                  </div>
                  <button onClick={() => navigate("/evidence-locker")} className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 transition-colors cursor-pointer text-white text-sm font-bold">
                    Open Evidence <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Timeline */}
                <div className="rounded-[24px] p-5 flex-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 13, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>
                    Timeline
                  </p>
                  <div className="relative pl-3">
                    <div className="absolute left-[5px] top-2 bottom-2 w-0.5 bg-white/10" />
                    {timelineEvents.map((ev, i) => (
                      <div key={i} className="relative mb-5 last:mb-0">
                        <div className={`absolute -left-[14px] top-1 w-2.5 h-2.5 rounded-full border-2 ${ev.active ? 'bg-red-500 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-[#110303] border-white/30'}`} />
                        <div className="pl-3">
                          <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 11, color: ev.active ? "#F87171" : "rgba(255,255,255,0.4)", marginBottom: 2 }}>
                            {ev.time}
                          </p>
                          <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 13, color: ev.active ? "white" : "rgba(255,255,255,0.7)" }}>
                            {ev.msg}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
    </AppLayout>
  );
};

export default GuardianPage;
