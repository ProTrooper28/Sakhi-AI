import { useState, useEffect, useRef } from "react";
import { MapPin, Phone, CheckCircle2, Navigation, Shield, RefreshCw, Users, X, ChevronRight, AlertTriangle, Heart } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";

const createUserMarker = () => L.divIcon({
  className: "custom-user-marker",
  html: `<div class="relative flex items-center justify-center w-full h-full">
          <div class="absolute w-14 h-14 rounded-full" style="background:rgba(212,69,92,0.3);animation:ping 2s cubic-bezier(0,0,0.2,1) infinite"></div>
          <div class="relative w-5 h-5 rounded-full border-2 border-white z-10 shadow-md" style="background:#D4455C"></div>
         </div>`,
  iconSize: [72, 72],
  iconAnchor: [36, 36],
});

const createGuardianMarker = (color: string) => L.divIcon({
  className: "custom-guardian-marker",
  html: `<div class="relative">
          <div class="w-9 h-9 ${color} rounded-2xl border-2 border-white shadow-xl flex items-center justify-center text-white font-black text-xs">G</div>
          <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-white"></div>
         </div>`,
  iconSize: [36, 40],
  iconAnchor: [18, 40],
});

const GuardianPage = () => {
  const navigate = useNavigate();
  const { sosState, locationState, resolveSOS } = useApp();
  const [selectedGuardian, setSelectedGuardian] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [showSafetyZones, setShowSafetyZones] = useState(true);
  const [isResolved, setIsResolved] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState("00:00");

  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const safetyZoneLayers = useRef<L.Circle[]>([]);

  const userLat = sosState.active ? sosState.coords.lat : (locationState.coords?.lat || 28.5355);
  const userLng = sosState.active ? sosState.coords.lng : (locationState.coords?.lng || 77.3910);

  const guardians = [
    { id: 1, name: "Priya Sharma",  role: "Primary Guardian",  status: "Online",     distance: "0.8 km", lat: userLat + 0.005, lng: userLng - 0.005, color: "bg-orange-400", online: true },
    { id: 2, name: "Rahul Singh",   role: "Emergency Contact", status: "En Route",   distance: "1.2 km", lat: userLat - 0.008, lng: userLng + 0.006, color: "bg-blue-500",   online: true },
    { id: 3, name: "Security Team", role: "Response Team",     status: "Monitoring", distance: "2.5 km", lat: userLat + 0.015, lng: userLng + 0.012, color: "bg-rose-600",   online: true },
  ];

  const handleAction = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 2800);
  };

  useEffect(() => {
    if (sosState.active) { setIsResolved(false); }
  }, [sosState.active]);

  // Timer
  useEffect(() => {
    if (!sosState.active) return;
    const calc = () => {
      if (!sosState.triggeredAt) return "00:00";
      const d = Math.floor((Date.now() - new Date(sosState.triggeredAt).getTime()) / 1000);
      return `${String(Math.floor(d / 60)).padStart(2, "0")}:${String(d % 60).padStart(2, "0")}`;
    };
    const id = setInterval(() => setTimeElapsed(calc()), 1000);
    return () => clearInterval(id);
  }, [sosState.active, sosState.triggeredAt]);

  // Map init
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) { mapRef.current.remove(); }

    const map = L.map(mapContainerRef.current, { center: [userLat, userLng], zoom: 14, zoomControl: false, attributionControl: false });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png").addTo(map);

    const uMarker = L.marker([userLat, userLng], { icon: createUserMarker() }).addTo(map);
    userMarkerRef.current = uMarker;

    guardians.forEach(g => {
      const m = L.marker([g.lat, g.lng], { icon: createGuardianMarker(g.color) }).addTo(map);
      m.on("click", () => setSelectedGuardian(g));
    });

    // Safety zones
    const zones = [
      { lat: userLat + 0.002, lng: userLng - 0.002, radius: 400, color: "#3D9970", fillColor: "#3D9970", fillOpacity: 0.12 },
      { lat: userLat - 0.004, lng: userLng + 0.003, radius: 600, color: "#F39C12", fillColor: "#F39C12", fillOpacity: 0.12 },
      { lat: userLat + 0.005, lng: userLng + 0.005, radius: 500, color: "#E74C3C", fillColor: "#E74C3C", fillOpacity: 0.12 },
    ];
    zones.forEach(z => {
      const c = L.circle([z.lat, z.lng], { radius: z.radius, color: z.color, fillColor: z.fillColor, fillOpacity: z.fillOpacity, weight: 1.5 });
      safetyZoneLayers.current.push(c);
    });
    if (showSafetyZones) safetyZoneLayers.current.forEach(c => c.addTo(map));

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; safetyZoneLayers.current = []; };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    if (showSafetyZones) safetyZoneLayers.current.forEach(c => { if (!mapRef.current?.hasLayer(c)) c.addTo(mapRef.current!); });
    else safetyZoneLayers.current.forEach(c => c.remove());
  }, [showSafetyZones]);

  const isSOS = sosState.active;

  return (
    <AppLayout>
      <div style={{ background: isSOS ? "#160404" : "var(--sakhi-cream)", minHeight: "100vh", transition: "background 0.5s ease", paddingBottom: "7rem" }}>

        {/* ── Action Feedback Toast ── */}
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

        <div className="max-w-2xl mx-auto px-4 pt-4">

          {/* ── Header ── */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 24, color: isSOS ? "white" : "#3D2315" }}>
                {isSOS ? "🚨 Emergency Active" : "Aapke Apnewale 💛"}
              </h1>
              <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 500, fontSize: 13, color: isSOS ? "rgba(255,255,255,0.65)" : "#9E7A6A" }}>
                {isSOS ? `${sosState.userName || "Preeti"} needs help right now` : "People who care about you"}
              </p>
            </div>
            <motion.button whileHover={{ rotate: 180 }} whileTap={{ scale: 0.9 }} onClick={() => { setIsRefreshing(true); setTimeout(() => setIsRefreshing(false), 1400); }}
              style={{ color: isSOS ? "rgba(255,255,255,0.7)" : "#9E7A6A" }}
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
            </motion.button>
          </div>

          {/* ── SOS Alert Banner ── */}
          <AnimatePresence>
            {isSOS && !isResolved && (
              <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="rounded-[22px] p-5 mb-5 relative overflow-hidden"
                style={{ background: "linear-gradient(135deg,#922B21,#C0392B)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.8, repeat: Infinity }} className="w-3 h-3 rounded-full bg-white" />
                  <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 16, color: "white" }}>Emergency Alert</span>
                  <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 18, color: "white", marginLeft: "auto" }}>{timeElapsed}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-white text-xs mb-4">
                  <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 12, padding: "8px 12px" }}>
                    <p style={{ opacity: 0.65, fontWeight: 600, marginBottom: 2 }}>User</p>
                    <p style={{ fontWeight: 800 }}>{sosState.userName || "Preeti"}</p>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 12, padding: "8px 12px" }}>
                    <p style={{ opacity: 0.65, fontWeight: 600, marginBottom: 2 }}>Location</p>
                    <p style={{ fontWeight: 800 }} className="truncate">{sosState.location || "Fetching…"}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => { window.location.href = "tel:112"; }} className="w-full py-3 rounded-[16px] cursor-pointer text-white font-bold text-sm flex items-center justify-center gap-2" style={{ background: "rgba(0,0,0,0.35)", fontFamily: "Nunito,sans-serif", fontWeight: 800 }}>
                    <Phone className="w-4 h-4" /> Call User
                  </button>
                  <button onClick={() => { setIsResolved(true); resolveSOS(); handleAction("Situation marked as safe ✅"); }}
                    className="w-full py-3 rounded-[16px] cursor-pointer font-bold text-sm flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg,#27AE60,#1E8449)", color: "white", fontFamily: "Nunito,sans-serif", fontWeight: 800 }}
                  >
                    <CheckCircle2 className="w-4 h-4" /> Mark as Safe
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Map ── */}
          <div className="rounded-[24px] overflow-hidden mb-5 relative" style={{ height: 260, border: `2px solid ${isSOS ? "rgba(192,57,43,0.4)" : "rgba(242,149,106,0.15)"}`, boxShadow: isSOS ? "0 0 30px rgba(192,57,43,0.25)" : "0 4px 20px rgba(139,58,47,0.07)" }}>
            <div ref={mapContainerRef} className="absolute inset-0" />
            {/* Zone toggle */}
            <div className="absolute top-3 right-3 z-[400]">
              <button onClick={() => setShowSafetyZones(!showSafetyZones)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer shadow-md"
                style={{ background: "white", fontFamily: "Nunito,sans-serif", color: showSafetyZones ? "#3D9970" : "#9E7A6A", border: `1px solid ${showSafetyZones ? "rgba(61,153,112,0.3)" : "rgba(242,149,106,0.2)"}` }}
              >
                <Shield className="w-3 h-3" /> {showSafetyZones ? "Zones On" : "Zones Off"}
              </button>
            </div>
          </div>

          {/* ── Guardian Cards ── */}
          <h2 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 15, color: isSOS ? "rgba(255,255,255,0.75)" : "#8B3A2F", marginBottom: 12 }}>
            {isSOS ? "Apnewale Status" : "Active Guardians"} ({guardians.length})
          </h2>
          <div className="space-y-3 mb-5">
            {guardians.map((g, i) => (
              <motion.div key={g.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                onClick={() => { setSelectedGuardian(selectedGuardian?.id === g.id ? null : g); if (mapRef.current) mapRef.current.setView([g.lat, g.lng], 15, { animate: true }); }}
                className="rounded-[22px] p-4 flex items-center gap-4 cursor-pointer transition-all"
                style={{
                  background: isSOS
                    ? (selectedGuardian?.id === g.id ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)")
                    : (selectedGuardian?.id === g.id ? "white" : "rgba(255,255,255,0.7)"),
                  border: `1px solid ${isSOS ? "rgba(255,255,255,0.1)" : "rgba(242,149,106,0.15)"}`,
                  boxShadow: selectedGuardian?.id === g.id ? "0 4px 16px rgba(139,58,47,0.08)" : "none",
                }}
              >
                <div className={`w-12 h-12 rounded-full ${g.color} flex items-center justify-center text-white font-black text-sm shadow relative flex-shrink-0`}>
                  {g.name.charAt(0)}
                  {g.online && <div className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-white" style={{ background: "#3D9970" }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 14, color: isSOS ? "white" : "#3D2315" }}>{g.name}</p>
                  <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 11, color: isSOS ? "rgba(255,255,255,0.55)" : "#9E7A6A" }}>{g.role} · {g.distance}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-bold"
                    style={{
                      fontFamily: "Nunito,sans-serif",
                      background: g.status === "Online" ? "rgba(61,153,112,0.15)" : g.status === "En Route" ? "rgba(59,130,246,0.15)" : "rgba(242,149,106,0.15)",
                      color: g.status === "Online" ? "#3D9970" : g.status === "En Route" ? "#3B82F6" : "#8B3A2F",
                    }}
                  >{g.status}</span>
                  <button onClick={e => { e.stopPropagation(); window.location.href = "tel:+919810000001"; handleAction(`Calling ${g.name}…`); }}
                    className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                    style={{ background: isSOS ? "rgba(255,255,255,0.12)" : "rgba(212,69,92,0.1)" }}
                  >
                    <Phone className="w-3.5 h-3.5" style={{ color: isSOS ? "white" : "#D4455C" }} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── Safety zones legend ── */}
          {!isSOS && (
            <div className="rounded-[22px] p-4" style={{ background: "white", boxShadow: "0 4px 20px rgba(139,58,47,0.05)" }}>
              <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 13, color: "#8B3A2F", marginBottom: 12 }}>Safety Zone Key</p>
              <div className="flex gap-4 flex-wrap">
                {[{ color: "#3D9970", label: "Safe Area" }, { color: "#F39C12", label: "Moderate" }, { color: "#E74C3C", label: "High Risk" }].map(z => (
                  <div key={z.label} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: z.color }} />
                    <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 12, color: "#9E7A6A" }}>{z.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </AppLayout>
  );
};

export default GuardianPage;
