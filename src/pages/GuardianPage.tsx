import { useState, useEffect, useRef } from "react";
import { MapPin, Shield, Phone, MessageSquare, AlertCircle, Clock, Navigation, CheckCircle2, MoreVertical, Menu, Search, Filter, RefreshCw, Radio, Users } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import AppLayout from "@/components/AppLayout";
import { motion, AnimatePresence } from "framer-motion";

// Custom Marker for User
const createUserMarker = () => L.divIcon({
  className: "custom-user-marker",
  html: `<div class="relative">
          <div class="absolute inset-0 w-8 h-8 bg-teal-500/30 rounded-full animate-ping"></div>
          <div class="relative w-8 h-8 bg-teal-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
            <div class="w-3 h-3 bg-white rounded-full"></div>
          </div>
         </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
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
  const [activeTab, setActiveTab] = useState<"active" | "requests">("active");
  const [selectedGuardian, setSelectedGuardian] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

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

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png").addTo(map);

    // User Marker
    L.marker([28.5355, 77.3910], { icon: createUserMarker() }).addTo(map);

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
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row h-screen bg-[#fcfcfd] overflow-hidden">
        
        {/* ── Left Sidebar (List) ── */}
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-full md:w-[420px] bg-white border-r border-slate-100 flex flex-col z-30 shadow-2xl relative"
        >
          {/* Header */}
          <div className="p-6 md:p-8 border-b border-slate-50">
            <div className="flex items-center justify-between mb-6 md:mb-8">
               <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>Guardians</h1>
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
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
              <input 
                placeholder="Search network..." 
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-11 pr-4 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 transition-all"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex px-6 md:px-8 mt-4 md:mt-6 gap-6 border-b border-slate-50">
             <button 
               onClick={() => setActiveTab("active")}
               className={`pb-4 text-[11px] md:text-[13px] font-black tracking-widest uppercase transition-all relative ${activeTab === "active" ? "text-slate-900" : "text-slate-400 hover:text-slate-600"}`}
             >
               Active (3)
               {activeTab === "active" && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-slate-900 rounded-t-full" />}
             </button>
             <button 
               onClick={() => setActiveTab("requests")}
               className={`pb-4 text-[11px] md:text-[13px] font-black tracking-widest uppercase transition-all relative ${activeTab === "requests" ? "text-slate-900" : "text-slate-400 hover:text-slate-600"}`}
             >
               Requests
               {activeTab === "requests" && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-slate-900 rounded-t-full" />}
             </button>
          </div>

          {/* Guardian List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-32 md:pb-4">
             <AnimatePresence>
               {activeTab === "active" ? (
                 guardians.map((g, i) => (
                   <motion.div 
                     key={g.id}
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: i * 0.1 }}
                     whileHover={{ x: 4, backgroundColor: "#f8fafc" }}
                     onClick={() => {
                       setSelectedGuardian(g);
                       if (mapRef.current) mapRef.current.setView([g.lat, g.lng], 15);
                     }}
                     className={`p-4 md:p-5 rounded-[24px] border cursor-pointer transition-all ${selectedGuardian?.id === g.id ? "bg-slate-50 border-slate-200 shadow-sm" : "bg-white border-transparent"}`}
                   >
                     <div className="flex items-center gap-4 md:gap-5">
                       <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl ${g.color} flex items-center justify-center text-white font-black text-lg md:text-xl shadow-lg`}>
                         {g.name[0]}
                       </div>
                       <div className="flex-1">
                         <div className="flex items-center justify-between mb-1">
                           <h3 className="font-black text-slate-900 text-[14px] md:text-[15px]">{g.name}</h3>
                           <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-full border border-slate-100">
                             <div className={`w-1.5 h-1.5 rounded-full ${g.status === "Online" ? "bg-green-500" : g.status === "En Route" ? "bg-blue-500" : "bg-slate-400"} animate-pulse`} />
                             <span className="text-[9px] md:text-[10px] font-black text-slate-600 uppercase tracking-wider">{g.status}</span>
                           </div>
                         </div>
                         <p className="text-slate-500 text-[11px] md:text-[12px] font-bold">{g.role}</p>
                         <div className="flex items-center gap-4 mt-2 md:mt-3">
                            <span className="flex items-center gap-1 text-[10px] md:text-[11px] font-black text-slate-400"><MapPin className="w-3 h-3" /> {g.distance}</span>
                            <span className="flex items-center gap-1 text-[10px] md:text-[11px] font-black text-slate-400"><Clock className="w-3 h-3" /> {g.lastSeen}</span>
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
          <div className="p-6 md:p-8 border-t border-slate-50 hidden md:block">
             <motion.button 
               whileHover={{ scale: 1.02 }}
               whileTap={{ scale: 0.98 }}
               className="w-full py-4 bg-slate-900 text-white font-black text-[13px] rounded-2xl shadow-xl shadow-slate-200 flex items-center justify-center gap-3"
             >
                <Users className="w-4 h-4" /> Add New Guardian
             </motion.button>
          </div>
        </motion.div>

        {/* ── Right Content (Map) ── */}
        <div className="flex-1 relative min-h-[300px] md:min-h-0">
           <div ref={mapContainerRef} className="w-full h-full" />

           {/* Floating Map Controls */}
           <div className="absolute top-6 right-6 z-[400] flex flex-col gap-3">
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-2xl border border-slate-100 shadow-xl flex items-center justify-center text-slate-900"><RefreshCw className="w-5 h-5" /></motion.button>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-2xl border border-slate-100 shadow-xl flex items-center justify-center text-slate-900"><Radio className="w-5 h-5" /></motion.button>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="w-10 h-10 md:w-12 md:h-12 bg-slate-900 rounded-2xl border border-white shadow-xl flex items-center justify-center text-white"><Shield className="w-5 h-5" /></motion.button>
           </div>

           {/* Bottom Floating Stats Panel */}
           <AnimatePresence>
             {selectedGuardian && (
               <motion.div 
                 initial={{ y: 100, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 exit={{ y: 100, opacity: 0 }}
                 className="absolute bottom-6 left-4 right-4 md:left-[50%] md:translate-x-[-50%] md:w-[600px] z-[400] bg-white rounded-[28px] md:rounded-[32px] p-6 md:p-8 shadow-2xl border border-slate-100"
               >
                  <div className="flex items-center justify-between mb-6 md:mb-8">
                     <div className="flex items-center gap-4 md:gap-5">
                        <div className={`w-12 h-12 md:w-16 md:h-16 rounded-[18px] md:rounded-[20px] ${selectedGuardian.color} flex items-center justify-center text-white font-black text-xl md:text-2xl shadow-lg`}>
                           {selectedGuardian.name[0]}
                        </div>
                        <div>
                           <h2 className="text-lg md:text-xl font-black text-slate-900">{selectedGuardian.name}</h2>
                           <p className="text-slate-400 font-bold text-[11px] md:text-[13px] uppercase tracking-widest">{selectedGuardian.role}</p>
                        </div>
                     </div>
                     <motion.button 
                       whileHover={{ scale: 1.1 }} 
                       whileTap={{ scale: 0.9 }}
                       onClick={() => setSelectedGuardian(null)}
                       className="p-2 text-slate-400 hover:text-slate-900"
                     >
                       <AlertCircle className="w-6 h-6" />
                     </motion.button>
                  </div>

                  <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
                     <div className="bg-slate-50 rounded-2xl p-3 md:p-4 border border-slate-100 text-center">
                        <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Distance</p>
                        <p className="text-md md:text-lg font-black text-slate-900">{selectedGuardian.distance}</p>
                     </div>
                     <div className="bg-slate-50 rounded-2xl p-3 md:p-4 border border-slate-100 text-center">
                        <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                        <p className="text-md md:text-lg font-black text-teal-600">{selectedGuardian.status}</p>
                     </div>
                     <div className="bg-slate-50 rounded-2xl p-3 md:p-4 border border-slate-100 text-center">
                        <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Battery</p>
                        <p className="text-md md:text-lg font-black text-slate-900">{selectedGuardian.battery}</p>
                     </div>
                  </div>

                  <div className="flex gap-3 md:gap-4">
                     <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 py-3 md:py-4 bg-teal-500 text-slate-900 font-black text-[12px] md:text-[13px] rounded-2xl shadow-lg shadow-teal-100 flex items-center justify-center gap-2 md:gap-3">
                        <Phone className="w-4 h-4 fill-slate-900" /> Call
                     </motion.button>
                     <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 py-3 md:py-4 bg-slate-900 text-white font-black text-[12px] md:text-[13px] rounded-2xl shadow-xl shadow-slate-200 flex items-center justify-center gap-2 md:gap-3">
                        <MessageSquare className="w-4 h-4 fill-white" /> Chat
                     </motion.button>
                  </div>
               </motion.div>
             )}
           </AnimatePresence>
        </div>

      </div>
    </AppLayout>
  );
};

export default GuardianPage;
