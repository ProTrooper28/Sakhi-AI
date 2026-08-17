import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin, Navigation2, ShieldCheck, Sparkles, Phone, Search, CheckCircle2,
  AlertTriangle, ChevronLeft, ChevronDown, Clock, Footprints, Car, Bike, Bus, UserCheck,
  Share2, Zap, Shield, Users2, Check, HelpCircle,
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
  RIDE_SERVICES,
  MONITORING_DEFAULTS,
  TRUSTED_CONTACTS,
  type TravelMode,
  type Journey,
  type RideDetails,
  type MonitoringOptions,
  readJourney,
  startJourney as createJourney,
  cancelJourney,
  clearJourney,
  evaluatePosition,
  emptyJourney,
  estimateDurationSec,
  deviationResponseRemainingSec,
  generateInsights,
  GPS_LOSS_ALERT_SEC,
  type JourneyAlert,
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

const MODE_LABEL: Record<TravelMode, string> = {
  walking: "Walking",
  cab: "Cab",
  auto: "Auto",
  bike: "Bike",
  public: "Public Transport",
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

/** "HH:MM" time input → epoch ms (today; +1 day if already passed). */
const timeInputToMs = (value: string): number | null => {
  if (!value) return null;
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
  return d.getTime();
};

// Monitoring toggles shown in the setup sheet.
const MONITORING_ROWS: { key: keyof MonitoringOptions; label: string }[] = [
  { key: "notifyOnArrival", label: "Notify guardian when I arrive safely" },
  { key: "detectDeviation", label: "Detect route deviation" },
  { key: "alertLongJourney", label: "Alert if journey takes unusually long" },
  { key: "shareLiveLocation", label: "Share live location during journey" },
  { key: "emergencyRecording", label: "Start emergency recording if SOS is triggered" },
];

type SafetyPrompt = {
  kind: "deviation" | "check";
  message: string;
  askedAt: number;
};

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

  // Optional journey details (Feature: ride-hailing future-ready shape)
  const [ride, setRide] = useState<RideDetails>({});
  const [showDetails, setShowDetails] = useState(false);
  const [monitoring, setMonitoring] = useState<MonitoringOptions>(MONITORING_DEFAULTS);
  const [trustedContactId, setTrustedContactId] = useState("all");
  const [etaOverride, setEtaOverride] = useState<string>("");

  const [prompt, setPrompt] = useState<SafetyPrompt | null>(null);
  const [needHelpOpen, setNeedHelpOpen] = useState(false);
  const [insights, setInsights] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);

  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const deviationAckedRef = useRef(false);

  // Live refs so the monitoring ticker never reads stale closures.
  const journeyRef = useRef(journey);
  journeyRef.current = journey;
  const locationRef = useRef(locationState);
  locationRef.current = locationState;

  const currentPos = useMemo<[number, number]>(
    () => (locationState.coords ? [locationState.coords.lat, locationState.coords.lng] : FALLBACK_POINT),
    [locationState.coords],
  );

  const guardianConnected = isSupabaseConfigured && !!user && !guest;

  // Preview ETA (straight-line estimate until the real route is fetched).
  const previewEtaMs = useMemo(() => {
    if (!selectedDest) return null;
    const dist = haversineMeters(currentPos[0], currentPos[1], selectedDest.lat, selectedDest.lng);
    return Date.now() + estimateDurationSec(dist, mode) * 1000;
  }, [selectedDest, mode, currentPos]);

  const etaOverrideMs = useMemo(() => timeInputToMs(etaOverride), [etaOverride]);
  const finalEtaMs = etaOverrideMs ?? previewEtaMs;

  const monitoringEnabledCount = Object.values(monitoring).filter(Boolean).length;
  const trustedContact = TRUSTED_CONTACTS.find((c) => c.id === trustedContactId)?.name ?? "All Guardians";

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

  useEffect(() => {
    if (!userMarkerRef.current || !locationState.coords) return;
    userMarkerRef.current.setLatLng([locationState.coords.lat, locationState.coords.lng]);
  }, [locationState.coords]);

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
    if (monitoring.shareLiveLocation) setSharingEnabled(true);
    const zones = safetyZonesFromGeoJson(buildSafetyGeoJson({ lat: currentPos[0], lng: currentPos[1] }));
    const options = await fetchRouteOptions(
      { lat: currentPos[0], lng: currentPos[1] },
      { lat: selectedDest.lat, lng: selectedDest.lng },
      zones,
    );
    const route = options[0] ?? {
      id: "fastest" as const,
      label: "Fastest Route",
      points: [[currentPos[0], currentPos[1]], [selectedDest.lat, selectedDest.lng]] as [number, number][],
      durationSec: haversineMeters(currentPos[0], currentPos[1], selectedDest.lat, selectedDest.lng) / 8,
      distanceM: haversineMeters(currentPos[0], currentPos[1], selectedDest.lat, selectedDest.lng),
      safety: "moderate" as const,
      safetyScore: 50,
    };

    const j = createJourney({
      destination: selectedDest,
      mode,
      routePoints: route.points,
      distanceM: route.distanceM,
      durationSec: route.durationSec,
      expectedArrivalMs: etaOverrideMs ?? Date.now() + route.durationSec * 1000,
      rideDetails: ride,
      monitoring,
      trustedContactId,
      etaOverride: etaOverrideMs,
    });
    setJourney(j);
    deviationAckedRef.current = false;

    if (guardianConnected && monitoring.shareLiveLocation) {
      void upsertLiveLocation({ lat: currentPos[0], lng: currentPos[1], label: locationState.address });
    }
    toast({ title: "Journey Started", description: `${MODE_LABEL[mode]} · AI monitoring is active.` });
  }, [selectedDest, mode, currentPos, guardianConnected, locationState.address, ride, monitoring, trustedContactId, etaOverrideMs]);

  // ── Live monitoring ticker (every GPS fix + 10s safety tick) ──
  const handleAlerts = useCallback((alerts: JourneyAlert[]) => {
    for (const alert of alerts) {
      if (alert.kind === "arrived") {
        toast({ title: "Journey Completed Safely", description: "Your guardian has been notified." });
        continue;
      }
      if (alert.kind === "deviation") {
        if (deviationAckedRef.current) continue;
        deviationAckedRef.current = true;
        setNeedHelpOpen(false);
        setPrompt({ kind: "deviation", message: alert.message, askedAt: Date.now() });
        continue;
      }
      // inactivity / GPS loss / long journey → unified "Everything okay?"
      setNeedHelpOpen(false);
      setPrompt({ kind: "check", message: alert.message, askedAt: Date.now() });
    }
  }, []);

  useEffect(() => {
    if (journeyRef.current.status !== "active") return;

    const run = () => {
      const j = journeyRef.current;
      const ls = locationRef.current;
      // Treat stale fixes as GPS loss (handled by the engine).
      const stale =
        ls.timestamp != null && Date.now() - ls.timestamp > GPS_LOSS_ALERT_SEC * 1000;
      const pos = ls.coords && !stale ? ls.coords : null;

      const { journey: updated, alerts } = evaluatePosition(j, pos, {
        inactivityAlertSec: 90,
        gpsLossAlertSec: GPS_LOSS_ALERT_SEC,
      });
      journeyRef.current = updated;
      setJourney(updated);

      if (guardianConnected && updated.status === "active" && pos && j.monitoring.shareLiveLocation) {
        void upsertLiveLocation({ lat: pos.lat, lng: pos.lng, label: ls.address });
      }
      if (updated.status === "completed" && j.monitoring.notifyOnArrival && guardianConnected && pos) {
        void sendSafeCheckIn({ lat: pos.lat, lng: pos.lng, label: ls.address });
      }
      handleAlerts(alerts);
    };

    run();
    const id = setInterval(run, 10000);
    return () => clearInterval(id);
  }, [guardianConnected, journey.status, handleAlerts]);

  // ── Insights (Feature 7) — refreshed while journeying ──
  useEffect(() => {
    if (journey.status !== "active" || !journey.destination) return;
    const pos = locationState.coords;
    const remainingM = journey.destination
      ? haversineMeters(
          pos?.lat ?? journey.lastPosition?.lat ?? journey.destination.lat,
          pos?.lng ?? journey.lastPosition?.lng ?? journey.destination.lng,
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
        gpsOk: !!pos,
        guardianTracking: guardianConnected,
        inactiveSec: journey.lastPosition ? Math.floor((Date.now() - journey.lastPosition.at) / 1000) : 0,
      }),
    );
  }, [journey, locationState.coords, guardianConnected]);

  // ── Prompt response timer (deviation only) ──
  const [responseLeft, setResponseLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!prompt || prompt.kind !== "deviation") {
      setResponseLeft(null);
      return;
    }
    const id = setInterval(() => {
      setResponseLeft(deviationResponseRemainingSec(prompt.askedAt));
    }, 1000);
    return () => clearInterval(id);
  }, [prompt]);

  const acknowledgePrompt = () => {
    setPrompt(null);
    setNeedHelpOpen(false);
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
    setRide({});
    setEtaOverride("");
  };

  // ── Render ──
  const active = journey.status === "active";
  const completed = journey.status === "completed";

  return (
    <AppLayout>
      <div className="relative min-h-[calc(100vh-96px)]" style={{ background: "#FDF6EE" }}>
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
              <div className="max-h-[68vh] overflow-y-auto max-w-md mx-auto bg-white rounded-[28px] shadow-2xl border border-slate-50 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#F2956A,#D4455C)" }}>
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-[#3D2315]" style={{ fontFamily: "Nunito,sans-serif" }}>Safety Journey</h2>
                    <p className="text-[11px] font-bold text-[#9E7A6A]">Just pick a destination and mode — everything else is optional.</p>
                  </div>
                </div>

                {/* Destination (primary) */}
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

                {/* Travel mode (primary) */}
                <p className="text-[10px] font-black uppercase tracking-widest text-[#9E7A6A] mb-2">Travel Mode</p>
                <div className="grid grid-cols-5 gap-1.5 mb-3">
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

                {/* ── Collapsible: Journey Details (Optional) ── */}
                <button
                  onClick={() => setShowDetails((v) => !v)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl bg-[#FDF6EE] border border-[#F5E4D6] mb-3 cursor-pointer"
                >
                  <span className="flex items-center gap-2 text-[12px] font-black text-[#8B3A2F]" style={{ fontFamily: "Nunito,sans-serif" }}>
                    <Navigation2 className="w-3.5 h-3.5 text-[#D4455C]" />
                    Journey Details (Optional)
                  </span>
                  <ChevronDown className={`w-4 h-4 text-[#9E7A6A] transition-transform ${showDetails ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {showDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-3 mb-3">
                        {/* Ride service */}
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-[#9E7A6A] mb-1.5">Ride Service</p>
                          <div className="flex flex-wrap gap-1.5">
                            {RIDE_SERVICES.map((s) => {
                              const selected = ride.rideService === s.id;
                              return (
                                <button
                                  key={s.id}
                                  onClick={() => setRide((r) => ({ ...r, rideService: selected ? null : s.id }))}
                                  className={`px-3 py-1.5 rounded-full text-[10px] font-black cursor-pointer transition-all ${
                                    selected ? "bg-[#D4455C] text-white shadow-md shadow-[#D4455C]/20" : "bg-[#FDF6EE] text-[#8B3A2F] border border-[#F5E4D6]"
                                  }`}
                                  style={{ fontFamily: "Nunito,sans-serif" }}
                                >
                                  {s.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Field label="Cab Number" value={ride.cabNumber ?? ""} onChange={(v) => setRide((r) => ({ ...r, cabNumber: v }))} placeholder="e.g. 42-12" />
                          <Field label="Vehicle Number Plate" value={ride.vehiclePlate ?? ""} onChange={(v) => setRide((r) => ({ ...r, vehiclePlate: v }))} placeholder="e.g. MH 01 AB 1234" />
                          <Field label="Driver Name" value={ride.driverName ?? ""} onChange={(v) => setRide((r) => ({ ...r, driverName: v }))} placeholder="Driver name" />
                          <Field label="Driver Phone (optional)" type="tel" value={ride.driverPhone ?? ""} onChange={(v) => setRide((r) => ({ ...r, driverPhone: v }))} placeholder="Mobile number" />
                          <Field label="Seat Number" value={ride.seatNumber ?? ""} onChange={(v) => setRide((r) => ({ ...r, seatNumber: v }))} placeholder="Public transport seat" />
                          <Field label="Bus / Train Number" value={ride.busTrainNumber ?? ""} onChange={(v) => setRide((r) => ({ ...r, busTrainNumber: v }))} placeholder="e.g. 501 / 12951" />
                        </div>

                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-[#9E7A6A] mb-1.5">Journey Notes</p>
                          <textarea
                            value={ride.notes ?? ""}
                            onChange={(e) => setRide((r) => ({ ...r, notes: e.target.value }))}
                            placeholder={'e.g. "Travelling alone", "Late night", "Meeting someone"'}
                            rows={2}
                            className="w-full bg-[#FDF6EE] border border-[#F5E4D6] rounded-2xl px-4 py-2.5 text-xs font-bold text-[#3D2315] outline-none focus:border-[#F2956A]/50 resize-none"
                          />
                        </div>

                        <p className="text-[9px] font-semibold text-[#9E7A6A] leading-relaxed">
                          Future ride-hailing integrations can auto-fill these details — nothing is hardcoded to a provider.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── ETA (auto + manual override) ── */}
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-[#FDF6EE] border border-[#F5E4D6] mb-3">
                  <Clock className="w-4 h-4 text-[#B7770D] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#9E7A6A]">Expected Arrival</p>
                    <p className="text-sm font-black text-[#3D2315]" style={{ fontFamily: "Nunito,sans-serif" }}>
                      {finalEtaMs ? formatEtaClock(finalEtaMs) : "—"}
                    </p>
                  </div>
                  <input
                    type="time"
                    value={etaOverride}
                    onChange={(e) => setEtaOverride(e.target.value)}
                    className="bg-white border border-[#F5E4D6] rounded-xl px-2 py-1.5 text-[11px] font-bold text-[#8B3A2F] outline-none"
                    title="Override ETA"
                  />
                  {etaOverride && (
                    <button
                      onClick={() => setEtaOverride("")}
                      className="text-[10px] font-black text-[#9E7A6A] underline cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* ── AI Monitoring options ── */}
                <p className="text-[10px] font-black uppercase tracking-widest text-[#9E7A6A] mb-2">AI Monitoring</p>
                <div className="rounded-2xl border border-[#F5E4D6] overflow-hidden mb-3">
                  {MONITORING_ROWS.map((row, i) => {
                    const on = monitoring[row.key];
                    return (
                      <button
                        key={row.key}
                        onClick={() => setMonitoring((m) => ({ ...m, [row.key]: !m[row.key] }))}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left cursor-pointer transition-colors ${
                          i < MONITORING_ROWS.length - 1 ? "border-b border-[#F5E4D6]/70" : ""
                        } ${on ? "bg-[#D6F5EA]/40" : "bg-white"}`}
                      >
                        <span
                          className={`w-4.5 h-4.5 rounded-md flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                            on ? "bg-[#3D9970] border-[#3D9970]" : "border-[#D6C9BC]"
                          }`}
                          style={{ width: 18, height: 18 }}
                        >
                          {on && <Check className="w-3 h-3 text-white" />}
                        </span>
                        <span className={`text-[11px] font-bold ${on ? "text-[#2E7D56]" : "text-[#9E7A6A]"}`} style={{ fontFamily: "Nunito,sans-serif" }}>
                          {row.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* ── Trusted contact ── */}
                <p className="text-[10px] font-black uppercase tracking-widest text-[#9E7A6A] mb-2 flex items-center gap-1.5">
                  <Users2 className="w-3 h-3" /> Trusted Contact
                </p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {TRUSTED_CONTACTS.map((c) => {
                    const selected = trustedContactId === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setTrustedContactId(c.id)}
                        className={`px-3.5 py-2 rounded-full text-[10px] font-black cursor-pointer transition-all ${
                          selected ? "bg-[#3D9970] text-white shadow-md shadow-[#3D9970]/20" : "bg-[#FDF6EE] text-[#8B3A2F] border border-[#F5E4D6]"
                        }`}
                        style={{ fontFamily: "Nunito,sans-serif" }}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>

                {/* ── Journey Summary ── */}
                {selectedDest && (
                  <div className="rounded-2xl bg-[#FDF6EE] border border-[#F5E4D6] p-4 mb-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#9E7A6A] mb-2.5">Journey Summary</p>
                    <div className="space-y-2">
                      <SummaryRow label="Destination" value={selectedDest.label.split(",").slice(0, 2).join(",")} />
                      <SummaryRow label="Travel Mode" value={MODE_LABEL[mode]} />
                      <SummaryRow label="ETA" value={finalEtaMs ? formatEtaClock(finalEtaMs) : "—"} />
                      <SummaryRow label="Guardian" value={trustedContact} />
                      <SummaryRow label="Monitoring" value={`${monitoringEnabledCount} of 5 enabled`} />
                    </div>
                  </div>
                )}

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

                {/* Ride details chips (when provided) */}
                {journey.rideDetails && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {journey.rideDetails.rideService && (
                      <Chip label={RIDE_SERVICES.find((s) => s.id === journey.rideDetails!.rideService)?.label ?? journey.rideDetails.rideService} />
                    )}
                    {journey.rideDetails.cabNumber && <Chip label={`Cab ${journey.rideDetails.cabNumber}`} />}
                    {journey.rideDetails.vehiclePlate && <Chip label={journey.rideDetails.vehiclePlate} />}
                    {journey.rideDetails.driverName && <Chip label={`Driver: ${journey.rideDetails.driverName}`} />}
                    {journey.rideDetails.busTrainNumber && <Chip label={`${journey.rideDetails.busTrainNumber}`} />}
                    {journey.rideDetails.seatNumber && <Chip label={`Seat ${journey.rideDetails.seatNumber}`} />}
                    {journey.trustedContactId && <Chip label={`${TRUSTED_CONTACTS.find((c) => c.id === journey.trustedContactId)?.name ?? "Guardian"} watching`} dark />}
                  </div>
                )}

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
                    <p className="text-sm font-black text-[#3D2315]" style={{ fontFamily: "Nunito,sans-serif" }}>
                      {guardianConnected ? (journey.monitoring.shareLiveLocation ? "Tracking" : "Arrival only") : "Demo mode"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#FDF6EE] p-3 text-center">
                    <Sparkles className="w-4 h-4 mx-auto text-[#D4455C] mb-1" />
                    <p className="text-[9px] font-black uppercase tracking-wider text-[#9E7A6A]">AI</p>
                    <p className="text-sm font-black text-[#3D2315]" style={{ fontFamily: "Nunito,sans-serif" }}>
                      {journey.monitoring.detectDeviation ? "Monitoring" : "On"}
                    </p>
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
                  {journey.monitoring.notifyOnArrival ? "Your guardian has been notified." : "You arrived safely. Great job staying aware."}
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

        {/* ── Unified safety prompt: "Everything okay?" ── */}
        <AnimatePresence>
          {prompt && (
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
                    <HelpCircle className="w-4.5 h-4.5 text-[#B7770D]" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#B7770D]">Safety Check</p>
                </div>
                <h3 className="text-xl font-black text-[#3D2315] mb-1" style={{ fontFamily: "Nunito,sans-serif" }}>
                  Everything okay?
                </h3>
                <p className="text-[13px] font-bold text-[#9E7A6A] leading-relaxed mb-1">{prompt.message}</p>
                {prompt.kind === "deviation" && responseLeft != null && (
                  <p className="text-[11px] font-bold text-[#9E7A6A] mb-3">
                    {responseLeft > 0
                      ? `We'll notify your guardian in ${responseLeft}s if you don't respond.`
                      : "Response time passed — you can still notify your guardian manually."}
                  </p>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={acknowledgePrompt}
                    className="py-3 rounded-2xl bg-[#3D9970] text-white text-xs font-black cursor-pointer"
                    style={{ fontFamily: "Nunito,sans-serif" }}
                  >
                    ✓ I'm Safe
                  </button>
                  <button
                    onClick={() => setNeedHelpOpen((v) => !v)}
                    className={`py-3 rounded-2xl text-xs font-black cursor-pointer ${needHelpOpen ? "bg-[#B7770D] text-white" : "bg-[#FFF3C7] text-[#B7770D]"}`}
                    style={{ fontFamily: "Nunito,sans-serif" }}
                  >
                    Need Help
                  </button>
                  <button
                    onClick={() => { triggerSOS(); navigate("/sos"); }}
                    className="py-3 rounded-2xl text-white text-xs font-black cursor-pointer"
                    style={{ background: "linear-gradient(135deg,#E74C3C,#B8324A)", fontFamily: "Nunito,sans-serif" }}
                  >
                    Trigger SOS
                  </button>
                </div>

                <AnimatePresence>
                  {needHelpOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <button
                          onClick={() => { void shareLocation(locationState.coords?.lat ?? currentPos[0], locationState.coords?.lng ?? currentPos[1], locationState.address); }}
                          className="py-2.5 rounded-2xl bg-[#DEEEFF] text-blue-800 text-xs font-black cursor-pointer"
                          style={{ fontFamily: "Nunito,sans-serif" }}
                        >
                          Share Location
                        </button>
                        <button
                          onClick={() => { window.location.href = "tel:112"; }}
                          className="py-2.5 rounded-2xl bg-[#FDF6EE] text-[#8B3A2F] text-xs font-black cursor-pointer"
                          style={{ fontFamily: "Nunito,sans-serif" }}
                        >
                          Call Guardian
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {prompt.kind === "deviation" && responseLeft != null && responseLeft <= 0 && (
                  <button
                    onClick={() => {
                      toast({ title: "Guardian Notified", description: "Your guardian has been alerted about the route change." });
                      acknowledgePrompt();
                    }}
                    className="w-full py-2.5 mt-2 rounded-2xl border-2 border-dashed border-[#D4455C]/40 text-[#B8324A] text-[11px] font-black cursor-pointer"
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

// ── Small presentational helpers ─────────────────────────────────────────────
const Field = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) => (
  <div>
    <p className="text-[10px] font-black uppercase tracking-widest text-[#9E7A6A] mb-1">{label}</p>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-[#FDF6EE] border border-[#F5E4D6] rounded-2xl px-3.5 py-2.5 text-xs font-bold text-[#3D2315] outline-none focus:border-[#F2956A]/50 placeholder:text-[#C9B7A8]"
    />
  </div>
);

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E7A6A]">{label}</span>
    <span className="text-[11px] font-black text-[#3D2315] truncate text-right" style={{ fontFamily: "Nunito,sans-serif" }}>{value}</span>
  </div>
);

const Chip = ({ label, dark }: { label: string; dark?: boolean }) => (
  <span
    className="px-2.5 py-1 rounded-full text-[9px] font-black"
    style={{
      background: dark ? "rgba(61,153,112,0.12)" : "rgba(122,43,115,0.08)",
      color: dark ? "#2E7D56" : "#7A2B73",
      fontFamily: "Nunito,sans-serif",
    }}
  >
    {label}
  </span>
);

export default SafetyJourneyPage;
