import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { startSOSAlarmLoop, stopSOSAlarmLoop, playSuccessChimeSound } from "@/lib/audio";
import { useAuth } from "./AuthContext";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  cancelSosEvent,
  createSosEvent,
  resolveSosEvent,
  sendSafeCheckIn,
  upsertLiveLocation,
} from "@/lib/safety";
import { getDeviceBattery, isSharingEnabled } from "@/pages/location/helpers";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EvidenceItem = {
  id: string;
  type: "sos-recording" | "report-media";
  name: string;
  fileUrl?: string;
  fileType?: string;
  timestamp: string;
  location?: string;
  reportId?: string;
};

export type ReportCategory =
  | "stalking"
  | "harassment"
  | "domestic-violence"
  | "theft"
  | "assault"
  | "cyber"
  | "missing-person"
  | "suspicious-activity"
  | "other";

export type ReportSeverity = "low" | "medium" | "high" | "critical";

export type ReportStatus =
  | "draft"
  | "pending"
  | "submitted"
  | "anonymous"
  | "high-risk"
  | "complaint"
  | "closed";

export type Report = {
  id: string;
  /** Legacy field (cyber/general) — new reports use `category`. */
  reportType: "cyber" | "general";
  category: ReportCategory;
  description: string;
  anonymous: boolean;
  /** When the report was created / submitted. */
  timestamp: string;
  /** When the incident happened. */
  incidentDate?: string;
  incidentTime?: string;
  /** Address / area label of the incident. */
  location?: string;
  /** GPS coordinates of the incident (auto-attached). */
  coords?: { lat: number; lng: number };
  peopleInvolved?: string;
  witnesses?: string;
  severity?: ReportSeverity;
  evidence: EvidenceItem[];
  status: ReportStatus;
  /** Human-readable tracking number (SAKHI-YYYY-XXXXXX). */
  reportNumber?: string;
  /** Official channel the user chose to submit through. */
  portal?: string;
  flaggedHighRisk?: boolean;
};

export type SOSState = {
  active: boolean;
  triggeredAt: string | null;
  userName: string;
  location: string;
  coords: { lat: number; lng: number };
  resolved?: boolean;
};

export type AppLocationState = {
  coords: { lat: number; lng: number } | null;
  address: string | null;
  error: boolean;
  loading: boolean;
  /** GPS horizontal accuracy in meters (device-provided). */
  accuracy?: number | null;
  /** Instantaneous speed in m/s (device-provided, may be null). */
  speed?: number | null;
  /** Heading in degrees (device-provided, may be null). */
  heading?: number | null;
  /** Epoch ms of the last position fix. */
  timestamp?: number | null;
};

const DEFAULT_SOS_STATE: SOSState = {
  active: false,
  triggeredAt: null,
  userName: "Preeti",
  location: "Bandra West, Mumbai",
  coords: { lat: 19.0596, lng: 72.8295 },
  resolved: false,
};

