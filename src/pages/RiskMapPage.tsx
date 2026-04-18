import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MapPin, Navigation2, CheckCircle2, AlertTriangle, ShieldCheck, 
  Phone, Search, Layers, X, Info, Zap, Shield
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
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

// ─── Mock Data Generators ────────────────────────────────────────────────────

const generateHeatmap = (center: [number, number]) => {
  return [
    { pos: [center[0] + 0.005, center[1] + 0.003], level: "red", label: "High Risk Area" },
    { pos: [center[0] - 0.004, center[1] + 0.008], level: "red", label: "Poorly Lit Zone" },
    { pos: [center[0] + 0.002, center[1] - 0.006], level: "orange", label: "Moderate Activity" },
    { pos: [center[0] - 0.007, center[1] - 0.002], level: "orange", label: "Developing Area" },
    { pos: [center[0] + 0.008, center[1] - 0.001], level: "green", label: "Well Lit / Safe" },
    { pos: [center[0] - 0.001, center[1] - 0.004], level: "green", label: "Secure Perimeter" },
  ];
};

const COLORS = {
  red: "rgba(239, 68, 68, 0.4)",
  orange: "rgba(249, 115, 22, 0.4)",
  green: "rgba(34, 197, 94, 0.25)",
};

// ─── Custom Icons ────────────────────────────────────────────────────────────

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
        <div class="absolute inset-0 bg-primary/30 rounded-full animate-ping"></div>
        <div class="relative z-10 w-4 h-4 bg-primary border-[3px] border-white rounded-full shadow-lg mt-0.5 ml-0.5"></div>
      </div>
    `,
    className: "",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

const destIcon = L.divIcon({
  html: `<div class="bg-foreground text-background w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white"><MapPin size={16} /></div>`,
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
  
  // Navigation & State
  const [navMode, setNavMode] = useState<'browsing' | 'routing' | 'tracking'>('browsing');
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoute, setSelectedRoute] = useState<'fastest' | 'safest'>('safest');
  
  const currentPos: [number, number] = useMemo(() => 
    locationState.coords ? [locationState.coords.lat, locationState.coords.lng] : FALLBACK_POINT
  , [locationState.coords]);

  // Heatmap Data
  const heatmapData = useMemo(() => generateHeatmap(currentPos), [currentPos]);

  // Initial Map Setup
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = L.map(containerRef.current, {
      center: currentPos,
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    // Initial User Marker
    const marker = L.marker(currentPos, { icon: makeUserIcon(), zIndexOffset: 1000 }).addTo(map);
    userMarkerRef.current = marker;

    // Contact Markers
    const contacts = [
      { id: "c1", lat: currentPos[0] + 0.003, lng: currentPos[1] - 0.002, initial: "P", color: "bg-blue-500" },
      { id: "c2", lat: currentPos[0] - 0.002, lng: currentPos[1] + 0.004, initial: "M", color: "bg-purple-500" },
    ];
    contacts.forEach((contact) => {
      L.marker([contact.lat, contact.lng], { icon: makeAvatarIcon(contact.initial, contact.color) }).addTo(map);
    });

    heatmapLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Heatmap Toggle
  useEffect(() => {
    if (!heatmapLayerRef.current) return;
    heatmapLayerRef.current.clearLayers();
    
    if (showHeatmap) {
      heatmapData.forEach((zone) => {
        L.circle(zone.pos as [number, number], {
          radius: 350,
          color: "transparent",
          fillColor: COLORS[zone.level as keyof typeof COLORS],
          fillOpacity: 1,
          weight: 0,
        }).addTo(heatmapLayerRef.current!);
      });
    }
  }, [showHeatmap, heatmapData]);

  // Update Position Tracking
  useEffect(() => {
    if (navMode !== 'tracking' || !mapRef.current || !locationState.coords) return;
    const newPoint = [locationState.coords.lat, locationState.coords.lng] as [number, number];
    mapRef.current.panTo(newPoint, { animate: true, duration: 1 });
    if (userMarkerRef.current) userMarkerRef.current.setLatLng(newPoint);
  }, [locationState.coords, navMode]);

  // ── Handling Search / Routing Simulation ──

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setNavMode('routing');
    
    if (!routeLayerRef.current || !mapRef.current) return;
    routeLayerRef.current.clearLayers();

    const dest: [number, number] = [currentPos[0] + 0.012, currentPos[1] + 0.008];
    
    // Render Destination Marker
    L.marker(dest, { icon: destIcon }).addTo(routeLayerRef.current);

    // Fastest Route (Through Red Zone)
    const fastestPath: [number, number][] = [
      currentPos,
      [currentPos[0] + 0.006, currentPos[1] + 0.004],
      dest
    ];
    
    // Safest Route (Avoiding zones)
    const safestPath: [number, number][] = [
      currentPos,
      [currentPos[0] + 0.002, currentPos[1] + 0.009],
      dest
    ];

    // Render Routes
    const fastestPoly = L.polyline(fastestPath, { 
      color: "hsl(var(--sos))", 
      weight: 6, 
      opacity: selectedRoute === 'fastest' ? 0.8 : 0.2,
      dashArray: "10, 10"
    }).addTo(routeLayerRef.current);

    const safestPoly = L.polyline(safestPath, { 
      color: "hsl(var(--safe))", 
      weight: 8, 
      opacity: selectedRoute === 'safest' ? 1 : 0.3
    }).addTo(routeLayerRef.current);

    mapRef.current.fitBounds(safestPoly.getBounds(), { padding: [50, 50] });
    
    toast({
      title: "Routes Calculated",
      description: "Found a safest path avoiding high-risk zones.",
    });
  };

  useEffect(() => {
    if (navMode === 'routing') {
      handleSearch({ preventDefault: () => {} } as any);
    }
  }, [selectedRoute]);

  const toggleHeatmap = () => setShowHeatmap(!showHeatmap);
  
  const startTracking = () => {
    setNavMode('tracking');
    routeLayerRef.current?.clearLayers();
    toast({
      title: "Safe Journey Started",
      description: "Sakhi is now monitoring your route in real-time.",
    });
  };

  const endJourney = () => {
    setNavMode('browsing');
    toast({
      title: "Journey Ended",
      description: "Live tracking has been securely stopped.",
    });
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      
      {/* ─── Map Surface ──────────────────────────────────────────────────── */}
      <div ref={containerRef} className="absolute inset-0 z-0" style={{ height: "calc(100vh - 4.5rem)" }} />

      {/* ─── Top Interface Overlay ────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-20 pt-10 px-5 space-y-3 pointer-events-none">
        
        {/* Search Bar */}
        <div className="max-w-md mx-auto pointer-events-auto">
          <form onSubmit={handleSearch} className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search safe address..."
              className="w-full bg-card/90 backdrop-blur-xl border border-border/50 rounded-full pl-11 pr-5 py-3.5 text-sm font-bold shadow-lg focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            />
          </form>
        </div>

        {/* Global Controls Row */}
        <div className="flex justify-between items-start max-w-lg mx-auto pointer-events-auto">
          <button 
             onClick={toggleHeatmap}
             className={`flex items-center gap-2 px-4 py-2.5 rounded-full border shadow-md transition-all font-bold text-[10px] uppercase tracking-wider backdrop-blur-md
                        ${showHeatmap ? 'bg-foreground text-background border-foreground' : 'bg-card/90 text-foreground border-border/50'}`}
          >
             <Layers className="w-3.5 h-3.5" />
             Heatmap {showHeatmap ? 'ON' : 'OFF'}
          </button>

          {navMode === 'browsing' && (
            <div className="bg-card/90 backdrop-blur-md shadow-sm border border-border/50 rounded-full px-4 py-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-safe animate-pulse" />
              <span className="text-[10px] font-bold text-foreground tracking-wide uppercase">
                 {locationState.loading ? "Locating..." : "GPS Active"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ─── Floating SOS ─────────────────────────────────────────────────── */}
      <div className="absolute top-1/2 right-4 -translate-y-1/2 z-[100] pointer-events-auto">
         <button 
           onClick={() => {
             console.log("🚨 SOS Triggered from Map");
             triggerSOS();
             navigate("/sos");
           }}
           className="bg-sos text-white w-14 h-14 rounded-full shadow-[0_8px_30px_rgba(220,38,38,0.4)] flex items-center justify-center hover:scale-[1.1] active:scale-90 transition-all duration-300 border-4 border-background cursor-pointer"
         >
           <AlertTriangle className="w-6 h-6" />
         </button>
      </div>

      {/* ─── Context Insight Tooltips ─────────────────────────────────────── */}
      <AnimatePresence>
         {navMode === 'tracking' && (
            <motion.div 
               initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
               className="absolute top-[25%] left-[20%] z-10 pointer-events-none"
            >
               <div className="bg-card/90 backdrop-blur px-3 py-1.5 rounded-xl border border-border/50 shadow-sm flex items-center gap-2">
                  <Zap className="w-3 h-3 text-orange-500 fill-orange-500" />
                  <span className="text-[9px] font-bold text-foreground uppercase tracking-wider">Well-Lit Area</span>
               </div>
            </motion.div>
         )}
      </AnimatePresence>

      {/* ─── Bottom Sheets ────────────────────────────────────────────────── */}
      <div className="absolute bottom-[4.5rem] left-0 right-0 z-20 px-4 pb-4">
        <AnimatePresence mode="wait">
          
          {/* 1. ROUTE SELECTION CARD */}
          {navMode === 'routing' && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
              className="bg-card shadow-2xl border border-border/80 rounded-[2rem] p-6 w-full flex flex-col gap-5"
            >
               <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Navigate Safely</h2>
                    <p className="text-xs font-medium text-muted-foreground">Select your preferred path</p>
                  </div>
                  <button onClick={() => setNavMode('browsing')} className="p-2 bg-muted rounded-full text-muted-foreground"><X size={16} /></button>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setSelectedRoute('safest')}
                    className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer ${selectedRoute === 'safest' ? 'border-safe bg-safe/5 shadow-inner' : 'border-border/60'}`}
                  >
                     <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4 text-safe" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-safe">Safest</span>
                     </div>
                     <p className="text-xl font-bold text-foreground leading-none">12 <span className="text-sm">min</span></p>
                     <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-wider">Safety Score: 98%</p>
                  </button>

                  <button 
                    onClick={() => setSelectedRoute('fastest')}
                    className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer ${selectedRoute === 'fastest' ? 'border-sos bg-sos/5 shadow-inner' : 'border-border/60'}`}
                  >
                     <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-sos" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-sos">Fastest</span>
                     </div>
                     <p className="text-xl font-bold text-foreground leading-none">8 <span className="text-sm">min</span></p>
                     <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-wider">Risk Level: High</p>
                  </button>
               </div>

               <button 
                 onClick={startTracking}
                 className="w-full py-4 bg-foreground text-background font-bold text-[16px] rounded-full hover:scale-[1.02] transition-all shadow-xl active:scale-[0.97] flex items-center justify-center gap-2 cursor-pointer"
               >
                  Start Safe Journey <Navigation2 className="w-4 h-4" />
               </button>
            </motion.div>
          )}

          {/* 2. TRACKING STATUS CARD */}
          {navMode === 'tracking' && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
              className="bg-card shadow-2xl border border-border/80 rounded-[2rem] p-6 w-full flex flex-col gap-5"
            >
               <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                       <ShieldCheck className="w-5 h-5 text-safe" />
                       <h2 className="text-base font-bold text-foreground">Tracking Active</h2>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">Monitoring your environment in real-time</p>
                  </div>
                  <div className={`px-4 py-2 rounded-full font-bold text-xs ${selectedRoute === 'safest' ? 'bg-safe/10 text-safe' : 'bg-sos/10 text-sos'}`}>
                     {selectedRoute === 'safest' ? 'SAFE ROUTE ACTIVE' : 'CAUTION: FAST ROUTE'}
                  </div>
               </div>

               <div className="flex items-center gap-4 bg-muted/60 rounded-2xl p-4 border border-border/50">
                  <div className="w-10 h-10 bg-card rounded-xl flex items-center justify-center shadow-sm">
                     <Info className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                     <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Live Insight</p>
                     <p className="text-xs font-bold text-foreground">Area has high footfall and good lighting.</p>
                  </div>
               </div>

               <button 
                 onClick={endJourney}
                 className="w-full py-4 bg-muted text-foreground font-bold text-[15px] rounded-full hover:scale-[1.02] active:scale-[0.97] transition-all cursor-pointer"
               >
                  End Journey
               </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  );
};

export default RiskMapPage;
