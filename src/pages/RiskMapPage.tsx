import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MapPin, Navigation2, CheckCircle2, AlertTriangle, ShieldCheck, 
  Phone, Search, Layers, X, Info, Zap, Shield, Asterisk
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { toast } from "@/components/ui/use-toast";
import { useApp } from "@/context/AppContext";

// ─── Constants & Leaflet Setup ───────────────────────────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const FALLBACK_POINT: [number, number] = [19.0596, 72.8295]; // Default to Mumbai

// ─── Custom Icons with Animations ───────────────────────────────────────────

function makeAvatarIcon(initial: string, colorClass: string) {
  return L.divIcon({
    html: `<div class="relative flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-xs shadow-md border-2 border-white ${colorClass}">${initial}</div>`,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function makeUserIcon() {
  return L.divIcon({
    html: `
      <div class="relative flex items-center justify-center w-10 h-10">
        <div class="absolute inset-0 bg-teal-500/30 rounded-full animate-ping"></div>
        <div class="absolute inset-0 bg-teal-500/20 rounded-full animate-pulse scale-150"></div>
        <div class="relative z-10 w-4 h-4 bg-teal-600 border-[3px] border-white rounded-full shadow-lg"></div>
      </div>
    `,
    className: "",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

const destIcon = L.divIcon({
  html: `<div class="bg-slate-900 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white"><div class="w-2 h-2 bg-white rounded-full"></div></div>`,
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

// ─────────────────────────────────────────────────────────────────────────────

const RiskMapPage = () => {
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const heatmapLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const navigate = useNavigate();
  const { triggerSOS, locationState, requestLocation } = useApp();
  
  const [navMode, setNavMode] = useState<'browsing' | 'routing' | 'tracking'>('browsing');
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoute, setSelectedRoute] = useState<'fastest' | 'safest'>('safest');
  
  const currentPos: [number, number] = useMemo(() => 
    locationState.coords ? [locationState.coords.lat, locationState.coords.lng] : FALLBACK_POINT
  , [locationState.coords]);

  const heatmapData = useMemo(() => [
    { pos: [currentPos[0] + 0.005, currentPos[1] + 0.003], level: "red" },
    { pos: [currentPos[0] - 0.004, currentPos[1] + 0.008], level: "red" },
    { pos: [currentPos[0] + 0.002, currentPos[1] - 0.006], level: "orange" },
    { pos: [currentPos[0] + 0.008, currentPos[1] - 0.001], level: "green" },
  ], [currentPos]);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = L.map(containerRef.current, {
      center: currentPos,
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png").addTo(map);

    const marker = L.marker(currentPos, { icon: makeUserIcon(), zIndexOffset: 1000 }).addTo(map);
    userMarkerRef.current = marker;

    heatmapLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!heatmapLayerRef.current) return;
    heatmapLayerRef.current.clearLayers();
    if (showHeatmap) {
      heatmapData.forEach((zone) => {
        L.circle(zone.pos as [number, number], {
          radius: 350,
          color: "transparent",
          fillColor: zone.level === 'red' ? '#ef4444' : zone.level === 'orange' ? '#f97316' : '#22c55e',
          fillOpacity: 0.15,
        }).addTo(heatmapLayerRef.current!);
      });
    }
  }, [showHeatmap, heatmapData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setNavMode('routing');
    if (!routeLayerRef.current || !mapRef.current) return;
    routeLayerRef.current.clearLayers();

    const dest: [number, number] = [currentPos[0] + 0.01, currentPos[1] + 0.01];
    L.marker(dest, { icon: destIcon }).addTo(routeLayerRef.current);

    const path: [number, number][] = [currentPos, [currentPos[0] + 0.005, currentPos[1] + 0.005], dest];
    L.polyline(path, { color: selectedRoute === 'safest' ? '#14b8a6' : '#ef4444', weight: 6, opacity: 0.8 }).addTo(routeLayerRef.current);
    
    mapRef.current.fitBounds(L.polyline(path).getBounds(), { padding: [50, 50] });
  };

  return (
    <AppLayout>
      <div className="relative overflow-hidden bg-slate-950" style={{ height: "calc(100vh - 0px)" }}>
        <div ref={containerRef} className="absolute inset-0 z-0" />

         {/* Top Interface */}
         <div className="absolute top-0 left-0 right-0 z-20 pt-10 px-8 flex flex-col items-center gap-5 pointer-events-none">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg pointer-events-auto">
              <form onSubmit={handleSearch} className="relative group">
                 <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                 <input 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   placeholder="SEARCH SECURE NODE..."
                   className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl pl-16 pr-8 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-100 shadow-2xl backdrop-blur-xl focus:outline-none transition-all focus:border-teal-500/50"
                 />
              </form>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4 pointer-events-auto">
               <button 
                 onClick={() => setShowHeatmap(!showHeatmap)}
                 className={`px-6 py-3 rounded-xl border text-[10px] font-black uppercase tracking-[0.25em] transition-all shadow-2xl backdrop-blur-xl ${showHeatmap ? "bg-teal-500 text-slate-950 border-teal-400" : "bg-slate-900/60 text-slate-400 border-slate-800"}`}
               >
                 <Layers className="w-4 h-4 inline mr-2" /> Tactical Heatmap
               </button>
               <div className="bg-slate-900/60 px-6 py-3 rounded-xl border border-slate-800 shadow-2xl flex items-center gap-3 backdrop-blur-xl">
                  <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-1.5 h-1.5 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.8)]" />
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.25em]">Telemetry Active</span>
               </div>
            </motion.div>
        </div>

        {/* Floating SOS Button */}
        <div className="absolute top-1/2 right-8 -translate-y-1/2 z-30">
           <motion.button 
             whileHover={{ scale: 1.05, backgroundColor: "#ef4444" }}
             whileTap={{ scale: 0.95 }}
             animate={{ 
               scale: [1, 1.05, 1],
               boxShadow: ["0 10px 40px rgba(239,68,68,0.2)", "0 10px 60px rgba(239,68,68,0.4)", "0 10px 40px rgba(239,68,68,0.2)"]
             }}
             transition={{ repeat: Infinity, duration: 3 }}
             onClick={() => { triggerSOS(); navigate("/sos"); }}
             className="w-20 h-20 bg-red-600 text-white rounded-3xl flex items-center justify-center shadow-2xl border border-white/20 transition-all cursor-pointer"
           >
              <Asterisk className="w-10 h-10" />
           </motion.button>
        </div>

        {/* Bottom Sheets */}
        <div className="absolute bottom-[4.5rem] left-0 right-0 z-40 px-8 pb-4">
           <AnimatePresence>
             {navMode === 'routing' && (
                 <motion.div 
                   initial={{ y: 100, opacity: 0 }}
                   animate={{ y: 0, opacity: 1 }}
                   exit={{ y: 100, opacity: 0 }}
                   className="max-w-[800px] mx-auto bg-slate-900/80 backdrop-blur-2xl rounded-[40px] p-10 shadow-2xl border border-slate-800/50 flex flex-col gap-8"
                 >
                    <div className="flex items-center justify-between">
                       <div>
                          <h2 className="text-2xl font-black text-slate-100 tracking-tight uppercase" style={{ fontFamily: "Manrope, sans-serif" }}>Route Intelligence</h2>
                          <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Tactical Analysis: Multiple Paths Identified</p>
                       </div>
                       <button onClick={() => setNavMode('browsing')} className="p-3 text-slate-600 hover:text-white transition-all bg-slate-950 rounded-2xl border border-slate-800 cursor-pointer"><X className="w-6 h-6" /></button>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <motion.button 
                         whileHover={{ y: -5 }}
                         onClick={() => setSelectedRoute('safest')}
                         className={`text-left p-8 rounded-[32px] border-2 transition-all shadow-2xl ${selectedRoute === 'safest' ? "border-teal-500 bg-teal-500/5 shadow-teal-500/10" : "border-slate-800 bg-slate-950/50 hover:border-slate-700"}`}
                      >
                         <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center border border-teal-500/20">
                               <Shield className="w-5 h-5 text-teal-500" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-teal-500">Safest Path</span>
                         </div>
                         <p className="text-3xl font-black text-slate-100 uppercase" style={{ fontFamily: "Manrope, sans-serif" }}>12 min</p>
                         <p className="text-[10px] font-black text-slate-600 mt-2 uppercase tracking-widest">Integrity: 98% Optimal</p>
                      </motion.button>
 
                      <motion.button 
                         whileHover={{ y: -5 }}
                         onClick={() => setSelectedRoute('fastest')}
                         className={`text-left p-8 rounded-[32px] border-2 transition-all shadow-2xl ${selectedRoute === 'fastest' ? "border-red-500 bg-red-500/5 shadow-red-500/10" : "border-slate-800 bg-slate-950/50 hover:border-slate-700"}`}
                      >
                         <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                               <Zap className="w-5 h-5 text-red-500" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-red-500">Rapid Response</span>
                         </div>
                         <p className="text-3xl font-black text-slate-100 uppercase" style={{ fontFamily: "Manrope, sans-serif" }}>8 min</p>
                         <p className="text-[10px] font-black text-slate-600 mt-2 uppercase tracking-widest">Risk Level: Elevated</p>
                      </motion.button>
                   </div>

                   <motion.button 
                     whileHover={{ scale: 1.02, backgroundColor: "#14b8a6", color: "#000" }}
                     whileTap={{ scale: 0.98 }}
                     onClick={() => { setNavMode('tracking'); toast({ title: "TACTICAL LINK ESTABLISHED", description: "Path monitoring sequence initiated." }); }}
                     className="w-full py-5 bg-teal-500 text-slate-950 font-black text-[13px] rounded-2xl shadow-2xl shadow-teal-500/20 flex items-center justify-center gap-4 transition-all uppercase tracking-[0.25em] cursor-pointer"
                   >
                      Initiate Safe Protocol <Navigation2 className="w-4 h-4" />
                   </motion.button>
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      </div>
    </AppLayout>
  );
};

export default RiskMapPage;
