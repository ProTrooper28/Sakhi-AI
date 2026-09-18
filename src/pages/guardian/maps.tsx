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
  // Guards the one-time auto-framing so we never fight the user's own pan/zoom.
  const hasFitRef = useRef(false);

  // Create once.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;
    const map = L.map(el, {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: false,
      attributionControl: false,
    });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
    mapRef.current = map;
    requestAnimationFrame(() => map.invalidateSize());
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
      hasFitRef.current = false;
    };
  }, []);

  // Move member markers as live locations stream in (no map re-creation).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const seen = new Set<string>();
    const points: [number, number][] = [];
    members.forEach((m) => {
      const loc = locations[m.user_id];
      if (!loc) return; // only real live positions — never fake markers
      points.push([loc.latitude, loc.longitude]);
      let marker = markersRef.current[m.user_id];
      if (!marker) {
        marker = L.marker([loc.latitude, loc.longitude], { icon: createUserMarker() }).addTo(map);
        markersRef.current[m.user_id] = marker;
      } else {
        marker.setLatLng([loc.latitude, loc.longitude]);
      }
      seen.add(m.user_id);
    });
    Object.keys(markersRef.current).forEach((id) => {
      if (!seen.has(id)) {
        markersRef.current[id]?.remove();
        delete markersRef.current[id];
      }
    });
    // As soon as the first real position(s) arrive, frame the map on them so
    // the tracked person is visible immediately (no hardcoded-city default).
    if (points.length && !hasFitRef.current) {
      hasFitRef.current = true;
      if (points.length === 1) {
        map.setView(points[0], 13, { animate: true });
      } else {
        map.fitBounds(L.latLngBounds(points).pad(0.25), { animate: true });
      }
    }
  }, [members, locations]);

  return <div ref={containerRef} style={{ height: 220, width: "100%", borderRadius: 18 }} />;
};

// ── Emergency live map (large, dark, animated marker, auto-follow) ───────────

export const EmergencyMap = ({ userLoc }: { userLoc: { lat: number; lng: number } | null }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;
    const map = L.map(el, { zoomControl: false, attributionControl: false, zoom: 15 });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      className: "map-tiles-dark",
    }).addTo(map);
    map.setView([19.0596, 72.8295], 15);
    mapRef.current = map;
    requestAnimationFrame(() => map.invalidateSize());
    return () => {
      map.remove();
      mapRef.current = null;
      userMarkerRef.current = null;
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
    map.panTo([lat, lng], { animate: true });
    // React ONLY to real coordinate changes (the parent re-renders every
    // second for the timer — panning on every render would fight the user).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoc?.lat, userLoc?.lng]);

  return <div ref={containerRef} className="absolute inset-0" />;
};
