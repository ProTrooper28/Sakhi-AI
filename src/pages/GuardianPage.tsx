import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import AppLayout from "@/components/AppLayout";
import { fetchMyLinks } from "@/lib/guardians";
import type { GuardianLink } from "@/lib/auth-types";
import { isSupabaseConfigured } from "@/lib/supabase";
import { startSOSAlarmLoop, stopSOSAlarmLoop, playSuccessChimeSound } from "@/lib/audio";
import {
  fetchLiveLocations,
  fetchSafetyEvents,
  resolveSosEvent,
  subscribeLiveLocations,
  subscribeSafetyEvents,
  type LiveLocation,
  type SafetyEvent,
} from "@/lib/safety";
import { NormalDashboard } from "./guardian/NormalDashboard";
import { EmergencyMode } from "./guardian/EmergencyMode";

/**
 * Guardian monitoring dashboard (/guardian).
 *
 * Two completely different visual states, driven ONLY by the realtime SOS
 * status of linked users (RLS-scoped safety_events via Supabase Realtime):
 *
 *   • No active SOS  → calm, premium NormalDashboard (white / pink / lavender)
 *   • status active  → dark EmergencyMode (deep red / black, pulsing, timer)
 *   • status resolved → success celebration, then automatic return to calm
 *
 * When no backend is configured (pure offline demo), the local AppContext SOS
 * flag is the fallback so the demo still works.
 */
