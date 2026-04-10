import { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Upload, X, Image, Film, FileAudio, File,
  Eye, EyeOff, ChevronRight,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import type { EvidenceItem } from "@/context/AppContext";

type ReportType = "cyber" | "general" | null;
type UploadedFile = { file: File; previewUrl?: string; id: string };

const getFileIcon = (type: string) => {
  if (type.startsWith("image/")) return Image;
  if (type.startsWith("video/")) return Film;
  if (type.startsWith("audio/")) return FileAudio;
  return File;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const ReportPage = () => {
  const navigate = useNavigate();
  const { addReport } = useApp();
  const [reportType, setReportType] = useState<ReportType>(null);
  const [anonymous, setAnonymous] = useState(true);
  const [description, setDescription] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilePick = () => fileInputRef.current?.click();

  const processFiles = (files: FileList | File[]) => {
    Array.from(files).forEach((file) => {
      const id = `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
      setUploadedFiles((prev) => [...prev, { file, previewUrl, id }]);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
    e.target.value = "";
  };

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  };

  const handleSubmit = async () => {
    if (!description.trim() || !reportType) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));

    let location: string | undefined;
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 })
      );
      location = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
    } catch {
      location = undefined;
    }

    const evidence: EvidenceItem[] = uploadedFiles.map((uf) => ({
      id: uf.id,
      type: "report-media" as const,
      name: uf.file.name,
      fileUrl: uf.previewUrl,
      fileType: uf.file.type,
      timestamp: new Date().toISOString(),
      location,
    }));

    const id = addReport({ reportType, description, anonymous, location, evidence, status: "pending" });
    setSubmitting(false);
    navigate(`/report-review/${id}`);
  };

  // ── Type Selection Screen ──────────────────────────────────────────────────
  if (!reportType) {
    return (
      <div className="min-h-screen pb-24" style={{ backgroundColor: "hsl(var(--background))" }}>
        <div className="px-5 pt-8 pb-5 border-b border-border/40">
          <p className="section-label mb-1">Incident Filing</p>
          <h1
            className="text-2xl font-black tracking-wide"
            style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}
          >
            REPORT
          </h1>
        </div>

        <div className="px-5 pt-5 space-y-2">
          <p className="section-label mb-3">Select incident type</p>

          {/* Cyber Incident */}
          <button
            id="report-type-cyber"
            onClick={() => setReportType("cyber")}
            className="w-full flex items-center justify-between px-5 py-5 transition-all"
            style={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "4px",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "hsl(var(--foreground) / 0.3)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "hsl(var(--border))";
            }}
          >
            <div className="text-left">
              <p
                className="text-sm font-bold tracking-wide font-mono"
                style={{ color: "hsl(var(--foreground))" }}
              >
                CYBER INCIDENT
              </p>
              <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                Online harassment, threats, hacking, impersonation
              </p>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: "hsl(var(--muted-foreground))" }} />
          </button>

          {/* General Report */}
          <button
            id="report-type-general"
            onClick={() => setReportType("general")}
            className="w-full flex items-center justify-between px-5 py-5 transition-all"
            style={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "4px",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "hsl(var(--foreground) / 0.3)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "hsl(var(--border))";
            }}
          >
            <div className="text-left">
              <p
                className="text-sm font-bold tracking-wide font-mono"
                style={{ color: "hsl(var(--foreground))" }}
              >
                GENERAL REPORT
              </p>
              <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                Physical incident, stalking, public threat
              </p>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: "hsl(var(--muted-foreground))" }} />
          </button>

          {/* Evidence Locker shortcut */}
          <button
            id="report-evidence-shortcut"
            onClick={() => navigate("/evidence-locker")}
            className="w-full flex items-center justify-between px-5 py-4 mt-4 transition-all"
            style={{
              backgroundColor: "transparent",
              border: "1px solid hsl(var(--border))",
              borderRadius: "4px",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "hsl(var(--foreground) / 0.25)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "hsl(var(--border))";
            }}
          >
            <p className="text-xs font-mono font-semibold tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
              VIEW EVIDENCE LOCKER
            </p>
            <ChevronRight className="w-3.5 h-3.5" style={{ color: "hsl(var(--muted-foreground))" }} />
          </button>
        </div>

        <BottomNav />
      </div>
    );
  }

  // ── Report Form ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "hsl(var(--background))" }}>
      <div className="px-5 pt-8 pb-5 border-b border-border/40">
        <button
          onClick={() => setReportType(null)}
          className="text-xs font-mono mb-3 transition-colors"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          ← BACK
        </button>
        <p className="section-label mb-1">
          {reportType === "cyber" ? "Cyber Incident" : "General Incident"}
        </p>
        <h1
          className="text-2xl font-black tracking-wide"
          style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}
        >
          FILE REPORT
        </h1>
      </div>

      <div className="px-5 pt-5 space-y-4">

        {/* Anonymous Toggle */}
        <button
          id="anonymous-toggle"
          onClick={() => setAnonymous(!anonymous)}
          className="w-full flex items-center justify-between px-4 py-3.5 transition-all"
          style={{
            backgroundColor: anonymous ? "hsl(var(--safe) / 0.07)" : "hsl(var(--card))",
            border: `1px solid ${anonymous ? "hsl(var(--safe) / 0.4)" : "hsl(var(--border))"}`,
            borderRadius: "4px",
          }}
        >
          <div className="flex items-center gap-3">
            {anonymous ? (
              <EyeOff className="w-4 h-4" style={{ color: "hsl(var(--safe))" }} />
            ) : (
              <Eye className="w-4 h-4" style={{ color: "hsl(var(--muted-foreground))" }} />
            )}
            <div className="text-left">
              <p
                className="text-xs font-mono font-bold tracking-wider"
                style={{ color: anonymous ? "hsl(var(--safe))" : "hsl(var(--muted-foreground))" }}
              >
                ANONYMOUS MODE: {anonymous ? "ON" : "OFF"}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                {anonymous ? "Your identity is fully protected" : "Authorities can identify you"}
              </p>
            </div>
          </div>
          <div
            className="w-9 h-5 rounded-full relative transition-colors flex-shrink-0"
            style={{ backgroundColor: anonymous ? "hsl(var(--safe))" : "hsl(var(--muted))" }}
          >
            <div
              className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform"
              style={{ transform: anonymous ? "translateX(17px)" : "translateX(2px)" }}
            />
          </div>
        </button>

        {/* Description */}
        <div className="space-y-1.5">
          <p className="section-label">
            Incident Description <span style={{ color: "hsl(var(--sos))" }}>*</span>
          </p>
          <textarea
            id="incident-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what happened. Include time, location, and any identifying details..."
            rows={5}
            className="w-full font-mono text-xs resize-none outline-none transition-colors px-4 py-3"
            style={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "4px",
              color: "hsl(var(--foreground))",
              caretColor: "hsl(var(--sos))",
            }}
            onFocus={(e) => {
              (e.currentTarget as HTMLTextAreaElement).style.borderColor = "hsl(var(--foreground) / 0.3)";
            }}
            onBlur={(e) => {
              (e.currentTarget as HTMLTextAreaElement).style.borderColor = "hsl(var(--border))";
            }}
          />
          <p className="text-[10px] font-mono text-right" style={{ color: "hsl(var(--muted-foreground))" }}>
            {description.length} chars
          </p>
        </div>

        {/* Evidence Upload */}
        <div className="space-y-2">
          <p className="section-label">Evidence Upload <span className="normal-case" style={{ color: "hsl(var(--muted-foreground))", fontFamily: "var(--font-sans)", fontWeight: 400, letterSpacing: 0 }}>— optional</span></p>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,audio/*,video/*,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          <div
            id="upload-zone"
            onClick={handleFilePick}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className="flex flex-col items-center justify-center gap-2 py-8 cursor-pointer transition-all"
            style={{
              backgroundColor: dragging ? "hsl(var(--foreground) / 0.04)" : "transparent",
              border: `1px dashed ${dragging ? "hsl(var(--foreground) / 0.4)" : "hsl(var(--border))"}`,
              borderRadius: "4px",
            }}
          >
            <Upload className="w-5 h-5" style={{ color: "hsl(var(--muted-foreground))" }} />
            <p className="text-xs font-mono font-semibold" style={{ color: "hsl(var(--foreground) / 0.7)" }}>
              TAP TO UPLOAD OR DRAG & DROP
            </p>
            <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
              Images · Audio · Video · PDF — max 10MB each
            </p>
          </div>

          {/* File List */}
          <AnimatePresence>
            {uploadedFiles.map((uf) => {
              const Icon = getFileIcon(uf.file.type);
              return (
                <motion.div
                  key={uf.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-center gap-3 px-3 py-2.5"
                  style={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "4px",
                  }}
                >
                  {uf.previewUrl ? (
                    <img src={uf.previewUrl} alt={uf.file.name} className="w-10 h-10 object-cover rounded flex-shrink-0" />
                  ) : (
                    <div
                      className="w-10 h-10 flex items-center justify-center rounded flex-shrink-0"
                      style={{ backgroundColor: "hsl(var(--muted))" }}
                    >
                      <Icon className="w-5 h-5" style={{ color: "hsl(var(--muted-foreground))" }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono truncate" style={{ color: "hsl(var(--foreground))" }}>
                      {uf.file.name}
                    </p>
                    <p className="text-[10px] font-mono" style={{ color: "hsl(var(--muted-foreground))" }}>
                      {formatSize(uf.file.size)}
                    </p>
                  </div>
                  <button
                    onClick={() => removeFile(uf.id)}
                    className="w-7 h-7 flex items-center justify-center rounded"
                    style={{ backgroundColor: "hsl(var(--muted))" }}
                  >
                    <X className="w-3.5 h-3.5" style={{ color: "hsl(var(--muted-foreground))" }} />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {uploadedFiles.length > 0 && (
            <p className="text-[10px] font-mono" style={{ color: "hsl(var(--safe))" }}>
              {uploadedFiles.length} file{uploadedFiles.length > 1 ? "s" : ""} attached
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          id="submit-report-btn"
          onClick={handleSubmit}
          disabled={!description.trim() || submitting}
          className="btn-primary"
          style={{
            opacity: !description.trim() || submitting ? 0.5 : 1,
            cursor: !description.trim() || submitting ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <span
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                style={{ display: "inline-block" }}
              />
              SUBMITTING...
            </span>
          ) : (
            "SUBMIT REPORT"
          )}
        </button>

        <p className="text-[10px] font-mono text-center pb-4" style={{ color: "hsl(var(--muted-foreground))" }}>
          Report can be converted to an official complaint at any time
        </p>
      </div>

      <BottomNav />
    </div>
  );
};

export default ReportPage;
