import { createContext, useContext, useState, useEffect, ReactNode } from "react";

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

type AppContextType = {
  reports: Report[];
  evidenceLocker: EvidenceItem[];
  addReport: (report: Omit<Report, "id" | "timestamp">) => string;
  updateReport: (id: string, updates: Partial<Report>) => void;
  addEvidence: (item: Omit<EvidenceItem, "id">) => string;
  getReport: (id: string) => Report | undefined;
};

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEY_REPORTS = "sakhi_reports";
const STORAGE_KEY_EVIDENCE = "sakhi_evidence";

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [reports, setReports] = useState<Report[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_REPORTS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [evidenceLocker, setEvidenceLocker] = useState<EvidenceItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_EVIDENCE);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_EVIDENCE, JSON.stringify(evidenceLocker));
  }, [evidenceLocker]);

  const addReport = (report: Omit<Report, "id" | "timestamp">): string => {
    const id = `rpt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newReport: Report = {
      ...report,
      id,
      timestamp: new Date().toISOString(),
    };
    setReports((prev) => [newReport, ...prev]);
    // Also add evidence items to locker
    newReport.evidence.forEach((ev) => {
      setEvidenceLocker((prev) => {
        if (prev.find((e) => e.id === ev.id)) return prev;
        return [{ ...ev, reportId: id }, ...prev];
      });
    });
    return id;
  };

  const updateReport = (id: string, updates: Partial<Report>) => {
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
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
      value={{ reports, evidenceLocker, addReport, updateReport, addEvidence, getReport }}
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
