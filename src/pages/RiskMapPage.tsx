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

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png").addTo(map);

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
      <div className="relative overflow-hidden bg-[#fcfcfd]" style={{ height: "calc(100vh - 0px)" }}>
        <div ref={containerRef} className="absolute inset-0 z-0" />

        {/* Top Interface */}
        <div className="absolute top-0 left-0 right-0 z-20 pt-10 px-8 flex flex-col items-center gap-4 pointer-events-none">
           <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md pointer-events-auto">
             <form onSubmit={handleSearch} className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter destination..."
                  className="w-full bg-white border border-slate-100 rounded-full pl-14 pr-6 py-4 text-sm font-bold shadow-2xl focus:outline-none transition-all"
                />
             </form>
           </motion.div>

           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 pointer-events-auto">
              <button 
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`px-5 py-2.5 rounded-full border text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl backdrop-blur-md ${showHeatmap ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-900 border-slate-100"}`}
              >
                <Layers className="w-3.5 h-3.5 inline mr-2" /> Heatmap
              </button>
              <div className="bg-white px-5 py-2.5 rounded-full border border-slate-100 shadow-xl flex items-center gap-2 backdrop-blur-md">
                 <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-2 h-2 rounded-full bg-teal-500" />
                 <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">GPS Locked</span>
              </div>
           </motion.div>
        </div>

        {/* Floating SOS Button */}
        <div className="absolute top-1/2 right-8 -translate-y-1/2 z-30">
           <motion.button 
             whileHover={{ scale: 1.1 }}
             whileTap={{ scale: 0.9 }}
             animate={{ 
               scale: [1, 1.05, 1],
               boxShadow: ["0 10px 30px rgba(239,68,68,0.2)", "0 10px 50px rgba(239,68,68,0.4)", "0 10px 30px rgba(239,68,68,0.2)"]
             }}
             transition={{ repeat: Infinity, duration: 3 }}
             onClick={() => { triggerSOS(); navigate("/sos"); }}
             className="w-16 h-16 bg-red-500 text-white rounded-full flex items-center justify-center shadow-2xl border-4 border-white"
           >
              <Asterisk className="w-8 h-8" />
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
                 className="max-w-[700px] mx-auto bg-white rounded-[32px] p-8 shadow-2xl border border-slate-50 flex flex-col gap-6"
               >
                  <div className="flex items-center justify-between">
                     <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">Select Route</h2>
                        <p className="text-[13px] font-bold text-slate-400">Choose the safest path for your journey</p>
                     </div>
                     <button onClick={() => setNavMode('browsing')} className="text-slate-300 hover:text-slate-900 transition-colors"><X className="w-6 h-6" /></button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <motion.button 
                        whileHover={{ y: -2 }}
                        onClick={() => setSelectedRoute('safest')}
                        className={`text-left p-6 rounded-[24px] border-2 transition-all ${selectedRoute === 'safest' ? "border-teal-500 bg-teal-50/30 shadow-inner" : "border-slate-50 hover:border-slate-100"}`}
                     >
                        <div className="flex items-center gap-2 mb-3">
                           <Shield className="w-4 h-4 text-teal-600" />
                           <span className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-600">Safest</span>
                        </div>
                        <p className="text-2xl font-black text-slate-900">12 min</p>
                        <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Score: 98%</p>
                     </motion.button>

                     <motion.button 
                        whileHover={{ y: -2 }}
                        onClick={() => setSelectedRoute('fastest')}
                        className={`text-left p-6 rounded-[24px] border-2 transition-all ${selectedRoute === 'fastest' ? "border-red-500 bg-red-50/30 shadow-inner" : "border-slate-50 hover:border-slate-100"}`}
                     >
                        <div className="flex items-center gap-2 mb-3">
                           <Zap className="w-4 h-4 text-red-600" />
                           <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600">Fastest</span>
                        </div>
                        <p className="text-2xl font-black text-slate-900">8 min</p>
                        <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Risk: High</p>
                     </motion.button>
                  </div>

                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setNavMode('tracking'); toast({ title: "Safe Journey Started", description: "Monitoring your path in real-time." }); }}
                    className="w-full py-4 bg-slate-900 text-white font-black text-[14px] rounded-2xl shadow-xl shadow-slate-200 flex items-center justify-center gap-3"
                  >
                     Start Live Navigation <Navigation2 className="w-4 h-4" />
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
