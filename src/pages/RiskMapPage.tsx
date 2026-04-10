import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  MapPin, Navigation, Eye, EyeOff,
  AlertTriangle, Clock, CheckCircle2, Siren, HeartPulse, Search, Map as MapIcon
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { toast } from "@/components/ui/use-toast";

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
// Base origin for demo
const ORIGIN_POINT: [number, number] = [28.7120, 77.1140]; // Somewhere in Rohini
// Mock calculated route points when a user enters a destination
const CALCULATED_ROUTE_POINTS: [number, number][] = [
  ORIGIN_POINT, [28.7200, 77.1000], [28.7300, 77.0900], [28.7380, 77.0800], [28.7450, 77.0700]
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

  // Routing State
  const [destination, setDestination] = useState("");
  const [routeCalculated, setRouteCalculated] = useState(false);
  const [isRouting, setIsRouting] = useState(false);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = L.map(containerRef.current, {
      center: ORIGIN_POINT,
      zoom: 13,
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

    // We leave routeGroup empty initially
    routeLayerRef.current = L.layerGroup();

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    if (!heatLayerRef.current || !mapRef.current) return;
    if (showHeatmap) mapRef.current.addLayer(heatLayerRef.current);
    else mapRef.current.removeLayer(heatLayerRef.current);
  }, [showHeatmap]);

  useEffect(() => {
    if (!markersRef.current || !mapRef.current) return;
    if (showMarkers) mapRef.current.addLayer(markersRef.current);
    else mapRef.current.removeLayer(markersRef.current);
  }, [showMarkers]);

  // Handle Route Calculation Mock
  const handleCalculateRoute = (e: React.FormEvent) => {
      e.preventDefault();
      if (!destination.trim() || !mapRef.current || !routeLayerRef.current) return;
      
      setIsRouting(true);
      
      setTimeout(() => {
          setIsRouting(false);
          setRouteCalculated(true);
          setShowRoute(true);
          
          // Clear old route
          routeLayerRef.current!.clearLayers();
          
          // Draw "Red/Unsafe" highlighted route line passing through high risk
          L.polyline(CALCULATED_ROUTE_POINTS, { color: "#dc2626", weight: 5, dashArray: "12, 8" }).addTo(routeLayerRef.current!);
          L.polyline(CALCULATED_ROUTE_POINTS, { color: "rgba(220,38,38,0.2)", weight: 15 }).addTo(routeLayerRef.current!);
          
          L.marker(CALCULATED_ROUTE_POINTS[0], { icon: makeCircleIcon("#22d3ee") }).bindPopup("<b>Origin: Rohini</b>").addTo(routeLayerRef.current!);
          L.marker(CALCULATED_ROUTE_POINTS[CALCULATED_ROUTE_POINTS.length - 1], { icon: makeCircleIcon("#a855f7") }).bindPopup(`<b>Destination: ${destination}</b>`).addTo(routeLayerRef.current!);
          
          mapRef.current!.addLayer(routeLayerRef.current!);
          mapRef.current!.fitBounds(L.polyline(CALCULATED_ROUTE_POINTS).getBounds(), { padding: [30, 30] });

      }, 1000);
  };

  useEffect(() => {
    if (!routeLayerRef.current || !mapRef.current) return;
    if (showRoute) {
        if (!mapRef.current.hasLayer(routeLayerRef.current)) {
           mapRef.current.addLayer(routeLayerRef.current);
        }
    } else {
        mapRef.current.removeLayer(routeLayerRef.current);
    }
  }, [showRoute]);

  return (
    <div className="min-h-screen pb-24 flex flex-col" style={{ backgroundColor: "hsl(var(--background))" }}>

      {/* Header */}
      <div className="px-5 pt-8 pb-5 border-b border-border/40">
        <div className="flex items-center gap-2 mb-1">
            <MapIcon className="w-4 h-4 text-primary" />
            <p className="section-label mb-0 text-primary">Situational Awareness</p>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground font-heading">
          Live Risk Map
        </h1>
      </div>

      {/* Tab bar */}
      <div className="px-5 pt-4 pb-3 flex gap-1.5 shrink-0">
        {(["map", "zones"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className="flex-1 py-2 font-semibold text-xs tracking-wider uppercase transition-all rounded-md"
            style={{
              backgroundColor: activeTab === t ? "hsl(var(--foreground) / 0.05)" : "transparent",
              border: `1px solid ${activeTab === t ? "hsl(var(--foreground) / 0.25)" : "hsl(var(--border))"}`,
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
            className="flex flex-col flex-1 px-5 gap-4"
          >
            {/* Nav Input Bar */}
            <form onSubmit={handleCalculateRoute} className="flex gap-2">
                <div className="relative flex-1">
                   <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400" />
                   <input 
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="Where to? (Origin: Rohini)"
                      className="input-soft pl-8 py-3 w-full border-border/80 text-[13px]"
                      disabled={isRouting}
                   />
                </div>
                <button 
                  type="submit" 
                  disabled={isRouting || !destination.trim()}
                  className="px-4 bg-primary text-white font-bold rounded-xl active:scale-95 transition-transform disabled:opacity-50"
                >
                    {isRouting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : <Search className="w-4 h-4" />}
                </button>
            </form>

            {/* Map */}
            <div
              className="relative overflow-hidden"
              style={{
                height: "320px",
                border: "1px solid hsl(var(--border))",
                borderRadius: "12px",
              }}
            >
              <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

              {/* Legend */}
              <div
                className="absolute bottom-3 left-3 z-[9999] flex flex-col gap-1.5 px-3 py-2.5 rounded-lg border border-white/10"
                style={{
                  backgroundColor: "rgba(5,8,20,0.88)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <p className="text-[9px] font-bold tracking-wider text-muted-foreground uppercase mb-0.5">LEGEND</p>
                {[
                  { color: "#dc2626", label: "HIGH RISK"   },
                  { color: "#ea580c", label: "MEDIUM RISK" },
                  { color: "#10b981", label: "SAFE ZONE"   },
                  { color: "#3b82f6", label: "POLICE STN"  },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-[9px] font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>
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
                  onClick={() => set((v) => !v)}
                  disabled={label === "ROUTE" && !routeCalculated}
                  className="flex items-center justify-between px-3 py-2.5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: state ? "hsl(var(--card))" : "transparent",
                    border: `1px solid ${state ? "hsl(var(--foreground) / 0.2)" : "hsl(var(--border))"}`,
                    borderRadius: "8px",
                  }}
                >
                  <span
                    className="text-[10px] font-bold tracking-wider uppercase"
                    style={{ color: state ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}
                  >
                    {label}
                  </span>
                  {state ? (
                    <Eye className="w-3.5 h-3.5" style={{ color: "hsl(var(--safe))" }} />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5" style={{ color: "hsl(var(--muted-foreground))" }} />
                  )}
                </button>
              ))}
            </div>

            {/* Warning Alert When Route Calculated */}
            <AnimatePresence>
              {showRoute && routeCalculated && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="px-4 py-4 flex flex-col gap-3 bg-card border border-sos/50 rounded-xl relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-sos/5 mix-blend-overlay pointer-events-none" />
                  
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-sos animate-pulse" />
                    <p className="text-sm font-bold text-sos">
                      UNSAFE ROUTE DETECTED
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="px-3 py-2 bg-background border border-border rounded">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">ORIGIN</p>
                      <p className="text-xs font-semibold text-foreground">Rohini (Demo)</p>
                    </div>
                    <div className="px-3 py-2 bg-background border border-border rounded">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">DESTINATION</p>
                      <p className="text-xs font-semibold text-foreground truncate">{destination}</p>
                    </div>
                  </div>
                  
                  <p className="text-[11px] font-medium text-foreground/80 leading-relaxed bg-sos/10 px-3 py-2 rounded border border-sos/20">
                    <strong className="text-sos">Warning:</strong> Your route actively intersects with <b>Rohini Sectors 3-11</b>, currently marked as a High-Risk Zone after 9 PM. Proceed with caution or generate an alternate route.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        ) : (
          /* Risk Zones List - Kept mainly same but font updated */
          <motion.div
            key="zones"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            className="px-5 space-y-5"
          >
            <div className="space-y-3">
              {RISK_ZONES.map((z, i) => {
                const s = z.risk === "high" ? "hsl(0 72% 58%)" : z.risk === "medium" ? "hsl(38 90% 52%)" : "hsl(142 60% 44%)";
                const Icon = z.risk === "high" ? AlertTriangle : z.risk === "medium" ? Clock : CheckCircle2;
                return (
                  <motion.div
                    key={z.name}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-4 px-4 py-3.5 bg-card border border-border rounded-xl"
                    style={{ borderLeft: `3px solid ${s}` }}
                  >
                    <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: s }} />
                    <div className="flex-1">
                      <p className="text-sm font-bold tracking-wide text-foreground">
                        {z.name}
                      </p>
                      <p className="text-xs font-medium mt-1 text-muted-foreground">
                        {z.desc}
                      </p>
                    </div>
                    <span
                      className="text-[9px] font-bold tracking-widest px-2 py-1 uppercase rounded-md border"
                      style={{ color: s, borderColor: s, flexShrink: 0 }}
                    >
                      {z.risk}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {/* Nearby Safe Points */}
            <div>
              <p className="section-label mb-3">Nearby Safe Points</p>
              <div className="space-y-2">
                {[
                  ...POLICE_STATIONS.slice(0, 2).map((p) => ({ ...p, type: "police" })),
                  ...HOSPITALS.slice(0, 2).map((h) => ({ ...h, type: "hospital" })),
                ].map((pt, i, arr) => (
                  <div
                    key={pt.name}
                    className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-lg"
                  >
                    {pt.type === "police" ? (
                      <Siren className="w-4 h-4 flex-shrink-0" style={{ color: "hsl(215 60% 60%)" }} />
                    ) : (
                      <HeartPulse className="w-4 h-4 flex-shrink-0" style={{ color: "hsl(142 60% 44%)" }} />
                    )}
                    <p className="text-xs font-semibold text-foreground/90">
                      {pt.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

export default RiskMapPage;
