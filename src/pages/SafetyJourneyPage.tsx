import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin, Navigation2, ShieldCheck, Sparkles, Phone, Search, CheckCircle2,
  AlertTriangle, ChevronLeft, Clock, Footprints, Car, Bike, Bus, UserCheck,
  Share2, Zap, Shield,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/components/ui/use-toast";
import {
  geocodeSearch,
  fetchRouteOptions,
  buildSafetyGeoJson,
  safetyZonesFromGeoJson,
  haversineMeters,
  shareLocation,
  formatTime,
  setSharingEnabled,
  type Destination,
} from "@/pages/location/helpers";
import {
  TRAVEL_MODES,
  type TravelMode,
  type Journey,
  readJourney,
  startJourney as createJourney,
  cancelJourney,
  clearJourney,
  evaluatePosition,
  emptyJourney,
  deviationResponseRemainingSec,
  generateInsights,
} from "@/lib/safety";
import { upsertLiveLocation, sendSafeCheckIn } from "@/lib/safety";
import { isSupabaseConfigured } from "@/lib/supabase";

// ─── Leaflet icon defaults (same as the Risk Map page) ───────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const FALLBACK_POINT: [number, number] = [19.0596, 72.8295];

const makeUserIcon = () =>
  L.divIcon({
    html: `
      <div class="relative flex items-center justify-center w-10 h-10">
        <div class="absolute inset-0 bg-[#D4455C]/30 rounded-full animate-ping"></div>
        <div class="absolute inset-0 bg-[#D4455C]/20 rounded-full animate-pulse scale-150"></div>
        <div class="relative z-10 w-4 h-4 bg-[#D4455C] border-[3px] border-white rounded-full shadow-lg"></div>
      </div>`,
    className: "",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

const destIcon = L.divIcon({
  html: `<div class="bg-slate-900 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white"><div class="w-2 h-2 bg-white rounded-full"></div></div>`,
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const MODE_ICON: Record<TravelMode, typeof Car> = {
  walking: Footprints,
  cab: Car,
  auto: Car,
  bike: Bike,
  public: Bus,
};

// ─── ETA helpers ─────────────────────────────────────────────────────────────
const etaCountdown = (targetMs: number | null): string => {
  if (!targetMs) return "—";
  const diff = Math.max(0, targetMs - Date.now());
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
};

const formatEtaClock = (targetMs: number | null): string =>
  targetMs ? formatTime(new Date(targetMs)) : "—";

// ─── Main page ───────────────────────────────────────────────────────────────
const SafetyJourneyPage = () => {
  const navigate = useNavigate();
  const { locationState, triggerSOS, requestLocation } = useApp();
  const { user, guest } = useAuth();

  const [journey, setJourney] = useState<Journey>(() => readJourney());
  const [searchQuery, setSearchQuery] = useState("");
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selectedDest, setSelectedDest] = useState<Destination | null>(null);
  const [mode, setMode] = useState<TravelMode>("walking");
  const [deviationPrompt, setDeviationPrompt] = useState<{ message: string; askedAt: number } | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [notifyOnComplete, setNotifyOnComplete] = useState(true);
  const [searching, setSearching] = useState(false);

  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const deviationAckedRef = useRef(false);

  const currentPos = useMemo<[number, number]>(
    () => (locationState.coords ? [locationState.coords.lat, locationState.coords.lng] : FALLBACK_POINT),
    [locationState.coords],
  );

  const guardianConnected = isSupabaseConfigured && !!user && !guest;

  // ── Map lifecycle ──
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = L.map(containerRef.current, {
      center: currentPos,
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png").addTo(map);
    userMarkerRef.current = L.marker(currentPos, { icon: makeUserIcon(), zIndexOffset: 1000 }).addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Keep the user marker pinned to live GPS.
  useEffect(() => {
    if (!userMarkerRef.current || !locationState.coords) return;
    userMarkerRef.current.setLatLng([locationState.coords.lat, locationState.coords.lng]);
  }, [locationState.coords]);

  // Draw the planned route when a journey is active.
  useEffect(() => {
    const layer = routeLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (journey.status === "active" && journey.routePoints.length > 1) {
      L.polyline(journey.routePoints as [number, number][], {
        color: "#D4455C",
        weight: 5,
        opacity: 0.85,
      }).addTo(layer);
      if (mapRef.current) {
        mapRef.current.fitBounds(L.polyline(journey.routePoints as [number, number][]).getBounds(), { padding: [60, 60] });
      }
    }
    if (journey.status === "active" && journey.destination) {
      L.marker([journey.destination.lat, journey.destination.lng], { icon: destIcon }).addTo(layer);
    }
  }, [journey.status, journey.routePoints, journey.destination]);

  // ── Destination search ──
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const results = await geocodeSearch(searchQuery);
    setDestinations(results);
    setSearching(false);
  };

  const pickDestination = (d: Destination) => {
    setSelectedDest(d);
    setDestinations([]);
    setSearchQuery(d.label.split(",").slice(0, 2).join(","));
  };

  // ── Start the journey ──
  const handleStart = useCallback(async () => {
    if (!selectedDest) {
      toast({ title: "Choose a destination", description: "Search for a place to start your Safety Journey." });
      return;
    }
    // Enable sharing + fetch a real route (OSRM public API; falls back to straight line).
    setSharingEnabled(true);
    const zones = safetyZonesFromGeoJson(buildSafetyGeoJson(currentPos as unknown as { lat: number; lng: number }));
    const options = await fetchRouteOptions(
      { lat: currentPos[0], lng: currentPos[1] },
      { lat: selectedDest.lat, lng: selectedDest.lng },
      zones,
    );
    const route = options[0] ?? {
      id: "fastest",
      label: "Fastest Route",
      points: [[currentPos[0], currentPos[1]], [selectedDest.lat, selectedDest.lng]] as [number, number][],
      durationSec: haversineMeters(currentPos[0], currentPos[1], selectedDest.lat, selectedDest.lng) / 8,
      distanceM: haversineMeters(currentPos[0], currentPos[1], selectedDest.lat, selectedDest.lng),
      safety: "moderate",
      safetyScore: 50,
    };

    const j = createJourney({
      destination: selectedDest,
      mode,
      routePoints: route.points,
      distanceM: route.distanceM,
      durationSec: route.durationSec,
    });
    setJourney(j);
    deviationAckedRef.current = false;

    // Guardian gets the live location immediately (existing pipeline).
    if (guardianConnected) {
      void upsertLiveLocation({ lat: currentPos[0], lng: currentPos[1], label: locationState.address });
    }
    toast({ title: "Journey Started", description: "AI monitoring is active. Your guardian can follow live." });
  }, [selectedDest, mode, currentPos, guardianConnected, locationState.address]);

  // ── Live monitoring: evaluate every GPS fix ──
  useEffect(() => {
    if (journey.status !== "active" || !locationState.coords) return;
    const { journey: updated, alerts } = evaluatePosition(journey, locationState.coords, {
      inactivityAlertSec: 90,
    });
    setJourney(updated);

    // Push live position to the guardian (throttled inside the engine callers).
    if (guardianConnected && updated.status === "active") {
      void upsertLiveLocation({
        lat: locationState.coords.lat,
        lng: locationState.coords.lng,
        label: locationState.address,
      });
    }

    for (const alert of alerts) {
      if (alert.kind === "deviation" && !deviationAckedRef.current) {
        deviationAckedRef.current = true;
        setDeviationPrompt({ message: alert.message, askedAt: Date.now() });
      }
      if (alert.kind === "arrived") {
        if (notifyOnComplete && guardianConnected) {
          void sendSafeCheckIn({ lat: locationState.coords.lat, lng: locationState.coords.lng, label: locationState.address });
        }
        toast({ title: "Journey Completed Safely", description: "Your guardian has been notified." });
      }
    }
  }, [locationState.coords, locationState.address, journey.status, journey.id, guardianConnected, notifyOnComplete]);

  // ── Insights (Feature 7) — refreshed while journeying ──
  useEffect(() => {
    if (journey.status !== "active" || !journey.destination) return;
    const remainingM = journey.destination
      ? haversineMeters(
          locationState.coords?.lat ?? journey.lastPosition?.lat ?? journey.destination.lat,
          locationState.coords?.lng ?? journey.lastPosition?.lng ?? journey.destination.lng,
          journey.destination.lat,
          journey.destination.lng,
        )
      : 0;
    const progressPct = journey.distanceM > 0 ? Math.max(0, Math.min(1, 1 - remainingM / journey.distanceM)) : 0;
    setInsights(
      generateInsights({
        journeyActive: true,
        progressPct,
        remainingM,
        etaMs: journey.expectedArrivalMs,
        gpsOk: !!locationState.coords,
        guardianTracking: guardianConnected,
        inactiveSec: journey.lastPosition ? Math.floor((Date.now() - journey.lastPosition.at) / 1000) : 0,
      }),
    );
  }, [journey, locationState.coords, guardianConnected]);

  // ── Deviation response timer ──
  const [responseLeft, setResponseLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!deviationPrompt) return;
    const id = setInterval(() => {
      setResponseLeft(deviationResponseRemainingSec(deviationPrompt.askedAt));
    }, 1000);
    return () => clearInterval(id);
  }, [deviationPrompt]);

  const acknowledgeDeviation = () => {
    setDeviationPrompt(null);
    deviationAckedRef.current = false; // allow future prompts
  };

  const handleCancel = () => {
    const updated = cancelJourney(journey);
    setJourney(updated);
    toast({ title: "Journey Ended", description: "Monitoring stopped. Stay safe." });
  };

  const resetToPlanning = () => {
    clearJourney();
    setJourney(emptyJourney());
    setSelectedDest(null);
    setSearchQuery("");
  };

  // ── Render: active / completed ──
  const active = journey.status === "active";
  const completed = journey.status === "completed";

  return (
    <AppLayout>
      <div className="relative min-h-[calc(100vh-96px)]" style={{ background: "#FDF6EE" }}>
        {/* Map */}
        <div ref={containerRef} className="absolute inset-0 z-0" />

        {/* ── Top bar ── */}
        <div className="absolute top-0 left-0 right-0 z-20 pt-5 px-4 flex items-center justify-between pointer-events-none">
          <motion.button
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => navigate("/home")}
            className="pointer-events-auto w-10 h-10 rounded-full bg-white shadow-xl border border-slate-100 flex items-center justify-center cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 text-[#8B3A2F]" />
          </motion.button>
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-auto flex items-center gap-2 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-xl border border-[#F5E4D6]"
          >
            <span className="relative flex w-2.5 h-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3D9970] opacity-60" />
              <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-[#3D9970]" />
            </span>
            <span className="text-xs font-extrabold text-[#3D2315]" style={{ fontFamily: "Nunito,sans-serif" }}>
              {active ? "Safety Journey Active" : completed ? "Journey Complete" : "Safety Journey"}
            </span>
          </motion.div>
          <div className="w-10" />
        </div>

        {/* ── Bottom sheet: setup ── */}
        <AnimatePresence>
          {journey.status === "planning" && (
            <motion.div
              key="setup"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              className="absolute bottom-[5.5rem] md:bottom-8 left-0 right-0 z-30 px-4 pb-[env(safe-area-inset-bottom)]"
            >
              <div className="max-w-md mx-auto bg-white rounded-[28px] shadow-2xl border border-slate-50 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#F2956A,#D4455C)" }}>
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-[#3D2315]" style={{ fontFamily: "Nunito,sans-serif" }}>Safety Journey</h2>
                    <p className="text-[11px] font-bold text-[#9E7A6A]">I'll monitor your route, ETA and deviations — and your guardian can follow live.</p>
                  </div>
                </div>

                {/* Destination search */}
                <div className="relative mb-3">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E7A6A]" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                    placeholder="Where are you heading?"
                    className="w-full bg-[#FDF6EE] border border-[#F5E4D6] rounded-2xl pl-11 pr-4 py-3 text-sm font-bold text-[#3D2315] outline-none focus:border-[#F2956A]/50 transition-all"
                  />
                  {searching && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#D4455C] border-t-transparent rounded-full animate-spin" />}
                </div>

                {destinations.length > 0 && (
                  <div className="mb-3 rounded-2xl border border-[#F5E4D6] overflow-hidden bg-white max-h-44 overflow-y-auto">
                    {destinations.map((d, i) => (
                      <button
                        key={i}
                        onClick={() => pickDestination(d)}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-[#FDF6EE] transition-colors cursor-pointer border-b border-[#F5E4D6]/60 last:border-0"
                      >
                        <MapPin className="w-3.5 h-3.5 text-[#D4455C] flex-shrink-0" />
                        <span className="text-xs font-bold text-[#3D2315] truncate">{d.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {selectedDest && (
                  <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-[#FBDDE3] border border-[#D4455C]/20">
                    <CheckCircle2 className="w-4 h-4 text-[#D4455C] flex-shrink-0" />
                    <span className="text-[11px] font-extrabold text-[#8B3A2F] truncate" style={{ fontFamily: "Nunito,sans-serif" }}>
                      {selectedDest.label}
                    </span>
                  </div>
                )}

                {/* Travel mode */}
                <p className="text-[10px] font-black uppercase tracking-widest text-[#9E7A6A] mb-2">Travel Mode</p>
                <div className="grid grid-cols-5 gap-1.5 mb-4">
                  {TRAVEL_MODES.map((m) => {
                    const Icon = MODE_ICON[m.id];
                    const selected = mode === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setMode(m.id)}
                        className={`flex flex-col items-center gap-1 py-2.5 rounded-2xl border transition-all cursor-pointer ${
                          selected ? "bg-[#D4455C] border-[#D4455C] shadow-lg shadow-[#D4455C]/20" : "bg-white border-[#F5E4D6] hover:border-[#F2956A]/40"
                        }`}
                      >
                        <Icon className={`w-4.5 h-4.5 ${selected ? "text-white" : "text-[#8B3A2F]"}`} />
                        <span className={`text-[8px] font-extrabold ${selected ? "text-white" : "text-[#9E7A6A]"}`} style={{ fontFamily: "Nunito,sans-serif" }}>
                          {m.id === "public" ? "Public" : m.id === "walking" ? "Walk" : m.id === "cab" ? "Cab" : m.id === "auto" ? "Auto" : "Bike"}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Optional notify guardian on arrival */}
                <label className="flex items-center gap-2 mb-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyOnComplete}
                    onChange={(e) => setNotifyOnComplete(e.target.checked)}
                    className="w-4 h-4 accent-[#D4455C]"
                  />
                  <span className="text-[11px] font-bold text-[#9E7A6A]" style={{ fontFamily: "Nunito,sans-serif" }}>
                    Notify guardian when I arrive safely
                  </span>
                </label>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleStart}
                  disabled={!selectedDest}
                  className="w-full py-3.5 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 transition-all"
                  style={{ background: "linear-gradient(135deg,#F2956A,#D4455C)", boxShadow: "0 8px 24px rgba(212,69,92,0.25)", fontFamily: "Nunito,sans-serif" }}
                >
                  <Navigation2 className="w-4 h-4" />
                  Start Safety Journey
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── Active journey bottom sheet ── */}
          {active && journey.destination && (
            <motion.div
              key="active"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              className="absolute bottom-[5.5rem] md:bottom-8 left-0 right-0 z-30 px-4 pb-[env(safe-area-inset-bottom)]"
            >
              <div className="max-w-md mx-auto bg-white/95 backdrop-blur rounded-[28px] shadow-2xl border border-slate-50 p-5">
                {/* Journey Started header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#3D9970]/10 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4 text-[#3D9970]" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-[#3D2315]" style={{ fontFamily: "Nunito,sans-serif" }}>Journey Started</p>
                      <p className="text-[10px] font-bold text-[#9E7A6A]">{journey.destination.label.split(",").slice(0, 2).join(",")}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1.5 rounded-full bg-[#FBDDE3] text-[10px] font-extrabold text-[#B8324A] cursor-pointer"
                    style={{ fontFamily: "Nunito,sans-serif" }}
                  >
                    End Journey
                  </button>
                </div>

                {/* ETA + guardian + AI status */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="rounded-2xl bg-[#FDF6EE] p-3 text-center">
                    <Clock className="w-4 h-4 mx-auto text-[#B7770D] mb-1" />
                    <p className="text-[9px] font-black uppercase tracking-wider text-[#9E7A6A]">ETA</p>
                    <p className="text-sm font-black text-[#3D2315]" style={{ fontFamily: "Nunito,sans-serif" }}>{etaCountdown(journey.expectedArrivalMs)}</p>
                    <p className="text-[9px] font-bold text-[#9E7A6A]">{formatEtaClock(journey.expectedArrivalMs)}</p>
                  </div>
                  <div className="rounded-2xl bg-[#FDF6EE] p-3 text-center">
                    <UserCheck className="w-4 h-4 mx-auto text-[#3D9970] mb-1" />
                    <p className="text-[9px] font-black uppercase tracking-wider text-[#9E7A6A]">Guardian</p>
                    <p className="text-sm font-black text-[#3D2315]" style={{ fontFamily: "Nunito,sans-serif" }}>{guardianConnected ? "Tracking" : "Demo mode"}</p>
                  </div>
                  <div className="rounded-2xl bg-[#FDF6EE] p-3 text-center">
                    <Sparkles className="w-4 h-4 mx-auto text-[#D4455C] mb-1" />
                    <p className="text-[9px] font-black uppercase tracking-wider text-[#9E7A6A]">AI</p>
                    <p className="text-sm font-black text-[#3D2315]" style={{ fontFamily: "Nunito,sans-serif" }}>Monitoring</p>
                  </div>
                </div>

                {/* Insights (Feature 7) */}
                <div className="mb-3 space-y-1.5">
                  {insights.slice(0, 2).map((ins, i) => (
                    <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-xl bg-[#D6F5EA]/60">
                      <Sparkles className="w-3.5 h-3.5 text-[#3D9970] mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] font-bold text-[#2E7D56]" style={{ fontFamily: "Nunito,sans-serif" }}>{ins}</p>
                    </div>
                  ))}
                </div>

                {/* Quick actions */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { icon: Share2, label: "Share", act: () => { void shareLocation(locationState.coords?.lat ?? currentPos[0], locationState.coords?.lng ?? currentPos[1], locationState.address); } },
                    { icon: Phone, label: "Call", act: () => { window.location.href = "tel:112"; } },
                    { icon: MapPin, label: "Police", act: () => navigate("/risk-map") },
                    { icon: Zap, label: "SOS", act: () => { triggerSOS(); navigate("/sos"); } },
                  ].map(({ icon: Icon, label, act }) => (
                    <button
                      key={label}
                      onClick={act}
                      className={`flex flex-col items-center gap-1 py-2.5 rounded-2xl cursor-pointer transition-all ${label === "SOS" ? "bg-[#D4455C] text-white shadow-lg shadow-[#D4455C]/25" : "bg-[#FDF6EE] hover:bg-[#F5E4D6]"}`}
                    >
                      <Icon className="w-4 h-4" style={{ color: label === "SOS" ? "white" : "#8B3A2F" }} />
                      <span className="text-[9px] font-extrabold" style={{ fontFamily: "Nunito,sans-serif", color: label === "SOS" ? "white" : "#8B3A2F" }}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Completion screen ── */}
          {completed && (
            <motion.div
              key="done"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              className="absolute bottom-[5.5rem] md:bottom-8 left-0 right-0 z-30 px-4 pb-[env(safe-area-inset-bottom)]"
            >
              <div className="max-w-md mx-auto bg-white rounded-[28px] shadow-2xl border border-slate-50 p-6 text-center">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  className="w-16 h-16 mx-auto mb-3 rounded-full bg-[#3D9970]/10 flex items-center justify-center"
                >
                  <CheckCircle2 className="w-8 h-8 text-[#3D9970]" />
                </motion.div>
                <h2 className="text-xl font-black text-[#3D2315]" style={{ fontFamily: "Nunito,sans-serif" }}>Journey Completed Safely</h2>
                <p className="text-xs font-bold text-[#9E7A6A] mt-1 mb-4">
                  {notifyOnComplete ? "Your guardian has been notified." : "You arrived safely. Great job staying aware."}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={resetToPlanning}
                    className="flex-1 py-3 rounded-2xl bg-[#FDF6EE] text-xs font-black text-[#8B3A2F] cursor-pointer"
                    style={{ fontFamily: "Nunito,sans-serif" }}
                  >
                    New Journey
                  </button>
                  <button
                    onClick={() => navigate("/home")}
                    className="flex-1 py-3 rounded-2xl text-white text-xs font-black cursor-pointer"
                    style={{ background: "linear-gradient(135deg,#F2956A,#D4455C)", fontFamily: "Nunito,sans-serif" }}
                  >
                    Back Home
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Deviation prompt (discreet, actionable) ── */}
        <AnimatePresence>
          {deviationPrompt && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-slate-950/40 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
            >
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                className="w-full max-w-md bg-white rounded-[28px] shadow-2xl p-6"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-[#FFF3C7] flex items-center justify-center">
                    <AlertTriangle className="w-4.5 h-4.5 text-[#B7770D]" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#B7770D]">Route Check</p>
                </div>
                <p className="text-base font-black text-[#3D2315] leading-snug mb-1" style={{ fontFamily: "Nunito,sans-serif" }}>
                  {deviationPrompt.message}
                </p>
                <p className="text-[11px] font-bold text-[#9E7A6A] mb-4">
                  {responseLeft != null && responseLeft > 0
                    ? `We'll notify your guardian in ${responseLeft}s if you don't respond.`
                    : "Response time passed — you can still notify your guardian manually."}
                </p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    onClick={acknowledgeDeviation}
                    className="py-3 rounded-2xl bg-[#3D9970] text-white text-xs font-black cursor-pointer"
                    style={{ fontFamily: "Nunito,sans-serif" }}
                  >
                    ✓ I'm Safe
                  </button>
                  <button
                    onClick={() => { void shareLocation(locationState.coords?.lat ?? currentPos[0], locationState.coords?.lng ?? currentPos[1], locationState.address); }}
                    className="py-3 rounded-2xl bg-[#DEEEFF] text-blue-800 text-xs font-black cursor-pointer"
                    style={{ fontFamily: "Nunito,sans-serif" }}
                  >
                    Share Location
                  </button>
                  <button
                    onClick={() => { window.location.href = "tel:112"; }}
                    className="py-3 rounded-2xl bg-[#FDF6EE] text-[#8B3A2F] text-xs font-black cursor-pointer"
                    style={{ fontFamily: "Nunito,sans-serif" }}
                  >
                    Call Guardian
                  </button>
                  <button
                    onClick={() => { triggerSOS(); navigate("/sos"); }}
                    className="py-3 rounded-2xl text-white text-xs font-black cursor-pointer"
                    style={{ background: "linear-gradient(135deg,#E74C3C,#B8324A)", fontFamily: "Nunito,sans-serif" }}
                  >
                    Trigger SOS
                  </button>
                </div>
                {responseLeft != null && responseLeft <= 0 && (
                  <button
                    onClick={() => {
                      toast({ title: "Guardian Notified", description: "Your guardian has been alerted about the route change." });
                      acknowledgeDeviation();
                    }}
                    className="w-full py-2.5 rounded-2xl border-2 border-dashed border-[#D4455C]/40 text-[#B8324A] text-[11px] font-black cursor-pointer"
                    style={{ fontFamily: "Nunito,sans-serif" }}
                  >
                    Notify Guardian Now
                  </button>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
};

export default SafetyJourneyPage;
