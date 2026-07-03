import { useState, useEffect, useRef } from "react";
import { 
  MapPin, Phone, CheckCircle2, Shield, RefreshCw, 
  Users, AlertTriangle, BatteryMedium, Wifi, Camera, 
  Mic, Clock, Navigation, Stethoscope, CarFront, MessageSquare, 
  FileText, ChevronRight, Check
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";

// ── Icons & Map Helpers ────────────────────────────────────────────────────────

const createUserMarker = () => L.divIcon({
  className: "custom-user-marker",
  html: `<div class="relative flex items-center justify-center w-full h-full">
          <div class="absolute w-14 h-14 rounded-full" style="background:rgba(212,69,92,0.3);animation:ping 2s cubic-bezier(0,0,0.2,1) infinite"></div>
          <div class="relative w-5 h-5 rounded-full border-2 border-white z-10 shadow-md" style="background:#D4455C"></div>
         </div>`,
  iconSize: [72, 72],
  iconAnchor: [36, 36],
});

const createGuardianMarker = () => L.divIcon({
  className: "custom-guardian-marker",
  html: `<div class="relative">
          <div class="w-9 h-9 bg-blue-500 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg></div>
         </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const createPoiMarker = (emoji: string, color: string) => L.divIcon({
  className: "custom-poi-marker",
  html: `<div class="w-8 h-8 rounded-full border-2 border-white shadow-md flex items-center justify-center text-sm" style="background:${color}">${emoji}</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// ── Main Page ─────────────────────────────────────────────────────────────

const GuardianPage = () => {
  const navigate = useNavigate();
  const { sosState, locationState, resolveSOS } = useApp();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isResolved, setIsResolved] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState("00:00");
  
  // Real-time map refs
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);

  // Mocks
  const userLat = sosState.active ? sosState.coords.lat : (locationState.coords?.lat || 28.5355);
  const userLng = sosState.active ? sosState.coords.lng : (locationState.coords?.lng || 77.3910);
  const guardianLat = userLat - 0.008;
  const guardianLng = userLng + 0.006;
  
  const isSOS = sosState.active;

  // Actions
  const handleAction = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 2800);
  };

  useEffect(() => {
    if (sosState.active) setIsResolved(false);
  }, [sosState.active]);

  // Timer
  useEffect(() => {
    if (!sosState.active) return;
    const calc = () => {
      if (!sosState.triggeredAt) return "00:00";
      const d = Math.floor((Date.now() - new Date(sosState.triggeredAt).getTime()) / 1000);
      return `${String(Math.floor(d / 60)).padStart(2, "0")}:${String(d % 60).padStart(2, "0")}`;
    };
    setTimeElapsed(calc());
    const id = setInterval(() => setTimeElapsed(calc()), 1000);
    return () => clearInterval(id);
  }, [sosState.active, sosState.triggeredAt]);

  // Map Initialization
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) mapRef.current.remove();

    const map = L.map(mapContainerRef.current, { 
      center: [userLat - 0.002, userLng + 0.002], // Offset center slightly to fit both
      zoom: 15, 
      zoomControl: false, 
      attributionControl: false 
    });
    
    // Use dark theme tiles if SOS is active, else light
    const tileUrl = isSOS 
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
    L.tileLayer(tileUrl).addTo(map);

    // Markers
    L.marker([userLat, userLng], { icon: createUserMarker(), zIndexOffset: 1000 }).addTo(map);
    
    if (isSOS) {
      L.marker([guardianLat, guardianLng], { icon: createGuardianMarker() }).addTo(map);
      
      // POIs
      L.marker([userLat + 0.004, userLng - 0.002], { icon: createPoiMarker("🚔", "#2563EB") }).addTo(map);
      L.marker([userLat - 0.002, userLng - 0.005], { icon: createPoiMarker("🏥", "#E74C3C") }).addTo(map);

      // Route Polyline
      const route = L.polyline([
        [guardianLat, guardianLng],
        [guardianLat + 0.003, guardianLng - 0.002],
        [userLat - 0.002, userLng + 0.001],
        [userLat, userLng]
      ], { color: "#3B82F6", weight: 4, dashArray: "10, 10", opacity: 0.8 }).addTo(map);
      routeLineRef.current = route;
      
      // Fit bounds
      map.fitBounds(route.getBounds(), { padding: [30, 30] });
    }

    // Safety zones (only in non-sos for cleaner view, or keep them? instructions say "Keep risk zones")
    const zones = [
      { lat: userLat + 0.002, lng: userLng - 0.002, radius: 400, color: "#3D9970", fillColor: "#3D9970", fillOpacity: isSOS ? 0.08 : 0.12 },
      { lat: userLat - 0.004, lng: userLng + 0.003, radius: 600, color: "#F39C12", fillColor: "#F39C12", fillOpacity: isSOS ? 0.08 : 0.12 },
      { lat: userLat + 0.005, lng: userLng + 0.005, radius: 500, color: "#E74C3C", fillColor: "#E74C3C", fillOpacity: isSOS ? 0.08 : 0.12 },
    ];
    zones.forEach(z => {
      L.circle([z.lat, z.lng], { radius: z.radius, color: z.color, fillColor: z.fillColor, fillOpacity: z.fillOpacity, weight: isSOS ? 1 : 1.5 }).addTo(map);
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [userLat, userLng, guardianLat, guardianLng, isSOS]);

  // Mock Timeline Generation
  const timelineEvents = [
    { time: "14:22", msg: "SOS Triggered", active: false },
    { time: "14:22", msg: "Guardians Notified", active: false },
    { time: "14:23", msg: "Live Location Shared", active: false },
    { time: "14:23", msg: "Video Recording Started", active: false },
    { time: "14:24", msg: "You opened the alert", active: true },
  ];

  return (
    <AppLayout>
      <div style={{ background: isSOS ? "#110303" : "var(--sakhi-cream)", minHeight: "100vh", transition: "background 0.5s ease", paddingBottom: "7rem" }}>
        
        {/* Toast */}
        <AnimatePresence>
          {actionFeedback && (
            <motion.div
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-5 py-3 rounded-full shadow-xl"
              style={{ background: "#3D9970", color: "white", fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 13 }}
            >
              <CheckCircle2 className="w-4 h-4" /> {actionFeedback}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-3xl mx-auto px-4 pt-4">

          {/* ── Dashboard Header ── */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {isSOS && <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.8, repeat: Infinity }} className="w-2.5 h-2.5 rounded-full bg-red-500" />}
                <h1 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 22, color: isSOS ? "white" : "#3D2315" }}>
                  {isSOS ? "Emergency Active" : "Aapke Apnewale 💛"}
                </h1>
              </div>
              <div className="flex items-center gap-3">
                {isSOS && (
                  <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 12, color: "#E74C3C" }}>
                    Duration: {timeElapsed}
                  </span>
                )}
                <span className="flex items-center gap-1.5" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 11, color: isSOS ? "rgba(255,255,255,0.4)" : "#9E7A6A" }}>
                  <RefreshCw className="w-3 h-3" /> Last Updated: Just now
                </span>
              </div>
            </div>
            
            {isSOS && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(46,204,113,0.15)", border: "1px solid rgba(46,204,113,0.3)" }}>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 10, color: "#6EE7B7", textTransform: "uppercase" }}>Live Tracking</span>
              </div>
            )}
          </div>

          {!isSOS ? (
            /* Non-SOS state placeholder (simplified for requirements focusing on SOS) */
            <div className="rounded-[24px] p-6 text-center" style={{ background: "white", boxShadow: "0 4px 20px rgba(139,58,47,0.05)" }}>
              <Users className="w-12 h-12 text-[#D4455C] mx-auto mb-3" />
              <h2 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 18, color: "#3D2315" }}>No Active Emergencies</h2>
              <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 13, color: "#9E7A6A", marginTop: 4 }}>
                Preeti is safe. You will be notified if an SOS is triggered.
              </p>
            </div>
          ) : (
            
            /* ── EMERGENCY DASHBOARD GRID ── */
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              
              {/* Main Column (Left) */}
              <div className="md:col-span-8 flex flex-col gap-4">
                
                {/* User Info Card */}
                <div className="rounded-[24px] p-5 relative overflow-hidden" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                  
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>User at Risk</p>
                      <h2 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 20, color: "white" }}>{sosState.userName || "Preeti Sharma"}</h2>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.1)" }}>
                        <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                        <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 11, color: "white" }}>Online</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.1)" }}>
                        <BatteryMedium className="w-3.5 h-3.5 text-yellow-400" />
                        <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 11, color: "white" }}>42%</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-500/20 text-red-400"><Camera className="w-4 h-4" /></div>
                      <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 13, color: "white" }}>Video Recording Active</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-500/20 text-red-400"><Mic className="w-4 h-4" /></div>
                      <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 13, color: "white" }}>Audio Recording Active</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-500/20 text-emerald-400"><MapPin className="w-4 h-4" /></div>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 13, color: "white" }}>Live Location Sharing</p>
                        <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 11, color: "rgba(255,255,255,0.5)" }} className="truncate">{sosState.location || "Tracking precise location..."}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Map View */}
                <div className="rounded-[24px] overflow-hidden relative" style={{ height: 280, border: "1px solid rgba(255,255,255,0.15)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                  <div ref={mapContainerRef} className="absolute inset-0" />
                  
                  {/* Map Overlay HUD */}
                  <div className="absolute top-3 right-3 z-[400] flex flex-col gap-2">
                    <div className="bg-[#110303]/80 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 shadow-xl flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <div>
                        <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 10, color: "rgba(255,255,255,0.6)", textTransform: "uppercase" }}>Your ETA</p>
                        <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 13, color: "white" }}>4 mins (1.2km)</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions (2x3 Grid) */}
                <h3 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 14, color: "rgba(255,255,255,0.6)" }} className="mt-1">Immediate Response</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Call User", icon: Phone, bg: "rgba(59,130,246,0.15)", color: "#60A5FA", border: "rgba(59,130,246,0.3)" },
                    { label: "Navigate", icon: Navigation, bg: "rgba(167,139,250,0.15)", color: "#C084FC", border: "rgba(167,139,250,0.3)" },
                    { label: "Call Police (112)", icon: CarFront, bg: "rgba(248,113,113,0.15)", color: "#F87171", border: "rgba(248,113,113,0.3)" },
                    { label: "Ambulance (108)", icon: Stethoscope, bg: "rgba(251,146,60,0.15)", color: "#FBBF24", border: "rgba(251,146,60,0.3)" },
                    { label: "Send Msg", icon: MessageSquare, bg: "rgba(255,255,255,0.1)", color: "white", border: "rgba(255,255,255,0.15)" },
                    { label: "Mark Safe", icon: CheckCircle2, bg: "rgba(52,211,153,0.15)", color: "#34D399", border: "rgba(52,211,153,0.3)", action: () => { setIsResolved(true); resolveSOS(); handleAction("Emergency Resolved"); navigate("/home"); } },
                  ].map(btn => (
                    <motion.button 
                      key={btn.label}
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
                      onClick={btn.action ? btn.action : () => handleAction(`Action: ${btn.label}`)}
                      className="rounded-[20px] p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all"
                      style={{ background: btn.bg, border: `1px solid ${btn.border}` }}
                    >
                      <btn.icon className="w-6 h-6" style={{ color: btn.color }} />
                      <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 13, color: btn.color }}>{btn.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Sidebar Column (Right) */}
              <div className="md:col-span-4 flex flex-col gap-4 mt-2 md:mt-0">
                
                {/* Status Panel */}
                <div className="rounded-[24px] p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 13, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>
                    Current Situation
                  </p>
                  <div className="space-y-4">
                    {[
                      { label: "Live Tracking", active: true, color: "emerald" },
                      { label: "Recording Active", active: true, color: "emerald" },
                      { label: "3 Guardians Notified", active: true, color: "emerald" },
                      { label: "Police Not Contacted", active: false, color: "yellow" },
                      { label: "Ambulance Not Contacted", active: false, color: "yellow" }
                    ].map((s, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${s.active ? 'bg-emerald-400' : 'bg-yellow-400'}`} />
                        <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 13, color: s.active ? "white" : "rgba(255,255,255,0.6)" }}>
                          {s.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Evidence Summary */}
                <div className="rounded-[24px] p-5" style={{ background: "linear-gradient(135deg, rgba(220,38,38,0.1), rgba(153,27,27,0.1))", border: "1px solid rgba(220,38,38,0.2)" }}>
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-4 h-4 text-red-400" />
                    <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 13, color: "white" }}>Evidence Collected</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-black/30 rounded-xl p-3 flex flex-col items-center justify-center">
                      <Camera className="w-4 h-4 text-white/70 mb-1" />
                      <span className="text-white font-bold text-sm">1 Video</span>
                    </div>
                    <div className="bg-black/30 rounded-xl p-3 flex flex-col items-center justify-center">
                      <Mic className="w-4 h-4 text-white/70 mb-1" />
                      <span className="text-white font-bold text-sm">1 Audio</span>
                    </div>
                  </div>
                  <button onClick={() => navigate("/evidence-locker")} className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 transition-colors cursor-pointer text-white text-sm font-bold">
                    Open Evidence <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Timeline */}
                <div className="rounded-[24px] p-5 flex-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 13, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>
                    Timeline
                  </p>
                  <div className="relative pl-3">
                    <div className="absolute left-[5px] top-2 bottom-2 w-0.5 bg-white/10" />
                    {timelineEvents.map((ev, i) => (
                      <div key={i} className="relative mb-5 last:mb-0">
                        <div className={`absolute -left-[14px] top-1 w-2.5 h-2.5 rounded-full border-2 ${ev.active ? 'bg-red-500 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-[#110303] border-white/30'}`} />
                        <div className="pl-3">
                          <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 11, color: ev.active ? "#F87171" : "rgba(255,255,255,0.4)", marginBottom: 2 }}>
                            {ev.time}
                          </p>
                          <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 13, color: ev.active ? "white" : "rgba(255,255,255,0.7)" }}>
                            {ev.msg}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
    </AppLayout>
  );
};

export default GuardianPage;
