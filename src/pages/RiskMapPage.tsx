import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  MapPin, Navigation, Eye, EyeOff,
  AlertTriangle, Clock, CheckCircle2, Siren, HeartPulse,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Mock Data
const HIGH_RISK_POINTS: [number, number, number][] = [
  [28.7041, 77.1025, 0.9], [28.7115, 77.1142, 0.85], [28.7200, 77.0980, 0.8],
  [28.7300, 77.0850, 0.9], [28.7380, 77.0760, 0.85], [28.7450, 77.0900, 0.8],
  [28.6950, 77.0700, 0.88],
];
const MEDIUM_RISK_POINTS: [number, number, number][] = [
  [28.7190, 77.1390, 0.55], [28.7260, 77.1520, 0.5], [28.7100, 77.1650, 0.6],
  [28.6940, 77.1400, 0.5],  [28.7010, 77.1550, 0.55],[28.7320, 77.1200, 0.5],
];
const LOW_RISK_POINTS: [number, number, number][] = [
  [28.6139, 77.2090, 0.2], [28.6280, 77.2190, 0.15], [28.6350, 77.2250, 0.2],
  [28.6200, 77.2000, 0.15],[28.6450, 77.2150, 0.18],
];
const POLICE_STATIONS = [
  { lat: 28.7050, lng: 77.1100, name: "Rohini Police Station" },
  { lat: 28.7180, lng: 77.1430, name: "Shalimar Bagh PS" },
  { lat: 28.6950, lng: 77.0820, name: "Mangolpuri PS" },
  { lat: 28.7370, lng: 77.0780, name: "Bawana PS" },
];
const HOSPITALS = [
  { lat: 28.7090, lng: 77.1060, name: "Rohini Hospital" },
  { lat: 28.7200, lng: 77.1500, name: "Hindu Rao Hospital" },
  { lat: 28.6250, lng: 77.2100, name: "AIIMS Delhi" },
  { lat: 28.7010, lng: 77.0890, name: "Sanjay Gandhi Memorial Hospital" },
];
const SAFE_ROUTE_POINTS: [number, number][] = [
  [28.6139, 77.2090], [28.6300, 77.2000], [28.6480, 77.1900],
  [28.6700, 77.1750], [28.6860, 77.1600], [28.7000, 77.1450],
  [28.7190, 77.1390],
];
const RISK_ZONES = [
  { name: "ROHINI SECTORS 3-11",  risk: "high"   as const, desc: "12 reports — Avoid after 9 PM" },
  { name: "BAWANA-NARELA ROAD",   risk: "high"   as const, desc: "8 reports — Isolated stretch" },
  { name: "MANGOLPURI AREA",      risk: "high"   as const, desc: "10 reports — After 10 PM" },
  { name: "CIVIL LINES",          risk: "medium" as const, desc: "5 reports — Semi-crowded" },
  { name: "TIMARPUR",             risk: "medium" as const, desc: "4 reports — Night caution" },
  { name: "CONNAUGHT PLACE",      risk: "low"    as const, desc: "1 report — Crowded and safe" },
];

