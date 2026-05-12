import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";

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

export type Report = {
  id: string;
  reportType: "cyber" | "general";
  description: string;
  anonymous: boolean;
  timestamp: string;
  location?: string;
  evidence: EvidenceItem[];
  status: "pending" | "anonymous" | "high-risk" | "complaint";
  flaggedHighRisk?: boolean;
};

export type SOSState = {
  active: boolean;
  triggeredAt: string | null;
  userName: string;
  location: string;
  coords: { lat: number; lng: number };
};

export type AppLocationState = {
  coords: { lat: number; lng: number } | null;
  address: string | null;
  error: boolean;
  loading: boolean;
};

const DEFAULT_SOS_STATE: SOSState = {
  active: false,
  triggeredAt: null,
  userName: "Preeti",
  location: "Bandra West, Mumbai",
  coords: { lat: 19.0596, lng: 72.8295 },
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
  });

  // Track reverse-geolocation coord checks to avoid API spamming
  const lastGeocodedCoords = useRef<{lat: number, lng: number} | null>(null);

  // ── Persist Storage ──
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_EVIDENCE, JSON.stringify(evidenceLocker));
  }, [evidenceLocker]);

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
  const requestLocation = useCallback(() => {
    setLocationState(prev => ({ ...prev, loading: true, error: false }));
    
    if (!("geolocation" in navigator)) {
       setLocationState({ coords: null, address: null, loading: false, error: true });
       return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        
        setLocationState(prev => ({ ...prev, coords, error: false, loading: false }));

        // Check distance to last geocoded point. If > 50 meters, fetch new address.
        const last = lastGeocodedCoords.current;
        if (!last || calculateDistance(last.lat, last.lng, coords.lat, coords.lng) > 50) {
            lastGeocodedCoords.current = coords;
            try {
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&zoom=14`);
              const data = await res.json();
              if (data && data.address) {
                 // Try to formulate a clean city location (e.g. "Bandra West, Mumbai")
                 const suburb = data.address.suburb || data.address.neighbourhood || data.address.residential;
                 const city = data.address.city || data.address.town || data.address.county;
                 const readable = [suburb, city].filter(Boolean).join(", ");
                 setLocationState(prev => ({ ...prev, address: readable || "Unknown Area" }));
              }
            } catch (err) {
              console.warn("Reverse geocoding failed", err);
              // don't set error: true because we still have coords
            }
        }
      },
      (err) => {
        console.warn("GPS Tracking Warning:", err.message);
        setLocationState(prev => ({ ...prev, loading: false, error: true }));
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Auto-start request immediately when app mounts
  useEffect(() => {
    const unsub = requestLocation();
    return () => { if (unsub) unsub(); }
  }, [requestLocation]);

  // ── SOS Actions ──
  const triggerSOS = useCallback(() => {
    const activeCoords = locationState.coords || DEFAULT_SOS_STATE.coords;
    const activeAddress = locationState.address || DEFAULT_SOS_STATE.location;

    const next: SOSState = {
      active: true,
      triggeredAt: new Date().toISOString(),
      userName: "Preeti",
      location: activeAddress,
      coords: activeCoords,
    };
    localStorage.setItem(STORAGE_KEY_SOS, JSON.stringify(next));
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY_SOS }));
    setSOSState(next);
  }, [locationState.coords, locationState.address]);

  const cancelSOS = useCallback(() => {
    const next: SOSState = { ...DEFAULT_SOS_STATE, active: false };
    localStorage.setItem(STORAGE_KEY_SOS, JSON.stringify(next));
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY_SOS }));
    setSOSState(next);
  }, []);

  // ── Report Actions ──
  const addReport = (report: Omit<Report, "id" | "timestamp">): string => {
    const id = `rpt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const loc = locationState.address || undefined;
    const newReport: Report = { ...report, id, timestamp: new Date().toISOString(), location: loc };
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
        triggerSOS, cancelSOS, requestLocation,
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
