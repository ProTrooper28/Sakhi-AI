import { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import {
  MapPin, Navigation, Users, Clock, AlertTriangle,
  Layers, ZoomIn, ZoomOut, Home, Briefcase, GraduationCap, Share2, Radio
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useApp } from "@/context/AppContext";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// ─── Leaflet Setup ──────────────────────────────────────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const FALLBACK_POINT: [number, number] = [28.7041, 77.1025]; // Delhi/Noida approx

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
    { pos: [center[0] - 0.002, center[1] + 0.001], level: "green" },
    { pos: [center[0], center[1] + 0.003], level: "blue" }, // light blue in the center
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
        <div class="absolute inset-0 bg-[#0ea5e9]/20 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
        <div class="absolute inset-0 bg-[#0ea5e9]/20 rounded-full"></div>
        <div class="relative z-10 w-3.5 h-3.5 bg-[#0ea5e9] border-[2.5px] border-white rounded-full shadow-md mt-0.5 ml-0.5"></div>
      </div>
    `,
    className: "",
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
}

// ─── Data ───────────────────────────────────────────────────────────────────

const journeyLog = [
  { time: "22:15", place: "Sector 18 Market", distance: "2.1 km", status: "safe" },
  { time: "21:40", place: "MG Road Metro Station", distance: "0.8 km", status: "safe" },
  { time: "21:05", place: "Connaught Place", distance: "1.4 km", status: "moderate" },
];

const guardians = [
  { initials: "M", name: "Mom (Sunita)", color: "bg-purple-500 text-white", since: "2 hrs ago" },
  { initials: "P", name: "Priya Kapoor", color: "bg-blue-500 text-white", since: "45 min ago" },
];

const geofences = [
  { icon: Home, label: "Home Zone", key: "home", radius: "200" },
  { icon: Briefcase, label: "Work Zone", key: "work", radius: "150" },
  { icon: GraduationCap, label: "School Zone", key: "school", radius: "300" },
];

export default function LocationTrackingPage() {
  const [toggles, setToggles] = useState({ home: true, work: true, school: false });
  const toggle = (key: keyof typeof toggles) => setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  const { locationState } = useApp();

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

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    // Add Heatmap Circles
    const heatmapData = generateHeatmap(currentPos);
    heatmapData.forEach((zone) => {
      let fillColor = COLORS.red;
      if (zone.level === "orange") fillColor = COLORS.orange;
      if (zone.level === "green") fillColor = COLORS.green;
      if (zone.level === "blue") fillColor = "rgba(14, 165, 233, 0.15)";

      L.circle(zone.pos as [number, number], {
        radius: zone.level === "blue" ? 300 : 700,
        color: "transparent",
        fillColor: fillColor,
        fillOpacity: 1,
        weight: 0,
      }).addTo(map);
    });

    // Add Contacts
    const contacts = [
      { id: "c1", lat: currentPos[0] + 0.007, lng: currentPos[1] + 0.002, initial: "P", color: "bg-blue-500" },
      { id: "c2", lat: currentPos[0] - 0.001, lng: currentPos[1] + 0.005, initial: "M", color: "bg-purple-500" },
    ];
    contacts.forEach((contact) => {
      L.marker([contact.lat, contact.lng], { icon: makeAvatarIcon(contact.initial, contact.color), zIndexOffset: 900 }).addTo(map);
    });

    // Add User Marker
    L.marker(currentPos, { icon: makeUserIcon(), zIndexOffset: 1000 }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [currentPos]);

  return (
    <AppLayout>
      <div className="bg-[#fcfcfd] min-h-screen">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="pb-10 px-8 max-w-[1400px] mx-auto pt-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 style={{ fontFamily: "Manrope,sans-serif" }} className="text-2xl font-bold text-slate-900 leading-tight">
                Live Location Tracking
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)] animate-pulse" />
                <span className="text-slate-500 text-[13px] font-medium">Updated 30s ago</span>
              </div>
            </div>
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-[13px] font-bold hover:bg-black transition-colors shadow-sm">
              <Share2 className="w-4 h-4" /> Share Location
            </button>
          </div>

          {/* Grid */}
          <div className="grid gap-6 items-start" style={{ gridTemplateColumns: "1fr 360px" }}>
            
            {/* MAP */}
            <div className="bg-white rounded-[24px] border border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden relative flex flex-col sticky top-8" style={{ minHeight: "calc(100vh - 180px)" }}>
              <div ref={containerRef} className="absolute inset-0 z-0 bg-slate-100" />
              
              {/* Overlay UI (Zoom Controls, Layer Toggles etc) */}
              <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-[400]">
                <button className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                  <ZoomIn className="w-5 h-5" />
                </button>
                <button className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                  <Layers className="w-5 h-5" />
                </button>
                <button className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                  <ZoomOut className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* RIGHT CARDS */}
            <div className="flex flex-col gap-5">
              {/* My Location */}
              <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-6">
                <div className="flex items-center gap-2 mb-5">
                  <MapPin className="w-5 h-5 text-teal-500" />
                  <h2 className="font-bold text-[15px] text-slate-900">My Location</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Address</p>
                    <p className="text-slate-900 text-[13px] font-bold">Sector 18, Noida, UP 201301</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Latitude</p><p className="text-slate-900 text-[13px] font-bold">28.5672° N</p></div>
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Longitude</p><p className="text-slate-900 text-[13px] font-bold">77.3218° E</p></div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">GPS Accuracy</span>
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded-md">Strong Signal</span>
                  </div>
                </div>
              </div>

              {/* Active Guardians */}
              <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Users className="w-5 h-5 text-slate-900" />
                  <h2 className="font-bold text-[15px] text-slate-900">Active Guardians</h2>
                  <span className="ml-auto text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{guardians.length} tracking</span>
                </div>
                <div className="space-y-4">
                  {guardians.map(g=>(
                    <div key={g.name} className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full ${g.color} flex items-center justify-center font-bold text-[12px] flex-shrink-0 shadow-sm border border-black/5`}>{g.initials}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-900 text-[13px] font-bold truncate">{g.name}</p>
                        <p className="text-slate-500 text-[11px] font-medium">Active {g.since}</p>
                      </div>
                      <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded-md border border-teal-100/50">Tracking</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Journey Log */}
              <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Clock className="w-5 h-5 text-slate-900" />
                  <h2 className="font-bold text-[15px] text-slate-900">Journey Log</h2>
                </div>
                <div className="space-y-4 relative">
                  <div className="absolute top-2 bottom-2 left-[5px] w-[2px] bg-slate-100" />
                  {journeyLog.map((e,i)=>(
                    <div key={i} className="flex items-start gap-4 relative">
                      <div className={`mt-1 w-3 h-3 rounded-full flex-shrink-0 relative z-10 ring-[3px] ring-white ${e.status==="safe"?"bg-teal-500":"bg-amber-500"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-900 text-[13px] font-bold">{e.place}</p>
                        <p className="text-slate-500 text-[11px] font-medium mt-0.5">{e.time} · {e.distance}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Geofence Alerts */}
              <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-6">
                <div className="flex items-center gap-2 mb-5">
                  <AlertTriangle className="w-5 h-5 text-slate-900" />
                  <h2 className="font-bold text-[15px] text-slate-900">Geofence Alerts</h2>
                </div>
                <div className="space-y-4">
                  {geofences.map(({icon:Icon,label,key,radius})=>(
                    <div key={key} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0 border border-slate-100">
                        <Icon className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-900 text-[13px] font-bold">{label}</p>
                        <p className="text-slate-500 text-[11px] font-medium">{radius}m radius</p>
                      </div>
                      <button
                        onClick={()=>toggle(key as keyof typeof toggles)}
                        className={`w-10 h-5 rounded-full transition-colors duration-200 flex-shrink-0 relative ${toggles[key as keyof typeof toggles]?"bg-slate-900":"bg-slate-200"}`}
                      >
                        <span className={`absolute top-[2px] w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${toggles[key as keyof typeof toggles]?"translate-x-5.5":"translate-x-0.5"}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* SOS Broadcast */}
              <div className="mt-2">
                <button className="w-full bg-[#da2929] hover:bg-[#c52525] text-white px-6 py-4 rounded-2xl text-[14px] font-bold transition-transform active:scale-[0.98] flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(218,41,41,0.25)]">
                  <Radio className="w-5 h-5" />
                  Broadcast to Guardians
                </button>
              </div>
            </div>
          </div>

        </motion.div>
      </div>
    </AppLayout>
  );
}