function makeCircleIcon(color: string) {
  return L.divIcon({
    html: `<div style="width:20px;height:20px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.5);box-shadow:0 2px 6px rgba(0,0,0,0.6);"></div>`,
    className: "",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

const RISK_STYLE = {
  high:   { text: "hsl(0 72% 58%)",   border: "hsl(0 72% 52% / 0.3)",   dot: "hsl(0 72% 58%)" },
  medium: { text: "hsl(38 90% 52%)",  border: "hsl(38 90% 52% / 0.3)",  dot: "hsl(38 90% 52%)" },
  low:    { text: "hsl(142 60% 44%)", border: "hsl(142 60% 44% / 0.3)", dot: "hsl(142 60% 44%)" },
};

const RiskMapPage = () => {
  const mapRef       = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const heatLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef= useRef<L.LayerGroup | null>(null);
  const markersRef   = useRef<L.LayerGroup | null>(null);

  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showRoute,   setShowRoute]   = useState(false);
  const [showMarkers, setShowMarkers] = useState(true);
  const [activeTab,   setActiveTab]   = useState<"map" | "zones">("map");

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = L.map(containerRef.current, {
      center: [28.7041, 77.1025],
      zoom: 12,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "© OpenStreetMap contributors © CARTO",
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Heatmap
    const heatGroup = L.layerGroup().addTo(map);
    const allPoints = [
      ...HIGH_RISK_POINTS.map(([lat, lng]) => ({ lat, lng, color: "rgba(220,38,38,",   r: 900 })),
      ...MEDIUM_RISK_POINTS.map(([lat, lng]) => ({ lat, lng, color: "rgba(234,88,12,",  r: 700 })),
      ...LOW_RISK_POINTS.map(([lat, lng]) => ({ lat, lng, color: "rgba(16,185,129,",   r: 600 })),
    ];
    allPoints.forEach(({ lat, lng, color, r }) => {
      L.circle([lat, lng], { radius: r,         color: "transparent", fillColor: color + "0.35)", fillOpacity: 1, weight: 0 }).addTo(heatGroup);
      L.circle([lat, lng], { radius: r * 0.5,   color: "transparent", fillColor: color + "0.2)",  fillOpacity: 1, weight: 0 }).addTo(heatGroup);
    });
    heatLayerRef.current = heatGroup;

    // Markers
    const markerGroup = L.layerGroup().addTo(map);
    POLICE_STATIONS.forEach(({ lat, lng, name }) =>
      L.marker([lat, lng], { icon: makeCircleIcon("#3b82f6") }).bindPopup(`<b>${name}</b>`).addTo(markerGroup)
    );
    HOSPITALS.forEach(({ lat, lng, name }) =>
      L.marker([lat, lng], { icon: makeCircleIcon("#10b981") }).bindPopup(`<b>${name}</b>`).addTo(markerGroup)
    );
    markersRef.current = markerGroup;

    // Route
    const routeGroup = L.layerGroup();
    L.polyline(SAFE_ROUTE_POINTS, { color: "#22d3ee", weight: 4, dashArray: "10, 8" }).addTo(routeGroup);
    L.marker(SAFE_ROUTE_POINTS[0], { icon: makeCircleIcon("#22d3ee") }).bindPopup("<b>Origin (Mock)</b>").addTo(routeGroup);
    L.marker(SAFE_ROUTE_POINTS[SAFE_ROUTE_POINTS.length - 1], { icon: makeCircleIcon("#a855f7") }).bindPopup("<b>Destination (Mock)</b>").addTo(routeGroup);
    routeLayerRef.current = routeGroup;

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    if (!heatLayerRef.current || !mapRef.current) return;
    if (showHeatmap) mapRef.current.addLayer(heatLayerRef.current);
    else mapRef.current.removeLayer(heatLayerRef.current);
  }, [showHeatmap]);

  useEffect(() => {
    if (!routeLayerRef.current || !mapRef.current) return;
    if (showRoute) mapRef.current.addLayer(routeLayerRef.current);
    else mapRef.current.removeLayer(routeLayerRef.current);
  }, [showRoute]);

  useEffect(() => {
    if (!markersRef.current || !mapRef.current) return;
    if (showMarkers) mapRef.current.addLayer(markersRef.current);
    else mapRef.current.removeLayer(markersRef.current);
  }, [showMarkers]);

  return (
    <div className="min-h-screen pb-24 flex flex-col" style={{ backgroundColor: "hsl(var(--background))" }}>

      {/* Header */}
      <div className="px-5 pt-8 pb-5 border-b border-border/40">
        <p className="section-label mb-1">Situational Awareness</p>
        <h1
          className="text-2xl font-black tracking-wide"
          style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}
        >
          LIVE THREAT MAP
        </h1>
      </div>

      {/* Tab bar */}
      <div className="px-5 pt-4 pb-3 flex gap-1.5 shrink-0">
        {(["map", "zones"] as const).map((t) => (
          <button
            key={t}
            id={`map-tab-${t}`}
            onClick={() => setActiveTab(t)}
            className="flex-1 py-2 font-mono text-[10px] font-bold tracking-widest uppercase transition-all"
            style={{
              backgroundColor: activeTab === t ? "hsl(var(--foreground) / 0.05)" : "transparent",
              border: `1px solid ${activeTab === t ? "hsl(var(--foreground) / 0.25)" : "hsl(var(--border))"}`,
              borderRadius: "4px",
              color: activeTab === t ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
            }}
          >
            {t === "map" ? "MAP VIEW" : "RISK ZONES"}
          </button>
        ))}
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
            {/* Map */}
            <div
              className="relative overflow-hidden"
              style={{
                height: "320px",
                border: "1px solid hsl(var(--border))",
                borderRadius: "4px",
              }}
            >
              <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

              {/* Legend */}
              <div
                className="absolute bottom-3 left-3 z-[9999] flex flex-col gap-1.5 px-3 py-2.5"
                style={{
                  backgroundColor: "rgba(5,8,20,0.88)",
                  backdropFilter: "blur(8px)",
                  borderRadius: "4px",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <p className="section-label mb-0.5">LEGEND</p>
                {[
                  { color: "#dc2626", label: "HIGH RISK"   },
                  { color: "#ea580c", label: "MEDIUM RISK" },
                  { color: "#10b981", label: "SAFE ZONE"   },
                  { color: "#3b82f6", label: "POLICE STN"  },
                  { color: "#10b981", label: "HOSPITAL"    },
                  { color: "#22d3ee", label: "SAFE ROUTE"  },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-[9px] font-mono font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Layer Toggles */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "HEATMAP", state: showHeatmap, set: setShowHeatmap },
                { label: "ROUTE",   state: showRoute,   set: setShowRoute   },
                { label: "MARKERS", state: showMarkers, set: setShowMarkers },
              ].map(({ label, state, set }) => (
                <button
                  key={label}
                  id={`toggle-${label.toLowerCase()}`}
                  onClick={() => set((v) => !v)}
                  className="flex items-center justify-between px-3 py-2.5 transition-all"
                  style={{
                    backgroundColor: state ? "hsl(var(--card))" : "transparent",
                    border: `1px solid ${state ? "hsl(var(--foreground) / 0.2)" : "hsl(var(--border))"}`,
                    borderRadius: "4px",
                  }}
                >
                  <span
                    className="text-[9px] font-mono font-bold tracking-wider"
                    style={{ color: state ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}
                  >
                    {label}
                  </span>
                  {state ? (
                    <Eye className="w-3 h-3" style={{ color: "hsl(var(--safe))" }} />
                  ) : (
                    <EyeOff className="w-3 h-3" style={{ color: "hsl(var(--muted-foreground))" }} />
                  )}
                </button>
              ))}
            </div>

            {/* Route Info */}
            <AnimatePresence>
              {showRoute && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="px-4 py-3 flex flex-col gap-2"
                  style={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(215 60% 50% / 0.25)",
                    borderRadius: "4px",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Navigation className="w-3.5 h-3.5" style={{ color: "hsl(215 60% 60%)" }} />
                    <p className="text-xs font-mono font-bold" style={{ color: "hsl(215 60% 60%)" }}>
                      SAFE ROUTE ACTIVE
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div
                      className="px-3 py-2"
                      style={{ backgroundColor: "hsl(var(--muted))", borderRadius: "2px" }}
                    >
                      <p className="text-[9px] font-mono font-bold" style={{ color: "hsl(var(--muted-foreground))" }}>
                        FROM
                      </p>
                      <p className="text-xs font-mono" style={{ color: "hsl(var(--foreground))" }}>
                        Connaught Place
                      </p>
                    </div>
                    <div
                      className="px-3 py-2"
                      style={{ backgroundColor: "hsl(var(--muted))", borderRadius: "2px" }}
                    >
                      <p className="text-[9px] font-mono font-bold" style={{ color: "hsl(var(--muted-foreground))" }}>
                        TO
                      </p>
                      <p className="text-xs font-mono" style={{ color: "hsl(var(--foreground))" }}>
                        Civil Lines
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] font-mono" style={{ color: "hsl(var(--safe))" }}>
                    Avoids all high-risk zones — 4.2 km
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Zone Stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "HIGH RISK", count: HIGH_RISK_POINTS.length,   color: "hsl(0 72% 58%)",    Icon: AlertTriangle },
                { label: "MEDIUM",    count: MEDIUM_RISK_POINTS.length,  color: "hsl(38 90% 52%)",   Icon: Clock },
                { label: "SAFE",      count: LOW_RISK_POINTS.length,     color: "hsl(142 60% 44%)",  Icon: CheckCircle2 },
              ].map(({ label, count, color, Icon }) => (
                <div
                  key={label}
                  className="text-center py-3"
                  style={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "4px",
                  }}
                >
                  <Icon className="w-4 h-4 mx-auto mb-1.5" style={{ color }} />
                  <p className="text-xl font-black font-mono" style={{ color }}>{count}</p>
                  <p className="text-[8px] font-mono font-bold tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          /* Risk Zones List */
          <motion.div
            key="zones"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            className="px-5 space-y-5"
          >
            <div className="space-y-px">
              {RISK_ZONES.map((z, i) => {
                const s = RISK_STYLE[z.risk];
                const Icon = z.risk === "high" ? AlertTriangle : z.risk === "medium" ? Clock : CheckCircle2;
                return (
                  <motion.div
                    key={z.name}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-4 px-4 py-3.5"
                    style={{
                      backgroundColor: "hsl(var(--card))",
                      borderBottom: i < RISK_ZONES.length - 1 ? "1px solid hsl(var(--border) / 0.4)" : undefined,
                      borderRadius:
                        i === 0
                          ? "4px 4px 0 0"
                          : i === RISK_ZONES.length - 1
                          ? "0 0 4px 4px"
                          : undefined,
                      borderLeft: `2px solid ${s.text}`,
                    }}
                  >
                    <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: s.text }} />
                    <div className="flex-1">
                      <p
                        className="text-xs font-mono font-bold tracking-wide"
                        style={{ color: "hsl(var(--foreground))" }}
                      >
                        {z.name}
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                        {z.desc}
                      </p>
                    </div>
                    <span
                      className="text-[8px] font-mono font-black tracking-widest px-2 py-0.5 uppercase"
                      style={{
                        color: s.text,
                        border: `1px solid ${s.border}`,
                        borderRadius: "2px",
                        flexShrink: 0,
                      }}
                    >
                      {z.risk}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {/* Nearby Safe Points */}
            <div>
              <p className="section-label mb-2">Nearby Safe Points</p>
              <div className="space-y-px">
                {[
                  ...POLICE_STATIONS.slice(0, 2).map((p) => ({ ...p, type: "police" })),
                  ...HOSPITALS.slice(0, 2).map((h) => ({ ...h, type: "hospital" })),
                ].map((pt, i, arr) => (
                  <div
                    key={pt.name}
                    className="flex items-center gap-3 px-4 py-2.5"
                    style={{
                      backgroundColor: "hsl(var(--card))",
                      borderBottom: i < arr.length - 1 ? "1px solid hsl(var(--border) / 0.4)" : undefined,
                      borderRadius:
                        i === 0
                          ? "4px 4px 0 0"
                          : i === arr.length - 1
                          ? "0 0 4px 4px"
                          : undefined,
                    }}
                  >
                    {pt.type === "police" ? (
                      <Siren className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "hsl(215 60% 60%)" }} />
                    ) : (
                      <HeartPulse className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "hsl(142 60% 44%)" }} />
                    )}
                    <p className="text-xs font-mono" style={{ color: "hsl(var(--foreground) / 0.8)" }}>
                      {pt.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="px-4 py-3 mb-4"
              style={{
                backgroundColor: "hsl(var(--muted))",
                borderRadius: "4px",
              }}
            >
              <p className="text-[10px] font-mono text-center" style={{ color: "hsl(var(--muted-foreground))" }}>
                Risk data derived from mock FIR records and community reports — demo only
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
