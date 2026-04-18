import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Navigation2, CheckCircle2, AlertTriangle, ShieldCheck, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { toast } from "@/components/ui/use-toast";
import { useApp } from "@/context/AppContext";

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const FALLBACK_POINT: [number, number] = [28.7120, 77.1140]; 

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

const RiskMapPage = () => {
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const safeZoneRef = useRef<L.Circle | null>(null);
  const safeZoneBorderRef = useRef<L.Circle | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const navigate = useNavigate();
  const { triggerSOS, locationState, requestLocation } = useApp();
  
  const [isTracking, setIsTracking] = useState(true);

  // Initialize Map
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const initialCenter = locationState.coords 
       ? [locationState.coords.lat, locationState.coords.lng] as [number, number] 
       : FALLBACK_POINT;

    const map = L.map(containerRef.current, {
      center: initialCenter,
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    // 1. Safe Zone
    const radiusFill = L.circle(initialCenter, {
      radius: 600,
      color: "transparent",
      fillColor: "hsl(142, 60%, 45%)",
      fillOpacity: 0.12,
      weight: 0,
    }).addTo(map);
    
    const radiusBorder = L.circle(initialCenter, {
      radius: 600,
      color: "hsl(142, 60%, 45%)",
      fillOpacity: 0,
      weight: 1.5,
      dashArray: "6, 6",
    }).addTo(map);

    // 2. User Marker
    const marker = L.marker(initialCenter, { icon: makeUserIcon(), zIndexOffset: 1000 }).addTo(map);

    // 3. Dynamic Trusted Contacts based on initial location
    const contacts = [
      { id: "c1", lat: initialCenter[0] + 0.003, lng: initialCenter[1] - 0.002, name: "Priya", initial: "P", color: "bg-blue-500" },
      { id: "c2", lat: initialCenter[0] - 0.002, lng: initialCenter[1] + 0.004, name: "Mom", initial: "M", color: "bg-purple-500" },
      { id: "c3", lat: initialCenter[0] - 0.004, lng: initialCenter[1] - 0.001, name: "Dad", initial: "D", color: "bg-orange-500" },
    ];
    contacts.forEach((contact) => {
      L.marker([contact.lat, contact.lng], { icon: makeAvatarIcon(contact.initial, contact.color) }).addTo(map);
    });

    mapRef.current = map;
    userMarkerRef.current = marker;
    safeZoneRef.current = radiusFill;
    safeZoneBorderRef.current = radiusBorder;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Dynamic Tracking
  useEffect(() => {
     if (!isTracking || !locationState.coords || !mapRef.current) return;
     
     const newPoint = [locationState.coords.lat, locationState.coords.lng] as [number, number];
     
     // Smooth pan map
     mapRef.current.panTo(newPoint, { animate: true, duration: 1 });
     
     // Update Live Marker & Geofence cleanly without refreshing layers
     if (userMarkerRef.current) userMarkerRef.current.setLatLng(newPoint);
     if (safeZoneRef.current) safeZoneRef.current.setLatLng(newPoint);
     if (safeZoneBorderRef.current) safeZoneBorderRef.current.setLatLng(newPoint);
  }, [locationState.coords, isTracking]);

  const handleEndJourney = () => {
    setIsTracking(false);
    toast({
      title: "Journey Ended",
      description: "Live tracking has been securely stopped.",
    });
    setTimeout(() => {
        navigate("/home");
    }, 1500);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      
      {/* Full Screen Map Container */}
      <div 
         ref={containerRef} 
         className="absolute inset-0 z-0" 
         style={{ height: "calc(100vh - 4.5rem)" }} 
      />

      {/* Top Status Indicator - Floating */}
      <div className="absolute top-0 left-0 right-0 z-10 pt-10 px-5 pointer-events-none flex justify-center">
        <motion.div 
           initial={{ opacity: 0, y: -20 }}
           animate={{ opacity: 1, y: 0 }}
           className="bg-card/90 backdrop-blur-md shadow-sm border border-border/50 rounded-full px-4 py-2 flex items-center gap-2 pointer-events-auto"
        >
          {locationState.error ? (
              <>
                 <AlertTriangle className="w-3 h-3 text-sos" />
                 <span className="text-[10px] font-bold text-sos tracking-wider uppercase cursor-pointer" onClick={requestLocation}>
                    Enable Location
                 </span>
              </>
          ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-safe animate-pulse" />
                <span className="text-xs font-bold text-foreground tracking-wide uppercase">
                   {locationState.loading ? "Locating..." : "GPS Active"}
                </span>
              </>
          )}
        </motion.div>
      </div>

      {/* Floating SOS Button - Right Side */}
      <div className="absolute top-1/2 right-4 -translate-y-1/2 z-20">
         <button 
           onClick={triggerSOS}
           className="bg-sos text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:scale-[1.05] hover:shadow-xl active:scale-[0.95] transition-all duration-300 border-4 border-card/50 cursor-pointer"
         >
           <AlertTriangle className="w-6 h-6" />
         </button>
      </div>

      {/* Bottom Floating Status Card */}
      <div className="absolute bottom-[4.5rem] left-0 right-0 z-20 px-4 pb-4">
        {isTracking && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card shadow-lg border border-border/60 rounded-[1.25rem] p-5 w-full flex flex-col gap-4"
          >
             {/* Header */}
             <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                     <ShieldCheck className="w-4 h-4 text-primary" />
                     <h2 className="text-sm font-bold text-foreground">Tracking Active</h2>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">Shared with 3 trusted contacts</p>
                </div>
                <div className="bg-primary/10 text-primary font-bold text-xs px-3 py-1.5 rounded-full">
                  12 MIN ETA
                </div>
             </div>

             {/* Destination Row */}
             <div className="flex items-center gap-3 bg-muted/50 rounded-xl p-3 border border-border/40">
                <div className="p-2 bg-background rounded-full shadow-sm">
                   <Navigation2 className="w-4 h-4 text-foreground/80" />
                </div>
                <div>
                   <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Destination</p>
                   <p className="text-sm font-semibold text-foreground">Safe Home</p>
                </div>
             </div>

             <button 
               onClick={handleEndJourney}
               className="w-full py-3.5 bg-foreground text-background font-bold text-[15px] rounded-full hover:scale-[1.02] hover:shadow-md active:scale-[0.97] transition-all duration-300 shadow-sm cursor-pointer"
             >
                End Journey
             </button>
             
          </motion.div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default RiskMapPage;
