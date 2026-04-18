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

const ORIGIN_POINT: [number, number] = [28.7120, 77.1140]; // Demo Center User

// Trusted Contacts Mock locations nearby
const TRUSTED_CONTACTS = [
  { id: "c1", lat: 28.7150, lng: 77.1120, name: "Priya", initial: "P", color: "bg-blue-500" },
  { id: "c2", lat: 28.7110, lng: 77.1180, name: "Mom", initial: "M", color: "bg-purple-500" },
  { id: "c3", lat: 28.7080, lng: 77.1135, name: "Dad", initial: "D", color: "bg-orange-500" },
];

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
        <div class="relative z-10 w-4 h-4 bg-primary border-[3px] border-white rounded-full shadow-lg"></div>
      </div>
    `,
    className: "",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

const RiskMapPage = () => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { triggerSOS } = useApp();
  
  const [isTracking, setIsTracking] = useState(true);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    // Initialize Map
    const map = L.map(containerRef.current, {
      center: ORIGIN_POINT,
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });

    // Subtly styled Light Theme base map (CartoDB Positron)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    if (isTracking) {
      // 1. Safe Zone Radius (Soft Green)
      L.circle(ORIGIN_POINT, {
        radius: 600, // 600 meters
        color: "transparent",
        fillColor: "hsl(142, 60%, 45%)",
        fillOpacity: 0.12,
        weight: 0,
      }).addTo(map);
      
      // Safe Zone Border
      L.circle(ORIGIN_POINT, {
        radius: 600,
        color: "hsl(142, 60%, 45%)",
        fillOpacity: 0,
        weight: 1.5,
        dashArray: "6, 6",
      }).addTo(map);

      // 2. User Location Marker
      L.marker(ORIGIN_POINT, { icon: makeUserIcon(), zIndexOffset: 1000 }).addTo(map);

      // 3. Trusted Contacts Avatars
      TRUSTED_CONTACTS.forEach((contact) => {
        L.marker([contact.lat, contact.lng], { icon: makeAvatarIcon(contact.initial, contact.color) }).addTo(map);
      });
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [isTracking]);

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
          <div className="w-2 h-2 rounded-full bg-safe animate-pulse" />
          <span className="text-xs font-bold text-foreground tracking-wide uppercase">GPS Active</span>
        </motion.div>
      </div>

      {/* Floating SOS Button - Right Side */}
      <div className="absolute top-1/2 right-4 -translate-y-1/2 z-20">
         <button 
           onClick={triggerSOS}
           className="bg-sos text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:bg-sos/90 active:scale-90 transition-all border-4 border-card/50"
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

             {/* Action Button */}
             <button 
               onClick={handleEndJourney}
               className="w-full py-3.5 bg-foreground text-background font-bold text-[15px] rounded-full active:scale-[0.98] transition-transform shadow-sm"
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
