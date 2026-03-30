import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Camera, FileText, Shield, AlertTriangle,
  Eye, EyeOff, ArrowRight, X, Image, Film, FileAudio, File,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import type { EvidenceItem } from "@/context/AppContext";

type ReportType = "cyber" | "general" | null;

type UploadedFile = {
  file: File;
  previewUrl?: string;
  id: string;
};

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
    const arr = Array.from(files);
    arr.forEach((file) => {
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
    await new Promise((r) => setTimeout(r, 800)); // simulate async

    // Get location
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

    const id = addReport({
      reportType,
      description,
      anonymous,
      location,
      evidence,
      status: "pending",
    });

    setSubmitting(false);
    navigate(`/report-review/${id}`);
  };

  if (!reportType) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="px-5 pt-6 pb-4">
          <h1 className="text-xl font-bold">Anonymous Reporting</h1>
          <p className="text-sm text-muted-foreground">Your identity stays protected</p>
        </div>
        <div className="px-5 space-y-4">
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setReportType("cyber")}
            className="w-full glass rounded-2xl p-5 text-left flex items-center gap-4 hover:border-primary/30 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <Camera className="w-6 h-6 text-accent" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Cyber Incident</p>
              <p className="text-xs text-muted-foreground">Upload screenshots, AI summarizes & suggests action</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </motion.button>

          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => setReportType("general")}
            className="w-full glass rounded-2xl p-5 text-left flex items-center gap-4 hover:border-primary/30 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-warning" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">General Report</p>
              <p className="text-xs text-muted-foreground">Report with or without evidence</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </motion.button>

          {/* Evidence Locker shortcut */}
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => navigate("/evidence-locker")}
            className="w-full glass rounded-2xl p-5 text-left flex items-center gap-4 hover:border-safe/30 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-safe/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-safe" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Evidence Locker</p>
              <p className="text-xs text-muted-foreground">View stored recordings & media</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </motion.button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-5 pt-6 pb-4">
        <button onClick={() => setReportType(null)} className="text-sm text-primary mb-2">← Back</button>
        <h1 className="text-xl font-bold">
          {reportType === "cyber" ? "Cyber Incident Report" : "General Report"}
        </h1>
      </div>

      <div className="px-5 space-y-5">
        {/* Anonymous Toggle */}
        <button
          onClick={() => setAnonymous(!anonymous)}
          className="w-full glass rounded-xl p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            {anonymous ? <EyeOff className="w-5 h-5 text-safe" /> : <Eye className="w-5 h-5 text-muted-foreground" />}
            <div className="text-left">
              <p className="text-sm font-medium">{anonymous ? "Anonymous Mode" : "Identity Visible"}</p>
              <p className="text-xs text-muted-foreground">
                {anonymous ? "Your identity is hidden" : "Authorities can see your identity"}
              </p>
            </div>
          </div>
          <div className={`w-10 h-6 rounded-full transition-colors ${anonymous ? "bg-safe" : "bg-muted"} relative`}>
            <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${anonymous ? "translate-x-4" : "translate-x-0.5"}`} />
          </div>
        </button>

        {/* Description */}
        <div className="space-y-2">
          <Label>Describe the incident <span className="text-sos">*</span></Label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What happened? Include as much detail as possible..."
            className="w-full min-h-[120px] rounded-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <p className="text-xs text-muted-foreground text-right">{description.length} chars</p>
        </div>

        {/* Evidence Upload */}
        <div className="space-y-3">
          <Label>Evidence <span className="text-muted-foreground font-normal">(optional — affects credibility score)</span></Label>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,audio/*,video/*,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Drop Zone */}
          <div
            onClick={handleFilePick}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`glass rounded-xl p-6 text-center border-dashed border-2 cursor-pointer transition-all ${dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
          >
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Tap to upload or drag & drop</p>
            <p className="text-xs text-muted-foreground mt-1">Images, audio, video, PDF — up to 10MB each</p>
          </div>

          {/* File Previews */}
          <AnimatePresence>
            {uploadedFiles.map((uf) => {
              const Icon = getFileIcon(uf.file.type);
              return (
                <motion.div
                  key={uf.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="glass rounded-xl p-3 flex items-center gap-3"
                >
                  {uf.previewUrl ? (
                    <img src={uf.previewUrl} alt={uf.file.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{uf.file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatSize(uf.file.size)}</p>
                  </div>
                  <button
                    onClick={() => removeFile(uf.id)}
                    className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-sos/20"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {uploadedFiles.length > 0 && (
            <p className="text-xs text-safe font-medium">✓ {uploadedFiles.length} file{uploadedFiles.length > 1 ? "s" : ""} attached — credibility will be scored</p>
          )}
        </div>

        {/* Info Cards */}
        {reportType === "general" && (
          <div className="glass rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">High Risk – Low Evidence</p>
              <p className="text-xs text-muted-foreground">Reports without evidence are flagged for monitoring</p>
            </div>
          </div>
        )}

        {reportType === "cyber" && (
          <div className="glass rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <p className="text-sm font-medium">AI Analysis</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Our AI will summarize the incident, suggest legal actions, and optionally forward to the official cybercrime portal.
            </p>
          </div>
        )}

        <Button
          onClick={handleSubmit}
          className="w-full"
          size="lg"
          disabled={!description.trim() || submitting}
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Submitting...
            </span>
          ) : (
            "Submit Report →"
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground pb-4">
          You can convert this into an official complaint later
        </p>
      </div>

      <BottomNav />
    </div>
  );
};

export default ReportPage;
