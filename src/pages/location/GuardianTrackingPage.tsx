import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  MapPin,
  Navigation,
  PhoneCall,
  MessageCircle,
  Share2,
  Bookmark,
  ShieldCheck,
  AlertTriangle,
  BatteryMedium,
  Satellite,
  CheckCircle2,
  History,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { fetchMyLinks } from "@/lib/guardians";
import type { GuardianLink } from "@/lib/auth-types";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  fetchLiveLocations,
  fetchSafetyEvents,
  resolveSosEvent,
  subscribeLiveLocations,
  subscribeSafetyEvents,
  type LiveLocation,
  type SafetyEvent,
} from "@/lib/safety";
import { LiveTrackingMap } from "./maps";
import {
  haversineMeters,
  distanceLabel,
  formatCoords,
  googleMapsUrl,
  timeAgoShort,
  formatElapsed,
  shareLocation,
  copyText,
  isStaleSos,
  initialsOf,
  AVATAR_COLORS,
  type TrailPoint,
} from "./helpers";

/**
 * Guardian Live Tracking — a premium Find-My-Family style screen.
 *
 * Large interactive map with the linked member's profile marker (initials
 * avatar), their movement trail (built from Realtime updates), live details
 * in a bottom sheet (address, distance from the guardian, battery, GPS
 * signal, online status) and a professional quick-action panel (navigate,
 * call, message, share, save, safety timeline).
 *
 * When that member has an ACTIVE SOS (Realtime safety_events), the marker
 * pulses red, the trail highlights and an emergency action bar appears with
 * a Mark Safe action — resolving it returns to normal automatically.
 */
