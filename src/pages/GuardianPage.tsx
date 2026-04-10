import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, MapPin, Navigation, Shield, AlertTriangle, CheckCircle2, Radio } from "lucide-react";
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

// Inject keyframe for marker animation
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes guardian-ping {
      0%   { transform: scale(1);   opacity: 0.8; }
      100% { transform: scale(2.5); opacity: 0;   }
    }
  `;
  document.head.appendChild(style);
}

const GuardianPage = () => {
  const { sosState, cancelSOS } = useApp();
  const [acknowledged, setAcknowledged] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [callActive, setCallActive] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<L.Map | null>(null);
  const markerRef       = useRef<L.Marker | null>(null);

  // Live elapsed timer
  useEffect(() => {
    if (!sosState.active || !sosState.triggeredAt) { setElapsed(0); return; }
    const start = new Date(sosState.triggeredAt).getTime();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [sosState.active, sosState.triggeredAt]);

  // Reset acknowledgement when a new SOS comes in
  useEffect(() => {
    if (sosState.active) setAcknowledged(false);
  }, [sosState.triggeredAt]);

  // Map init/update
  useEffect(() => {
    if (!sosState.active || !mapContainerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [sosState.coords.lat, sosState.coords.lng],
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
      });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd", maxZoom: 19,
      }).addTo(map);
      const marker = L.marker([sosState.coords.lat, sosState.coords.lng], { icon: makePulseIcon() })
        .addTo(map)
        .bindPopup(`<b style="font-family:monospace">${sosState.userName} — IN DANGER</b>`);
      marker.openPopup();
      mapRef.current = map;
      markerRef.current = marker;
    } else {
      mapRef.current.setView([sosState.coords.lat, sosState.coords.lng], 14);
      markerRef.current?.setLatLng([sosState.coords.lat, sosState.coords.lng]);
    }

    return () => {
      if (!sosState.active) {
        mapRef.current?.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [sosState.active, sosState.coords.lat, sosState.coords.lng]);

  // Cleanup map when SOS deactivates
  useEffect(() => {
    if (!sosState.active && mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      markerRef.current = null;
    }
  }, [sosState.active]);

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  // ── EMERGENCY ACTIVE VIEW ───────────────────────────────────────────────────
  if (sosState.active) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ backgroundColor: "hsl(0 30% 5%)", minHeight: "100dvh" }}
      >
        {/* Top status bar */}
        <div
          className="flex items-center justify-between px-5 pt-8 pb-4 shrink-0"
          style={{ borderBottom: "1px solid hsl(var(--sos) / 0.2)" }}
        >
          <div>
            <p className="section-label" style={{ color: "hsl(var(--sos) / 0.7)" }}>Device 2 — Guardian</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="dot-sos" />
              <span className="text-[10px] font-mono font-bold tracking-widest" style={{ color: "hsl(var(--sos))" }}>
                LIVE EMERGENCY ACTIVE
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-mono" style={{ color: "hsl(var(--sos) / 0.5)" }}>ELAPSED</p>
            <p className="text-sm font-mono font-bold" style={{ color: "hsl(var(--sos))" }}>
              {formatElapsed(elapsed)}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

          {/* Alert Banner */}
          <AnimatePresence>
            {!acknowledged && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="px-5 py-4"
                style={{
                  backgroundColor: "hsl(var(--sos) / 0.1)",
                  border: "1px solid hsl(var(--sos) / 0.5)",
                  borderRadius: "4px",
                  boxShadow: "0 0 24px hsl(var(--sos) / 0.08)",
                }}
              >
                <p
                  className="text-lg font-black tracking-wide mb-3"
                  style={{ fontFamily: "var(--font-mono)", color: "hsl(var(--sos))", letterSpacing: "0.06em" }}
                >
                  EMERGENCY ALERT RECEIVED
                </p>
                <div className="space-y-2">
                  {[
                    { label: "NAME",     value: sosState.userName },
                    { label: "STATUS",   value: "IN DANGER",      highlight: true },
                    { label: "LOCATION", value: sosState.location },
                    { label: "TIME",     value: sosState.triggeredAt ? new Date(sosState.triggeredAt).toLocaleTimeString() : "--" },
                  ].map(({ label, value, highlight }) => (
                    <div key={label} className="flex items-center gap-3">
                      <span
                        className="text-[9px] font-mono font-bold w-20 shrink-0"
                        style={{ color: "hsl(var(--muted-foreground))" }}
                      >
                        {label}
                      </span>
                      <span
                        className="text-xs font-mono font-semibold"
                        style={{ color: highlight ? "hsl(var(--sos))" : "hsl(var(--foreground))" }}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Live Map */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="dot-sos" />
              <p className="section-label" style={{ color: "hsl(var(--sos) / 0.8)" }}>
                LIVE TRACKING ACTIVE
              </p>
            </div>
            <div
              style={{
                height: "220px",
                border: "1px solid hsl(var(--sos) / 0.3)",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
            </div>
            <p className="text-[10px] font-mono mt-1.5" style={{ color: "hsl(var(--muted-foreground))" }}>
              Tracking: {sosState.location} · {sosState.coords.lat.toFixed(4)}°N, {sosState.coords.lng.toFixed(4)}°E
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <p className="section-label mb-1.5">Actions</p>

            {/* Call User */}
            <button
              id="guardian-call-btn"
              onClick={() => setCallActive((v) => !v)}
              className="w-full flex items-center gap-3 px-4 py-3.5 transition-all"
              style={{
                backgroundColor: callActive ? "hsl(var(--safe) / 0.15)" : "hsl(var(--safe) / 0.08)",
                border: `1px solid ${callActive ? "hsl(var(--safe) / 0.6)" : "hsl(var(--safe) / 0.3)"}`,
                borderRadius: "4px",
              }}
            >
              <Phone className="w-4 h-4 flex-shrink-0" style={{ color: "hsl(var(--safe))" }} />
              <div className="flex-1 text-left">
                <p className="text-xs font-mono font-bold tracking-wider" style={{ color: "hsl(var(--safe))" }}>
                  {callActive ? "CALL IN PROGRESS..." : "CALL USER"}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {callActive ? `Calling ${sosState.userName}` : "Initiate emergency call"}
                </p>
              </div>
              {callActive && <span className="dot-active" />}
            </button>

            {/* Track Live */}
            <button
              id="guardian-track-btn"
              className="w-full flex items-center gap-3 px-4 py-3.5"
              style={{
                backgroundColor: "hsl(215 60% 50% / 0.08)",
                border: "1px solid hsl(215 60% 50% / 0.3)",
                borderRadius: "4px",
              }}
            >
              <Navigation className="w-4 h-4 flex-shrink-0" style={{ color: "hsl(215 60% 60%)" }} />
              <div className="flex-1 text-left">
                <p className="text-xs font-mono font-bold tracking-wider" style={{ color: "hsl(215 60% 60%)" }}>
                  TRACK LIVE LOCATION
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                  Location updating in real-time
                </p>
              </div>
              <span className="dot-active" style={{ backgroundColor: "hsl(215 60% 60%)" }} />
            </button>

            {/* Acknowledge */}
            {!acknowledged ? (
              <button
                id="guardian-ack-btn"
                onClick={() => setAcknowledged(true)}
                className="w-full flex items-center gap-3 px-4 py-3.5 transition-all"
                style={{
                  backgroundColor: "hsl(var(--muted))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "4px",
                }}
              >
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "hsl(var(--muted-foreground))" }} />
                <div className="flex-1 text-left">
                  <p className="text-xs font-mono font-bold tracking-wider" style={{ color: "hsl(var(--foreground) / 0.7)" }}>
                    ACKNOWLEDGE ALERT
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                    Dismiss popup — monitoring continues
                  </p>
                </div>
              </button>
            ) : (
              <div
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  backgroundColor: "hsl(var(--safe) / 0.05)",
                  border: "1px solid hsl(var(--safe) / 0.2)",
                  borderRadius: "4px",
                }}
              >
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "hsl(var(--safe))" }} />
                <p className="text-xs font-mono" style={{ color: "hsl(var(--safe))" }}>
                  Alert acknowledged — monitoring active
                </p>
              </div>
            )}

            {/* Dismiss (for demo) */}
            <button
              onClick={cancelSOS}
              className="w-full py-3 font-mono text-xs font-semibold tracking-wider transition-all"
              style={{
                backgroundColor: "transparent",
                border: "1px solid hsl(var(--border))",
                borderRadius: "4px",
                color: "hsl(var(--muted-foreground))",
                marginTop: "8px",
              }}
            >
              MARK AS RESOLVED
            </button>
          </div>

        </div>
      </div>
    );
  }

  // ── STANDBY / NO ALERT ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "hsl(var(--background))", minHeight: "100dvh" }}>

      <div className="px-5 pt-8 pb-5 border-b border-border/40">
        <p className="section-label mb-1">Device 2</p>
        <h1
          className="text-2xl font-black tracking-wide"
          style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}
        >
          GUARDIAN DASHBOARD
        </h1>
      </div>

      <div className="px-5 pt-5 flex-1 flex flex-col gap-4">

        {/* Status */}
        <div
          className="flex items-center gap-3 px-4 py-3 status-line"
          style={{ backgroundColor: "hsl(var(--muted))", borderRadius: "4px" }}
        >
          <span className="dot-active" />
          <div>
            <p className="text-xs font-mono font-semibold" style={{ color: "hsl(var(--foreground))" }}>
              MONITORING ACTIVE
            </p>
            <p className="text-[10px] font-mono mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
              Waiting for alerts from Device 1
            </p>
          </div>
          <Shield className="w-4 h-4 ml-auto flex-shrink-0" style={{ color: "hsl(var(--safe))" }} />
        </div>

        {/* Device info */}
        <div
          className="px-4 py-5"
          style={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "4px" }}
        >
          <div className="flex items-start gap-3 mb-4">
            <Radio className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "hsl(var(--safe))" }} />
            <div>
              <p className="text-sm font-mono font-bold" style={{ color: "hsl(var(--foreground))" }}>
                Real-time sync active
              </p>
              <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                This device receives emergency alerts automatically when SOS is activated on Device 1.
              </p>
            </div>
          </div>
          <div className="space-y-2 pl-8">
            {[
              "Open Device 1 at the same URL in another tab",
              "Navigate to SOS and tap ACTIVATE SOS",
              "This screen will immediately show the alert",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span
                  className="text-[9px] font-mono font-bold w-4 shrink-0 mt-0.5"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  {i + 1}.
                </span>
                <p className="text-[11px]" style={{ color: "hsl(var(--muted-foreground))" }}>{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Monitored User */}
        <div
          className="px-4 py-4"
          style={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "4px" }}
        >
          <p className="section-label mb-3">Monitored User</p>
          {[
            { label: "NAME",     value: "Taranpreet" },
            { label: "LOCATION", value: "Rohini, Delhi" },
            { label: "STATUS",   value: "SAFE" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center gap-3 py-1.5">
              <span className="text-[9px] font-mono font-bold w-20 shrink-0" style={{ color: "hsl(var(--muted-foreground))" }}>
                {label}
              </span>
              <span
                className="text-xs font-mono"
                style={{ color: value === "SAFE" ? "hsl(var(--safe))" : "hsl(var(--foreground))" }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* Link to Device 1 */}
        <a
          href="/sos"
          className="flex items-center justify-between px-4 py-3 mt-auto"
          style={{
            backgroundColor: "transparent",
            border: "1px solid hsl(var(--border))",
            borderRadius: "4px",
            textDecoration: "none",
          }}
        >
          <p className="text-xs font-mono font-semibold tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
            SWITCH TO DEVICE 1 VIEW
          </p>
          <AlertTriangle className="w-3.5 h-3.5" style={{ color: "hsl(var(--muted-foreground))" }} />
        </a>

      </div>
    </div>
  );
};

export default GuardianPage;
