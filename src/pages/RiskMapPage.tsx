import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Shield, Navigation, Eye, EyeOff,
  AlertTriangle, Clock, CheckCircle2, Siren, HeartPulse
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// ─── Fix default marker icon broken by bundlers ──────────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ─── Mock Data ────────────────────────────────────────────────────────────────

/** Heat zones: [lat, lng, intensity 0-1] */
const HIGH_RISK_POINTS: [number, number, number][] = [
  [28.7041, 77.1025, 0.9],  // Rohini Sector 3
  [28.7115, 77.1142, 0.85], // Rohini Sector 7
  [28.7200, 77.0980, 0.8],  // Rohini Sector 11
  [28.7300, 77.0850, 0.9],  // Outer Delhi isolated road
  [28.7380, 77.0760, 0.85], // Bawana Road stretch
  [28.7450, 77.0900, 0.8],  // Narela area
  [28.6950, 77.0700, 0.88], // Mangolpuri area
];

const MEDIUM_RISK_POINTS: [number, number, number][] = [
  [28.7190, 77.1390, 0.55], // North Delhi - Civil Lines
  [28.7260, 77.1520, 0.5],  // Timarpur
  [28.7100, 77.1650, 0.6],  // Kashmere Gate
  [28.6940, 77.1400, 0.5],  // Shakti Nagar
  [28.7010, 77.1550, 0.55], // Pratap Nagar
  [28.7320, 77.1200, 0.5],  // Shalimar Bagh
];

const LOW_RISK_POINTS: [number, number, number][] = [
  [28.6139, 77.2090, 0.2],  // Connaught Place (crowded/safe)
  [28.6280, 77.2190, 0.15], // Pragati Maidan
  [28.6350, 77.2250, 0.2],  // Central Delhi Lajpat Nagar
  [28.6200, 77.2000, 0.15], // Janpath area
  [28.6450, 77.2150, 0.18], // ITO area
];

/** Police stations */
const POLICE_STATIONS = [
  { lat: 28.7050, lng: 77.1100, name: "Rohini Police Station" },
  { lat: 28.7180, lng: 77.1430, name: "Shalimar Bagh PS" },
  { lat: 28.6950, lng: 77.0820, name: "Mangolpuri PS" },
  { lat: 28.7370, lng: 77.0780, name: "Bawana PS" },
];

/** Hospitals */
const HOSPITALS = [
  { lat: 28.7090, lng: 77.1060, name: "Rohini Hospital" },
  { lat: 28.7200, lng: 77.1500, name: "Hindu Rao Hospital" },
  { lat: 28.6250, lng: 77.2100, name: "AIIMS Delhi" },
  { lat: 28.7010, lng: 77.0890, name: "Sanjay Gandhi Memorial Hospital" },
];

/** Safe route: mock user → destination avoiding red zones */
const SAFE_ROUTE_POINTS: [number, number][] = [
  [28.6139, 77.2090], // Start: Connaught Place
  [28.6300, 77.2000],
  [28.6480, 77.1900],
  [28.6700, 77.1750],
  [28.6860, 77.1600],
  [28.7000, 77.1450],
  [28.7190, 77.1390], // End: Civil Lines
];