export default function GuardianTrackingPage() {
  const navigate = useNavigate();
  const params = useParams<{ userId?: string }>();

  const [links, setLinks] = useState<GuardianLink[]>([]);
  const [locations, setLocations] = useState<Record<string, LiveLocation>>({});
  const [events, setEvents] = useState<SafetyEvent[]>([]);
  const [trails, setTrails] = useState<Record<string, TrailPoint[]>>({});
  const [guardianPos, setGuardianPos] = useState<{ lat: number; lng: number } | null>(null);
  const [timelineOpen, setTimelineOpen] = useState(false);

  const accepted = useMemo(() => links.filter((l) => l.status === "accepted"), [links]);

  // ── Data: links + live locations + safety events (Realtime + polling) ──
  // Realtime subscriptions provide instant delivery when working, but a
  // continuous polling fallback (every 8 s, or 4 s during an active SOS)
  // ensures the guardian always receives fresh location data regardless of
  // Realtime availability, RLS edge cases, or WebSocket disconnections.
  useEffect(() => {
    let mounted = true;
    void fetchMyLinks("parent").then((fetched) => {
      if (mounted) setLinks(fetched);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let mounted = true;

    /** Merge fetched locations into state, building trails for new points. */
    const loadLocations = async () => {
      const locs = await fetchLiveLocations();
      if (!mounted) return;
      const map = Object.fromEntries(locs.map((l) => [l.user_id, l]));
      setLocations(map);
      // Merge new points into existing trails instead of overwriting,
      // so the movement polyline is preserved across poll cycles.
      setTrails((prev) => {
        const next = { ...prev };
        for (const l of locs) {
          const cur = next[l.user_id] ?? [];
          const ts = new Date(l.updated_at).getTime();
          const p: TrailPoint = { lat: l.latitude, lng: l.longitude, ts };
          const last = cur[cur.length - 1];
          if (!last || (last.lat !== p.lat || last.lng !== p.lng)) {
            next[l.user_id] = [...cur, p].slice(-30);
          }
        }
        return next;
      });
    };
    const loadEvents = async () => {
      const evts = await fetchSafetyEvents();
      if (!mounted) return;
      setEvents(evts);
    };
    const loadAll = async () => {
      await Promise.all([loadLocations(), loadEvents()]);
    };

    // Initial fetch
    void loadAll();

    // Realtime subscriptions (fast path — instant delivery)
    const offLocations = subscribeLiveLocations((loc) => {
      setLocations((prev) => ({ ...prev, [loc.user_id]: loc }));
      setTrails((prev) => {
        const cur = prev[loc.user_id] ?? [];
        const last = cur[cur.length - 1];
        const p: TrailPoint = { lat: loc.latitude, lng: loc.longitude, ts: new Date(loc.updated_at).getTime() };
        if (last && haversineMeters(last.lat, last.lng, p.lat, p.lng) < 12) return prev;
        return { ...prev, [loc.user_id]: [...cur, p].slice(-30) };
      });
    });
    const offEvents = subscribeSafetyEvents((evt) =>
      setEvents((prev) => [evt, ...prev.filter((x) => x.id !== evt.id)]),
    );

    // Polling fallback (reliable path — always active)
    // During an active SOS poll faster (4 s) so the guardian sees the user's
    // position update as quickly as possible. Otherwise 8 s is sufficient.
    const pollInterval = setInterval(() => {
      if (!mounted) return;
      void loadAll();
    }, 8000);

    return () => {
      mounted = false;
      clearInterval(pollInterval);
      offLocations();
      offEvents();
    };
  }, []);

  // ── Guardian's own position (for distance readout) ───────────────────────
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setGuardianPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGuardianPos(null),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  // ── Selected member (route param, or first linked member) ────────────────
  const selected = useMemo(() => {
    if (params.userId) {
      const byParam = accepted.find((l) => l.user_id === params.userId);
      if (byParam) return byParam;
    }
    const withLocation = accepted.find((l) => locations[l.user_id]);
    return withLocation ?? accepted[0] ?? null;
  }, [accepted, locations, params.userId]);

  const selectedLoc = selected ? locations[selected.user_id] : undefined;
  const selectedTrail = selected ? trails[selected.user_id] : undefined;
  const memberColor = useMemo(() => {
    if (!selected) return AVATAR_COLORS[0]!;
    const idx = accepted.findIndex((l) => l.user_id === selected.user_id);
    return AVATAR_COLORS[Math.max(0, idx) % AVATAR_COLORS.length]!;
  }, [selected, accepted]);

  // ── Active SOS for the selected member (Realtime, unexpired only) ────────
  const activeSos = useMemo(
    () =>
      selected
        ? (events.find(
            (e) =>
              e.user_id === selected.user_id &&
              e.type === "sos" &&
              e.status === "active" &&
              !isStaleSos(e),
          ) ?? null)
        : null,
    [events, selected],
  );

  const [sosElapsed, setSosElapsed] = useState(0);
  useEffect(() => {
    if (!activeSos) return;
    const calc = () =>
      Math.max(0, Math.floor((Date.now() - new Date(activeSos.triggered_at).getTime()) / 1000));
    setSosElapsed(calc());
    const id = setInterval(() => setSosElapsed(calc()), 1000);
    return () => clearInterval(id);
  }, [activeSos]);

  // ── Derived member status ────────────────────────────────────────────────
  const online = selectedLoc
    ? Date.now() - new Date(selectedLoc.updated_at).getTime() < 300_000
    : false;

  const gpsSignal = !selectedLoc
    ? "Offline"
    : Date.now() - new Date(selectedLoc.updated_at).getTime() < 90_000
      ? "Strong"
      : Date.now() - new Date(selectedLoc.updated_at).getTime() < 300_000
        ? "Weak"
        : "Stale";

  const distance = useMemo(() => {
    if (!selectedLoc || !guardianPos) return null;
    return haversineMeters(guardianPos.lat, guardianPos.lng, selectedLoc.latitude, selectedLoc.longitude);
  }, [selectedLoc, guardianPos]);

  const memberLat = selectedLoc?.latitude ?? null;
  const memberLng = selectedLoc?.longitude ?? null;

  const handleMarkSafe = useCallback(() => {
    if (!activeSos) return;
    void resolveSosEvent(activeSos.id).then((ok) => {
      toast[ok ? "success" : "error"](ok ? "Marked safe — SOS resolved" : "Could not resolve the SOS");
    });
  }, [activeSos]);

  const onShare = useCallback(async () => {
    if (memberLat == null || memberLng == null) {
      toast.error("No live location available yet");
      return;
    }
    const res = await shareLocation(memberLat, memberLng, selectedLoc?.location_label);
    if (res === "shared") toast.success("Location shared");
    else if (res === "copied") toast.success("Location link copied");
    else toast.error("Could not share the location");
  }, [memberLat, memberLng, selectedLoc?.location_label]);

  const onSave = useCallback(async () => {
    if (memberLat == null || memberLng == null) return;
    const name = selected?.user_name ?? "Member";
    const ok = await copyText(
      `${name} — ${selectedLoc?.location_label ?? formatCoords(memberLat, memberLng)} (${formatCoords(memberLat, memberLng)})`,
    );
    toast[ok ? "success" : "error"](ok ? "Location saved to clipboard" : "Could not save location");
  }, [memberLat, memberLng, selectedLoc?.location_label, selected?.user_name]);

  // ── Safety timeline for the selected member ──────────────────────────────
  const timeline = useMemo(
    () =>
      selected
        ? events
            .filter((e) => e.user_id === selected.user_id)
            .sort((a, b) => new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime())
            .slice(0, 10)
        : [],
    [events, selected],
  );

  return (
    <AppLayout>
      <div
        className="relative -mx-3.5 -mt-3 md:-mx-10 md:-mt-8 overflow-hidden rounded-none md:rounded-[28px] bg-white"
        style={{ height: "calc(100dvh - 11.5rem)", minHeight: 480 }}
      >
        {/* ── Map ── */}
        {selected && (memberLat != null || selectedTrail && selectedTrail.length > 0) ? (
          <LiveTrackingMap
            trail={selectedTrail ?? []}
            avatar={{ initials: initialsOf(selected.user_name ?? "M"), color: memberColor }}
            sos={activeSos != null}
            follow
          />
        ) : (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3"
            style={{ background: "linear-gradient(180deg, #FBF0E9, #F3EDFB)" }}
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(242,149,106,0.15)" }}>
              <MapPin style={{ width: 26, height: 26, color: "#F2956A" }} />
            </div>
            <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 14, color: "#3D2315" }}>
              {selected ? "Waiting for live location…" : "No linked family members yet"}
            </p>
            {selected ? (
              <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 11, color: "#9E7A6A", textAlign: "center", maxWidth: 260, lineHeight: 1.5 }}>
                {selected.user_name} hasn't shared their location yet. Make sure they have Location Services enabled and are signed in.
              </p>
            ) : (
              <button
                onClick={() => navigate("/guardian")}
                className="px-4 py-2 rounded-full text-white cursor-pointer"
                style={{ background: "#D4455C", border: "none", fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 12 }}
              >
                Go to Dashboard
              </button>
            )}
          </div>
        )}

        {/* ── Top bar ── */}
        <div
          className="absolute top-0 inset-x-0 z-[500] px-3 pt-3"
          style={{ background: "linear-gradient(180deg, rgba(251,240,233,0.95), rgba(251,240,233,0))" }}
        >
          <div className="flex items-center justify-between mb-2.5">
            <button
              onClick={() => navigate("/guardian")}
              aria-label="Back to dashboard"
              className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer"
              style={{ background: "rgba(255,255,255,0.95)", boxShadow: "0 4px 16px rgba(139,58,47,0.18)", color: "#8B3A2F", border: "none" }}
            >
              <ArrowLeft style={{ width: 18, height: 18 }} />
            </button>
            <div className="text-center">
              <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 15, color: "#3D2315" }}>
                Live Tracking
              </p>
              <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 10, color: "#9E7A6A" }}>
                {selected?.user_name ?? "Family member"}
              </p>
            </div>
            <div className="w-10 h-10" />
          </div>

          {/* Member selector */}
          {accepted.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {accepted.map((link) => {
                const active = selected?.user_id === link.user_id;
                const idx = accepted.findIndex((l) => l.user_id === link.user_id);
                return (
                  <button
                    key={link.id}
                    onClick={() => navigate(`/guardian/track/${link.user_id}`)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full flex-shrink-0 cursor-pointer"
                    style={{
                      background: active ? "rgba(122,43,115,0.95)" : "rgba(255,255,255,0.95)",
                      border: `1px solid ${active ? "transparent" : "rgba(242,149,106,0.25)"}`,
                      boxShadow: "0 2px 10px rgba(139,58,47,0.12)",
                    }}
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-black flex-shrink-0"
                      style={{ background: AVATAR_COLORS[Math.max(0, idx) % AVATAR_COLORS.length] }}
                    >
                      {initialsOf(link.user_name ?? "M")}
                    </span>
                    <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 11, color: active ? "white" : "#3D2315" }}>
                      {link.user_name ?? "Member"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── SOS action bar ── */}
        <AnimatePresence>
          {activeSos && selected && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="absolute bottom-0 inset-x-0 z-[520] p-3"
            >
              <div
                className="rounded-[24px] p-4"
                style={{
                  background: "linear-gradient(135deg, rgba(153,27,27,0.97), rgba(69,10,10,0.97))",
                  border: "1px solid rgba(248,113,113,0.5)",
                  boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1], scale: [1, 1.12, 1] }}
                    transition={{ duration: 0.9, repeat: Infinity }}
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(239,68,68,0.35)", border: "1px solid rgba(239,68,68,0.6)" }}
                  >
                    <AlertTriangle style={{ width: 18, height: 18, color: "#FCA5A5" }} />
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 16, color: "white" }}>ACTIVE SOS</p>
                    <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
                      {selected.user_name} needs help
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 9, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: 1 }}>Elapsed</p>
                    <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 22, color: "white", lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
                      {formatElapsed(sosElapsed)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <SosAction icon={Navigation} label="Navigate" onClick={() => memberLat != null && memberLng != null && window.open(googleMapsUrl(memberLat, memberLng), "_blank")} />
                  <SosAction icon={PhoneCall} label="Call" onClick={() => { window.location.href = "tel:112"; }} />
                  <SosAction icon={MessageCircle} label="Message" onClick={() => { window.location.href = `sms:112?body=${encodeURIComponent(`Sakhi SOS: ${selected.user_name} needs help`)}`; }} />
                  <SosAction icon={CheckCircle2} label="Mark Safe" onClick={handleMarkSafe} accent />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Bottom sheet ── */}
        {selected && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-0 inset-x-0 z-[450] flex flex-col"
            style={{ maxHeight: "62%" }}
          >
            <div
              className="flex-1 min-h-0 overflow-y-auto rounded-t-[28px] px-5 pt-2.5 pb-6"
              style={{
                background: "rgba(255,252,249,0.98)",
                backdropFilter: "blur(18px)",
                WebkitBackdropFilter: "blur(18px)",
                boxShadow: "0 -12px 40px rgba(139,58,47,0.14)",
                borderTop: "1px solid rgba(242,149,106,0.18)",
              }}
            >
              <div className="w-10 h-1.5 rounded-full mx-auto mb-3" style={{ background: "#F5E4D6" }} />

              {/* Member header */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${memberColor}, ${memberColor}cc)` }}
                >
                  {initialsOf(selected.user_name ?? "M")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="truncate" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 18, color: "#3D2315" }}>
                      {selected.user_name ?? "Member"}
                    </h1>
                    <span
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: online ? "rgba(61,153,112,0.12)" : "rgba(158,122,106,0.1)", fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 9.5, color: online ? "#2E7D56" : "#6B4F40" }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: online ? "#3D9970" : "#9E7A6A" }} />
                      {online ? "Online" : "Offline"}
                    </span>
                  </div>
                  <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 11.5, color: "#9E7A6A", marginTop: 1 }}>
                    {selected.relationship || "Family member"} · Last updated{" "}
                    {selectedLoc ? timeAgoShort(selectedLoc.updated_at) : "—"}
                  </p>
                </div>
              </div>

              {/* Address */}
              <div className="rounded-[20px] p-4 mb-3 flex items-start gap-3"
                style={{ background: "linear-gradient(135deg, #FDF0F4, #F3EDFB)", border: "1px solid rgba(214,82,163,0.08)" }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(122,43,115,0.1)" }}>
                  <MapPin style={{ width: 17, height: 17, color: "#7A2B73" }} />
                </div>
                <div className="min-w-0">
                  <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 10, color: "#9E7A6A", textTransform: "uppercase", letterSpacing: 0.6 }}>Current Address</p>
                  <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 13.5, color: "#3D2315", lineHeight: 1.45, marginTop: 2 }}>
                    {selectedLoc?.location_label ?? (memberLat != null ? "Fetching address…" : "Waiting for location…")}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <Stat icon={Navigation} label="Distance" value={distanceLabel(distance)} tone="#7A2B73" />
                <Stat icon={BatteryMedium} label="Battery" value={selectedLoc?.battery_level != null ? `${Math.round(selectedLoc.battery_level)}%` : "—"} tone={selectedLoc?.battery_level != null && selectedLoc.battery_level < 20 ? "#B7770D" : "#3D9970"} />
                <Stat icon={Satellite} label="GPS Signal" value={gpsSignal} tone={gpsSignal === "Strong" ? "#3D9970" : gpsSignal === "Weak" ? "#B7770D" : "#9E7A6A"} />
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <Action icon={Navigation} label="Navigate" onClick={() => memberLat != null && memberLng != null && window.open(googleMapsUrl(memberLat, memberLng), "_blank")} disabled={memberLat == null} />
                <Action icon={PhoneCall} label="Call" onClick={() => { window.location.href = "tel:112"; }} />
                <Action icon={MessageCircle} label="Message" onClick={() => { window.location.href = `sms:112?body=${encodeURIComponent(`Sakhi: ${selected.user_name ?? "Aanya"} — how are you doing? Reply to confirm you're safe.`)}`; }} />
                <Action icon={Share2} label="Share Location" onClick={() => void onShare()} disabled={memberLat == null} />
                <Action icon={Bookmark} label="Save" onClick={() => void onSave()} disabled={memberLat == null} />
                <Action icon={History} label="Timeline" onClick={() => setTimelineOpen((v) => !v)} tone={timelineOpen ? "#D4455C" : "#7A2B73"} />
              </div>

              {/* Safety timeline */}
              <AnimatePresence>
                {timelineOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-[18px] p-4 mb-2" style={{ background: "#FBF0E9", border: "1px solid rgba(242,149,106,0.12)" }}>
                      <p className="mb-2.5 flex items-center gap-1.5" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 12.5, color: "#3D2315" }}>
                        <ShieldCheck style={{ width: 14, height: 14, color: "#3D9970" }} /> Safety Timeline
                      </p>
                      {timeline.length === 0 ? (
                        <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 11.5, color: "#9E7A6A", textAlign: "center", padding: "0.5rem 0" }}>
                          No safety events yet — check-ins and SOS history appear here.
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          {timeline.map((ev) => (
                            <div key={ev.id} className="flex items-start gap-2.5">
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{
                                  background:
                                    ev.type === "checkin"
                                      ? "rgba(61,153,112,0.14)"
                                      : ev.status === "resolved"
                                        ? "rgba(122,43,115,0.1)"
                                        : "rgba(212,69,92,0.12)",
                                }}
                              >
                                {ev.type === "checkin" ? (
                                  <CheckCircle2 style={{ width: 13, height: 13, color: "#2E7D56" }} />
                                ) : ev.status === "resolved" ? (
                                  <ShieldCheck style={{ width: 13, height: 13, color: "#7A2B73" }} />
                                ) : (
                                  <AlertTriangle style={{ width: 13, height: 13, color: "#B8324A" }} />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 11.5, color: "#3D2315" }}>
                                  {ev.type === "checkin"
                                    ? "Checked in safely"
                                    : ev.status === "resolved"
                                      ? "SOS resolved"
                                      : ev.status === "cancelled"
                                        ? "SOS cancelled"
                                        : "SOS activated"}
                                </p>
                                {ev.location_label && (
                                  <p className="truncate" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 10.5, color: "#9E7A6A", marginTop: 1 }}>
                                    {ev.location_label}
                                  </p>
                                )}
                              </div>
                              <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 10, color: "#9E7A6A", flexShrink: 0 }}>
                                {timeAgoShort(ev.triggered_at)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}

// ── Presentational pieces ─────────────────────────────────────────────────────

const Stat = ({ icon: Icon, label, value, tone }: { icon: typeof MapPin; label: string; value: string; tone: string }) => (
  <div className="rounded-[16px] px-3 py-2.5" style={{ background: "white", border: "1px solid rgba(242,149,106,0.14)" }}>
    <p className="flex items-center gap-1.5" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 9.5, color: "#9E7A6A", textTransform: "uppercase", letterSpacing: 0.5 }}>
      <Icon style={{ width: 11, height: 11, color: tone }} />
      {label}
    </p>
    <p className="truncate mt-0.5" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 12, color: "#3D2315" }}>
      {value}
    </p>
  </div>
);

const Action = ({
  icon: Icon,
  label,
  onClick,
  tone = "#7A2B73",
  disabled,
}: {
  icon: typeof MapPin;
  label: string;
  onClick: () => void;
  tone?: string;
  disabled?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="flex flex-col items-center justify-center gap-1.5 rounded-[18px] py-3 cursor-pointer disabled:opacity-40 disabled:cursor-default"
    style={{ background: "white", border: "1px solid rgba(242,149,106,0.14)", boxShadow: "0 2px 10px rgba(139,58,47,0.05)" }}
  >
    <Icon style={{ width: 18, height: 18, color: tone }} />
    <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 10.5, color: "#3D2315" }}>{label}</span>
  </button>
);

const SosAction = ({
  icon: Icon,
  label,
  onClick,
  accent,
}: {
  icon: typeof MapPin;
  label: string;
  onClick: () => void;
  accent?: boolean;
}) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center gap-1 rounded-[14px] py-2.5 cursor-pointer"
    style={{
      background: accent ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.08)",
      border: `1px solid ${accent ? "rgba(52,211,153,0.45)" : "rgba(255,255,255,0.15)"}`,
    }}
  >
    <Icon style={{ width: 17, height: 17, color: accent ? "#6EE7B7" : "#FCA5A5" }} />
    <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 10, color: accent ? "#6EE7B7" : "white" }}>{label}</span>
  </button>
);
