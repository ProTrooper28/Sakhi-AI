import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { TrailPoint } from "./helpers";
import { SAFETY_ZONE_COLORS, type SafetyFeatureCollection } from "./helpers";

// ── Marker icons ─────────────────────────────────────────────────────────────

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Profile-style avatar marker (initials on a gradient ring) — Find My look. */
const createAvatarIcon = (initials: string, color: string, sos: boolean) =>
  L.divIcon({
    className: "",
    html: `
      <div class="relative flex items-center justify-center" style="width:${sos ? 58 : 48}px;height:${sos ? 58 : 48}px">
        ${sos ? `<div class="absolute inset-0 rounded-full sakhi-marker-ping" style="background:rgba(220,38,38,0.5)"></div>` : ""}
        <div class="absolute inset-0 rounded-full" style="background:rgba(255,255,255,0.9);box-shadow:0 4px 14px rgba(60,30,20,0.35)"></div>
        <div class="absolute inset-[3px] rounded-full flex items-center justify-center text-white font-black"
             style="background:linear-gradient(135deg, ${color}, ${color}cc);font-family:'Nunito',sans-serif;font-size:${sos ? 16 : 14}px;border:2px solid white">
          ${escapeHtml(initials)}
        </div>
      </div>`,
    iconSize: sos ? [58, 58] : [48, 48],
    iconAnchor: sos ? [29, 29] : [24, 24],
  });