// ─── Risk zones list (sidebar) ────────────────────────────────────────────────
const RISK_ZONES = [
  { name: "Rohini Sectors 3–11", risk: "high" as const, desc: "12 reports · Avoid after 9 PM" },
  { name: "Bawana–Narela Road", risk: "high" as const, desc: "8 reports · Isolated stretch" },
  { name: "Mangolpuri Area",    risk: "high" as const, desc: "10 reports · After 10 PM" },
  { name: "Civil Lines",        risk: "medium" as const, desc: "5 reports · Semi-crowded" },
  { name: "Timarpur",           risk: "medium" as const, desc: "4 reports · Night caution" },
  { name: "Connaught Place",    risk: "low" as const, desc: "1 report · Crowded & safe" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeCircleIcon(color: string) {
  return L.divIcon({
    html: `<div style="
      width:28px;height:28px;border-radius:50%;
      background:${color};
      border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.5);
      display:flex;align-items:center;justify-content:center;
      font-size:13px;
    "></div>`,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

const RISK_STYLE = {
  high:   { bg: "bg-red-500/15",    text: "text-red-400",    border: "border-red-500/30",   dot: "bg-red-500"    },
  medium: { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/30",dot: "bg-orange-500" },
  low:    { bg: "bg-emerald-500/15",text: "text-emerald-400",border: "border-emerald-500/30",dot:"bg-emerald-500" },
};

// ─── Component ────────────────────────────────────────────────────────────────
const RiskMapPage = () => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const heatLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showRoute,   setShowRoute]   = useState(false);
  const [showMarkers, setShowMarkers] = useState(true);
  const [activeTab,   setActiveTab]   = useState<"map" | "zones">("map");

  // Init map
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = L.map(containerRef.current, {
      center: [28.7041, 77.1025],
      zoom: 12,
      zoomControl: false,
    });

    // Dark tile layer
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution: "© OpenStreetMap contributors © CARTO",
        subdomains: "abcd",
        maxZoom: 19,
      }
    ).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    // ── Heatmap (canvas circles) ──
    const heatGroup = L.layerGroup().addTo(map);
    const drawHeat = () => {
      heatGroup.clearLayers();
      const allPoints: { lat: number; lng: number; color: string; r: number }[] = [
        ...HIGH_RISK_POINTS.map(([lat, lng]) => ({ lat, lng, color: "rgba(220,38,38,", r: 900 })),
        ...MEDIUM_RISK_POINTS.map(([lat, lng]) => ({ lat, lng, color: "rgba(234,88,12,", r: 700 })),
        ...LOW_RISK_POINTS.map(([lat, lng]) => ({ lat, lng, color: "rgba(16,185,129,", r: 600 })),
      ];
      allPoints.forEach(({ lat, lng, color, r }) => {
        L.circle([lat, lng], {
          radius: r,
          color: "transparent",
          fillColor: color + "0.35)",
          fillOpacity: 1,
          weight: 0,
        }).addTo(heatGroup);
        L.circle([lat, lng], {
          radius: r * 0.5,
          color: "transparent",
          fillColor: color + "0.25)",
          fillOpacity: 1,
          weight: 0,
        }).addTo(heatGroup);
      });
    };
    drawHeat();
    heatLayerRef.current = heatGroup;

    // ── Markers (police + hospitals) ──
    const markerGroup = L.layerGroup().addTo(map);
    POLICE_STATIONS.forEach(({ lat, lng, name }) => {
      L.marker([lat, lng], { icon: makeCircleIcon("#3b82f6") })
        .bindPopup(`<b>🚔 ${name}</b>`)
        .addTo(markerGroup);
    });
    HOSPITALS.forEach(({ lat, lng, name }) => {
      L.marker([lat, lng], { icon: makeCircleIcon("#10b981") })
        .bindPopup(`<b>🏥 ${name}</b>`)
        .addTo(markerGroup);
    });
    markersRef.current = markerGroup;

    // ── Safe Route ──
    const routeGroup = L.layerGroup();
    L.polyline(SAFE_ROUTE_POINTS, {
      color: "#22d3ee",
      weight: 5,
      dashArray: "10, 8",
    }).addTo(routeGroup);
    // Start / end markers
    L.marker(SAFE_ROUTE_POINTS[0], {
      icon: makeCircleIcon("#22d3ee"),
    }).bindPopup("<b>📍 Your Location (Mock)</b>").addTo(routeGroup);
    L.marker(SAFE_ROUTE_POINTS[SAFE_ROUTE_POINTS.length - 1], {
      icon: makeCircleIcon("#a855f7"),
    }).bindPopup("<b>🏁 Destination (Mock)</b>").addTo(routeGroup);

    routeLayerRef.current = routeGroup;

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Toggle heatmap
  useEffect(() => {
    if (!heatLayerRef.current || !mapRef.current) return;
    if (showHeatmap) mapRef.current.addLayer(heatLayerRef.current);
    else mapRef.current.removeLayer(heatLayerRef.current);
  }, [showHeatmap]);

  // Toggle route
  useEffect(() => {
    if (!routeLayerRef.current || !mapRef.current) return;
    if (showRoute) mapRef.current.addLayer(routeLayerRef.current);
    else mapRef.current.removeLayer(routeLayerRef.current);
  }, [showRoute]);

  // Toggle markers
  useEffect(() => {
    if (!markersRef.current || !mapRef.current) return;
    if (showMarkers) mapRef.current.addLayer(markersRef.current);
    else mapRef.current.removeLayer(markersRef.current);
  }, [showMarkers]);

  return (
    <div className="min-h-screen bg-background pb-24 flex flex-col">
      {/* Header */}
      <div className="px-5 pt-6 pb-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold">Safety Heatmap</h1>
          <p className="text-xs text-muted-foreground">Delhi · Mock demo data</p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <MapPin className="w-5 h-5 text-primary" />
        </div>
      </div>

      {/* Tab bar */}
      <div className="px-5 mb-3 shrink-0">
        <div className="glass rounded-xl p-1 flex gap-1">
          {(["map", "zones"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all capitalize ${
                activeTab === t
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground"
              }`}
            >
              {t === "map" ? "🗺️ Live Map" : "📋 Risk Zones"}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "map" ? (
          <motion.div
            key="map"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col flex-1 px-5 gap-3"
          >
            {/* Map container */}
            <div className="relative rounded-2xl overflow-hidden border border-border shadow-xl"
              style={{ height: "320px" }}>
              <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

              {/* Legend overlay */}
              <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md rounded-xl px-3 py-2 flex flex-col gap-1.5 z-[9999]">
                <p className="text-[9px] font-bold text-white/60 uppercase tracking-wider mb-0.5">Legend</p>
                {[
                  { color: "bg-red-500",     label: "High Risk"   },
                  { color: "bg-orange-500",  label: "Medium Risk" },
                  { color: "bg-emerald-500", label: "Safe Zone"   },
                  { color: "bg-blue-500",    label: "Police Stn"  },
                  { color: "bg-emerald-400", label: "Hospital"    },
                  { color: "bg-cyan-400",    label: "Safe Route"  },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                    <span className="text-[10px] text-white/80">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Toggle controls */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Heatmap",  state: showHeatmap, set: setShowHeatmap, icon: <Eye className="w-3.5 h-3.5" /> },
                { label: "Route",    state: showRoute,   set: setShowRoute,   icon: <Navigation className="w-3.5 h-3.5" /> },
                { label: "Markers",  state: showMarkers, set: setShowMarkers, icon: <MapPin className="w-3.5 h-3.5" /> },
              ].map(({ label, state, set, icon }) => (
                <button
                  key={label}
                  onClick={() => set((v) => !v)}
                  className={`glass rounded-xl py-2.5 flex flex-col items-center gap-1.5 border transition-all text-xs font-semibold ${
                    state
                      ? "border-primary/40 text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {state ? icon : <EyeOff className="w-3.5 h-3.5" />}
                  {label}
                </button>
              ))}
            </div>

            {/* Route info card */}
            <AnimatePresence>
              {showRoute && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="glass rounded-xl p-4 border border-cyan-500/20"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Navigation className="w-4 h-4 text-cyan-400" />
                    <p className="text-sm font-semibold text-cyan-400">Safe Route Active</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div className="glass rounded-lg p-2">
                      <p className="font-medium text-foreground">📍 From</p>
                      <p>Connaught Place</p>
                    </div>
                    <div className="glass rounded-lg p-2">
                      <p className="font-medium text-foreground">🏁 To</p>
                      <p>Civil Lines</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    ✅ This route avoids all High Risk zones · ~4.2 km
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Stat chips */}
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: "High Risk", count: HIGH_RISK_POINTS.length,   color: "text-red-400",     Icon: AlertTriangle },
                { label: "Medium",    count: MEDIUM_RISK_POINTS.length,  color: "text-orange-400",  Icon: Clock },
                { label: "Safe",      count: LOW_RISK_POINTS.length,     color: "text-emerald-400", Icon: CheckCircle2 },
              ].map(({ label, count, color, Icon }) => (
                <div key={label} className="glass rounded-xl py-3">
                  <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
                  <p className={`text-lg font-bold ${color}`}>{count}</p>
                  <p className="text-[10px] text-muted-foreground">{label} zones</p>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          /* ── Risk Zones List ─────────────────────────────────────────── */
          <motion.div
            key="zones"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="px-5 space-y-3"
          >
            <div className="space-y-3">
              {RISK_ZONES.map((z, i) => {
                const s = RISK_STYLE[z.risk];
                const Icon = z.risk === "high" ? AlertTriangle : z.risk === "medium" ? Clock : CheckCircle2;
                return (
                  <motion.div
                    key={z.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className={`glass rounded-xl p-4 border ${s.border} ${s.bg}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <Icon className={`w-5 h-5 mt-0.5 ${s.text}`} />
                        <div>
                          <p className="text-sm font-semibold text-foreground">{z.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{z.desc}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${s.border} ${s.text} shrink-0`}>
                        {z.risk}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* POI list */}
            <div className="glass rounded-xl p-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                Nearby Safe Points
              </p>
              <div className="space-y-2">
                {POLICE_STATIONS.slice(0, 2).map((p) => (
                  <div key={p.name} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
                      <Siren className="w-4 h-4 text-blue-400" />
                    </div>
                    <p className="text-sm">{p.name}</p>
                  </div>
                ))}
                {HOSPITALS.slice(0, 2).map((h) => (
                  <div key={h.name} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                      <HeartPulse className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="text-sm">{h.name}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground">
                Risk data based on mock FIR records &amp; community reports. For demo purposes only.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

export default RiskMapPage;
