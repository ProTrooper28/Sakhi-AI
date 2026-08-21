import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent as ReactTouchEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Share2,
  Copy,
  RefreshCw,
  PauseCircle,
  PlayCircle,
  BatteryMedium,
  Wifi,
  WifiOff,
  Satellite,
  Footprints,
  Car,
  Clock,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  MessageCircle,
  PhoneCall,
  CheckCircle2,
  AlertTriangle,
  LocateFixed,
  History,
  Search,
  X,
  Layers,
  Shield,
  ShieldCheck,
  Zap,
  Crosshair,
  Route,
} from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import { useApp } from "@/context/AppContext";
import { LiveTrackingMap, MiniMap } from "./maps";
import {
  formatCoords,
  googleMapsUrl,
  appleMapsUrl,
  formatTime,
  timeAgoShort,
  formatElapsed,
  movementFromSpeed,
  movementLabel,
  reverseGeocode,
  getDeviceBattery,
  copyText,
  shareLocation,
  isSharingEnabled,
  setSharingEnabled,
  haversineMeters,
  distanceLabel,
  buildSafetyGeoJson,
  safetyZonesFromGeoJson,
  SAFETY_LEGEND,
  SAFETY_ZONE_COLORS,
  fetchRouteOptions,
  geocodeSearch,
  etaLabel,
  type TrailPoint,
  type Destination,
  type RouteOption,
  type RouteKind,
} from "./helpers";

const TRAIL_KEY = "sakhi_location_trail";

const SATELLITE_TILES = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const ROUTE_COLORS: Record<RouteKind, string> = {
  safest: "#3D9970", // green
  fastest: "#2563EB", // blue
  walking: "#7A2B73", // purple
  driving: "#D4455C", // rose
};

const SAFETY_COLORS: Record<RouteOption["safety"], string> = {
  safe: "#2E7D56",
  moderate: "#B7770D",
  caution: "#B8324A",
};

/** Draggable bottom sheet snap points (px from bottom of map). */
const SHEET_SNAPS = {
  compact: 170,
  half: 320,
  full: 560,
} as const;

/**
 * Live Location — the user's premium full-screen tracking screen.
 *
 * A Google-Find-My style experience: full-bleed interactive map with the
 * live position (accuracy circle + movement trail + smooth animated marker),
 * and a clean bottom sheet with address, device stats, quick actions and a
 * tap-to-reopen location history. While an SOS is active the map highlights
 * the marker and an emergency action bar appears — resolving it returns to
 * normal automatically.
 */
