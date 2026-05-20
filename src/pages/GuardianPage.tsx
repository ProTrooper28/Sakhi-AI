import { useState, useEffect, useRef } from "react";
import { MapPin, Shield, Phone, MessageSquare, AlertCircle, Clock, Navigation, CheckCircle2, MoreVertical, Menu, Search, Filter, RefreshCw, Radio, Users, AlertTriangle, ShieldAlert, BatteryMedium, Wifi, Watch, X } from "lucide-react";
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
  const { sosState, locationState, resolveSOS } = useApp();
  const [activeTab, setActiveTab] = useState<"active" | "requests">("active");
  const [selectedGuardian, setSelectedGuardian] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [jitter, setJitter] = useState({ lat: 0, lng: 0 });
  const [isResolved, setIsResolved] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showPoliceModal, setShowPoliceModal] = useState(false);
  const [showSafetyZones, setShowSafetyZones] = useState(true);
  const [activeRoute, setActiveRoute] = useState<L.Polyline | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [routeType, setRouteType] = useState<"fastest" | "safer">("safer");
  const [navTarget, setNavTarget] = useState<{ name: string; lat: number; lng: number; distance: string; type?: string } | null>(null);
  const activeRouteGroupRef = useRef<L.FeatureGroup | null>(null);

  const liveUpdates = ["Location refreshed", "Connection stable", "Updating...", "Signal strong"];
  const [liveStatusText, setLiveStatusText] = useState(liveUpdates[0]);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  const safetyZoneLayers = useRef<L.Circle[]>([]);
  const routeLayer = useRef<L.Polyline | null>(null);

  const userLat = sosState.active ? sosState.coords.lat : (locationState.coords?.lat || 28.5355);
  const userLng = sosState.active ? sosState.coords.lng : (locationState.coords?.lng || 77.3910);

  const guardians = [
    { id: 1, name: "Priya Sharma", role: "Primary Guardian", status: "Online", distance: "0.8 km", battery: "84%", lat: userLat + 0.005, lng: userLng - 0.005, color: "bg-teal-600", lastSeen: "Just now" },
    { id: 2, name: "Rahul Singh", role: "Emergency Contact", status: "En Route", distance: "1.2 km", battery: "92%", lat: userLat - 0.008, lng: userLng + 0.006, color: "bg-blue-600", lastSeen: "2m ago" },
    { id: 3, name: "Security Team", role: "Response Team", status: "Monitoring", distance: "2.5 km", battery: "100%", lat: userLat + 0.015, lng: userLng + 0.012, color: "bg-slate-900", lastSeen: "Live" }
  ];

  // Pulse marker for destination
  const createDestinationPulseMarker = (color: string, iconHtml: string) => L.divIcon({
    className: "custom-dest-pulse-marker",
    html: `<div class="relative flex items-center justify-center w-10 h-10">
             <div class="absolute w-12 h-12 ${color.split(' ')[0]}/40 rounded-full animate-ping pointer-events-none"></div>
             <div class="w-8 h-8 ${color} rounded-full border-2 border-white shadow-lg flex items-center justify-center">${iconHtml}</div>
           </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });

  const getRoutePoints = (targetName: string, type: "fastest" | "safer") => {
    if (targetName.includes("City Hospital")) {
      const dest = [userLat + 0.003, userLng + 0.004];
      if (type === "fastest") {
        return [
          L.latLng(userLat, userLng),
          L.latLng(userLat + 0.001, userLng + 0.0015),
          L.latLng(userLat + 0.002, userLng + 0.003),
          L.latLng(dest[0], dest[1])
        ];
      } else {
        return [
          L.latLng(userLat, userLng),
          L.latLng(userLat + 0.0005, userLng - 0.001),
          L.latLng(userLat + 0.002, userLng - 0.001),
          L.latLng(userLat + 0.0028, userLng + 0.001),
          L.latLng(dest[0], dest[1])
        ];
      }
    }
    
    if (targetName.includes("General Hospital")) {
      const dest = [userLat - 0.005, userLng - 0.002];
      if (type === "fastest") {
        return [
          L.latLng(userLat, userLng),
          L.latLng(userLat - 0.002, userLng - 0.001),
          L.latLng(dest[0], dest[1])
        ];
      } else {
        return [
          L.latLng(userLat, userLng),
          L.latLng(userLat - 0.001, userLng + 0.001),
          L.latLng(userLat - 0.003, userLng + 0.001),
          L.latLng(dest[0], dest[1])
        ];
      }
    }

    if (targetName.includes("Central Police")) {
      const dest = [userLat + 0.002, userLng - 0.006];
      if (type === "fastest") {
        return [
          L.latLng(userLat, userLng),
          L.latLng(userLat + 0.001, userLng - 0.003),
          L.latLng(dest[0], dest[1])
        ];
      } else {
        return [
          L.latLng(userLat, userLng),
          L.latLng(userLat + 0.0005, userLng - 0.002),
          L.latLng(userLat + 0.001, userLng - 0.004),
          L.latLng(dest[0], dest[1])
        ];
      }
    }

    if (targetName.includes("District Police")) {
      const dest = [userLat - 0.007, userLng + 0.003];
      if (type === "fastest") {
        return [
          L.latLng(userLat, userLng),
          L.latLng(userLat - 0.003, userLng + 0.001),
          L.latLng(dest[0], dest[1])
        ];
      } else {
        return [
          L.latLng(userLat, userLng),
          L.latLng(userLat - 0.002, userLng - 0.001),
          L.latLng(userLat - 0.005, userLng - 0.001),
          L.latLng(dest[0], dest[1])
        ];
      }
    }

    // Fallback: direct line to target
    const fallbackLat = navTarget?.lat || userLat + 0.005;
    const fallbackLng = navTarget?.lng || userLng - 0.005;
    
    if (type === "fastest") {
      return [
        L.latLng(userLat, userLng),
        L.latLng(fallbackLat, fallbackLng)
      ];
    } else {
      return [
        L.latLng(userLat, userLng),
        L.latLng(userLat + (fallbackLat - userLat) * 0.3, userLng - (fallbackLng - userLng) * 0.1),
        L.latLng(userLat + (fallbackLat - userLat) * 0.7, userLng + (fallbackLng - userLng) * 0.1),
        L.latLng(fallbackLat, fallbackLng)
      ];
    }
  };

  const animatePolylineDraw = (polyline: L.Polyline, fullLatLngs: L.LatLng[]) => {
    let currentStep = 0;
    const totalSteps = 15;
    polyline.setLatLngs([]);
    
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep > totalSteps) {
        clearInterval(interval);
        polyline.setLatLngs(fullLatLngs);
        return;
      }
      
      const progress = currentStep / totalSteps;
      const subLatLngs: L.LatLng[] = [];
      const segmentCount = fullLatLngs.length - 1;
      const limit = progress * segmentCount;
      
      for (let i = 0; i <= segmentCount; i++) {
        if (i <= limit) {
          subLatLngs.push(fullLatLngs[i]);
        } else if (i - 1 < limit) {
          const start = fullLatLngs[i - 1];
          const end = fullLatLngs[i];
          const segProgress = limit - (i - 1);
          const lat = start.lat + (end.lat - start.lat) * segProgress;
          const lng = start.lng + (end.lng - start.lng) * segProgress;
          subLatLngs.push(L.latLng(lat, lng));
          break;
        }
      }
      polyline.setLatLngs(subLatLngs);
    }, 25);
  };

  const getNavDetails = () => {
    if (!navTarget) return { name: "Help Point", fastestDist: "350m", fastestEta: "2 min", saferDist: "450m", saferEta: "3.5 min" };
    
    const name = navTarget.name;
    if (name.includes("City Hospital")) {
      return { name, fastestDist: "350m", fastestEta: "2 min", saferDist: "450m", saferEta: "3.5 min" };
    }
    if (name.includes("General Hospital")) {
      return { name, fastestDist: "550m", fastestEta: "3 min", saferDist: "700m", saferEta: "5 min" };
    }
    if (name.includes("Central Police")) {
      return { name, fastestDist: "400m", fastestEta: "2 min", saferDist: "520m", saferEta: "4 min" };
    }
    if (name.includes("District Police")) {
      return { name, fastestDist: "800m", fastestEta: "5 min", saferDist: "1.1 km", saferEta: "8 min" };
    }
    if (name.includes("Priya")) {
      return { name, fastestDist: "0.8 km", fastestEta: "5 min", saferDist: "1.0 km", saferEta: "7 min" };
    }
    if (name.includes("Rahul")) {
      return { name, fastestDist: "1.2 km", fastestEta: "8 min", saferDist: "1.5 km", saferEta: "11 min" };
    }
    if (name.includes("Security")) {
      return { name, fastestDist: "2.5 km", fastestEta: "15 min", saferDist: "3.1 km", saferEta: "20 min" };
    }
    
    return { name, fastestDist: navTarget.distance || "350m", fastestEta: "2 min", saferDist: "450m", saferEta: "3.5 min" };
  };

  const startNavigation = (name: string, lat: number, lng: number, distance: string, type?: string) => {
    setIsNavigating(true);
    setNavTarget({ name, lat, lng, distance, type });
    setRouteType("safer");
    handleAction(`Navigating to ${name}`);
  };

  const startNavigationRef = useRef(startNavigation);
  useEffect(() => {
    startNavigationRef.current = startNavigation;
  });

  const stopNavigation = () => {
    setIsNavigating(false);
    setNavTarget(null);
    if (activeRouteGroupRef.current && mapRef.current) {
      mapRef.current.removeLayer(activeRouteGroupRef.current);
      activeRouteGroupRef.current = null;
    }
    if (mapRef.current) {
      mapRef.current.setView([userLat, userLng], 14, { animate: true });
    }
    handleAction("Navigation ended");
  };

  const stopNavigationRef = useRef(stopNavigation);
  useEffect(() => {
    stopNavigationRef.current = stopNavigation;
  });

  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    // Clean up if already exists
    if (mapRef.current) {
      mapRef.current.remove();
    }

    const map = L.map(mapContainerRef.current, {
      center: [userLat, userLng],
      zoom: 14,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png").addTo(map);

    // User Marker
    const uMarker = L.marker([userLat, userLng], { icon: createUserMarker() }).addTo(map);
    userMarkerRef.current = uMarker;

    // Guardian Markers
    guardians.forEach(g => {
      const marker = L.marker([g.lat, g.lng], { icon: createGuardianMarker(g.color) }).addTo(map);
      marker.on('click', () => {
        setSelectedGuardian(g);
      });
    });

    // Custom Help Markers
    const createHelpMarker = (color: string, iconHtml: string) => L.divIcon({
      className: "custom-help-marker",
      html: `<div class="relative w-8 h-8 ${color} rounded-full border-2 border-white shadow-lg flex items-center justify-center">${iconHtml}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const hospitalIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>`;
    const policeIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;

    const helpPoints = [
      { name: "City Hospital", type: "hospital", lat: userLat + 0.003, lng: userLng + 0.004, distance: "350m", icon: hospitalIcon, color: "bg-emerald-500 text-white" },
      { name: "General Hospital", type: "hospital", lat: userLat - 0.005, lng: userLng - 0.002, distance: "550m", icon: hospitalIcon, color: "bg-emerald-500 text-white" },
      { name: "Central Police Station", type: "police", lat: userLat + 0.002, lng: userLng - 0.006, distance: "400m", icon: policeIcon, color: "bg-blue-500 text-white" },
      { name: "District Police Station", type: "police", lat: userLat - 0.007, lng: userLng + 0.003, distance: "800m", icon: policeIcon, color: "bg-blue-500 text-white" }
    ];

    helpPoints.forEach(hp => {
      const marker = L.marker([hp.lat, hp.lng], { icon: createHelpMarker(hp.color, hp.icon) }).addTo(map);
      marker.bindPopup(`
        <div class="text-center font-sans p-1">
          <div class="font-black text-sm text-slate-800">${hp.name}</div>
          <div class="text-xs text-slate-500 font-bold mb-2">${hp.distance} away</div>
          <button 
            class="bg-slate-900 text-white text-xs font-black px-3 py-1.5 rounded-xl w-full shadow-md hover:bg-slate-800 transition-all duration-150 active:scale-95 cursor-pointer navigate-btn"
            data-hp-name="${hp.name}"
            data-hp-lat="${hp.lat}"
            data-hp-lng="${hp.lng}"
            data-hp-distance="${hp.distance}"
            data-hp-type="${hp.type}"
          >
            Navigate
          </button>
        </div>
      `);
    });

    map.on("popupopen", (e) => {
      const popupElement = e.popup.getElement();
      if (!popupElement) return;

      const navBtn = popupElement.querySelector(".navigate-btn") as HTMLButtonElement;
      if (navBtn) {
        navBtn.addEventListener("click", () => {
          // Visual feedback on click
          navBtn.classList.add("clicked");
          navBtn.innerText = "Connecting...";

          const hpName = navBtn.getAttribute("data-hp-name") || "Help Point";
          const hpLat = parseFloat(navBtn.getAttribute("data-hp-lat") || "0");
          const hpLng = parseFloat(navBtn.getAttribute("data-hp-lng") || "0");
          const hpDist = navBtn.getAttribute("data-hp-distance") || "350m";
          const hpType = navBtn.getAttribute("data-hp-type") || "hospital";

          setTimeout(() => {
            map.closePopup();
            startNavigationRef.current(hpName, hpLat, hpLng, hpDist, hpType);
          }, 350);
        });
      }
    });

    // Add Safety Zones
    const zones = [
      { lat: userLat + 0.002, lng: userLng - 0.002, radius: 400, color: "#10b981", fillColor: "#10b981", fillOpacity: 0.15 }, // Green (Safe)
      { lat: userLat - 0.004, lng: userLng + 0.003, radius: 600, color: "#eab308", fillColor: "#eab308", fillOpacity: 0.15 }, // Yellow (Moderate)
      { lat: userLat + 0.005, lng: userLng + 0.005, radius: 500, color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.15 }  // Red (High Risk)
    ];

    zones.forEach(z => {
      const circle = L.circle([z.lat, z.lng], {
        radius: z.radius,
        color: z.color,
        fillColor: z.fillColor,
        fillOpacity: z.fillOpacity,
        weight: 1
      });
      safetyZoneLayers.current.push(circle);
    });

    if (showSafetyZones) {
      safetyZoneLayers.current.forEach(c => c.addTo(map));
    }

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        safetyZoneLayers.current = [];
      }
    };
  }, []); // Run once on mount

  // Toggle Safety Zones
  useEffect(() => {
    if (!mapRef.current) return;
    if (showSafetyZones) {
      safetyZoneLayers.current.forEach(c => {
        if (!mapRef.current?.hasLayer(c)) c.addTo(mapRef.current!);
      });
    } else {
      safetyZoneLayers.current.forEach(c => c.remove());
    }
  }, [showSafetyZones]);

  // Handle Guardian Selection Routing
  useEffect(() => {
    if (activeRoute && mapRef.current) {
      mapRef.current.removeLayer(activeRoute);
      setActiveRoute(null);
    }
    
    // Only draw simple line if we are not in active navigation mode
    if (selectedGuardian && mapRef.current && userMarkerRef.current && !isNavigating) {
      const userLatLng = userMarkerRef.current.getLatLng();
      const guardianLatLng = L.latLng(selectedGuardian.lat, selectedGuardian.lng);

      const route = L.polyline([userLatLng, guardianLatLng], {
        color: '#3b82f6',
        weight: 4,
        dashArray: '10, 10',
        opacity: 0.8
      }).addTo(mapRef.current);
      
    }
  }, [selectedGuardian, sosState.active]);

  // Sync navigation route on map
  useEffect(() => {
    if (!mapRef.current) return;

    if (activeRouteGroupRef.current) {
      mapRef.current.removeLayer(activeRouteGroupRef.current);
      activeRouteGroupRef.current = null;
    }

    if (isNavigating && navTarget) {
      const points = getRoutePoints(navTarget.name, routeType);
      const color = routeType === "safer" ? "#10b981" : "#3b82f6";
      
      const group = L.featureGroup().addTo(mapRef.current);
      activeRouteGroupRef.current = group;

      // 1. Thick track background
      const polyBg = L.polyline(points, {
        color: color,
        weight: 8,
        opacity: 0.3
      }).addTo(group);

      // 2. Glowing animated foreground
      const polyFg = L.polyline(points, {
        color: color,
        weight: 4,
        opacity: 0.9,
        className: "animated-route-line"
      }).addTo(group);

      // Animate progressive drawing
      animatePolylineDraw(polyBg, points);
      animatePolylineDraw(polyFg, points);

      // 3. Pulsing destination marker
      const hospitalIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>`;
      const policeIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
      const iconHtml = navTarget.name.includes("Hospital") ? hospitalIcon : policeIcon;
      const colorClass = routeType === "safer" ? "bg-emerald-500 text-white" : "bg-blue-500 text-white";

      L.marker([navTarget.lat, navTarget.lng], {
        icon: createDestinationPulseMarker(colorClass, iconHtml)
      }).addTo(group);

      // Fit map bounds to show route
      const bounds = L.latLngBounds(points);
      mapRef.current.fitBounds(bounds, { padding: [80, 80], maxZoom: 16 });
    }

    return () => {
      if (activeRouteGroupRef.current && mapRef.current) {
        mapRef.current.removeLayer(activeRouteGroupRef.current);
        activeRouteGroupRef.current = null;
      }
    };
  }, [isNavigating, navTarget, routeType]);

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
    <div className={`flex flex-col md:flex-row h-screen w-screen overflow-hidden ${sosState.active ? "bg-red-50" : "bg-[#fcfcfd]"}`}>
      <style>{`
        @keyframes routeDash {
          to {
            stroke-dashoffset: -20;
          }
        }
        .animated-route-line {
          stroke-dasharray: 10, 10;
          animation: routeDash 1.2s linear infinite;
        }
        .navigate-btn {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .navigate-btn:active {
          transform: scale(0.92) !important;
          filter: brightness(0.9);
        }
        .navigate-btn.clicked {
          background-color: #10b981 !important;
          color: white !important;
          transform: scale(0.9) !important;
          pointer-events: none !important;
        }
      `}</style>
        
        {/* ── Left Sidebar (List) ── */}
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className={`bg-white flex flex-col z-30 shadow-2xl transition-all duration-300 ${
            sosState.active 
              ? "fixed bottom-0 left-0 right-0 rounded-t-[32px] md:rounded-none max-h-[60vh] md:max-h-none md:relative md:w-[420px] md:h-full border-t md:border-t-0 md:border-r border-slate-100" 
              : "w-full h-[50vh] md:h-full md:w-[420px] border-b md:border-b-0 md:border-r border-slate-100 relative"
          }`}
        >
          {/* Mobile Bottom Sheet Handle */}
          {sosState.active && (
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mt-4 mb-2 md:hidden shrink-0" />
          )}
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

          {/* Tabs - Hidden if SOS is active */}
          {!sosState.active && (
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
                                 <div className={`text-white p-5 rounded-3xl border shadow-md mb-6 relative overflow-hidden transition-colors duration-500 ${isResolved ? "bg-emerald-600 border-emerald-500" : "bg-red-600 border-red-500"}`}>
                      <div className="absolute top-0 left-0 w-full h-1 bg-white/20" />
                      <div className="flex items-center gap-3 mb-2">
                        {!isResolved && <div className="w-2 h-2 bg-white rounded-full animate-pulse" />}
                        {isResolved && <CheckCircle2 className="w-5 h-5 text-white" />}
                        <h2 className="font-black text-[15px] tracking-wide uppercase">
                          {isResolved ? "Situation Resolved" : "Emergency Alert"}
                        </h2>
                      </div>
                      
                      {/* Critical Info Panel */}
                      <div className="bg-black/20 p-4 rounded-2xl mb-4 space-y-3">
                        <div className="flex justify-between items-center border-b border-white/10 pb-2">
                          <span className="text-xs font-bold text-white/70 uppercase tracking-wider">User</span>
                          <span className="text-sm font-black tracking-wide">{sosState.userName || "Taranpreet Singh"}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/10 pb-2">
                          <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Status</span>
                          <span className={`text-sm font-black tracking-wide ${isResolved ? "text-emerald-300" : "text-red-200"}`}>
                            {isResolved ? "Safe" : "In Danger"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pb-1">
                          <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Location</span>
                          <span className="text-sm font-bold truncate max-w-[140px]">{sosState.location || locationState.address || "Fetching..."}</span>
                        </div>
                      </div>
                      
                      {!isResolved && (
                        <div className="flex items-center justify-between bg-black/20 p-3 rounded-xl mb-2">
                          <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Time Elapsed</span>
                          <motion.span key={timeElapsed} initial={{ scale: 0.95 }} animate={{ scale: 1 }} transition={{ duration: 0.2 }} className="text-xl font-black font-mono tracking-wider inline-block origin-right">{timeElapsed}</motion.span>
                        </div>
                      )}
                    </div>

                    {!isResolved && (
                      <>
                        <div className="mb-4 px-2">
                          <p className="text-xs font-bold text-slate-500 mb-2">You can call the user or reach nearby help</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{ animationDuration: "1s" }} />
                              <span className="text-[11px] font-black uppercase tracking-widest text-slate-900">LIVE</span>
                            </div>
                            <AnimatePresence mode="wait">
                              <motion.span key={liveStatusText} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[11px] font-bold text-slate-500">
                                {liveStatusText}
                              </motion.span>
                            </AnimatePresence>
                          </div>
                        </div>

                        <div className="space-y-4 mb-8 pl-4 border-l-2 border-slate-200 ml-2">
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative">
                            <div className="absolute -left-[23px] top-1 w-3 h-3 bg-red-500 rounded-full ring-4 ring-white" />
                            <span className="text-sm font-bold text-slate-900 block leading-none">Alert received</span>
                            <span className="text-[10px] text-slate-500 font-bold uppercase mt-1 block">✔ Verified</span>
                          </motion.div>
                          
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="relative">
                            <div className="absolute -left-[23px] top-1 w-3 h-3 bg-teal-500 rounded-full ring-4 ring-white" />
                            <span className="text-sm font-bold text-slate-900 block leading-none">Location tracking active</span>
                            <span className="text-[10px] text-teal-600 font-bold uppercase mt-1 block">Just now</span>
                          </motion.div>

                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="relative bg-slate-50 p-3 rounded-xl border border-slate-100 mt-3">
                            <div className="absolute -left-[35px] top-4 w-3 h-3 bg-blue-500 rounded-full ring-4 ring-white" />
                            <div className="flex items-center gap-2 mb-2">
                               <div className="flex items-end gap-0.5 h-4">
                                 <motion.div animate={{ height: ["4px", "12px", "4px"] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1 bg-blue-500 rounded-full" />
                                 <motion.div animate={{ height: ["8px", "16px", "8px"] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1 bg-blue-500 rounded-full" />
                                 <motion.div animate={{ height: ["12px", "6px", "12px"] }} transition={{ repeat: Infinity, duration: 1.0 }} className="w-1 bg-blue-500 rounded-full" />
                                 <motion.div animate={{ height: ["6px", "14px", "6px"] }} transition={{ repeat: Infinity, duration: 0.7 }} className="w-1 bg-blue-500 rounded-full" />
                               </div>
                               <span className="text-sm font-bold text-slate-900 leading-none">Live audio streaming...</span>
                            </div>
                            <span className="text-[10px] text-blue-600 font-bold uppercase mt-1 block">2s ago</span>
                          </motion.div>
                        </div>

                        <div className="space-y-3 pb-6">
                          <motion.button onClick={() => setShowCallModal(true)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} className="w-full bg-slate-900 text-white font-black text-sm py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:shadow-[0_0_20px_rgba(15,23,42,0.4)] transition-all cursor-pointer">
                            <Phone className="w-4 h-4" /> Call User
                          </motion.button>
                          <motion.button onClick={() => { if(mapRef.current) mapRef.current.setView([userMarkerRef.current?.getLatLng().lat || sosState.coords.lat, userMarkerRef.current?.getLatLng().lng || sosState.coords.lng], 17, { animate: true, duration: 1 }); handleAction("Zoomed to Live Location"); }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} className="w-full bg-blue-600 text-white font-black text-sm py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all cursor-pointer">
                            <Navigation className="w-4 h-4" /> View Live Location
                          </motion.button>
                          <motion.button onClick={() => setShowPoliceModal(true)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} className="w-full bg-red-100 text-red-700 font-black text-sm py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-red-200 transition-colors cursor-pointer">
                            <Shield className="w-4 h-4" /> Notify Authorities
                          </motion.button>

                          <motion.button onClick={() => startNavigation("User's Emergency Location", userMarkerRef.current?.getLatLng().lat || sosState.coords.lat, userMarkerRef.current?.getLatLng().lng || sosState.coords.lng, "1.2 km")} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} className="w-full bg-emerald-50 text-emerald-600 font-black text-sm py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer mt-2">
                            <MapPin className="w-4 h-4" /> Navigate Safely
                          </motion.button>
                          
                          <motion.button onClick={() => { setIsResolved(true); resolveSOS(); handleAction("Situation marked as safe"); }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} className="w-full bg-emerald-100 text-emerald-700 font-black text-sm py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-emerald-200 transition-colors cursor-pointer mt-4">
                            <CheckCircle2 className="w-4 h-4" /> Mark as Safe
                          </motion.button>
                        </div>
                      </>
                    )}

                 </motion.div>
               ) : activeTab === "active" ? (
                  <div className="space-y-4">
                    {/* User & Device Status Dashboard */}
                    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-emerald-400" />
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <h3 className="font-black text-sm text-slate-900 uppercase tracking-wide">User is Safe</h3>
                        <span className="ml-auto text-[10px] text-slate-400 font-bold uppercase">Last updated: just now</span>
                      </div>
                      <p className="text-xs font-bold text-slate-500 mb-4">User moving through safe area. All systems normal.</p>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-white p-2 rounded-xl text-center shadow-sm border border-slate-100">
                          <BatteryMedium className="w-3.5 h-3.5 text-teal-500 mx-auto mb-1" />
                          <p className="text-[10px] font-black text-slate-900">72%</p>
                          <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Phone</p>
                        </div>
                        <div className="bg-white p-2 rounded-xl text-center shadow-sm border border-slate-100">
                          <Wifi className="w-3.5 h-3.5 text-blue-500 mx-auto mb-1" />
                          <p className="text-[10px] font-black text-slate-900">Strong</p>
                          <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Network</p>
                        </div>
                        <div className="bg-white p-2 rounded-xl text-center shadow-sm border border-slate-100">
                          <Watch className="w-3.5 h-3.5 text-indigo-500 mx-auto mb-1" />
                          <p className="text-[10px] font-black text-slate-900">Active</p>
                          <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Wearable</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between px-2 pt-2 pb-1 border-b border-slate-50">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Active Guardians</h4>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={showSafetyZones} onChange={(e) => setShowSafetyZones(e.target.checked)} className="sr-only peer" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Zones</span>
                        <div className="w-7 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-teal-500 relative"></div>
                      </label>
                    </div>

                    {guardians.map((g, i) => (
                      <motion.div 
                        key={g.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={`p-4 md:p-5 rounded-[24px] border transition-all ${selectedGuardian?.id === g.id ? "bg-slate-50 border-slate-200 shadow-sm" : "bg-white border-slate-50"}`}
                      >
                        <div 
                          className="flex items-center gap-4 md:gap-5 cursor-pointer"
                          onClick={() => {
                            setSelectedGuardian(selectedGuardian?.id === g.id ? null : g);
                            if (mapRef.current && selectedGuardian?.id !== g.id) {
                              const userLatLng = userMarkerRef.current?.getLatLng();
                              const guardianLatLng = L.latLng(g.lat, g.lng);
                              if(userLatLng) {
                                mapRef.current.fitBounds(L.latLngBounds(userLatLng, guardianLatLng), { padding: [50, 50], maxZoom: 15 });
                              }
                            }
                          }}
                        >
                           <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl ${g.color} flex items-center justify-center text-white font-black text-lg md:text-xl shadow-lg`}>
                             {g.name[0]}
                           </div>
                           <div className="flex-1">
                             <div className="flex items-center justify-between mb-1">
                               <h3 className="font-black text-slate-900 text-[14px] md:text-[15px]">{g.name}</h3>
                               <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-full border border-slate-100">
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

                        {/* Quick Actions (Prevention) */}
                        <AnimatePresence>
                          {selectedGuardian?.id === g.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="flex gap-2 pt-4 mt-4 border-t border-slate-200">
                                <button onClick={() => handleAction(`Checking on ${g.name}...`)} className="flex-1 py-2 bg-slate-900 text-white font-bold text-[10px] rounded-xl flex items-center justify-center gap-1.5 hover:bg-slate-800 transition-colors">
                                  <Shield className="w-3 h-3" /> Check User
                                </button>
                                <button onClick={() => handleAction("Location Shared")} className="flex-1 py-2 bg-blue-100 text-blue-700 font-bold text-[10px] rounded-xl flex items-center justify-center gap-1.5 hover:bg-blue-200 transition-colors">
                                  <Navigation className="w-3 h-3" /> Share Loc
                                </button>
                                <button onClick={() => handleAction("Viewing Safe Route")} className="flex-1 py-2 bg-emerald-100 text-emerald-700 font-bold text-[10px] rounded-xl flex items-center justify-center gap-1.5 hover:bg-emerald-200 transition-colors">
                                  <MapPin className="w-3 h-3" /> View Route
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </div>
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
        <div className={`relative bg-slate-100 overflow-hidden transition-all duration-300 ${
          sosState.active
            ? "w-full h-full absolute inset-0 md:relative md:flex-1"
            : "flex-1 min-h-[50vh] md:min-h-0"
        }`}>
           <div ref={mapContainerRef} className="w-full h-full relative z-0" />
           <div className="absolute inset-0 pointer-events-none z-10 shadow-[inset_0_0_100px_rgba(0,0,0,0.1)]" />

           {/* Floating Map Controls */}
           <div className="absolute top-6 right-6 z-[400] flex flex-col gap-3">
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-2xl border border-slate-100 shadow-xl flex items-center justify-center text-slate-900"><RefreshCw className="w-5 h-5" /></motion.button>
              <div className="relative">
                {sosState.active && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />}
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className={`w-10 h-10 md:w-12 md:h-12 ${sosState.active ? "bg-red-500 text-white" : "bg-white text-slate-900"} rounded-2xl border border-slate-100 shadow-xl flex items-center justify-center`}><Radio className="w-5 h-5" /></motion.button>
              </div>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="w-10 h-10 md:w-12 md:h-12 bg-slate-900 rounded-2xl border border-white shadow-xl flex items-center justify-center text-white"><Shield className="w-5 h-5" /></motion.button>
           </div>

           {/* Top Floating Live Status (Always active) */}
           <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[400] flex flex-col items-center gap-2 w-full max-w-[90%] sm:max-w-md">
             <motion.div 
               initial={{ y: -50, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               className={`px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-full shadow-2xl flex items-center gap-2 sm:gap-3 border-2 ${sosState.active ? "bg-white border-red-100" : "bg-slate-900 border-slate-700"}`}
             >
               <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full animate-pulse ${sosState.active ? "bg-red-600" : "bg-emerald-400"}`} />
               <span className={`font-black text-[10px] sm:text-sm tracking-widest uppercase ${sosState.active ? "text-slate-900" : "text-white"}`}>
                 {sosState.active ? "LIVE EMERGENCY TRACKING" : "LIVE TRACKING ACTIVE"}
               </span>
             </motion.div>

             {!sosState.active && (
               <motion.div 
                 initial={{ opacity: 0, y: -10 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.2 }}
                 className="bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full shadow-lg border border-slate-200 flex items-center gap-2"
               >
                 <Shield className="w-3.5 h-3.5 text-blue-600" />
                 <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Nearest help: 350m away</span>
               </motion.div>
             )}
           </div>

           {/* Active Route Navigation Panel Overlay */}
           <AnimatePresence>
             {isNavigating && (
               <motion.div 
                 initial={{ opacity: 0, y: -20 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -20 }}
                 className="absolute top-28 left-1/2 -translate-x-1/2 z-[400] flex flex-col items-center gap-2 w-full max-w-[340px] px-4"
               >
                 <div className="bg-white/95 backdrop-blur-xl p-5 rounded-3xl shadow-2xl border border-slate-100 w-full flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Navigation className="w-5 h-5 text-emerald-500 animate-pulse" />
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Navigation Active</p>
                          <h3 className="font-black text-slate-900 text-sm tracking-tight truncate max-w-[200px]" style={{ fontFamily: "Manrope, sans-serif" }}>
                            {getNavDetails().name}
                          </h3>
                        </div>
                      </div>
                      <button onClick={stopNavigation} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="flex gap-2 mb-4 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                       <button onClick={() => setRouteType("safer")} className={`flex-1 py-2 rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-wider transition-all ${routeType === "safer" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30" : "bg-transparent text-slate-400 hover:text-slate-600"}`}>
                         Safer Route
                       </button>
                       <button onClick={() => setRouteType("fastest")} className={`flex-1 py-2 rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-wider transition-all ${routeType === "fastest" ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "bg-transparent text-slate-400 hover:text-slate-600"}`}>
                         Fastest
                       </button>
                    </div>

                    <div className="flex items-center justify-between px-2 mb-2">
                       <div>
                         <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Est. Time</p>
                         <p className="text-2xl font-black text-slate-900 leading-none">
                           {routeType === "safer" ? getNavDetails().saferEta : getNavDetails().fastestEta}
                         </p>
                       </div>
                       <div className="text-right">
                         <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Distance</p>
                         <p className="text-2xl font-black text-slate-900 leading-none">
                           {routeType === "safer" ? getNavDetails().saferDist : getNavDetails().fastestDist}
                         </p>
                       </div>
                    </div>
                    
                    <AnimatePresence mode="wait">
                      {routeType === "safer" ? (
                        <motion.div 
                          key="safer"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 bg-emerald-50/80 px-3 py-2.5 rounded-xl flex items-start gap-2 border border-emerald-100 overflow-hidden"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-[11px] font-bold text-emerald-700 leading-tight">Safer route suggested. This path avoids marked high-risk zones.</span>
                        </motion.div>
                      ) : (
                        <motion.div 
                          key="fastest"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 bg-blue-50/80 px-3 py-2.5 rounded-xl flex items-start gap-2 border border-blue-100 overflow-hidden"
                        >
                          <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                          <span className="text-[11px] font-bold text-blue-700 leading-tight">Fastest route selected. Please remain vigilant.</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.button 
                      whileHover={{ scale: 1.02 }} 
                      whileTap={{ scale: 0.98 }}
                      onClick={stopNavigation}
                      className="w-full bg-red-500 hover:bg-red-600 active:scale-95 text-white font-black text-xs py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-red-100 transition-all mt-4 cursor-pointer"
                    >
                      <X className="w-4 h-4" /> End Navigation
                    </motion.button>
                 </div>
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
                 className="absolute bottom-32 left-1/2 -translate-x-1/2 z-[500] bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl font-black text-sm"
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

        {/* ── Call Modal Overlay ── */}
        <AnimatePresence>
          {showCallModal && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }} 
                animate={{ scale: 1, y: 0 }} 
                exit={{ scale: 0.9, y: 20 }} 
                className="bg-white w-full max-w-sm rounded-[32px] p-8 flex flex-col items-center shadow-2xl relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-white pointer-events-none" />
                <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6 relative z-10">
                  <Phone className="w-10 h-10 text-blue-600 animate-pulse" />
                </motion.div>
                <h3 className="text-xl font-black text-slate-900 relative z-10 mb-1">Calling {sosState.userName || "User"}...</h3>
                <p className="text-sm font-bold text-slate-400 relative z-10 mb-8">Ringing</p>
                <motion.button onClick={() => setShowCallModal(false)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-[0_10px_25px_rgba(239,68,68,0.4)] relative z-10">
                   <Phone className="w-6 h-6 text-white rotate-[135deg]" />
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Police Modal Overlay ── */}
        <AnimatePresence>
          {showPoliceModal && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }} 
                animate={{ scale: 1, y: 0 }} 
                exit={{ scale: 0.9, y: 20 }} 
                className="bg-white w-full max-w-sm rounded-[32px] p-8 flex flex-col items-center shadow-2xl text-center relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-red-50 to-white pointer-events-none" />
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4 relative z-10">
                  <ShieldAlert className="w-10 h-10 text-red-600" />
                </div>
                <h3 className="text-xl font-black text-slate-900 relative z-10 mb-2">Connecting to Emergency Services</h3>
                <p className="text-sm font-bold text-slate-500 relative z-10 mb-8">Your local police station is being notified with the live location and recording feed.</p>
                
                <div className="w-full flex gap-3 relative z-10">
                  <motion.button onClick={() => setShowPoliceModal(false)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl">
                    Cancel
                  </motion.button>
                  <motion.button onClick={() => { setShowPoliceModal(false); handleAction("Authorities Dispatched"); }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 py-4 bg-red-600 text-white font-black rounded-2xl shadow-[0_10px_25px_rgba(239,68,68,0.4)]">
                    Confirm
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

    </div>
  );
};

export default GuardianPage;