const GuardianPage = () => {
  const { sosState, resolveSOS } = useApp();
  const { role, displayName } = useAuth();
  const isParent = role === "parent";

  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState<{ userName: string } | null>(null);
  const [elapsedSecs, setElapsedSecs] = useState(0);

  // ── Real-time safety data (Supabase Realtime, RLS-scoped to linked users) ──
  const [events, setEvents] = useState<SafetyEvent[]>([]);
  const [locations, setLocations] = useState<Record<string, LiveLocation>>({});
  const [links, setLinks] = useState<GuardianLink[]>([]);

  const reloadLinks = useCallback(async () => {
    const fetched = await fetchMyLinks("parent");
    setLinks(fetched);
  }, []);

  useEffect(() => {
    if (!isParent) return;
    let mounted = true;
    void fetchMyLinks("parent").then((fetched) => {
      if (mounted) setLinks(fetched);
    });
    return () => {
      mounted = false;
    };
  }, [isParent]);

  // Snapshot + subscribe: events (SOS / check-ins) and live locations update
  // automatically — no manual refresh. RLS only delivers rows the guardian is
  // allowed to see (accepted linked users).
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let mounted = true;
    void fetchSafetyEvents().then((evts) => {
      if (mounted) setEvents(evts);
    });
    void fetchLiveLocations().then((locs) => {
      if (mounted) setLocations(Object.fromEntries(locs.map((l) => [l.user_id, l])));
    });
    const offEvents = subscribeSafetyEvents((evt) =>
      setEvents((prev) => [evt, ...prev.filter((x) => x.id !== evt.id)]),
    );
    const offLocations = subscribeLiveLocations((loc) =>
      setLocations((prev) => ({ ...prev, [loc.user_id]: loc })),
    );
    return () => {
      mounted = false;
      offEvents();
      offLocations();
    };
  }, []);

  const userNameFor = useCallback(
    (userId: string) => links.find((l) => l.user_id === userId)?.user_name ?? "Linked user",
    [links],
  );

  // The active SOS event for a linked user (from Supabase, another device) —
  // the ONE source of truth for Emergency Mode. When no backend is wired up
  // (pure offline demo) the local AppContext SOS flag is the fallback.
  const activeRemoteSos = events.find((e) => e.type === "sos" && e.status === "active") ?? null;

  const activeSos = useMemo(() => {
    if (activeRemoteSos) {
      const loc = locations[activeRemoteSos.user_id];
      return {
        user_id: activeRemoteSos.user_id,
        userName: userNameFor(activeRemoteSos.user_id),
        triggeredAt: activeRemoteSos.triggered_at,
        locationLabel: loc?.location_label ?? activeRemoteSos.location_label,
        lat: loc?.latitude ?? activeRemoteSos.latitude,
        lng: loc?.longitude ?? activeRemoteSos.longitude,
      };
    }
    if (!isSupabaseConfigured && sosState.active) {
      return {
        user_id: null as string | null,
        userName: sosState.userName,
        triggeredAt: sosState.triggeredAt,
        locationLabel: sosState.location || null,
        lat: sosState.coords.lat,
        lng: sosState.coords.lng,
      };
    }
    return null;
  }, [activeRemoteSos, locations, sosState, userNameFor]);

  const isSOS = activeSos != null;

  // Live position + battery for the SOS user (updates via Realtime).
  const userLoc = useMemo(() => {
    if (!activeSos) return null;
    const loc = activeSos.user_id ? locations[activeSos.user_id] : undefined;
    const lat = loc?.latitude ?? activeSos.lat ?? 19.0596;
    const lng = loc?.longitude ?? activeSos.lng ?? 72.8295;
    const updatedAgo = loc ? (Date.now() - new Date(loc.updated_at).getTime()) / 1000 : null;
    return {
      lat,
      lng,
      label: loc?.location_label ?? activeSos.locationLabel ?? "Fetching address…",
      battery: loc?.battery_level ?? null,
      updatedAgo,
    };
  }, [activeSos, locations]);

  // ── Success celebration: the moment an active SOS resolves, play the chime
  //    and show a brief "✅ X is Safe" overlay before returning to the calm
  //    dashboard. Triggered ONLY by a real active → resolved transition.
  const prevSosActiveRef = useRef(isSOS);
  const sosNameRef = useRef<string>("Aanya");
  useEffect(() => {
    const wasActive = prevSosActiveRef.current;
    prevSosActiveRef.current = isSOS;
    if (isSOS && activeSos) sosNameRef.current = activeSos.userName;
    if (wasActive && !isSOS) {
      stopSOSAlarmLoop();
      playSuccessChimeSound();
      setCelebrating({ userName: sosNameRef.current });
      const t = setTimeout(() => setCelebrating(null), 3000);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSOS]);

  // ── Guardian alerting: alarm when a linked user's SOS goes live. ──
  const remoteActiveRef = useRef(false);
  useEffect(() => {
    const active = activeRemoteSos != null;
    if (active && !remoteActiveRef.current) startSOSAlarmLoop(true);
    else if (!active && remoteActiveRef.current) stopSOSAlarmLoop();
    remoteActiveRef.current = active;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRemoteSos?.id]);
  useEffect(() => () => stopSOSAlarmLoop(), []);

  // ── Chime on new safe check-ins. ──
  const checkinCountRef = useRef(0);
  useEffect(() => {
    const count = events.filter((e) => e.type === "checkin").length;
    if (count > checkinCountRef.current && checkinCountRef.current > 0) playSuccessChimeSound();
    checkinCountRef.current = count;
  }, [events]);

  // ── Emergency timer (counts up from the SOS trigger time). ──
  useEffect(() => {
    if (!isSOS || !activeSos?.triggeredAt) return;
    const calc = () =>
      Math.max(0, Math.floor((Date.now() - new Date(activeSos.triggeredAt).getTime()) / 1000));
    setElapsedSecs(calc());
    const id = setInterval(() => setElapsedSecs(calc()), 1000);
    return () => clearInterval(id);
  }, [isSOS, activeSos?.triggeredAt]);

  const handleAction = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const handleMarkSafe = () => {
    if (activeRemoteSos) {
      // Remote (other device): resolve in Supabase — the dashboard flips back
      // to the calm view automatically via Realtime, with the success overlay.
      void resolveSosEvent(activeRemoteSos.id);
      handleAction("Emergency resolved — marked safe");
    } else {
      // Offline demo: resolve the local AppContext SOS.
      resolveSOS();
      handleAction("Emergency resolved — marked safe");
    }
  };

  return (
    <AppLayout>
      <div
        style={{
          background: isSOS ? "transparent" : "linear-gradient(180deg, #FBF0E9 0%, #F7EDF6 60%, #F3EDFB 100%)",
          minHeight: "100vh",
          transition: "background 0.5s ease",
          paddingBottom: "7rem",
        }}
      >
        {/* Dark emergency ambient (only while an SOS is active) */}
        {isSOS && <div className="guardian-emergency-bg fixed inset-0 z-0" />}

        <div className="relative max-w-3xl mx-auto px-4 pt-4" style={{ zIndex: 10 }}>
          {/* ── Dashboard header ── */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {isSOS && (
                  <motion.div
                    animate={{ opacity: [1, 0.2, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: "#EF4444" }}
                  />
                )}
                <h1 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 22, color: isSOS ? "white" : "#3D2315" }}>
                  {isSOS ? "Emergency Response" : "Guardian Dashboard"}
                </h1>
              </div>
              <span className="flex items-center gap-1.5" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 11, color: isSOS ? "rgba(255,255,255,0.5)" : "#9E7A6A" }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: isSOS ? "#EF4444" : "#3D9970" }} />
                {isSOS ? "Live emergency — realtime updates active" : "Monitoring in real time — no active emergencies"}
              </span>
            </div>
            {isSOS && (
              <span
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0"
                style={{ background: "rgba(239,68,68,0.18)", border: "1px solid rgba(239,68,68,0.4)" }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#EF4444", animation: "dot-pulse 0.8s ease-in-out infinite" }} />
                <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 10, color: "#FCA5A5", textTransform: "uppercase" }}>
                  SOS Active
                </span>
              </span>
            )}
          </div>

          {!isSOS ? (
            <AnimatePresence mode="wait">
              <motion.div
                key="calm"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                {isParent ? (
                  <NormalDashboard
                    links={links}
                    locations={locations}
                    events={events}
                    displayName={displayName}
                    reloadLinks={reloadLinks}
                  />
                ) : (
                  <div className="rounded-[24px] p-6 text-center" style={{ background: "white", boxShadow: "0 4px 20px rgba(139,58,47,0.05)" }}>
                    <ShieldCheck className="w-12 h-12 text-[#3D9970] mx-auto mb-3" />
                    <h2 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 18, color: "#3D2315" }}>No Active Emergencies</h2>
                    <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 13, color: "#9E7A6A", marginTop: 4 }}>
                      Everyone is safe. You will be notified if an SOS is triggered.
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key="emergency"
                initial={{ opacity: 0, scale: 0.985 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.01 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <EmergencyMode
                  userName={activeSos?.userName ?? "Linked user"}
                  locationLabel={userLoc?.label ?? null}
                  elapsedSecs={elapsedSecs}
                  userLoc={userLoc}
                  onMarkSafe={handleMarkSafe}
                />
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Toast */}
        <AnimatePresence>
          {actionFeedback && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-5 py-3 rounded-full shadow-xl"
              style={{ background: "#3D9970", color: "white", fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 13 }}
            >
              <CheckCircle2 className="w-4 h-4" /> {actionFeedback}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── "✅ X is Safe" success celebration ── */}
        <AnimatePresence>
          {celebrating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="fixed inset-0 z-[100] flex items-center justify-center"
              style={{ background: "linear-gradient(180deg, rgba(16,185,129,0.35), rgba(253,240,233,0.97) 75%)", backdropFilter: "blur(6px)" }}
            >
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 18 }}
                className="text-center px-6"
              >
                <motion.div
                  animate={{ scale: [1, 1.12, 1] }}
                  transition={{ duration: 0.8, repeat: 2 }}
                  className="w-24 h-24 rounded-full mx-auto mb-5 flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #34D399, #10B981)", boxShadow: "0 20px 50px rgba(16,185,129,0.45)" }}
                >
                  <CheckCircle2 style={{ width: 44, height: 44, color: "white" }} />
                </motion.div>
                <h2 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 26, color: "#064E3B" }}>
                  ✅ {celebrating.userName} is Safe
                </h2>
                <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 14, color: "#3D2315", marginTop: 6, opacity: 0.75 }}>
                  SOS resolved — returning to normal monitoring…
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
};

export default GuardianPage;
