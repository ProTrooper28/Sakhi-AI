import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GuardianLink } from "@/lib/auth-types";
import type { LiveLocation } from "@/lib/safety";

// ── Leaflet markers ───────────────────────────────────────────────────────────

const createUserMarker = () =>
  L.divIcon({
    className: "custom-user-marker",
    html: `<div class="relative flex items-center justify-center w-full h-full">
            <div class="absolute w-12 h-12 rounded-full sakhi-marker-ping" style="background:rgba(212,69,92,0.35)"></div>
            <div class="relative w-5 h-5 rounded-full border-2 border-white z-10 shadow-md" style="background:#D4455C"></div>
           </div>`,
    iconSize: [64, 64],
    iconAnchor: [32, 32],
  });

const createEmergencyUserMarker = () =>
  L.divIcon({
    className: "custom-user-marker",
    html: `<div class="relative flex items-center justify-center w-full h-full">
            <div class="absolute w-16 h-16 rounded-full sakhi-marker-ping" style="background:rgba(220,38,38,0.55)"></div>
            <div class="absolute w-9 h-9 rounded-full sakhi-marker-ping-slow" style="background:rgba(220,38,38,0.35)"></div>
            <div class="relative w-6 h-6 rounded-full border-2 border-white z-10 shadow-lg" style="background:#EF4444"></div>
           </div>`,
    iconSize: [72, 72],
    iconAnchor: [36, 36],
  });

const createGuardianMarker = () =>
  L.divIcon({
    className: "custom-guardian-marker",
    html: `<div class="relative">
            <div class="w-9 h-9 bg-blue-500 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg></div>
           </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

const createPoiMarker = (emoji: string, color: string) =>
  L.divIcon({
    className: "custom-poi-marker",
    html: `<div class="w-8 h-8 rounded-full border-2 border-white shadow-md flex items-center justify-center text-sm" style="background:${color}">${emoji}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

// ── Calm family map (small preview, light tiles, markers update in place) ────

export const CalmFamilyMap = ({
  members,
  locations,
}: {
  members: GuardianLink[];
  locations: Record<string, LiveLocation>;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const guardianRef = useRef<L.Marker | null>(null);

  // Create once.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;
    const map = L.map(el, {
      center: [19.0596, 72.8295],
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png").addTo(map);
    guardianRef.current = L.marker([19.0596, 72.8295], { icon: createGuardianMarker() }).addTo(map);
    mapRef.current = map;
    requestAnimationFrame(() => map.invalidateSize());
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
      guardianRef.current = null;
    };
  }, []);

  // Move member markers as live locations stream in (no map re-creation).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const seen = new Set<string>();
    members.forEach((m, i) => {
      const loc = locations[m.user_id];
      const lat = loc?.latitude ?? 19.0596 + (i % 3) * 0.012 - 0.012;
      const lng = loc?.longitude ?? 72.8295 + Math.floor(i / 3) * 0.012 - 0.006;
      let marker = markersRef.current[m.user_id];
      if (!marker) {
        marker = L.marker([lat, lng], { icon: createUserMarker() }).addTo(map);
        markersRef.current[m.user_id] = marker;
      } else {
        marker.setLatLng([lat, lng]);
      }
      seen.add(m.user_id);
    });
    Object.keys(markersRef.current).forEach((id) => {
      if (!seen.has(id)) {
        markersRef.current[id]?.remove();
        delete markersRef.current[id];
      }
    });
  }, [members, locations]);

  return <div ref={containerRef} style={{ height: 220, width: "100%", borderRadius: 18 }} />;
};

// ── Emergency live map (large, dark, animated marker, auto-follow) ───────────

export const EmergencyMap = ({ userLoc }: { userLoc: { lat: number; lng: number } | null }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const guardianMarkerRef = useRef<L.Marker | null>(null);
  const routeRef = useRef<L.Polyline | null>(null);
  const poiRefs = useRef<L.Marker[]>([]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;
    const map = L.map(el, { zoomControl: false, attributionControl: false, zoom: 15 });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png").addTo(map);
    map.setView([19.0596, 72.8295], 15);
    mapRef.current = map;
    requestAnimationFrame(() => map.invalidateSize());
    return () => {
      map.remove();
      mapRef.current = null;
      userMarkerRef.current = null;
      guardianMarkerRef.current = null;
      routeRef.current = null;
      poiRefs.current = [];
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLoc) return;
    const { lat, lng } = userLoc;
    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker([lat, lng], { icon: createEmergencyUserMarker(), zIndexOffset: 1000 }).addTo(map);
    } else {
      userMarkerRef.current.setLatLng([lat, lng]);
    }
    const gLat = lat - 0.008;
    const gLng = lng + 0.006;
    if (!guardianMarkerRef.current) {
      guardianMarkerRef.current = L.marker([gLat, gLng], { icon: createGuardianMarker() }).addTo(map);
    } else {
      guardianMarkerRef.current.setLatLng([gLat, gLng]);
    }
    if (poiRefs.current.length === 0) {
      poiRefs.current = [
        L.marker([lat + 0.004, lng - 0.002], { icon: createPoiMarker("🚔", "#2563EB") }).addTo(map),
        L.marker([lat - 0.002, lng - 0.005], { icon: createPoiMarker("🏥", "#E74C3C") }).addTo(map),
      ];
    } else {
      poiRefs.current[0]?.setLatLng([lat + 0.004, lng - 0.002]);
      poiRefs.current[1]?.setLatLng([lat - 0.002, lng - 0.005]);
    }
    if (!routeRef.current) {
      routeRef.current = L.polyline([], { color: "#60A5FA", weight: 4, dashArray: "10, 10", opacity: 0.85 }).addTo(map);
    }
    routeRef.current.setLatLngs([
      [gLat, gLng],
      [gLat + 0.003, gLng - 0.002],
      [lat - 0.002, lng + 0.001],
      [lat, lng],
    ]);
    map.fitBounds(routeRef.current.getBounds(), { padding: [36, 36], animate: true });
    // React ONLY to real coordinate changes (the parent re-renders every
    // second for the timer — re-fitting on every render would fight the user).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoc?.lat, userLoc?.lng]);

  return <div ref={containerRef} className="absolute inset-0" />;
};
