import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Navigation, Users, Clock, AlertTriangle,
  Layers, ZoomIn, ZoomOut, Home, Briefcase, GraduationCap, Share2, Radio, Check
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useApp } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// ─── Leaflet Setup ──────────────────────────────────────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const FALLBACK_POINT: [number, number] = [28.7041, 77.1025]; 

const COLORS = {
  red: "rgba(239, 68, 68, 0.35)",
  orange: "rgba(249, 115, 22, 0.35)",
  green: "rgba(34, 197, 94, 0.25)",
};

const generateHeatmap = (center: [number, number]) => {
  return [
    { pos: [center[0] + 0.005, center[1] + 0.005], level: "red" },
    { pos: [center[0] - 0.004, center[1] + 0.007], level: "red" },
    { pos: [center[0] - 0.007, center[1] - 0.002], level: "orange" },
    { pos: [center[0] + 0.006, center[1] - 0.005], level: "orange" },
    { pos: [center[0], center[1] - 0.007], level: "green" },
  ];
};

function makeAvatarIcon(initial: string, colorClass: string) {
  return L.divIcon({
    html: `<div class="relative flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-[13px] shadow-md border-[2px] border-white ${colorClass}">${initial}</div>`,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function makeUserIcon() {
  return L.divIcon({
    html: `
      <div class="relative flex items-center justify-center w-12 h-12">
        <div class="absolute inset-0 bg-[#0ea5e9]/20 rounded-full animate-ping"></div>
        <div class="absolute inset-0 bg-[#0ea5e9]/10 rounded-full animate-pulse scale-150"></div>
        <div class="relative z-10 w-3.5 h-3.5 bg-[#0ea5e9] border-[2.5px] border-white rounded-full shadow-md"></div>
      </div>
    `,
    className: "",
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
}

const journeyLog = [
  { time: "22:15", place: "Sector 18 Market", distance: "2.1 km", status: "safe" },
  { time: "21:40", place: "MG Road Metro Station", distance: "0.8 km", status: "safe" },
  { time: "21:05", place: "Connaught Place", distance: "1.4 km", status: "moderate" },
];

const guardiansList = [
  { initials: "M", name: "Mom (Sunita)", color: "bg-purple-500 text-white", since: "2 hrs ago" },
  { initials: "P", name: "Priya Kapoor", color: "bg-blue-500 text-white", since: "45 min ago" },
];

const geofences = [
  { icon: Home, label: "Home Zone", key: "home", radius: "200" },
  { icon: Briefcase, label: "Work Zone", key: "work", radius: "150" },
  { icon: GraduationCap, label: "School Zone", key: "school", radius: "300" },
];

export default function LocationTrackingPage() {
  const navigate = useNavigate();
  const { locationState, triggerSOS } = useApp();
  const [copied, setCopied] = useState(false);
  const [satelliteMode, setSatelliteMode] = useState(false);
  const [showSafetyZones, setShowSafetyZones] = useState(true);
  const [routeType, setRouteType] = useState<"fastest" | "safest">("fastest");
  const [liveStatusText, setLiveStatusText] = useState("Location updated just now");
  
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const heatmapGroupRef = useRef<L.LayerGroup | null>(null);
  const routeGroupRef = useRef<L.LayerGroup | null>(null);

  const handleShare = () => {
    const coordText = locationState.coords
      ? `${locationState.coords.lat.toFixed(5)}, ${locationState.coords.lng.toFixed(5)}`
      : "28.56720, 77.32180";
    navigator.clipboard.writeText(`My live location: ${coordText}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleZoomIn  = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleLayers  = () => {
    if (!mapRef.current) return;
    setSatelliteMode(prev => {
      const next = !prev;
      if (tileLayerRef.current) mapRef.current!.removeLayer(tileLayerRef.current);
      const url = next
        ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
      tileLayerRef.current = L.tileLayer(url).addTo(mapRef.current!);
      return next;
    });
  };

  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentPos: [number, number] = useMemo(() => 
    locationState.coords ? [locationState.coords.lat, locationState.coords.lng] : FALLBACK_POINT
  , [locationState.coords]);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = L.map(containerRef.current, {
      center: currentPos,
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });
    const tile = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png").addTo(map);
    tileLayerRef.current = tile;
    
    heatmapGroupRef.current = L.layerGroup().addTo(map);
    routeGroupRef.current = L.layerGroup().addTo(map);

    const contacts = [
      { id: "c1", lat: currentPos[0] + 0.007, lng: currentPos[1] + 0.002, initial: "P", color: "bg-blue-500" },
      { id: "c2", lat: currentPos[0] - 0.001, lng: currentPos[1] + 0.005, initial: "M", color: "bg-purple-500" },
    ];
    contacts.forEach((contact) => {
      L.marker([contact.lat, contact.lng], { icon: makeAvatarIcon(contact.initial, contact.color), zIndexOffset: 900 }).addTo(map);
    });
    L.marker(currentPos, { icon: makeUserIcon(), zIndexOffset: 1000 }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [currentPos]);

  useEffect(() => {
    if (!mapRef.current || !heatmapGroupRef.current || !routeGroupRef.current) return;
    
    heatmapGroupRef.current.clearLayers();
    routeGroupRef.current.clearLayers();

    if (showSafetyZones) {
      const heatmapData = generateHeatmap(currentPos);
      heatmapData.forEach((zone) => {
        L.circle(zone.pos as [number, number], {
          radius: 700,
          color: "transparent",
          fillColor: zone.level === "red" ? COLORS.red : zone.level === "orange" ? COLORS.orange : COLORS.green,
          fillOpacity: 1,
        }).addTo(heatmapGroupRef.current!);
      });
    }

    const destinationPos: [number, number] = [currentPos[0] + 0.015, currentPos[1] + 0.02];
    const fastestRoute = [currentPos, [currentPos[0] + 0.007, currentPos[1] + 0.01], destinationPos];
    const safestRoute = [currentPos, [currentPos[0] + 0.002, currentPos[1] + 0.015], [currentPos[0] + 0.01, currentPos[1] + 0.022], destinationPos];

    L.marker(destinationPos, { icon: makeAvatarIcon("D", "bg-slate-900") }).addTo(routeGroupRef.current);

    if (routeType === "fastest") {
      L.polyline(fastestRoute as [number, number][], { color: "#3b82f6", weight: 5, dashArray: "10, 10" }).addTo(routeGroupRef.current);
    } else {
      L.polyline(safestRoute as [number, number][], { color: "#14b8a6", weight: 5, dashArray: "10, 10" }).addTo(routeGroupRef.current);
    }
  }, [currentPos, showSafetyZones, routeType]);

  useEffect(() => {
    const texts = ["Location updated just now", "Signal strong", "Tracking accurate"];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % texts.length;
      setLiveStatusText(texts[i]);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AppLayout>
      <div className="bg-[#fcfcfd] min-h-screen">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="pb-10 px-8 max-w-[1400px] mx-auto pt-8">
          <div className="flex items-center justify-between mb-10">
            <motion.div initial={{ x: -20 }} animate={{ x: 0 }}>
              <h1 style={{ fontFamily: "Manrope,sans-serif" }} className="text-2xl font-black text-slate-900 tracking-tight">Live Location Tracking</h1>
              <div className="flex items-center gap-2 mt-1.5">
                <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-2 h-2 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]" />
                <span className="text-slate-400 text-[11px] font-black uppercase tracking-widest">Live tracking active • {liveStatusText}</span>
              </div>
            </motion.div>
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={handleShare}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[13px] font-black transition-colors shadow-xl cursor-pointer ${
                copied ? "bg-teal-600 text-white shadow-teal-100" : "bg-slate-900 text-white hover:bg-black shadow-slate-200"
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              {copied ? "Copied!" : "Share Location"}
            </motion.button>
          </div>

          <div className="grid gap-8 items-start" style={{ gridTemplateColumns: "1fr 380px" }}>
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[32px] border border-slate-50 shadow-[0_4px_30px_rgba(0,0,0,0.02)] overflow-hidden relative flex flex-col sticky top-8" style={{ minHeight: "calc(100vh - 180px)" }}>
              <div ref={containerRef} className="absolute inset-0 z-0 bg-slate-50" />
              <div className="absolute bottom-8 right-8 flex flex-col gap-3 z-[400]">
                <motion.button onClick={handleZoomIn}  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="w-12 h-12 bg-white rounded-2xl shadow-xl border border-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all cursor-pointer"><ZoomIn className="w-6 h-6" /></motion.button>
                <motion.button onClick={handleLayers} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className={`w-12 h-12 rounded-2xl shadow-xl border flex items-center justify-center transition-all cursor-pointer ${ satelliteMode ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-50 text-slate-400 hover:text-slate-900" }`}><Layers className="w-6 h-6" /></motion.button>
                <motion.button onClick={handleZoomOut} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="w-12 h-12 bg-white rounded-2xl shadow-xl border border-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all cursor-pointer"><ZoomOut className="w-6 h-6" /></motion.button>
              </div>
            </motion.div>

              <div className="flex flex-col gap-6">
                {/* Smart Routing Options */}
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-[28px] border border-slate-50 shadow-sm p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Navigation className="w-5 h-5 text-blue-500" />
                    <h2 className="font-black text-[15px] text-slate-900 uppercase tracking-tight">Smart Routing</h2>
                  </div>
                </div>

                <div className="flex bg-slate-50 p-1 rounded-2xl mb-6 border border-slate-100">
                  <button onClick={() => setRouteType("fastest")} className={`flex-1 py-2 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all cursor-pointer ${routeType === "fastest" ? "bg-white shadow-md text-blue-600" : "text-slate-400 hover:text-slate-600"}`}>Fastest Route</button>
                  <button onClick={() => setRouteType("safest")} className={`flex-1 py-2 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all cursor-pointer ${routeType === "safest" ? "bg-white shadow-md text-teal-600" : "text-slate-400 hover:text-slate-600"}`}>Safest Route</button>
                </div>

                {routeType === "safest" && (
                  <div className="mb-6 bg-teal-50 border border-teal-100 p-3 rounded-xl flex items-center gap-2">
                    <Check className="w-4 h-4 text-teal-600" />
                    <span className="text-[11px] font-bold text-teal-700">Safer route suggested (avoids high-risk zones)</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Show Safety Zones</span>
                  <button onClick={() => setShowSafetyZones(!showSafetyZones)} className={`w-12 h-6 rounded-full relative transition-colors cursor-pointer ${showSafetyZones ? "bg-red-500" : "bg-slate-200"}`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${showSafetyZones ? "left-7" : "left-1"}`} />
                  </button>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-[28px] border border-slate-50 shadow-sm p-8">
                <div className="flex items-center gap-3 mb-6">
                  <MapPin className="w-5 h-5 text-teal-500" />
                  <h2 className="font-black text-[15px] text-slate-900 uppercase tracking-tight">My Location</h2>
                </div>
                <div className="space-y-5">
                  <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Address</p>
                    <p className="text-slate-900 text-[13px] font-bold">{locationState.address || "Fetching..."}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lat</p><p className="text-slate-900 text-[13px] font-bold">{currentPos[0].toFixed(4)}° N</p></div>
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Long</p><p className="text-slate-900 text-[13px] font-bold">{currentPos[1].toFixed(4)}° E</p></div>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-[28px] border border-slate-50 shadow-sm p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Users className="w-5 h-5 text-slate-900" />
                  <h2 className="font-black text-[15px] text-slate-900 uppercase tracking-tight">Guardians</h2>
                  <span className="ml-auto text-[10px] font-black bg-teal-50 text-teal-600 px-2 py-1 rounded-full uppercase">Live</span>
                </div>
                <div className="space-y-5">
                  {guardiansList.map((g, i)=>(
                    <motion.button
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.97 }}
                      key={i}
                      onClick={() => navigate("/guardian")}
                      className="w-full flex items-center gap-4 cursor-pointer text-left"
                    >
                      <div className={`w-10 h-10 rounded-xl ${g.color} flex items-center justify-center font-black text-[12px] shadow-lg`}>{g.initials}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-900 text-[13px] font-black truncate">{g.name}</p>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Active {g.since}</p>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="bg-white rounded-[28px] border border-slate-50 shadow-sm p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Clock className="w-5 h-5 text-slate-900" />
                  <h2 className="font-black text-[15px] text-slate-900 uppercase tracking-tight">Journey Log</h2>
                </div>
                <div className="space-y-5 relative pl-2">
                  <div className="absolute top-2 bottom-2 left-[13px] w-[2px] bg-slate-100" />
                  {journeyLog.map((e,i)=>(
                    <div key={i} className="flex items-start gap-5 relative">
                      <div className={`mt-1.5 w-2.5 h-2.5 rounded-full z-10 ring-4 ring-white ${e.status==="safe"?"bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]":"bg-amber-500"}`} />
                      <div>
                        <p className="text-slate-900 text-[13px] font-black">{e.place}</p>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">{e.time} • {e.distance}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { triggerSOS(); }}
                className="w-full bg-[#da2929] hover:bg-[#c52525] text-white px-8 py-5 rounded-[24px] text-[14px] font-black uppercase tracking-widest transition-all shadow-xl shadow-red-100 flex items-center justify-center gap-3"
              >
                <Radio className="w-5 h-5 animate-pulse" /> Broadcast Signal
              </motion.button>
            </div>
          </div>
          
          <div className="mt-8 text-center text-slate-400 text-[11px] font-bold leading-relaxed max-w-2xl mx-auto opacity-70">
            Safety data is based on publicly available FIR and incident reports. Color zones indicate relative risk levels:<br/>
            <span className="text-red-400">Red = High Risk</span>, <span className="text-amber-400">Yellow = Moderate</span>, <span className="text-teal-400">Green = Safer Areas</span>.
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