/** Destination pin marker. */
const createDestIcon = () =>
  L.divIcon({
    className: "",
    html: `
      <div class="relative flex items-center justify-center" style="width:34px;height:34px">
        <div class="absolute inset-0 rounded-full" style="background:rgba(37,99,235,0.25)"></div>
        <div class="relative w-4 h-4 rounded-full" style="background:#2563EB;border:2.5px solid white;box-shadow:0 3px 10px rgba(30,64,175,0.45)"></div>
        <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0" style="border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid #2563EB"></div>
      </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 30],
  });

/** Plain dot marker with optional SOS pulse. */
const createDotIcon = (sos: boolean) =>
  L.divIcon({
    className: "",
    html: `
      <div class="relative flex items-center justify-center" style="width:${sos ? 56 : 40}px;height:${sos ? 56 : 40}px">
        ${sos ? `<div class="absolute inset-0 rounded-full sakhi-marker-ping" style="background:rgba(220,38,38,0.55)"></div>` : ""}
        <div class="relative rounded-full" style="width:${sos ? 18 : 14}px;height:${sos ? 18 : 14}px;background:${sos ? "#DC2626" : "#D4455C"};border:2.5px solid white;box-shadow:0 3px 10px rgba(60,30,20,0.4)"></div>
      </div>`,
    iconSize: sos ? [56, 56] : [40, 40],
    iconAnchor: sos ? [28, 28] : [20, 20],
  });

// ── Tiles ────────────────────────────────────────────────────────────────────

const LIGHT_TILES = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

// ── Marker animation (smooth glide between realtime updates) ────────────────

const animateMarker = (marker: L.Marker, from: [number, number], to: [number, number], dur = 650) => {
  const start = performance.now();
  const step = (t: number) => {
    const p = Math.min(1, (t - start) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    marker.setLatLng([from[0] + (to[0] - from[0]) * eased, from[1] + (to[1] - from[1]) * eased]);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

/**
 * Premium live-tracking map:
 *   • user marker (avatar or dot) with a smooth animated glide between
 *     realtime fixes,
 *   • accuracy radius circle,
 *   • recent movement trail polyline,
 *   • optional SOS pulse + red highlight,
 *   • auto-follow of the latest position.
 * The map is created once and updated in place — no re-creation per update.
 */
export const LiveTrackingMap = ({
  trail,
  accuracy,
  avatar,
  sos = false,
  follow = true,
  tileUrl,
  safetyGeoJson,
  routes,
  destination,
  onMapClick,
  className = "absolute inset-0",
  onReady,
}: {
  trail: TrailPoint[];
  accuracy?: number | null;
  avatar?: { initials: string; color: string } | null;
  sos?: boolean;
  follow?: boolean;
  /** Swaps the base tile layer (e.g. light ↔ satellite). */
  tileUrl?: string;
  /** Semi-transparent safety overlay (GeoJSON FeatureCollection). */
  safetyGeoJson?: SafetyFeatureCollection | null;
  /** Route polylines: selected route full-color, alternatives dashed gray. */
  routes?: { points: [number, number][]; color: string; dashed?: boolean }[];
  /** Destination pin. */
  destination?: { lat: number; lng: number } | null;
  /** Map click handler (tap-to-set destination). */
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
  onReady?: (map: L.Map) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const accuracyRef = useRef<L.Circle | null>(null);
  const trailRef = useRef<L.Polyline | null>(null);
  const destRef = useRef<L.Marker | null>(null);
  const zonesRef = useRef<L.LayerGroup | null>(null);
  const routesRef = useRef<L.LayerGroup | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const lastLatLngRef = useRef<[number, number] | null>(null);

  // Create once (tile layer added by the tileUrl effect below). The map is
  // ALWAYS created with an initial view — a Leaflet map without a view has
  // no bounds, and adding a Circle/Polyline to it crashes inside Leaflet
  // (`getBounds().intersects(...)` on undefined), which blanked the page in
  // production. Start at the first known trail point, else a sane default;
  // the live fix pans to the real position as soon as it arrives.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;
    const first = trail[0];
    const map = L.map(el, {
      zoomControl: false,
      attributionControl: false,
      zoom: 15,
      center: first ? [first.lat, first.lng] : [19.0596, 72.8295],
    });
    mapRef.current = map;
    onReady?.(map);
    const raf = requestAnimationFrame(() => map.invalidateSize());
    return () => {
      cancelAnimationFrame(raf);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      accuracyRef.current = null;
      trailRef.current = null;
      destRef.current = null;
      zonesRef.current = null;
      routesRef.current = null;
      tileRef.current = null;
      lastLatLngRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tile layer (swaps when tileUrl changes).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileRef.current) map.removeLayer(tileRef.current);
    tileRef.current = L.tileLayer(tileUrl ?? LIGHT_TILES, { maxZoom: 19 }).addTo(map);
  }, [tileUrl]);

  // Map click → destination.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !onMapClick) return;
    const handler = (e: L.LeafletMouseEvent) => onMapClick(e.latlng.lat, e.latlng.lng);
    map.on("click", handler);
    return () => {
      map.off("click", handler);
    };
  }, [onMapClick]);

  // Safety overlay — renders whatever GeoJSON FeatureCollection is provided.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // Defense-in-depth: never paint vector layers on a map without a view.
    if (!map.getBounds()) return;
    if (!zonesRef.current) zonesRef.current = L.layerGroup().addTo(map);
    zonesRef.current.clearLayers();
    const fc = safetyGeoJson;
    if (!fc) return;
    for (const f of fc.features) {
      const color = SAFETY_ZONE_COLORS[f.properties.level];
      const style: L.PathOptions = {
        color,
        weight: 1.2,
        opacity: 0.45,
        fillColor: color,
        fillOpacity: 0.12,
      };
      if (f.geometry.type === "Point") {
        const [lng, lat] = f.geometry.coordinates;
        L.circle([lat, lng], { ...style, radius: f.properties.radius ?? 400 }).addTo(zonesRef.current!);
      } else {
        const rings = f.geometry.coordinates.map((ring) =>
          ring.map(([lng, lat]) => [lat, lng] as [number, number]),
        );
        L.polygon(rings, style).addTo(zonesRef.current!);
      }
    }
  }, [safetyGeoJson]);

  // Route polylines.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!map.getBounds()) return;
    if (!routesRef.current) routesRef.current = L.layerGroup().addTo(map);
    routesRef.current.clearLayers();
    (routes ?? []).forEach((r) => {
      L.polyline(r.points, {
        color: r.color,
        weight: r.dashed ? 3 : 5,
        opacity: r.dashed ? 0.45 : 0.9,
        dashArray: r.dashed ? "6 8" : undefined,
      }).addTo(routesRef.current!);
    });
  }, [routes]);

  // Destination pin.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getBounds()) return;
    if (destination) {
      if (!destRef.current) {
        destRef.current = L.marker([destination.lat, destination.lng], {
          icon: createDestIcon(),
          zIndexOffset: 900,
        }).addTo(map);
      } else {
        destRef.current.setLatLng([destination.lat, destination.lng]);
      }
    } else if (destRef.current) {
      destRef.current.remove();
      destRef.current = null;
    }
    // `destination` is read fresh from the render scope; only its rounded
    // coordinates drive updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination?.lat, destination?.lng]);

  const latest = trail[trail.length - 1];

  // Update marker / accuracy / trail / follow in place.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !latest) return;
    const to: [number, number] = [latest.lat, latest.lng];

    // Accuracy circle
    if (accuracy != null && Number.isFinite(accuracy)) {
      if (!accuracyRef.current) {
        accuracyRef.current = L.circle(to, {
          radius: accuracy,
          color: sos ? "#DC2626" : "#7A2B73",
          weight: 1,
          fillColor: sos ? "#DC2626" : "#7A2B73",
          fillOpacity: 0.08,
        }).addTo(map);
      } else {
        accuracyRef.current.setLatLng(to).setRadius(accuracy);
        // Reflect SOS state in both directions (red while active, calm after).
        accuracyRef.current.setStyle({
          color: sos ? "#DC2626" : "#7A2B73",
          fillColor: sos ? "#DC2626" : "#7A2B73",
        });
      }
    } else if (accuracyRef.current) {
      accuracyRef.current.remove();
      accuracyRef.current = null;
    }

    // Marker (create once, glide to each new fix)
    const icon = avatar ? createAvatarIcon(avatar.initials, avatar.color, sos) : createDotIcon(sos);
    if (!markerRef.current) {
      markerRef.current = L.marker(to, { icon, zIndexOffset: 1000 }).addTo(map);
      lastLatLngRef.current = to;
    } else {
      markerRef.current.setIcon(icon);
      const from = lastLatLngRef.current ?? to;
      if (from[0] !== to[0] || from[1] !== to[1]) animateMarker(markerRef.current, from, to);
      lastLatLngRef.current = to;
    }

    // Movement trail
    const line = trail.map((t) => [t.lat, t.lng] as [number, number]);
    if (line.length > 1) {
      if (!trailRef.current) {
        trailRef.current = L.polyline(line, {
          color: sos ? "#EF4444" : "#7A2B73",
          weight: 3,
          opacity: 0.7,
          dashArray: sos ? "6 8" : undefined,
        }).addTo(map);
      } else {
        trailRef.current.setLatLngs(line);
      }
    } else if (trailRef.current) {
      trailRef.current.remove();
      trailRef.current = null;
    }

    if (follow) map.panTo(to, { animate: true });
    // Avatar is an object prop — depend on its fields, not its identity, so
    // parent re-renders (e.g. a per-second SOS timer) don't reset the icon
    // and re-pan the map on every tick. `trail`/`latest` are intentionally
    // read fresh from the render scope only when the latest point changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latest?.lat, latest?.lng, latest?.ts, accuracy, avatar?.initials, avatar?.color, sos, follow]);

  return <div ref={containerRef} className={className} />;
};

/**
 * Small static map preview for the location history list — one marker, no
 * panning/zooming/scrolling, cheap to render.
 */
export const MiniMap = ({
  lat,
  lng,
  sos = false,
  className = "",
}: {
  lat: number;
  lng: number;
  sos?: boolean;
  className?: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const map = L.map(el, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
      zoom: 15,
      center: [lat, lng],
    });
    L.tileLayer(LIGHT_TILES, { maxZoom: 19 }).addTo(map);
    L.marker([lat, lng], { icon: createDotIcon(sos), interactive: false }).addTo(map);
    const raf = requestAnimationFrame(() => map.invalidateSize());
    return () => {
      cancelAnimationFrame(raf);
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  return <div ref={containerRef} className={className} />;
};
