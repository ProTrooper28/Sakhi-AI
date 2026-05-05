import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bell, Settings, LayoutDashboard, Map as MapIcon, Users, Brain, Activity, 
  Plus, HelpCircle, FileText, Phone, Navigation, MessageSquare, 
  Video, MapPin, ShieldAlert, AlertTriangle, CheckCircle2, Play, Search, LogOut
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Blinking red marker icon
const makePulseIcon = () =>
  L.divIcon({
    html: `
      <div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">
        <div style="
          position:absolute;width:24px;height:24px;border-radius:50%;
          background:rgba(239,68,68,0.25);
          animation:guardian-ping 1.2s ease-out infinite;
        "></div>
        <div style="
          width:12px;height:12px;border-radius:50%;
          background:#ef4444;
          border:2px solid rgba(255,255,255,0.8);
          box-shadow:0 0 8px rgba(239,68,68,0.8);
        "></div>
      </div>
    `,
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes guardian-ping {
      0%   { transform: scale(1);   opacity: 0.8; }
      100% { transform: scale(2.5); opacity: 0;   }
    }
    @keyframes radar-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

const GuardianPage = () => {
  const { sosState } = useApp();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<L.Map | null>(null);
  const markerRef       = useRef<L.Marker | null>(null);

  const centerLat = sosState?.coords?.lat || 28.5700;
  const centerLng = sosState?.coords?.lng || 77.3200;

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
      });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
      }).addTo(map);
      
      const marker = L.marker([centerLat, centerLng], { icon: makePulseIcon() }).addTo(map);
      
      mapRef.current = map;
      markerRef.current = marker;
    } else {
      mapRef.current.setView([centerLat, centerLng], 15);
      if (markerRef.current) markerRef.current.setLatLng([centerLat, centerLng]);
    }
  }, [centerLat, centerLng]);

  return (
    <div className="flex h-screen bg-[#fcfcfd] text-slate-700 overflow-hidden" style={{ fontFamily: "Manrope, sans-serif" }}>
      
      {/* Sidebar - Light Redesign */}
      <div className="w-[280px] bg-white border-r border-slate-100 flex flex-col shrink-0 z-20">
         <div className="p-8 pb-6">
            <div className="flex items-center gap-2 mb-2">
               <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-white" />
               </div>
               <h2 className="text-xl font-black text-slate-900 tracking-tight">Sakhi Guardian</h2>
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-10">Live Command Center</p>
         </div>

         <div className="flex-1 px-4 py-2 space-y-1">
            <button className="w-full flex items-center gap-3 px-4 py-3 bg-slate-900 text-white rounded-2xl font-bold text-[13px] shadow-lg shadow-slate-200 transition-all">
               <LayoutDashboard className="w-4 h-4" /> Dashboard
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-2xl font-bold text-[13px] transition-all">
               <MapIcon className="w-4 h-4" /> Live Heatmap
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-2xl font-bold text-[13px] transition-all">
               <Users className="w-4 h-4" /> Team Coordination
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-2xl font-bold text-[13px] transition-all">
               <Brain className="w-4 h-4" /> Threat Analysis
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-2xl font-bold text-[13px] transition-all">
               <Activity className="w-4 h-4" /> System Health
            </button>
         </div>

         <div className="p-6">
            <button className="w-full flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-900 px-4 py-4 rounded-[20px] text-[13px] font-black transition-colors">
               <Plus className="w-4 h-4" /> New Coordination
            </button>
         </div>

         <div className="p-6 border-t border-slate-50 space-y-1">
            <button className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-slate-900 rounded-lg text-[12px] font-bold transition-all">
               <HelpCircle className="w-4 h-4" /> Knowledge Base
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-slate-900 rounded-lg text-[12px] font-bold transition-all">
               <FileText className="w-4 h-4" /> Export Logs
            </button>
         </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Navbar - Light */}
        <header className="h-20 flex items-center justify-between px-10 bg-white border-b border-slate-100 shrink-0">
           <div className="flex items-center gap-8">
              <div className="relative group">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                 <input placeholder="Search protected ID..." className="bg-slate-50 border border-slate-100 rounded-full pl-10 pr-4 py-2 text-[13px] font-medium w-64 outline-none focus:ring-2 focus:ring-slate-100 transition-all" />
              </div>
           </div>
           
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-4 border-r border-slate-100 pr-6">
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                    <span className="text-[10px] font-black tracking-widest text-red-500 uppercase">Emergency Active</span>
                 </div>
                 <button className="bg-red-500 hover:bg-red-600 text-white text-[11px] font-black tracking-widest uppercase px-5 py-2.5 rounded-full shadow-lg shadow-red-200 transition-all active:scale-95">
                    DEPLOY INTERVENTION
                 </button>
              </div>
              
              <div className="flex items-center gap-4">
                 <button className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors relative">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                 </button>
                 <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white overflow-hidden shadow-sm">
                    <img src="https://ui-avatars.com/api/?name=Admin&background=0F172A&color=fff" alt="Avatar" className="w-full h-full object-cover" />
                 </div>
              </div>
           </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-10 flex flex-col gap-8">
           
           {/* Alert Banner Redesign */}
           <div className="bg-white rounded-[32px] p-6 flex items-center justify-between shadow-[0_4px_25px_rgba(0,0,0,0.03)] border border-slate-100 shrink-0">
              <div className="flex items-center gap-5">
                 <div className="w-16 h-16 rounded-[24px] bg-red-50 flex items-center justify-center border border-red-100/50">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                 </div>
                 <div>
                    <h2 className="text-xl font-black text-slate-900 mb-1 leading-none">Emergency Protocol Initiated</h2>
                    <p className="text-[13px] text-slate-500 font-medium">Tracking session ID: <span className="font-bold text-slate-900">#SX-8854-B</span> • High accuracy GPS engaged</p>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 <button className="bg-slate-900 text-white font-black text-[13px] px-8 py-4 rounded-2xl shadow-xl shadow-slate-200 hover:bg-black transition-all">
                    OPEN COMMAND COMMS
                 </button>
              </div>
           </div>

           {/* Main Grid */}
           <div className="flex-1 flex gap-8 min-h-0">
              
              {/* Left Column (Map & Actions) */}
              <div className="flex-1 flex flex-col gap-6 min-w-0">
                 {/* Map Container */}
                 <div className="flex-1 bg-white rounded-[32px] relative overflow-hidden shadow-[0_4px_25px_rgba(0,0,0,0.03)] border border-slate-100">
                    <div ref={mapContainerRef} className="absolute inset-0 z-0 bg-slate-50" />
                    
                    {/* Simulated Radar Overlay on Map */}
                    <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center overflow-hidden">
                       <div className="relative">
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border-[1.5px] border-red-500/10 rounded-full" />
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border-[1.5px] border-red-500/5 rounded-full" />
                          <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] -translate-y-full origin-bottom-left animate-[radar-spin_4s_linear_infinite]" style={{
                             background: 'conic-gradient(from 90deg at bottom left, transparent 0deg, rgba(239,68,68,0.1) 90deg, transparent 90deg)'
                          }} />
                       </div>
                    </div>

                    {/* Floating Map UI */}
                    <div className="absolute top-6 left-6 z-20 bg-white/95 backdrop-blur rounded-[20px] px-4 py-3 shadow-xl border border-slate-100">
                       <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-[11px] font-black text-slate-900 tracking-widest uppercase">Target Vector</span>
                       </div>
                       <p className="text-[10px] text-slate-500 font-bold pl-4 uppercase">Sync: 0.2s latency</p>
                    </div>

                    <div className="absolute bottom-6 left-6 z-20 bg-slate-900 text-white text-[13px] font-black px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2 pointer-events-none">
                       <MapPin className="w-4 h-4 text-red-400" /> {sosState?.location || "Sector 18, Noida, Uttar Pradesh"}
                    </div>

                    {/* Zoom controls */}
                    <div className="absolute top-6 right-6 z-20 flex flex-col gap-2">
                       <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden flex flex-col">
                          <button className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-50 border-b border-slate-50"><Plus className="w-5 h-5" /></button>
                          <button className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-50 font-black text-lg pb-1">-</button>
                       </div>
                       <button className="w-10 h-10 bg-white rounded-xl shadow-lg border border-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors">
                          <Navigation className="w-5 h-5" />
                       </button>
                    </div>
                 </div>

                 {/* Action Buttons */}
                 <div className="grid grid-cols-3 gap-6 shrink-0">
                    <button className="bg-red-500 hover:bg-red-600 text-white font-black text-[15px] py-6 rounded-[24px] shadow-xl shadow-red-100 transition-all flex items-center justify-center gap-3">
                       <Phone className="w-5 h-5 fill-current" /> Call Help
                    </button>
                    <button className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-100 font-black text-[15px] py-6 rounded-[24px] shadow-sm transition-all flex items-center justify-center gap-3">
                       <Navigation className="w-5 h-5" /> Directions
                    </button>
                    <button className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-100 font-black text-[15px] py-6 rounded-[24px] shadow-sm transition-all flex items-center justify-center gap-3">
                       <MessageSquare className="w-5 h-5 fill-current" /> Send Alert
                    </button>
                 </div>
              </div>

              {/* Right Column (Status Panels) */}
              <div className="w-[400px] flex flex-col gap-6 overflow-y-auto pr-1 pb-1">
                 
                 {/* Live Status Feed */}
                 <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.03)] shrink-0">
                    <h3 className="text-[17px] font-black text-slate-900 mb-8 flex items-center gap-2">
                       <FileText className="w-5 h-5 text-slate-400" /> Operational Log
                    </h3>
                    <div className="relative border-l-2 border-slate-50 ml-3 space-y-8">
                       
                       <div className="relative pl-8">
                          <div className="absolute -left-[11px] top-0.5 w-[20px] h-[20px] rounded-full bg-red-100 border-[4px] border-white flex items-center justify-center shadow-md ring-1 ring-red-100/50">
                             <div className="w-2 h-2 rounded-full bg-red-500" />
                          </div>
                          <div className="flex justify-between items-start">
                             <div>
                                <p className="text-[14px] font-black text-slate-900 leading-none mb-1.5">Evidence Capture Active</p>
                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Cloud Sync: Synchronized</p>
                             </div>
                             <span className="text-[11px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded tracking-widest">00:23</span>
                          </div>
                       </div>

                       <div className="relative pl-8">
                          <div className="absolute -left-[11px] top-0.5 w-[20px] h-[20px] rounded-full bg-slate-100 border-[4px] border-white flex items-center justify-center shadow-md">
                             <div className="w-2 h-2 rounded-full bg-slate-400" />
                          </div>
                          <div className="flex justify-between items-start">
                             <div>
                                <p className="text-[14px] font-black text-slate-900 leading-none mb-1.5">GPS Vector Stable</p>
                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Precision: 2.4 meters</p>
                             </div>
                             <span className="text-[11px] font-bold text-slate-300">2s ago</span>
                          </div>
                       </div>

                       <div className="relative pl-8">
                          <div className="absolute -left-[11px] top-0.5 w-[20px] h-[20px] rounded-full bg-teal-100 border-[4px] border-white flex items-center justify-center shadow-md">
                             <div className="w-2 h-2 rounded-full bg-teal-500" />
                          </div>
                          <div className="flex justify-between items-start">
                             <div>
                                <p className="text-[14px] font-black text-slate-900 leading-none mb-1.5">Guardians Dispatched</p>
                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">ETA: 4-6 minutes</p>
                             </div>
                             <span className="text-[11px] font-bold text-teal-500">10s ago</span>
                          </div>
                       </div>

                    </div>
                 </div>

                 {/* Video Feed Redesign */}
                 <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.03)] shrink-0">
                    <div className="flex justify-between items-center mb-6">
                       <h3 className="text-[17px] font-black text-slate-900">Live Surveillance</h3>
                       <div className="bg-red-500 text-white text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-2 shadow-lg shadow-red-200">
                          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE STREAM
                       </div>
                    </div>
                    <div className="w-full aspect-[16/9] bg-slate-900 rounded-[24px] relative overflow-hidden group cursor-pointer shadow-xl">
                       <img src="https://images.unsplash.com/photo-1555626906-fcf10d6851b4?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" alt="Live Feed" className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                       <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center border border-white/30 group-hover:bg-white/40 transition-all shadow-2xl">
                             <Play className="w-6 h-6 text-white ml-1 fill-current" />
                          </div>
                       </div>
                       <div className="absolute bottom-4 right-4 text-[11px] font-black text-white bg-black/60 px-3 py-1 rounded-lg backdrop-blur-md border border-white/10 uppercase tracking-widest">
                          CAM-01 • HD
                       </div>
                    </div>
                 </div>

                 {/* Coordination List Redesign */}
                 <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.03)] shrink-0">
                    <h3 className="text-[17px] font-black text-slate-900 mb-8">Active Responders</h3>
                    <div className="space-y-6">
                       
                       <div className="flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-[18px] overflow-hidden bg-slate-100 border-2 border-white shadow-sm ring-1 ring-slate-100 group-hover:scale-105 transition-transform">
                                <img src="https://ui-avatars.com/api/?name=Dad&background=F1F5F9&color=334155" alt="Dad" className="w-full h-full object-cover" />
                             </div>
                             <div>
                                <p className="text-[14px] font-black text-slate-900 leading-none mb-1.5">Dad (Sunil)</p>
                                <p className="text-[11px] text-slate-400 font-bold flex items-center gap-1.5"><MapIcon className="w-3.5 h-3.5" /> Passive Monitor</p>
                             </div>
                          </div>
                          <span className="text-[10px] font-black px-3 py-1 bg-slate-50 text-slate-400 rounded-full border border-slate-100 uppercase tracking-widest">Standby</span>
                       </div>

                       <div className="flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-[18px] overflow-hidden bg-teal-50 border-2 border-white shadow-sm ring-1 ring-teal-100 group-hover:scale-105 transition-transform">
                                <img src="https://ui-avatars.com/api/?name=Mom&background=F0FDFA&color=0D9488" alt="Mom" className="w-full h-full object-cover" />
                             </div>
                             <div>
                                <p className="text-[14px] font-black text-slate-900 leading-none mb-1.5">Mom (Asha)</p>
                                <p className="text-[11px] text-teal-600 font-black flex items-center gap-1.5"><Navigation className="w-3.5 h-3.5" /> En Route to Target</p>
                             </div>
                          </div>
                          <span className="text-[10px] font-black px-3 py-1 bg-teal-50 text-teal-600 rounded-full border border-teal-100 uppercase tracking-widest">Active</span>
                       </div>

                    </div>
                 </div>

              </div>
           </div>

        </main>
      </div>

    </div>
  );
};

export default GuardianPage;
