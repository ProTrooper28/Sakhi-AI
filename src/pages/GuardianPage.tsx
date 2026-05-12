import { useState, useEffect, useRef } from "react";
import { MapPin, Shield, Phone, MessageSquare, AlertCircle, Clock, Navigation, CheckCircle2, MoreVertical, Menu, Search, Filter, RefreshCw, Radio, Users, AlertTriangle } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";

// Custom Marker for User
const createUserMarker = () => L.divIcon({
  className: "custom-user-marker",
  html: `<div class="relative flex items-center justify-center w-full h-full">
          <div class="absolute w-16 h-16 bg-red-500/40 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
          <div class="relative w-6 h-6 bg-red-600 rounded-full border-2 border-white flex items-center justify-center z-10 shadow-sm">
          </div>
         </div>`,
  iconSize: [80, 80],
  iconAnchor: [40, 40]
});

// Custom Marker for Guardians
const createGuardianMarker = (color: string) => L.divIcon({
  className: "custom-guardian-marker",
  html: `<div class="relative">
          <div class="w-10 h-10 ${color} rounded-2xl border-2 border-white shadow-xl flex items-center justify-center text-white font-black text-xs">G</div>
          <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white"></div>
         </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 40]
});

const GuardianPage = () => {
  const { sosState, locationState } = useApp();
  const [activeTab, setActiveTab] = useState<"active" | "requests">("active");
  const [selectedGuardian, setSelectedGuardian] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [jitter, setJitter] = useState({ lat: 0, lng: 0 });
  const liveUpdates = ["Location refreshed", "Connection stable", "Updating...", "Signal strong"];
  const [liveStatusText, setLiveStatusText] = useState(liveUpdates[0]);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  const guardians = [
    { id: 1, name: "Priya Sharma", role: "Primary Guardian", status: "Online", distance: "0.8 km", battery: "84%", lat: 28.5355, lng: 77.3910, color: "bg-teal-600", lastSeen: "Just now" },
    { id: 2, name: "Rahul Singh", role: "Emergency Contact", status: "En Route", distance: "1.2 km", battery: "92%", lat: 28.5450, lng: 77.4000, color: "bg-blue-600", lastSeen: "2m ago" },
    { id: 3, name: "Security Team", role: "Response Team", status: "Monitoring", distance: "2.5 km", battery: "100%", lat: 28.5200, lng: 77.3800, color: "bg-slate-900", lastSeen: "Live" }
  ];

  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    // Clean up if already exists
    if (mapRef.current) {
      mapRef.current.remove();
    }

    const map = L.map(mapContainerRef.current, {
      center: [28.5355, 77.3910],
      zoom: 14,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png").addTo(map);

    // User Marker
    const userLat = sosState.active ? sosState.coords.lat : (locationState.coords?.lat || 28.5355);
    const userLng = sosState.active ? sosState.coords.lng : (locationState.coords?.lng || 77.3910);
    const uMarker = L.marker([userLat, userLng], { icon: createUserMarker() }).addTo(map);
    userMarkerRef.current = uMarker;

    // Guardian Markers
    guardians.forEach(g => {
      const marker = L.marker([g.lat, g.lng], { icon: createGuardianMarker(g.color) }).addTo(map);
      marker.on('click', () => {
        setSelectedGuardian(g);
      });
    });

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // Run once on mount

  // Sync user marker position with jitter
  useEffect(() => {
    if (userMarkerRef.current && mapRef.current) {
      const userLat = (sosState.active ? sosState.coords.lat : (locationState.coords?.lat || 28.5355)) + jitter.lat;
      const userLng = (sosState.active ? sosState.coords.lng : (locationState.coords?.lng || 77.3910)) + jitter.lng;
      userMarkerRef.current.setLatLng([userLat, userLng]);
      if (sosState.active) {
        mapRef.current.setView([userLat, userLng], 16, { animate: true, duration: 1.5 });
      }
    }
  }, [sosState.active, sosState.coords, locationState.coords, jitter]);

  // Live Jitter and Status Text Simulator
  useEffect(() => {
    if (sosState.active) {
      const jitterId = setInterval(() => {
        setJitter({ 
          lat: (Math.random() - 0.5) * 0.0003, 
          lng: (Math.random() - 0.5) * 0.0003 
        });
      }, 3000);

      let textIndex = 0;
      const textId = setInterval(() => {
        textIndex = (textIndex + 1) % liveUpdates.length;
        setLiveStatusText(liveUpdates[textIndex]);
      }, 4000);

      return () => { clearInterval(jitterId); clearInterval(textId); };
    }
  }, [sosState.active]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  const handleAction = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const calculateTimeElapsed = () => {
    if (!sosState.triggeredAt) return "00:00";
    const diff = Math.floor((new Date().getTime() - new Date(sosState.triggeredAt).getTime()) / 1000);
    const m = Math.floor(diff / 60).toString().padStart(2, "0");
    const s = (diff % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const [timeElapsed, setTimeElapsed] = useState("00:00");
  useEffect(() => {
    if (sosState.active) {
      const id = setInterval(() => setTimeElapsed(calculateTimeElapsed()), 1000);
      return () => clearInterval(id);
    }
  }, [sosState.active, sosState.triggeredAt]);

  return (
    <div className={`flex flex-col md:flex-row h-screen w-screen overflow-hidden ${sosState.active ? "bg-slate-950" : "bg-[#020617]"}`}>
        
        {/* ── Left Sidebar (List) ── */}
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-full md:w-[420px] bg-slate-900/40 backdrop-blur-xl border-r border-slate-800/50 flex flex-col z-30 shadow-2xl relative"
        >
          {/* Header */}
          <div className="p-8 border-b border-slate-800/50">
            <div className="flex items-center justify-between mb-8">
               <h1 className="text-2xl font-black text-slate-100 tracking-tight uppercase" style={{ fontFamily: "Manrope, sans-serif" }}>Guardian Command</h1>
               <motion.button 
                 whileHover={{ scale: 1.1, rotate: 180 }}
                 whileTap={{ scale: 0.9 }}
                 onClick={handleRefresh}
                 className="text-slate-400 hover:text-slate-900 transition-all"
               >
                 <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
               </motion.button>
            </div>

            {/* Search */}
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-teal-500 transition-colors" />
              <input 
                placeholder="Search command network..." 
                className="w-full bg-slate-950/50 border border-slate-800/50 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500/50 transition-all"
              />
            </div>
          </div>

          {/* Tabs - Hidden if SOS is active */}
          {!sosState.active && (
            <div className="flex px-6 md:px-8 mt-4 md:mt-6 gap-6 border-b border-slate-800/50">
               <button 
                 onClick={() => setActiveTab("active")}
                 className={`pb-4 text-[11px] md:text-[13px] font-black tracking-widest uppercase transition-all relative ${activeTab === "active" ? "text-teal-500" : "text-slate-500 hover:text-slate-300"}`}
               >
                 Active Nodes
                 {activeTab === "active" && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)] rounded-t-full" />}
               </button>
               <button 
                 onClick={() => setActiveTab("requests")}
                 className={`pb-4 text-[11px] md:text-[13px] font-black tracking-widest uppercase transition-all relative ${activeTab === "requests" ? "text-teal-500" : "text-slate-500 hover:text-slate-300"}`}
               >
                 Pending
                 {activeTab === "requests" && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)] rounded-t-full" />}
               </button>
            </div>
          )}

          {/* Guardian List or SOS Alert Status */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-32 md:pb-4">
             <AnimatePresence mode="wait">
               {sosState.active ? (
                 <motion.div
                   key="sos-alert"
                   initial={{ opacity: 0, x: -20 }}
                   animate={{ opacity: 1, x: 0 }}
                   className="p-4"
                 >
                    <div className="bg-red-600 text-white p-5 rounded-3xl border border-red-500 shadow-[0_0_30px_rgba(220,38,38,0.3)] mb-6 relative overflow-hidden">
                       <motion.div 
                         animate={{ opacity: [0.1, 0.3, 0.1] }}
                         transition={{ repeat: Infinity, duration: 2 }}
                         className="absolute inset-0 bg-white/10 pointer-events-none" 
                       />
                       <div className="flex items-center gap-3 mb-2 relative">
                         <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                         <h2 className="font-black text-lg tracking-wide uppercase">Priority Alert Detected</h2>
                       </div>
                       <p className="text-red-100 font-bold text-sm mb-4 relative italic opacity-90">Hardware SOS Triggered • Immediate Response Required</p>
                       
                       <div className="space-y-3 relative">
                         <div className="flex items-center justify-between bg-black/30 backdrop-blur-md p-3 rounded-xl border border-white/10">
                           <span className="text-[10px] font-black text-red-100 uppercase tracking-widest">Incident Duration</span>
                           <motion.span key={timeElapsed} initial={{ scale: 0.95 }} animate={{ scale: 1 }} transition={{ duration: 0.2 }} className="text-xl font-black font-mono tracking-wider text-white">{timeElapsed}</motion.span>
                         </div>
                         <div className="flex flex-col gap-1 bg-black/30 backdrop-blur-md p-3 rounded-xl border border-white/10">
                           <span className="text-[10px] font-black text-red-100 uppercase tracking-widest flex justify-between">
                             Last Verified Pos
                             <span className="text-red-300">Just now</span>
                           </span>
                           <span className="text-sm font-bold truncate text-white">{sosState.location || locationState.address || "Sector 18, Noida"}</span>
                         </div>
                       </div>
                     </div>

                    <div className="flex items-center justify-between mb-4 px-2">
                       <div className="flex items-center gap-2">
                         <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                         <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-100">System Live</span>
                       </div>
                       <AnimatePresence mode="wait">
                         <motion.span key={liveStatusText} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                           {liveStatusText}
                         </motion.span>
                       </AnimatePresence>
                    </div>

                    <div className="space-y-4 mb-8 pl-4 border-l-2 border-slate-800 ml-2">
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative">
                        <div className="absolute -left-[23px] top-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-4 ring-[#0f172a]" />
                        <span className="text-[13px] font-black text-slate-100 block leading-none uppercase tracking-tight">Signal Received</span>
                        <span className="text-[9px] text-slate-500 font-black uppercase mt-1.5 block tracking-widest">Security Protocol Engaged</span>
                      </motion.div>
                      
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="relative">
                        <div className="absolute -left-[23px] top-1 w-2.5 h-2.5 bg-teal-500 rounded-full ring-4 ring-[#0f172a]" />
                        <span className="text-[13px] font-black text-slate-100 block leading-none uppercase tracking-tight">Real-time Telemetry</span>
                        <span className="text-[9px] text-teal-500 font-black uppercase mt-1.5 block tracking-widest">Syncing active coords</span>
                      </motion.div>

                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="relative bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50 mt-3 backdrop-blur-md">
                        <div className="absolute -left-[35px] top-4 w-2.5 h-2.5 bg-blue-500 rounded-full ring-4 ring-[#0f172a]" />
                        <div className="flex items-center gap-3 mb-2.5">
                           <div className="flex items-end gap-1 h-4">
                             <motion.div animate={{ height: ["4px", "12px", "4px"] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1 bg-blue-500/80 rounded-full" />
                             <motion.div animate={{ height: ["8px", "16px", "8px"] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                             <motion.div animate={{ height: ["12px", "6px", "12px"] }} transition={{ repeat: Infinity, duration: 1.0 }} className="w-1 bg-blue-500/80 rounded-full" />
                           </div>
                           <span className="text-[12px] font-black text-slate-200 leading-none uppercase tracking-tight">Evidence Stream</span>
                        </div>
                        <span className="text-[9px] text-blue-500 font-black uppercase block tracking-widest">Uploading live evidence pack</span>
                      </motion.div>
                    </div>

                    <div className="space-y-3">
                      <motion.button onClick={() => handleAction("Establishing Link...")} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full bg-slate-100 text-slate-950 font-black text-[11px] py-4 rounded-2xl flex items-center justify-center gap-2.5 uppercase tracking-widest shadow-xl hover:bg-white transition-all cursor-pointer">
                        <Phone className="w-3.5 h-3.5" /> Call Node
                      </motion.button>
                      <motion.button onClick={() => { if(mapRef.current) mapRef.current.setView([userMarkerRef.current?.getLatLng().lat || sosState.coords.lat, userMarkerRef.current?.getLatLng().lng || sosState.coords.lng], 16); handleAction("Locked Tracking"); }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full bg-blue-600 text-white font-black text-[11px] py-4 rounded-2xl flex items-center justify-center gap-2.5 uppercase tracking-widest shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:bg-blue-500 transition-all cursor-pointer">
                        <Navigation className="w-3.5 h-3.5" /> Recenter Ops
                      </motion.button>
                      <motion.button onClick={() => handleAction("Notifying Authorities...")} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full bg-red-500/10 text-red-500 border border-red-500/20 font-black text-[11px] py-4 rounded-2xl flex items-center justify-center gap-2.5 uppercase tracking-widest hover:bg-red-500/20 transition-all cursor-pointer">
                        <Shield className="w-3.5 h-3.5" /> Dispatch Help
                      </motion.button>
                    </div>

                 </motion.div>
               ) : activeTab === "active" ? (
                 guardians.map((g, i) => (
                   <motion.div 
                     key={g.id}
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: i * 0.1 }}
                     whileHover={{ x: 4, backgroundColor: "rgba(30, 41, 59, 0.4)" }}
                     onClick={() => {
                       setSelectedGuardian(g);
                       if (mapRef.current) mapRef.current.setView([g.lat, g.lng], 15);
                     }}
                     className={`p-4 md:p-5 rounded-[24px] border cursor-pointer transition-all ${selectedGuardian?.id === g.id ? "bg-slate-800/60 border-teal-500/30 shadow-lg" : "bg-transparent border-slate-800/50"}`}
                   >
                     <div className="flex items-center gap-4 md:gap-5">
                       <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl ${g.color} flex items-center justify-center text-white font-black text-lg md:text-xl shadow-[0_0_15px_rgba(0,0,0,0.3)]`}>
                         {g.name[0]}
                       </div>
                       <div className="flex-1">
                         <div className="flex items-center justify-between mb-1.5">
                           <h3 className="font-black text-slate-100 text-[14px] md:text-[15px] tracking-tight uppercase">{g.name}</h3>
                           <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-950/50 rounded-full border border-slate-800/50">
                             <div className={`w-1.5 h-1.5 rounded-full ${g.status === "Online" ? "bg-teal-500" : g.status === "En Route" ? "bg-blue-500" : "bg-slate-600"} animate-pulse`} />
                             <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{g.status}</span>
                           </div>
                         </div>
                         <p className="text-slate-500 text-[11px] md:text-[12px] font-black uppercase tracking-widest">{g.role}</p>
                         <div className="flex items-center gap-4 mt-3">
                            <span className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest"><MapPin className="w-3 h-3 text-teal-500" /> {g.distance}</span>
                            <span className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest"><Clock className="w-3 h-3 text-teal-500" /> {g.lastSeen}</span>
                         </div>
                       </div>
                     </div>
                   </motion.div>
                 ))
               ) : (
                 <div className="flex flex-col items-center justify-center h-64 text-center p-8">
                   <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100 text-slate-300">
                      <Users className="w-8 h-8" />
                   </div>
                   <p className="text-slate-900 font-black text-[15px] mb-1">No pending requests</p>
                   <p className="text-slate-400 font-bold text-[13px]">When people ask to follow you, they'll appear here.</p>
                 </div>
               )}
             </AnimatePresence>
          </div>

          {/* Bottom Action (Hidden on mobile if needed, or adjusted) */}
          <div className="p-8 border-t border-slate-800/50 hidden md:block">
             <motion.button 
               whileHover={{ scale: 1.02, backgroundColor: "#14b8a6", color: "#000" }}
               whileTap={{ scale: 0.98 }}
               className="w-full py-5 bg-teal-500/5 border border-teal-500/20 text-teal-500 font-black text-[12px] rounded-2xl shadow-2xl flex items-center justify-center gap-4 transition-all uppercase tracking-[0.25em] cursor-pointer"
             >
                <Users className="w-4 h-4" /> Recruit New Node
             </motion.button>
          </div>
        </motion.div>

        {/* ── Right Content (Map) ── */}
        <div className="flex-1 relative min-h-[300px] md:min-h-0">
           <div ref={mapContainerRef} className="w-full h-full" />

           {/* Floating Map Controls */}
           <div className="absolute top-6 right-6 z-[400] flex flex-col gap-4">
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="w-12 h-12 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl flex items-center justify-center text-slate-300 transition-all hover:text-teal-500 cursor-pointer"><RefreshCw className="w-5 h-5" /></motion.button>
              <div className="relative">
                {sosState.active && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />}
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className={`w-12 h-12 ${sosState.active ? "bg-red-600 text-white" : "bg-slate-900/80 text-slate-300"} backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl flex items-center justify-center transition-all cursor-pointer`}><Radio className="w-5 h-5" /></motion.button>
              </div>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="w-12 h-12 bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl flex items-center justify-center text-slate-300 transition-all hover:text-teal-500 cursor-pointer"><Shield className="w-5 h-5" /></motion.button>
           </div>

           {/* Top Floating Live Status (SOS) */}
           <AnimatePresence>
             {sosState.active && (
                <motion.div 
                  initial={{ y: -50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -50, opacity: 0 }}
                  className="absolute top-6 left-1/2 -translate-x-1/2 z-[400] bg-slate-900/90 backdrop-blur-md px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-red-500/30"
                >
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="font-black text-[11px] tracking-[0.2em] text-white uppercase">Operational Status: Active</span>
                </motion.div>
             )}
           </AnimatePresence>

           {/* Action Feedback Toast */}
           <AnimatePresence>
             {actionFeedback && (
                <motion.div 
                  initial={{ y: 50, opacity: 0, scale: 0.9 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 50, opacity: 0, scale: 0.9 }}
                  className="absolute bottom-32 left-1/2 -translate-x-1/2 z-[500] bg-teal-500 text-slate-950 px-8 py-3.5 rounded-full shadow-[0_0_30px_rgba(20,184,166,0.4)] font-black text-[11px] uppercase tracking-widest"
                >
                  {actionFeedback}
                </motion.div>
             )}
           </AnimatePresence>

           {/* Bottom Floating Stats Panel */}
           <AnimatePresence>
             {selectedGuardian && (
                <motion.div 
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 100, opacity: 0 }}
                  className="absolute bottom-6 left-4 right-4 md:left-[50%] md:translate-x-[-50%] md:w-[600px] z-[400] bg-slate-900/60 backdrop-blur-2xl rounded-[32px] p-6 md:p-8 shadow-2xl border border-slate-800/50"
                >
                  <div className="flex items-center justify-between mb-6 md:mb-8">
                     <div className="flex items-center gap-4 md:gap-5">
                        <div className={`w-12 h-12 md:w-16 md:h-16 rounded-[18px] md:rounded-[20px] ${selectedGuardian.color} flex items-center justify-center text-white font-black text-xl md:text-2xl shadow-lg`}>
                           {selectedGuardian.name[0]}
                        </div>
                         <div>
                            <h2 className="text-lg md:text-xl font-black text-slate-100 uppercase tracking-tight">{selectedGuardian.name}</h2>
                            <p className="text-slate-500 font-black text-[10px] md:text-[11px] uppercase tracking-[0.2em]">{selectedGuardian.role}</p>
                         </div>
                     </div>
                     <motion.button 
                       whileHover={{ scale: 1.1 }} 
                       whileTap={{ scale: 0.9 }}
                       onClick={() => setSelectedGuardian(null)}
                       className="p-2 text-slate-400 hover:text-white"
                     >
                       <AlertCircle className="w-6 h-6" />
                     </motion.button>
                  </div>

                  <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
                     <div className="bg-slate-950/50 rounded-2xl p-3 md:p-4 border border-slate-800/50 text-center">
                        <p className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Range</p>
                        <p className="text-md md:text-lg font-black text-slate-100">{selectedGuardian.distance}</p>
                     </div>
                     <div className="bg-slate-950/50 rounded-2xl p-3 md:p-4 border border-slate-800/50 text-center">
                        <p className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</p>
                        <p className="text-md md:text-lg font-black text-teal-500">{selectedGuardian.status}</p>
                     </div>
                     <div className="bg-slate-950/50 rounded-2xl p-3 md:p-4 border border-slate-800/50 text-center">
                        <p className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Telemetry</p>
                        <p className="text-md md:text-lg font-black text-slate-100">{selectedGuardian.battery}</p>
                     </div>
                  </div>

                  <div className="flex gap-3 md:gap-4">
                     <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 py-3 md:py-4 bg-teal-500 text-slate-950 font-black text-[11px] md:text-[12px] rounded-2xl shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 md:gap-3 uppercase tracking-widest">
                        <Phone className="w-3.5 h-3.5 fill-slate-950" /> Establish Link
                     </motion.button>
                     <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 py-3 md:py-4 bg-slate-800 text-white font-black text-[11px] md:text-[12px] rounded-2xl border border-slate-700 flex items-center justify-center gap-2 md:gap-3 uppercase tracking-widest">
                        <MessageSquare className="w-3.5 h-3.5 fill-white" /> Command Chat
                     </motion.button>
                  </div>
               </motion.div>
             )}
           </AnimatePresence>
        </div>

    </div>
  );
};

export default GuardianPage;