type AppContextType = {
  reports: Report[];
  evidenceLocker: EvidenceItem[];
  sosState: SOSState;
  locationState: AppLocationState;
  addReport: (report: Omit<Report, "id" | "timestamp">) => string;
  updateReport: (id: string, updates: Partial<Report>) => void;
  addEvidence: (item: Omit<EvidenceItem, "id">) => string;
  getReport: (id: string) => Report | undefined;
  triggerSOS: () => void;
  cancelSOS: () => void;
  resolveSOS: () => void;
  requestLocation: () => void;
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY_REPORTS  = "sakhi_reports";
const STORAGE_KEY_EVIDENCE = "sakhi_evidence";
const STORAGE_KEY_SOS      = "sakhi_sos_state";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const readSOSFromStorage = (): SOSState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SOS);
    return raw ? JSON.parse(raw) : DEFAULT_SOS_STATE;
  } catch {
    return DEFAULT_SOS_STATE;
  }
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  // Rough distance in meters (haversine)
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// ─── Provider ─────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  // Use the authenticated user's name for SOS broadcasts (falls back to the
  // demo persona "Preeti" for guests / before profile load).
  const { displayName, user, guest } = useAuth();

  // Id of the Supabase safety_events row backing the CURRENT local SOS, so
  // resolve/cancel can close it for the guardian. Null in guest/demo mode.
  const activeSosEventIdRef = useRef<string | null>(null);

  const [reports, setReports] = useState<Report[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_REPORTS);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const [evidenceLocker, setEvidenceLocker] = useState<EvidenceItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_EVIDENCE);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const [sosState, setSOSState] = useState<SOSState>(readSOSFromStorage);
  
  const [locationState, setLocationState] = useState<AppLocationState>({
    coords: null,
    address: null,
    error: false,
    loading: true,
    accuracy: null,
    speed: null,
    heading: null,
    timestamp: null,
  });

  // Active geolocation watch id — refreshed on every requestLocation() call
  // so "Refresh location" starts a clean watch instead of stacking new ones.
  const locationWatchIdRef = useRef<number | null>(null);

  // Track reverse-geolocation coord checks to avoid API spamming
  const lastGeocodedCoords = useRef<{lat: number, lng: number} | null>(null);

  // ── Persist Storage ──
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_EVIDENCE, JSON.stringify(evidenceLocker));
  }, [evidenceLocker]);

  // Keep track of previous SOS State to detect transitions
  const prevSOSState = useRef<{ active: boolean; resolved: boolean }>({
    active: sosState.active,
    resolved: !!sosState.resolved
  });

  useEffect(() => {
    const prev = prevSOSState.current;
    const current = { active: sosState.active, resolved: !!sosState.resolved };

    // Differentiate between Guardian page and Victim/User pages
    const isGuardianPage = window.location.pathname.includes("guardian-live");

    // 1. Transition: active changed from false to true (SOS Triggered / Alert Received)
    if (!prev.active && current.active) {
      if (isGuardianPage) {
        startSOSAlarmLoop(true);
      } else {
        try {
          const storedOptions = localStorage.getItem("sakhi_sos_options");
          const isSilentSOS = storedOptions ? JSON.parse(storedOptions).silent : false;
          
          const storedSettings = localStorage.getItem("sakhi_security_settings");
          const isSilentSettings = storedSettings ? JSON.parse(storedSettings).silent : false;
          
          const isSilent = isSilentSOS || isSilentSettings;
          if (!isSilent) {
            startSOSAlarmLoop(false);
          }
        } catch {
          startSOSAlarmLoop(false);
        }
      }
    }

    // 2. Transition: active changed from true to false (SOS stopped/cancelled)
    if (prev.active && !current.active) {
      stopSOSAlarmLoop();
    }

    // 3. Transition: resolved changed from false to true (Marked Safe)
    if (!prev.resolved && current.resolved) {
      playSuccessChimeSound();
    }

    prevSOSState.current = current;
  }, [sosState.active, sosState.resolved]);

  // Clean up alarm loop on unmount
  useEffect(() => {
    return () => {
      stopSOSAlarmLoop();
    };
  }, []);

  // Sync SOS State across tabs (simulates multiple devices)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_SOS) setSOSState(readSOSFromStorage());
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Poll SOS State (robust local sync)
  useEffect(() => {
    const id = setInterval(() => {
      const fresh = readSOSFromStorage();
      setSOSState((prev) => {
        if (prev.active !== fresh.active || prev.triggeredAt !== fresh.triggeredAt) return fresh;
        return prev;
      });
    }, 1500);
    return () => clearInterval(id);
  }, []);

  // ── GPS Geolocation Engine ──
  // Track whether we have successfully received at least one fix, so we
  // can distinguish "still loading" from "permission denied / unavailable".
  const hasReceivedFixRef = useRef(false);

  const requestLocation = useCallback(() => {
    setLocationState(prev => ({ ...prev, loading: true, error: false }));

    if (!("geolocation" in navigator)) {
      setLocationState(prev => ({
        ...prev,
        loading: false,
        error: true,
        // Provide a meaningful address so UI never shows blank
        address: prev.address ?? "Location services unavailable",
      }));
      return;
    }

    // Replace any previous watch so repeated calls never pile up.
    if (locationWatchIdRef.current != null) {
      navigator.geolocation.clearWatch(locationWatchIdRef.current);
      locationWatchIdRef.current = null;
    }

    /** Process a successful position fix — shared by getCurrent + watch. */
    const handlePosition = async (pos: GeolocationPosition) => {
      const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      hasReceivedFixRef.current = true;

      setLocationState(prev => ({
        ...prev,
        coords: c,
        accuracy: pos.coords.accuracy ?? null,
        speed: pos.coords.speed ?? null,
        heading: pos.coords.heading ?? null,
        timestamp: pos.timestamp,
        error: false,
        loading: false,
      }));

      // Reverse geocode when the user has moved >50 m from the last geocoded point.
      const last = lastGeocodedCoords.current;
      if (!last || calculateDistance(last.lat, last.lng, c.lat, c.lng) > 50) {
        lastGeocodedCoords.current = c;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${c.lat}&lon=${c.lng}&zoom=14`,
            { headers: { Accept: "application/json" } },
          );
          const data = await res.json();
          if (data?.address) {
            const a = data.address;
            const area = a.suburb || a.neighbourhood || a.residential || "";
            const city = a.city || a.town || a.village || a.county || "";
            const readable = [area, city].filter(Boolean).join(", ");
            if (readable) setLocationState(prev => ({ ...prev, address: readable }));
          }
        } catch {
          // Network error — ignore, coords are still valid
        }
      }
    };

    /**
     * IP-based geolocation fallback for desktop browsers without GPS.
     * Uses free ipapi.co API (no key needed, 1k requests/day).
     */
    const tryIpFallback = async () => {
      try {
        const res = await fetch("https://ipapi.co/json/", {
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.latitude && data.longitude) {
          const c = { lat: data.latitude, lng: data.longitude };
          hasReceivedFixRef.current = true;
          const area = data.city || data.region || "";
          const country = data.country_name || "";
          const readable = [area, country].filter(Boolean).join(", ");
          setLocationState(prev => ({
            ...prev,
            coords: c,
            accuracy: null,
            speed: null,
            heading: null,
            timestamp: Date.now(),
            error: false,
            loading: false,
            address: readable || "Current location (approximate)",
          }));
        }
      } catch {
        // IP fallback also failed — show the real error
      }
    };

    /** Handle geolocation errors with specific messaging. */
    const handleError = (err: GeolocationPositionError) => {
      console.warn("[sakhi-gps] Error:", err.code, err.message);
      if (err.code === 1) {
        // PERMISSION_DENIED
        setLocationState(prev => ({
          ...prev,
          loading: false,
          error: true,
          address: "Location permission denied — enable in browser settings",
        }));
      } else if (err.code === 2) {
        // POSITION_UNAVAILABLE — on desktop this is common (no GPS hw).
        // Try IP geolocation as a fallback before showing an error.
        if (!hasReceivedFixRef.current) {
          void tryIpFallback();
          // Show a softer message while the IP fallback is loading
          setLocationState(prev => ({
            ...prev,
            loading: true,
            error: false,
            address: "Detecting location…",
          }));
        } else {
          setLocationState(prev => ({
            ...prev,
            loading: false,
            error: true,
            address: "GPS signal lost — waiting for reconnection",
          }));
        }
      } else {
        // TIMEOUT (code 3) or other
        if (!hasReceivedFixRef.current) {
          // Timeout on first fix — also try IP fallback
          void tryIpFallback();
        }
        setLocationState(prev => ({
          ...prev,
          loading: false,
          error: !hasReceivedFixRef.current,
          address: hasReceivedFixRef.current
            ? "Location request timed out — retrying"
            : "Detecting approximate location…",
        }));
      }
    };

    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 15000,
    };

    // Step 1: Request a one-shot fix (triggers the permission prompt on
    // browsers that require a user gesture before prompting).
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Got an immediate fix — process it and start continuous watching.
        void handlePosition(pos);
        const watchId = navigator.geolocation.watchPosition(
          handlePosition,
          handleError,
          geoOptions,
        );
        locationWatchIdRef.current = watchId;
      },
      (err) => {
        // Initial request failed — still start watchPosition in case the
        // user grants permission after the prompt or the device acquires GPS.
        handleError(err);
        const watchId = navigator.geolocation.watchPosition(
          handlePosition,
          handleError,
          geoOptions,
        );
        locationWatchIdRef.current = watchId;
      },
      geoOptions,
    );

    return () => {
      if (locationWatchIdRef.current != null) {
        navigator.geolocation.clearWatch(locationWatchIdRef.current);
        locationWatchIdRef.current = null;
      }
    };
  }, []);

  // Auto-start request immediately when app mounts
  useEffect(() => {
    const unsub = requestLocation();
    return () => { if (unsub) unsub(); }
  }, [requestLocation]);

  // ── Continuous live location → Supabase (guardian gets updates in real
  //    time without refreshing). Throttled so watchPosition's high-frequency
  //    callbacks don't hammer the API. Never in guest mode, and paused when
  //    the user switches "Stop Sharing" off on the Live Location screen.
  const lastLocationUpsertRef = useRef(0);
  const upsertFailedRef = useRef(false);
  useEffect(() => {
    if (!isSupabaseConfigured || guest || !user) return;
    if (!isSharingEnabled()) return;
    const coords = locationState.coords;
    if (!coords) return;
    const now = Date.now();
    // Throttle to every 5 seconds, BUT always allow the first write
    // (lastLocationUpsertRef starts at 0, so the very first call always
    // passes). After a successful write, update the ref. After a failure,
    // retry sooner (2 seconds) so the guardian isn't left stale.
    const interval = upsertFailedRef.current ? 2000 : 5000;
    if (now - lastLocationUpsertRef.current < interval) return;
    lastLocationUpsertRef.current = now;
    const label = locationState.address ?? null;
    void (async () => {
      try {
        const battery = await getDeviceBattery();
        await upsertLiveLocation({ lat: coords.lat, lng: coords.lng, label, battery });
        upsertFailedRef.current = false;
      } catch {
        upsertFailedRef.current = true;
      }
    })();
  }, [locationState.coords, locationState.address, guest, user]);

  const triggerSOS = useCallback(() => {
    const activeCoords = locationState.coords || DEFAULT_SOS_STATE.coords;
    const activeAddress = locationState.address || DEFAULT_SOS_STATE.location;

    const next: SOSState = {
      active: true,
      triggeredAt: new Date().toISOString(),
      userName: displayName || "Preeti",
      location: activeAddress,
      coords: activeCoords,
    };
    localStorage.setItem(STORAGE_KEY_SOS, JSON.stringify(next));
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY_SOS }));
    setSOSState(next);

    // Automatically generate a real-time evidence recording entry
    const now = new Date();
    setEvidenceLocker(prev => [
      {
        id: `ev_sos_${now.getTime()}`,
        type: "sos-recording",
        name: `SOS_Incident_${now.getTime()}.mp4`,
        fileUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        timestamp: now.toISOString(),
        location: activeAddress,
        fileType: "video/mp4",
      },
      ...prev
    ]);

    // REAL backend: create the SOS event + start live location sharing so the
    // guardian's dashboard updates instantly via Supabase Realtime. Guests
    // never write to Supabase.
    if (isSupabaseConfigured && !guest && user) {
      void createSosEvent({
        lat: activeCoords.lat,
        lng: activeCoords.lng,
        label: activeAddress,
      }).then((evt) => {
        if (evt) activeSosEventIdRef.current = evt.id;
      });
      void upsertLiveLocation({
        lat: activeCoords.lat,
        lng: activeCoords.lng,
        label: activeAddress,
      });
    }
  }, [locationState.coords, locationState.address, displayName, guest, user]);

  const cancelSOS = useCallback(() => {
    // Close the backend event too (guardian sees the alert cancelled).
    const eventId = activeSosEventIdRef.current;
    if (isSupabaseConfigured && !guest && user && eventId) {
      activeSosEventIdRef.current = null;
      void cancelSosEvent(eventId);
    }
    const next: SOSState = { ...DEFAULT_SOS_STATE, active: false, resolved: false };
    localStorage.setItem(STORAGE_KEY_SOS, JSON.stringify(next));
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY_SOS }));
    setSOSState(next);
  }, [guest, user]);

  const resolveSOS = useCallback(() => {
    // "I'm Safe": close the backend SOS AND send a ✅ safe check-in (time +
    // location) so the guardian immediately sees it.
    const eventId = activeSosEventIdRef.current;
    if (isSupabaseConfigured && !guest && user) {
      if (eventId) {
        activeSosEventIdRef.current = null;
        void resolveSosEvent(eventId);
      }
      const coords = locationState.coords || DEFAULT_SOS_STATE.coords;
      const label = locationState.address || DEFAULT_SOS_STATE.location;
      void sendSafeCheckIn({ lat: coords.lat, lng: coords.lng, label });
    }
    setSOSState(prev => {
      const next: SOSState = { ...prev, active: false, resolved: true };
      localStorage.setItem(STORAGE_KEY_SOS, JSON.stringify(next));
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY_SOS }));
      return next;
    });
  }, [guest, user, locationState.coords, locationState.address]);

  // ── Report Actions ──
  const addReport = (report: Omit<Report, "id" | "timestamp">): string => {
    const id = `rpt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const loc = locationState.address || undefined;
    const newReport: Report = {
      ...report,
      category: report.category ?? (report.reportType === "cyber" ? "cyber" : "other"),
      id,
      timestamp: new Date().toISOString(),
      location: report.location ?? loc,
    };
    setReports((prev) => [newReport, ...prev]);
    newReport.evidence.forEach((ev) => {
      setEvidenceLocker((prev) => {
        if (prev.find((e) => e.id === ev.id)) return prev;
        return [{ ...ev, reportId: id }, ...prev];
      });
    });
    return id;
  };

  const updateReport = (id: string, updates: Partial<Report>) => {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const addEvidence = (item: Omit<EvidenceItem, "id">): string => {
    const id = `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newItem: EvidenceItem = { ...item, id };
    setEvidenceLocker((prev) => [newItem, ...prev]);
    return id;
  };

  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const getReport = (id: string) => reports.find((r) => r.id === id);

  return (
    <AppContext.Provider
      value={{
        reports, evidenceLocker, sosState, locationState,
        addReport, updateReport, addEvidence, getReport,
        triggerSOS, cancelSOS, resolveSOS, requestLocation,
        isSidebarOpen, setSidebarOpen
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};
