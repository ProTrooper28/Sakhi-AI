import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

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

const DEFAULT_SOS_STATE: SOSState = {
  active: false,
  triggeredAt: null,
  userName: "Taranpreet",
  location: "Rohini, Delhi",
  coords: { lat: 28.7041, lng: 77.1025 },
};

type AppContextType = {
  reports: Report[];
  evidenceLocker: EvidenceItem[];
  sosState: SOSState;
  addReport: (report: Omit<Report, "id" | "timestamp">) => string;
  updateReport: (id: string, updates: Partial<Report>) => void;
  addEvidence: (item: Omit<EvidenceItem, "id">) => string;
  getReport: (id: string) => Report | undefined;
  triggerSOS: () => void;
  cancelSOS: () => void;
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

  // Persist reports + evidence
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_EVIDENCE, JSON.stringify(evidenceLocker));
  }, [evidenceLocker]);

  // Listen for cross-tab SOS changes (simulates Device 1 → Device 2 sync)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_SOS) {
        setSOSState(readSOSFromStorage());
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Also poll every 1.5s (covers same-tab scenarios + edge cases)
  useEffect(() => {
    const id = setInterval(() => {
      const fresh = readSOSFromStorage();
      setSOSState((prev) => {
        if (prev.active !== fresh.active || prev.triggeredAt !== fresh.triggeredAt) {
          return fresh;
        }
        return prev;
      });
    }, 1500);
    return () => clearInterval(id);
  }, []);

  // ── SOS Actions ──
  const triggerSOS = useCallback(() => {
    const next: SOSState = {
      active: true,
      triggeredAt: new Date().toISOString(),
      userName: "Taranpreet",
      location: "Rohini, Delhi",
      coords: { lat: 28.7041, lng: 77.1025 },
    };
    localStorage.setItem(STORAGE_KEY_SOS, JSON.stringify(next));
    // Dispatch custom event for same-tab detection
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY_SOS }));
    setSOSState(next);

    // Add SOS recording to evidence
    setEvidenceLocker((prev) => [
      {
        id: `ev_sos_${Date.now()}`,
        type: "sos-recording",
        name: `SOS_Recording_${new Date().toLocaleTimeString().replace(/:/g, "-")}.webm`,
        fileType: "audio/webm",
        timestamp: new Date().toISOString(),
        location: next.location,
      },
      ...prev,
    ]);
  }, []);

  const cancelSOS = useCallback(() => {
    const next: SOSState = { ...DEFAULT_SOS_STATE };
    localStorage.setItem(STORAGE_KEY_SOS, JSON.stringify(next));
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY_SOS }));
    setSOSState(next);
  }, []);

  // ── Report Actions ──
  const addReport = (report: Omit<Report, "id" | "timestamp">): string => {
    const id = `rpt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newReport: Report = { ...report, id, timestamp: new Date().toISOString() };
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

  const getReport = (id: string) => reports.find((r) => r.id === id);

  return (
    <AppContext.Provider
      value={{
        reports, evidenceLocker, sosState,
        addReport, updateReport, addEvidence, getReport,
        triggerSOS, cancelSOS,
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