export default function UserLiveLocationPage() {
  const navigate = useNavigate();
  const { locationState, requestLocation, sosState, resolveSOS } = useApp();

  const coords = locationState.coords;
  const label = locationState.address;

  // ── Realtime trail (sampled, persisted) ──────────────────────────────────
  const lastSampleRef = useRef<{ lat: number; lng: number; ts: number } | null>(null);
  const [trail, setTrail] = useState<TrailPoint[]>([]);

  useEffect(() => {
    let restored: TrailPoint[] = [];
    try {
      const raw = localStorage.getItem(TRAIL_KEY);
      if (raw) {
        restored = (JSON.parse(raw) as TrailPoint[]).filter((p) => Date.now() - p.ts < 6 * 3600 * 1000).slice(-40);
      }
    } catch {
      // ignore storage errors
    }
    if (coords) {
      const now = Date.now();
      lastSampleRef.current = { ...coords, ts: now };
      // Seed the trail with the current fix so the map has a position to
      // show immediately (before the first real sample is appended).
      if (restored.length === 0) restored = [{ ...coords, ts: now }];
    }
    setTrail(restored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!coords) return;
    const now = Date.now();
    const last = lastSampleRef.current;
    const moved = !last || haversineMeters(last.lat, last.lng, coords.lat, coords.lng) > 25;
    const elapsed = !last || now - last.ts > 20000;
    if (!moved && !elapsed) return;
    lastSampleRef.current = { lat: coords.lat, lng: coords.lng, ts: now };
    setTrail((prev) => {
      const next = [...prev, { lat: coords.lat, lng: coords.lng, ts: now }].slice(-40);
      try {
        localStorage.setItem(TRAIL_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, [coords]);

  // ── Device stats ─────────────────────────────────────────────────────────
  const [battery, setBattery] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      const b = await getDeviceBattery();
      if (alive) setBattery(b);
    };
    void poll();
    const id = setInterval(poll, 15000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const gpsStatus = locationState.error
    ? "Unavailable"
    : !coords
      ? "Acquiring…"
      : Date.now() - (locationState.timestamp ?? 0) > 60000
        ? "Weak signal"
        : "Active";

  const movement = useMemo(() => {
    if (locationState.speed != null) return movementFromSpeed(locationState.speed);
    if (trail.length < 2) return null;
    const a = trail[trail.length - 2]!;
    const b = trail[trail.length - 1]!;
    const dt = Math.max(1, (b.ts - a.ts) / 1000);
    return movementFromSpeed(haversineMeters(a.lat, a.lng, b.lat, b.lng) / dt);
  }, [locationState.speed, trail]);

  const lowBattery = battery != null && battery < 20;

  // ── Sharing toggle ───────────────────────────────────────────────────────
  const [sharing, setSharing] = useState(isSharingEnabled);
  const toggleSharing = () => {
    const next = !sharing;
    setSharingEnabled(next);
    setSharing(next);
    toast[next ? "success" : "info"](
      next ? "Live location sharing resumed" : "Sharing paused — guardian sees your last known location",
    );
  };

  // ── Safety overlay + map layers ──────────────────────────────────────────
  const [safetyOn, setSafetyOn] = useState(true);
  const [satellite, setSatellite] = useState(false);
  // Safety layer: a GeoJSON FeatureCollection (placeholder data today, a real
  // crime/safety source tomorrow — the UI only consumes GeoJSON). Anchored on
  // ~100m-rounded coords so it stays stable between GPS ticks (no flicker)
  // while still following the user as they move.
  const zoneAnchorKey = coords ? `${coords.lat.toFixed(3)},${coords.lng.toFixed(3)}` : null;
  const safetyGeoJson = useMemo(() => {
    if (!safetyOn || !zoneAnchorKey) return null;
    const [la, ln] = zoneAnchorKey.split(",");
    return buildSafetyGeoJson({ lat: parseFloat(la!), lng: parseFloat(ln!) });
  }, [safetyOn, zoneAnchorKey]);
  // Same data, flattened into zones for route safety scoring.
  const safetyZones = useMemo(() => safetyZonesFromGeoJson(safetyGeoJson), [safetyGeoJson]);

  // ── Destination & route options ──────────────────────────────────────────
  const [destQuery, setDestQuery] = useState("");
  const [destSuggestions, setDestSuggestions] = useState<Destination[]>([]);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<RouteKind | null>(null);
  const [loadingRoutes, setLoadingRoutes] = useState(false);

  const searchDest = useCallback(async (q: string) => {
    if (q.trim().length < 3) {
      setDestSuggestions([]);
      return;
    }
    const found = await geocodeSearch(q);
    setDestSuggestions(found);
  }, []);

  const selectDestination = useCallback(
    async (d: Destination) => {
      setDestination(d);
      setDestQuery(d.label);
      setDestSuggestions([]);
      setLoadingRoutes(true);
      const origin = coords;
      if (origin) {
        const opts = await fetchRouteOptions(origin, d, safetyZones);
        setRoutes(opts);
        setSelectedRouteId(opts[0]?.id ?? null);
      } else {
        setRoutes([]);
        setSelectedRouteId(null);
      }
      setLoadingRoutes(false);
    },
    [coords, safetyZones],
  );

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      setDestQuery("");
      setDestSuggestions([]);
      void reverseGeocode(lat, lng).then((g) => selectDestination({ lat, lng, label: g.label }));
    },
    [selectDestination],
  );

  const clearDestination = useCallback(() => {
    setDestination(null);
    setDestQuery("");
    setDestSuggestions([]);
    setRoutes([]);
    setSelectedRouteId(null);
  }, []);

  // Route layers: selected route in its route color, alternatives gray dashed.
  const routeLayers = useMemo(() => {
    if (!destination || routes.length === 0) return [];
    const selected = routes.find((r) => r.id === selectedRouteId) ?? routes[0];
    const layers = routes
      .filter((r) => r !== selected)
      .map((r) => ({ points: r.points, color: "#6B7280", dashed: true }));
    layers.push({ points: selected.points, color: ROUTE_COLORS[selected.id], dashed: false });
    return layers;
  }, [routes, selectedRouteId, destination]);

  // Fit the map to the selected route once (not on every GPS tick).
  const selectedRoute = routes.find((r) => r.id === selectedRouteId) ?? null;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedRoute || selectedRoute.points.length < 2) return;
    const lats = selectedRoute.points.map((p) => p[0]);
    const lngs = selectedRoute.points.map((p) => p[1]);
    map.fitBounds(
      [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)],
      ],
      { padding: [56, 56] },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoute?.id]);

  const destInputRef = useRef<HTMLInputElement>(null);
  // "Directions" — focus the destination search; if a route exists, refit it.
  const openDirections = useCallback(() => {
    if (selectedRoute && mapRef.current && selectedRoute.points.length >= 2) {
      const lats = selectedRoute.points.map((p) => p[0]);
      const lngs = selectedRoute.points.map((p) => p[1]);
      mapRef.current.fitBounds(
        [
          [Math.min(...lats), Math.min(...lngs)],
          [Math.max(...lats), Math.max(...lngs)],
        ],
        { padding: [56, 56] },
      );
    }
    destInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    destInputRef.current?.focus({ preventScroll: true });
  }, [selectedRoute]);

  // ── More details (full address + device telemetry) ───────────────────────
  const [moreOpen, setMoreOpen] = useState(false);
  const [fullAddress, setFullAddress] = useState<string | null>(null);
  // Keyed on ~11m-rounded coords so GPS ticks don't re-geocode every second.
  const coordKey = coords ? `${coords.lat.toFixed(4)},${coords.lng.toFixed(4)}` : null;
  useEffect(() => {
    if (!moreOpen || !coordKey) return;
    const [latStr, lngStr] = coordKey.split(",");
    const lat = parseFloat(latStr!);
    const lng = parseFloat(lngStr!);
    let alive = true;
    void reverseGeocode(lat, lng).then((g) => {
      if (alive) setFullAddress(g.address);
    });
    return () => {
      alive = false;
    };
  }, [moreOpen, coordKey]);

  // ── Location history (derived from the trail) ────────────────────────────
  const history = useMemo(() => {
    if (trail.length === 0) return [];
    const entries: { lat: number; lng: number; ts: number; durationMs: number }[] = [];
    let start = trail[0]!;
    for (let i = 1; i < trail.length; i++) {
      const p = trail[i]!;
      if (haversineMeters(start.lat, start.lng, p.lat, p.lng) > 50) {
        entries.push({ lat: start.lat, lng: start.lng, ts: start.ts, durationMs: p.ts - start.ts });
        start = p;
      }
    }
    entries.push({ lat: start.lat, lng: start.lng, ts: start.ts, durationMs: Date.now() - start.ts });
    return entries.slice(-8).reverse();
  }, [trail]);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLabels, setHistoryLabels] = useState<Record<string, string>>({});
  // Each history stop is geocoded at most once (ref set), so GPS ticks while
  // the section is open never re-fire Nominatim requests.
  const geocodedKeysRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!historyOpen || history.length === 0) return;
    let alive = true;
    history.forEach((h) => {
      const key = `${h.lat.toFixed(3)},${h.lng.toFixed(3)}`;
      if (historyLabels[key] || geocodedKeysRef.current.has(key)) return;
      geocodedKeysRef.current.add(key);
      if (coords && label && haversineMeters(coords.lat, coords.lng, h.lat, h.lng) < 300) {
        setHistoryLabels((prev) => ({ ...prev, [key]: label }));
        return;
      }
      void reverseGeocode(h.lat, h.lng).then((g) => {
        if (alive) setHistoryLabels((prev) => ({ ...prev, [key]: g.label }));
      });
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyOpen, history]);

  const mapRef = useRef<L.Map | null>(null);
  const flyTo = (lat: number, lng: number) => {
    mapRef.current?.flyTo([lat, lng], 16, { duration: 0.8 });
  };

  // ── SOS overlay (mirrors the active SOS from AppContext) ─────────────────
  const [sosElapsed, setSosElapsed] = useState(0);
  useEffect(() => {
    if (!sosState.active || !sosState.triggeredAt) return;
    const calc = () =>
      Math.max(0, Math.floor((Date.now() - new Date(sosState.triggeredAt as string).getTime()) / 1000));
    setSosElapsed(calc());
    const id = setInterval(() => setSosElapsed(calc()), 1000);
    return () => clearInterval(id);
  }, [sosState.active, sosState.triggeredAt]);

  const onShare = useCallback(async () => {
    if (!coords) {
      toast.error("Location not available yet");
      return;
    }
    const res = await shareLocation(coords.lat, coords.lng, label);
    if (res === "shared") toast.success("Live location shared");
    else if (res === "copied") toast.success("Location link copied to clipboard");
    else toast.error("Could not share — use Copy Coordinates instead");
  }, [coords, label]);

  const onCopy = useCallback(async () => {
    if (!coords) {
      toast.error("Location not available yet");
      return;
    }
    const ok = await copyText(formatCoords(coords.lat, coords.lng));
    toast[ok ? "success" : "error"](ok ? "Coordinates copied" : "Could not copy coordinates");
  }, [coords]);

  // ── Draggable bottom sheet ───────────────────────────────────────────────
  const [sheetHeight, setSheetHeight] = useState<number>(SHEET_SNAPS.compact);
  const [sheetTransition, setSheetTransition] = useState(true);
  const dragStartRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const snapSheet = useCallback((target: number) => {
    setSheetTransition(true);
    const snaps = [SHEET_SNAPS.compact, SHEET_SNAPS.half, SHEET_SNAPS.full];
    const closest = snaps.reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a));
    setSheetHeight(closest);
  }, []);

  const onDragStart = useCallback((clientY: number) => {
    setSheetTransition(false);
    dragStartRef.current = { startY: clientY, startHeight: sheetHeight };
  }, [sheetHeight]);

  const onDragMove = useCallback((clientY: number) => {
    const d = dragStartRef.current;
    if (!d) return;
    const delta = d.startY - clientY;
    setSheetHeight(Math.max(SHEET_SNAPS.compact, Math.min(SHEET_SNAPS.full, d.startHeight + delta)));
  }, []);

  const onDragEnd = useCallback(() => {
    const d = dragStartRef.current;
    dragStartRef.current = null;
    if (d) snapSheet(sheetHeight);
  }, [sheetHeight, snapSheet]);

  const onRefresh = useCallback(() => {
    requestLocation();
    toast.info("Refreshing location…");
  }, [requestLocation]);

  const handleMarkSafe = useCallback(() => {
    resolveSOS();
    toast.success("Marked safe — SOS resolved");
  }, [resolveSOS]);

  const sosCoords = sosState.coords;

  // ── GPS error state messages ──
  const gpsErrorMessage = locationState.error
    ? locationState.address?.includes("denied")
      ? "Location permission denied"
      : locationState.address?.includes("unavailable") || locationState.address?.includes("Unable")
        ? "GPS unavailable"
        : "Location unavailable"
    : null;

  return (
    <AppLayout>
      <div
        className="relative -mx-3.5 -mt-3 md:-mx-10 md:-mt-8 overflow-hidden rounded-none md:rounded-[28px] bg-white"
        style={{ height: "calc(100dvh - 8rem)", minHeight: 520 }}
      >
        {/* ── Full-bleed map ── */}
        <LiveTrackingMap
          trail={trail}
          accuracy={locationState.accuracy ?? (sosState.active ? 60 : null)}
          sos={sosState.active}
          follow
          tileUrl={satellite ? SATELLITE_TILES : undefined}
          safetyGeoJson={safetyGeoJson}
          routes={routeLayers}
          destination={destination}
          onMapClick={handleMapClick}
          bottomPadding={sheetHeight}
          onReady={(map) => {
            mapRef.current = map;
          }}
        />

        {/* ── GPS error / loading overlay ── */}
        {(!coords && !sosState.active) && (
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[600] flex flex-col items-center gap-3 px-6 py-5 rounded-[24px]"
            style={{
              background: "rgba(255,252,249,0.96)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 8px 32px rgba(139,58,47,0.15)",
              border: "1px solid rgba(242,149,106,0.2)",
              maxWidth: 300,
              fontFamily: "Nunito,sans-serif",
            }}
          >
            {gpsErrorMessage ? (
              <>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(212,69,92,0.12)" }}>
                  <AlertTriangle style={{ width: 20, height: 20, color: "#D4455C" }} />
                </div>
                <p style={{ fontWeight: 800, fontSize: 13, color: "#3D2315", textAlign: "center" }}>{gpsErrorMessage}</p>
                <p style={{ fontWeight: 600, fontSize: 11, color: "#9E7A6A", textAlign: "center", lineHeight: 1.5 }}>
                  {gpsErrorMessage.includes("denied")
                    ? "Please enable location access in your browser or device settings to use Live Location."
                    : "Make sure GPS is enabled and you have a clear view of the sky."
                  }
                </p>
                <button
                  onClick={onRefresh}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer"
                  style={{ background: "#D4455C", color: "white", fontWeight: 800, fontSize: 12, border: "none" }}
                >
                  <RefreshCw style={{ width: 13, height: 13 }} /> Retry
                </button>
              </>
            ) : locationState.loading ? (
              <>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(122,43,115,0.1)" }}>
                  <Satellite className="w-5 h-5 animate-spin" style={{ color: "#7A2B73" }} />
                </div>
                <p style={{ fontWeight: 800, fontSize: 13, color: "#3D2315", textAlign: "center" }}>Acquiring GPS signal…</p>
                <p style={{ fontWeight: 600, fontSize: 11, color: "#9E7A6A", textAlign: "center" }}>
                  This may take a few seconds on first use
                </p>
              </>
            ) : null}
          </div>
        )}

        {/* ── Top bar overlay ── */}
        <div
          className="absolute top-0 inset-x-0 z-[500] flex items-center justify-between px-3 py-3"
          style={{ background: "linear-gradient(180deg, rgba(251,240,233,0.95), rgba(251,240,233,0))" }}
        >
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer"
            style={{ background: "rgba(255,255,255,0.95)", boxShadow: "0 4px 16px rgba(139,58,47,0.18)", color: "#8B3A2F", border: "none" }}
          >
            <ArrowLeft style={{ width: 18, height: 18 }} />
          </button>
          <div className="flex items-center gap-1.5">
            <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 15, color: "#3D2315" }}>
              Live Location
            </span>
          </div>
          <div className="w-10 h-10" />
        </div>

        {/* ── Floating map controls (right edge) ── */}
        <div className="absolute top-[4.5rem] right-3 z-[480] flex flex-col gap-2">
          <MapControl
            icon={LocateFixed}
            label="Current Location"
            onClick={() => {
              if (coords) flyTo(coords.lat, coords.lng);
              else onRefresh();
            }}
          />
          <MapControl
            icon={Crosshair}
            label="Recenter"
            onClick={() => {
              if (coords) mapRef.current?.panTo([coords.lat, coords.lng], { animate: true });
              else onRefresh();
            }}
          />
          <MapControl icon={Shield} label="Safety Layer" active={safetyOn} onClick={() => setSafetyOn((v) => !v)} />
          <MapControl icon={Route} label="Directions" active={!!destination} onClick={openDirections} />
          <MapControl icon={Layers} label="Map Layers" active={satellite} onClick={() => setSatellite((v) => !v)} />
        </div>

        {/* ── Safety legend + live chip (bottom-left, above the sheet) ── */}
        {safetyOn && coords && !sosState.active && (
          <div
            className="absolute left-3 z-[480] flex items-center gap-2.5 px-3 py-1.5 rounded-full"
            style={{ bottom: sheetHeight + 56, background: "rgba(255,255,255,0.95)", boxShadow: "0 4px 16px rgba(139,58,47,0.16)", border: "1px solid rgba(242,149,106,0.2)" }}
          >
            {SAFETY_LEGEND.map((item) => (
              <span key={item.level} className="flex items-center gap-1" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 9.5, color: "#3D2315" }}>
                <span className="w-2 h-2 rounded-full" style={{ background: SAFETY_ZONE_COLORS[item.level] }} />
                {item.label}
              </span>
            ))}
          </div>
        )}
        {coords && !sosState.active && (
          <div
            className="absolute left-3 z-[480] flex items-center gap-2 px-3 py-2 rounded-full"
            style={{ bottom: sheetHeight + 14, background: "rgba(255,255,255,0.95)", boxShadow: "0 4px 16px rgba(139,58,47,0.16)", border: "1px solid rgba(242,149,106,0.2)" }}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: gpsStatus === "Active" ? "#3D9970" : "#F39C12", animation: "dot-pulse 1.6s ease-in-out infinite" }} />
            <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 11, color: "#3D2315" }}>
              {gpsStatus === "Active" ? "Live" : gpsStatus}
            </span>
          </div>
        )}

        {/* ── SOS action bar (only while an SOS is active) ── */}
        <AnimatePresence>
          {sosState.active && (
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
                    <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 16, color: "white" }}>SOS Active</p>
                    <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
                      Emergency contacts are being notified
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
                  <SosAction icon={Navigation} label="Navigate" onClick={() => window.open(googleMapsUrl(sosCoords.lat, sosCoords.lng), "_blank")} />
                  <SosAction icon={PhoneCall} label="Call" onClick={() => { window.location.href = "tel:112"; }} />
                  <SosAction icon={MessageCircle} label="Message" onClick={() => { window.location.href = "sms:112"; }} />
                  <SosAction icon={CheckCircle2} label="Mark Safe" onClick={handleMarkSafe} accent />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Bottom sheet (draggable) ── */}
        <div
          className="absolute bottom-0 inset-x-0 z-[450] flex flex-col live-location-sheet"
          style={{
            height: sheetHeight,
            transition: sheetTransition ? "height 0.3s cubic-bezier(0.33,1,0.68,1)" : "none",
          }}
        >
          <div
            className="flex-1 min-h-0 overflow-y-auto rounded-t-[28px] px-4 pt-2 pb-5"
            style={{
              background: "rgba(255,252,249,0.98)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              boxShadow: "0 -12px 40px rgba(139,58,47,0.14)",
              borderTop: "1px solid rgba(242,149,106,0.18)",
            }}
          >
            {/* Drag handle */}
            <div
              className="w-10 h-1.5 rounded-full mx-auto mb-2 cursor-grab active:cursor-grabbing touch-none"
              style={{ background: "#F5E4D6" }}
              onMouseDown={(e) => { e.preventDefault(); onDragStart(e.clientY); const onMove = (ev: MouseEvent) => onDragMove(ev.clientY); const onUp = () => { onDragEnd(); window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); }; window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp); }}
              onTouchStart={(e: ReactTouchEvent) => { onDragStart(e.touches[0]!.clientY); }}
              onTouchMove={(e: ReactTouchEvent) => { if (dragStartRef.current) { e.preventDefault(); onDragMove(e.touches[0]!.clientY); } }}
              onTouchEnd={onDragEnd}
            />

            {/* ── Compact header (always visible) ── */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 18, color: "#3D2315" }}>Current Location</h1>
                <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 11, color: "#9E7A6A", marginTop: 1 }}>
                  Updated {coords ? timeAgoShort(new Date(locationState.timestamp ?? Date.now()).toISOString()) : "—"}
                </p>
              </div>
              <span
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0"
                style={{ background: sharing ? "rgba(61,153,112,0.12)" : "rgba(243,156,18,0.12)", fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 10, color: sharing ? "#2E7D56" : "#B7770D" }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: sharing ? "#3D9970" : "#F39C12" }} />
                {sharing ? "Sharing Live" : "Sharing Paused"}
              </span>
            </div>

            {/* ── Compact summary (always visible) ── */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-2 flex-1 min-w-0 rounded-xl px-3 py-2"
                style={{ background: "linear-gradient(135deg, #FDF0F4, #F3EDFB)", border: "1px solid rgba(214,82,163,0.08)" }}>
                <MapPin style={{ width: 14, height: 14, color: "#D4455C", flexShrink: 0 }} />
                <p className="truncate" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 12, color: "#3D2315" }}>
                  {label ?? (coords ? "Fetching address…" : "Waiting for GPS fix…")}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="flex items-center gap-1" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 11, color: lowBattery ? "#B7770D" : "#3D9970" }}>
                  <BatteryMedium style={{ width: 13, height: 13 }} />
                  {battery != null ? `${battery}%` : "—"}
                </span>
                <span className="flex items-center gap-1" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 11, color: "#7A2B73" }}>
                  <Satellite style={{ width: 13, height: 13 }} />
                  {locationState.accuracy != null ? (locationState.accuracy < 50 ? "High" : locationState.accuracy < 200 ? "Medium" : "Low") : "—"}
                </span>
              </div>
            </div>

            {/* ── Expanded content (visible when sheet is dragged up) ── */}
            <div
              className="overflow-hidden"
              style={{
                maxHeight: sheetHeight > SHEET_SNAPS.compact + 30 ? 1200 : 0,
                opacity: sheetHeight > SHEET_SNAPS.compact + 30 ? 1 : 0,
                transition: "max-height 0.35s cubic-bezier(0.33,1,0.68,1), opacity 0.25s ease",
              }}
            >
            {/* Address + live details (expanded) */}
            <div className="rounded-[20px] p-3.5 mb-2.5"
              style={{ background: "linear-gradient(135deg, #FDF0F4, #F3EDFB)", border: "1px solid rgba(214,82,163,0.08)" }}
            >
              <div className="grid grid-cols-3 gap-x-2 gap-y-2" style={{ borderTop: "none" }}>
                <Field icon={sharing ? Share2 : PauseCircle} label="Sharing" value={sharing ? "Live" : "Paused"} tone={sharing ? "#2E7D56" : "#B7770D"} />
                <Field icon={Clock} label="Updated" value={coords ? timeAgoShort(new Date(locationState.timestamp ?? Date.now()).toISOString()) : "—"} tone="#9E7A6A" />
                <Field icon={Satellite} label="GPS Accuracy" value={locationState.accuracy != null ? `±${Math.round(locationState.accuracy)} m` : "—"} tone="#7A2B73" />
                <Field icon={BatteryMedium} label="Battery" value={battery != null ? `${battery}%` : "—"} tone={lowBattery ? "#B7770D" : "#3D9970"} />
                <Field icon={online ? Wifi : WifiOff} label="Internet" value={online ? "Online" : "Offline"} tone={online ? "#3D9970" : "#B7770D"} />
                <Field icon={movement === "driving" ? Car : movement === "walking" ? Footprints : MapPin} label="Movement" value={movementLabel(movement)} tone="#7A2B73" />
              </div>
            </div>

            {/* Destination & route options */}
            <div className="mb-2.5">
              <div className="relative">
                <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "#9E7A6A" }} />
                <input
                  ref={destInputRef}
                  value={destQuery}
                  onChange={(e) => {
                    setDestQuery(e.target.value);
                    void searchDest(e.target.value);
                  }}
                  onFocus={() => {
                    if (destQuery.trim().length >= 3) void searchDest(destQuery);
                  }}
                  placeholder="Search destination or tap the map"
                  aria-label="Destination"
                  style={{
                    width: "100%",
                    padding: "0.6rem 2.5rem 0.6rem 2.4rem",
                    background: "#FFF6FA",
                    border: "1px solid rgba(214,82,163,0.12)",
                    borderRadius: 12,
                    fontSize: "0.8125rem",
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 600,
                    color: "#3D2315",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                {destination && (
                  <button
                    onClick={clearDestination}
                    aria-label="Clear destination"
                    title="Clear destination"
                    style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", cursor: "pointer", color: "#9E7A6A" }}
                  >
                    <X style={{ width: 15, height: 15 }} />
                  </button>
                )}
              </div>

              {destSuggestions.length > 0 && (
                <div className="mt-2 rounded-[14px] overflow-hidden" style={{ background: "white", border: "1px solid rgba(242,149,106,0.14)", boxShadow: "0 6px 20px rgba(139,58,47,0.08)" }}>
                  {destSuggestions.map((s) => (
                    <button
                      key={`${s.lat},${s.lng}`}
                      onClick={() => void selectDestination(s)}
                      className="w-full text-left px-3.5 py-2.5 cursor-pointer"
                      style={{ border: "none", background: "transparent", borderBottom: "1px solid rgba(242,149,106,0.08)" }}
                    >
                      <p className="truncate" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 12, color: "#3D2315" }}>{s.label}</p>
                    </button>
                  ))}
                </div>
              )}

              {destination && (
                <div className="mt-2.5 rounded-[18px] p-3" style={{ background: "rgba(37,99,235,0.05)", border: "1px solid rgba(37,99,235,0.14)" }}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="flex items-center gap-1.5 truncate" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 12, color: "#1E3A8A" }}>
                      <MapPin style={{ width: 13, height: 13, flexShrink: 0 }} /> {destination.label}
                    </p>
                    <button
                      onClick={() => window.open(googleMapsUrl(destination.lat, destination.lng), "_blank")}
                      aria-label="Open destination in Google Maps"
                      style={{ border: "none", background: "transparent", cursor: "pointer", color: "#2563EB", flexShrink: 0 }}
                    >
                      <ExternalLink style={{ width: 15, height: 15 }} />
                    </button>
                  </div>
                  {loadingRoutes ? (
                    <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 11.5, color: "#6B7280" }}>Finding routes…</p>
                  ) : routes.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {routes.map((r) => {
                        const active = selectedRouteId === r.id;
                        return (
                          <button
                            key={r.id}
                            onClick={() => setSelectedRouteId(r.id)}
                            className="rounded-[14px] px-3 py-2.5 text-left cursor-pointer"
                            style={{
                              background: active ? ROUTE_COLORS[r.id] : "white",
                              border: `1px solid ${active ? ROUTE_COLORS[r.id] : "rgba(242,149,106,0.2)"}`,
                              boxShadow: active ? "0 4px 14px rgba(139,58,47,0.15)" : "none",
                            }}
                          >
                            <p className="flex items-center gap-1.5" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 11.5, color: active ? "white" : "#3D2315" }}>
                              <RouteIcon kind={r.id} /> {r.label.replace(" Route", "")}
                            </p>
                            <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 10.5, color: active ? "rgba(255,255,255,0.85)" : "#6B7280", marginTop: 2 }}>
                              {etaLabel(r.durationSec)} · {distanceLabel(r.distanceM)}
                            </p>
                            <p className="flex items-center gap-1 mt-1.5" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 9.5, color: active ? "rgba(255,255,255,0.9)" : SAFETY_COLORS[r.safety] }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? "rgba(255,255,255,0.9)" : SAFETY_COLORS[r.safety] }} />
                              Safety {r.safetyScore}/100
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-3 gap-2 mb-2.5">
              <Action icon={Share2} label="Share" onClick={() => void onShare()} />
              <Action icon={Copy} label="Copy" onClick={() => void onCopy()} />
              <Action icon={ExternalLink} label="Google Maps" onClick={() => coords && window.open(googleMapsUrl(coords.lat, coords.lng), "_blank")} disabled={!coords} />
              <Action icon={RefreshCw} label="Refresh" onClick={onRefresh} />
              <Action
                icon={sharing ? PauseCircle : PlayCircle}
                label={sharing ? "Stop Sharing" : "Resume"}
                onClick={toggleSharing}
                tone={sharing ? "#B8324A" : "#2E7D56"}
              />
              <Action
                icon={Navigation}
                label="Apple Maps"
                onClick={() => coords && window.open(appleMapsUrl(coords.lat, coords.lng), "_blank")}
                disabled={!coords}
              />
            </div>

            {/* More details */}
            <button
              onClick={() => setMoreOpen((v) => !v)}
              className="w-full flex items-center justify-between py-2.5 cursor-pointer"
              style={{ border: "none", background: "transparent" }}
            >
              <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 13, color: "#7A2B73" }}>More Details</span>
              <ChevronDown style={{ width: 16, height: 16, color: "#9E7A6A", transform: moreOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </button>
            <AnimatePresence>
              {moreOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-[18px] p-4 space-y-2.5 mb-3" style={{ background: "#FBF0E9", border: "1px solid rgba(242,149,106,0.12)" }}>
                    <DetailRow label="Latitude & Longitude" value={coords ? formatCoords(coords.lat, coords.lng) : "—"} />
                    <DetailRow label="Full address" value={fullAddress ?? label ?? "—"} />
                    <DetailRow label="GPS accuracy" value={locationState.accuracy != null ? `± ${Math.round(locationState.accuracy)} m` : "—"} />
                    <DetailRow label="Speed" value={locationState.speed != null ? `${(locationState.speed * 3.6).toFixed(1)} km/h` : "—"} />
                    <DetailRow label="Heading" value={locationState.heading != null ? `${Math.round(locationState.heading)}°` : "—"} />
                    <DetailRow label="Device battery" value={battery != null ? `${battery}%` : "—"} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* History */}
            <button
              onClick={() => setHistoryOpen((v) => !v)}
              className="w-full flex items-center justify-between py-2.5 cursor-pointer"
              style={{ border: "none", background: "transparent", borderTop: "1px solid rgba(242,149,106,0.14)" }}
            >
              <span className="flex items-center gap-2" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 13, color: "#7A2B73" }}>
                <History style={{ width: 15, height: 15 }} /> Location History
              </span>
              <span className="flex items-center gap-1.5" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 11, color: "#9E7A6A" }}>
                {history.length > 0 ? `${history.length} stops` : ""}
                <ChevronDown style={{ width: 15, height: 15, transform: historyOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
              </span>
            </button>
            <AnimatePresence>
              {historyOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  {history.length === 0 ? (
                    <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 12, color: "#9E7A6A", padding: "0.75rem 0", textAlign: "center" }}>
                      Stops appear here as you move — keep location services on.
                    </p>
                  ) : (
                    <div className="space-y-2.5 py-2 mb-2">
                      {history.map((h, i) => {
                        const key = `${h.lat.toFixed(3)},${h.lng.toFixed(3)}`;
                        const durMin = Math.max(1, Math.round(h.durationMs / 60000));
                        return (
                          <button
                            key={`${h.ts}-${i}`}
                            onClick={() => flyTo(h.lat, h.lng)}
                            className="w-full flex items-center gap-3 rounded-[18px] p-2.5 text-left cursor-pointer"
                            style={{ background: "white", border: "1px solid rgba(242,149,106,0.14)", boxShadow: "0 2px 10px rgba(139,58,47,0.05)" }}
                          >
                            <div className="w-20 h-16 rounded-xl overflow-hidden flex-shrink-0" style={{ position: "relative" }}>
                              <MiniMap lat={h.lat} lng={h.lng} className="w-full h-full" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="truncate" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 12.5, color: "#3D2315" }}>
                                {historyLabels[key] ?? "Loading address…"}
                              </p>
                              <p className="flex items-center gap-1.5 mt-1" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 10.5, color: "#9E7A6A" }}>
                                <Clock style={{ width: 11, height: 11 }} />
                                {formatTime(h.ts)} · {durMin} {durMin === 1 ? "min" : "mins"}
                              </p>
                            </div>
                            <ChevronRight style={{ width: 15, height: 15, color: "#FDDCCC", flexShrink: 0 }} />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            </div>{/* end expanded content */}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// ── Small presentational pieces ───────────────────────────────────────────────

const Field = ({ icon: Icon, label, value, tone }: { icon: typeof MapPin; label: string; value: string; tone: string }) => (
  <div className="min-w-0">
    <p className="flex items-center gap-1" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 9, color: "#9E7A6A", textTransform: "uppercase", letterSpacing: 0.4 }}>
      <Icon style={{ width: 10, height: 10, color: tone, flexShrink: 0 }} />
      <span className="truncate">{label}</span>
    </p>
    <p className="truncate mt-0.5" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 11.5, color: "#3D2315" }}>{value}</p>
  </div>
);

const MapControl = ({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof MapPin;
  label: string;
  active?: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    title={label}
    aria-label={label}
    className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer"
    style={{
      background: active ? "rgba(122,43,115,0.95)" : "rgba(255,255,255,0.95)",
      color: active ? "white" : "#3D2315",
      boxShadow: "0 4px 16px rgba(139,58,47,0.18)",
      border: `1px solid ${active ? "transparent" : "rgba(242,149,106,0.25)"}`,
    }}
  >
    <Icon style={{ width: 17, height: 17 }} />
  </button>
);

const RouteIcon = ({ kind }: { kind: RouteKind }) => {
  if (kind === "safest") return <ShieldCheck style={{ width: 13, height: 13 }} />;
  if (kind === "fastest") return <Zap style={{ width: 13, height: 13 }} />;
  if (kind === "walking") return <Footprints style={{ width: 13, height: 13 }} />;
  return <Car style={{ width: 13, height: 13 }} />;
};

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

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-start justify-between gap-3">
    <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 11, color: "#9E7A6A", flexShrink: 0 }}>{label}</span>
    <span className="text-right" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 11.5, color: "#3D2315" }}>{value}</span>
  </div>
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
