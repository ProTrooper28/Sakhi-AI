import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Navigation, Users, Clock, AlertTriangle,
  Layers, ZoomIn, ZoomOut, Home, Briefcase, GraduationCap, Share2, Radio, Check, Sparkles, Heart
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
  red: "rgba(212, 69, 92, 0.25)",
  orange: "rgba(242, 149, 106, 0.25)",
  green: "rgba(61, 153, 112, 0.18)",
};

function makeAvatarIcon(initial: string, bgClass: string) {
  return L.divIcon({
    html: `<div class="relative flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-[13px] shadow-md border-[2px] border-white ${bgClass}">${initial}</div>`,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function makeUserIcon() {
  return L.divIcon({
    html: `
      <div class="relative flex items-center justify-center w-12 h-12">
        <div class="absolute inset-0 bg-[#D4455C]/20 rounded-full animate-ping"></div>
        <div class="absolute inset-0 bg-[#D4455C]/10 rounded-full animate-pulse scale-150"></div>
        <div class="relative z-10 w-4 h-4 bg-[#D4455C] border-[2.5px] border-white rounded-full shadow-md"></div>
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
  { initials: "P", name: "Priya Sharma", role: "Primary Guardian", color: "bg-[#F2956A] text-white", since: "2 hrs ago" },
  { initials: "R", name: "Rahul Singh", role: "Emergency Contact", color: "bg-[#8B3A2F] text-white", since: "45 min ago" },
];

export default function LocationTrackingPage() {
  const navigate = useNavigate();
  const { locationState, triggerSOS } = useApp();
  const [copied, setCopied] = useState(false);
  const [satelliteMode, setSatelliteMode] = useState(false);
  const [showSafetyZones, setShowSafetyZones] = useState(true);
  const [routeType, setRouteType] = useState<"fastest" | "safest">("safest");
  const [liveStatusText, setLiveStatusText] = useState("Signal strong & safe");
  
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const heatmapGroupRef = useRef<L.LayerGroup | null>(null);
  const routeGroupRef = useRef<L.LayerGroup | null>(null);

  const handleShare = () => {
    const coordText = locationState.coords
      ? `${locationState.coords.lat.toFixed(5)}, ${locationState.coords.lng.toFixed(5)}`
      : "28.56720, 77.32180";
    navigator.clipboard.writeText(`Sakhi says I am here: ${coordText}`).catch(() => {});
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
      { id: "c1", lat: currentPos[0] + 0.007, lng: currentPos[1] + 0.002, initial: "P", color: "bg-[#F2956A]" },
      { id: "c2", lat: currentPos[0] - 0.001, lng: currentPos[1] + 0.005, initial: "R", color: "bg-[#8B3A2F]" },
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
      const heatmapData = [
        { pos: [currentPos[0] + 0.005, currentPos[1] + 0.005], level: "red" },
        { pos: [currentPos[0] - 0.004, currentPos[1] + 0.007], level: "red" },
        { pos: [currentPos[0] - 0.007, currentPos[1] - 0.002], level: "orange" },
        { pos: [currentPos[0] + 0.006, currentPos[1] - 0.005], level: "orange" },
        { pos: [currentPos[0], currentPos[1] - 0.007], level: "green" },
      ];
      heatmapData.forEach((zone) => {
        L.circle(zone.pos as [number, number], {
          radius: 650,
          color: "transparent",
          fillColor: zone.level === "red" ? COLORS.red : zone.level === "orange" ? COLORS.orange : COLORS.green,
          fillOpacity: 1,
        }).addTo(heatmapGroupRef.current!);
      });
    }

    const destinationPos: [number, number] = [currentPos[0] + 0.012, currentPos[1] + 0.015];
    const fastestRoute = [currentPos, [currentPos[0] + 0.005, currentPos[1] + 0.008], destinationPos];
    const safestRoute = [currentPos, [currentPos[0] + 0.002, currentPos[1] + 0.004], [currentPos[0] + 0.007, currentPos[1] + 0.011], destinationPos];

    L.marker(destinationPos, { icon: makeAvatarIcon("🏠", "bg-emerald-600") }).addTo(routeGroupRef.current);

    if (routeType === "fastest") {
      L.polyline(fastestRoute as [number, number][], { color: "#F2956A", weight: 5, dashArray: "8, 8" }).addTo(routeGroupRef.current);
    } else {
      L.polyline(safestRoute as [number, number][], { color: "#3D9970", weight: 5, dashArray: "8, 8" }).addTo(routeGroupRef.current);
    }
  }, [currentPos, showSafetyZones, routeType]);

  useEffect(() => {
    const texts = ["Signal strong & safe", "Location monitoring live", "Sakhi is looking out for you"];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % texts.length;
      setLiveStatusText(texts[i]);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  return (
    <AppLayout>
      <div className="bg-[#FDF6EE] min-h-screen text-[#3D2315] font-sans pb-24 md:pb-10">
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="px-4 md:px-8 max-w-[1400px] mx-auto pt-6"
        >
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <motion.div initial={{ x: -20 }} animate={{ x: 0 }}>
              <div className="flex items-center gap-2 text-xs font-bold text-[#9E7A6A] tracking-wider uppercase mb-1">
                <Sparkles className="w-3.5 h-3.5 text-[#F2956A]" />
                Sakhi knows your path
              </div>
              <h1 className="text-3xl font-extrabold text-[#3D2315] font-heading tracking-tight">
                Where are you? 🗺️
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <motion.span 
                  animate={{ opacity: [1, 0.4, 1] }} 
                  transition={{ repeat: Infinity, duration: 2 }} 
                  className="w-2 h-2 rounded-full bg-[#3D9970] shadow-[0_0_8px_rgba(61,153,112,0.4)]" 
                />
                <span className="text-[#9E7A6A] text-xs font-semibold">
                  {liveStatusText}
                </span>
              </div>
            </motion.div>

            <motion.button
              whileHover={{ scale: 1.03 }} 
              whileTap={{ scale: 0.97 }}
              onClick={handleShare}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-[20px] text-sm font-bold transition-all shadow-md cursor-pointer ${
                copied 
                  ? "bg-[#3D9970] text-white" 
                  : "bg-[#D4455C] text-white hover:bg-[#b8324a]"
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              {copied ? "Link Copied!" : "Share Live Path"}
            </motion.button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
            {/* Map Container */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className="bg-white rounded-[28px] border border-[#F9C5B0]/30 shadow-md overflow-hidden relative flex flex-col h-[380px] lg:h-[calc(100vh-170px)]"
            >
              <div ref={containerRef} className="absolute inset-0 z-0 bg-[#FBF0E9]" />
              
              {/* Map Controls */}
              <div className="absolute bottom-4 right-4 flex flex-col gap-2.5 z-[400]">
                <motion.button 
                  onClick={handleZoomIn}  
                  whileHover={{ scale: 1.08 }} 
                  whileTap={{ scale: 0.92 }} 
                  className="w-11 h-11 bg-white rounded-xl shadow-lg border border-[#F5E4D6] flex items-center justify-center text-[#9E7A6A] hover:text-[#3D2315] cursor-pointer"
                >
                  <ZoomIn className="w-5.5 h-5.5" />
                </motion.button>
                <motion.button 
                  onClick={handleLayers} 
                  whileHover={{ scale: 1.08 }} 
                  whileTap={{ scale: 0.92 }} 
                  className={`w-11 h-11 rounded-xl shadow-lg border flex items-center justify-center transition-all cursor-pointer ${
                    satelliteMode 
                      ? "bg-[#3D2315] border-[#3D2315] text-white" 
                      : "bg-white border-[#F5E4D6] text-[#9E7A6A] hover:text-[#3D2315]" 
                  }`}
                >
                  <Layers className="w-5.5 h-5.5" />
                </motion.button>
                <motion.button 
                  onClick={handleZoomOut} 
                  whileHover={{ scale: 1.08 }} 
                  whileTap={{ scale: 0.92 }} 
                  className="w-11 h-11 bg-white rounded-xl shadow-lg border border-[#F5E4D6] flex items-center justify-center text-[#9E7A6A] hover:text-[#3D2315] cursor-pointer"
                >
                  <ZoomOut className="w-5.5 h-5.5" />
                </motion.button>
              </div>
            </motion.div>

            {/* Path Controls & Details Side Panel */}
            <div className="flex flex-col gap-6">
              {/* Smart Routing Panel */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                className="bg-white rounded-[28px] border border-[#F9C5B0]/20 shadow-sm p-6"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 rounded-xl bg-[#FBDDD0]">
                    <Navigation className="w-5 h-5 text-[#D4455C]" />
                  </div>
                  <h2 className="font-extrabold text-base text-[#3D2315] font-heading">Smart Path Choice</h2>
                </div>

                <div className="flex bg-[#FBF0E9] p-1.5 rounded-2xl mb-5">
                  <button 
                    onClick={() => setRouteType("fastest")} 
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      routeType === "fastest" 
                        ? "bg-white shadow-sm text-[#D4455C]" 
                        : "text-[#9E7A6A] hover:text-[#3D2315]"
                    }`}
                  >
                    Fastest
                  </button>
                  <button 
                    onClick={() => setRouteType("safest")} 
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      routeType === "safest" 
                        ? "bg-white shadow-sm text-[#3D9970]" 
                        : "text-[#9E7A6A] hover:text-[#3D2315]"
                    }`}
                  >
                    Safest Path
                  </button>
                </div>

                {routeType === "safest" && (
                  <div className="mb-5 bg-[#D6F5EA] border border-[#3D9970]/10 p-3 rounded-xl flex items-center gap-2">
                    <Heart className="w-4 h-4 text-[#3D9970] fill-[#3D9970]" />
                    <span className="text-[11px] font-bold text-[#3D9970]">
                      Using the path with active streetlights & shops open.
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-[#F5E4D6]">
                  <span className="text-xs font-bold text-[#3D2315]">Show Safe Zones on map</span>
                  <button 
                    onClick={() => setShowSafetyZones(!showSafetyZones)} 
                    className={`w-10 h-6 rounded-full relative transition-colors cursor-pointer ${
                      showSafetyZones ? "bg-[#3D9970]" : "bg-[#F5E4D6]"
                    }`}
                  >
                    <div 
                      className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${
                        showSafetyZones ? "left-5" : "left-1"
                      }`} 
                    />
                  </button>
                </div>
              </motion.div>

              {/* Current Address Details */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: 0.1 }} 
                className="bg-white rounded-[28px] border border-[#F9C5B0]/20 shadow-sm p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-[#FBDDD0]">
                    <MapPin className="w-5 h-5 text-[#F2956A]" />
                  </div>
                  <h2 className="font-extrabold text-base text-[#3D2315] font-heading">Your Location</h2>
                </div>
                <div className="bg-[#FBF0E9]/50 p-4 rounded-2xl border border-[#FBF0E9]">
                  <p className="text-[10px] font-bold text-[#9E7A6A] uppercase tracking-wider mb-1">Current Address</p>
                  <p className="text-[#3D2315] text-xs font-bold leading-relaxed">
                    {locationState.address || "Sector 62, Noida, Uttar Pradesh, India"}
                  </p>
                </div>
              </motion.div>

              {/* Journey Log */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: 0.2 }} 
                className="bg-white rounded-[28px] border border-[#F9C5B0]/20 shadow-sm p-6"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 rounded-xl bg-[#FBDDD0]">
                    <Clock className="w-5 h-5 text-[#8B3A2F]" />
                  </div>
                  <h2 className="font-extrabold text-base text-[#3D2315] font-heading">Journey Log</h2>
                </div>
                
                <div className="space-y-4 relative pl-2">
                  <div className="absolute top-1.5 bottom-1.5 left-[13px] w-[1.5px] bg-[#F5E4D6]" />
                  {journeyLog.map((e, i) => (
                    <div key={i} className="flex items-start gap-4 relative">
                      <div className={`mt-1.5 w-2.5 h-2.5 rounded-full z-10 ring-4 ring-white ${
                        e.status === "safe" ? "bg-[#3D9970]" : "bg-[#F2956A]"
                      }`} />
                      <div>
                        <p className="text-[#3D2315] text-xs font-bold">{e.place}</p>
                        <p className="text-[#9E7A6A] text-[10px] font-medium mt-0.5">{e.time} • {e.distance}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Emergency Warning trigger */}
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate("/sos")}
                className="w-full bg-[#D4455C] hover:bg-[#b8324a] text-white p-4.5 rounded-[22px] text-sm font-bold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <Radio className="w-4 h-4 animate-pulse" /> Trigger Emergency Alert
              </motion.button>
            </div>
          </div>
          
          <div className="mt-8 text-center text-[#9E7A6A] text-[11px] leading-relaxed max-w-2xl mx-auto opacity-80 pb-6">
            Map markings represent general local safety feedback. 
            <br />
            <span className="text-[#D4455C] font-semibold">Red zones</span> indicate isolated stretches, 
            <span className="text-[#F2956A] font-semibold"> peach zones</span> moderate traffic, and 
            <span className="text-[#3D9970] font-semibold">green zones</span> highly active lanes.
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
