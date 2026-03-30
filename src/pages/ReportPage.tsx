import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, Camera, FileText, Shield, AlertTriangle, Eye, EyeOff, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BottomNav from "@/components/BottomNav";

type ReportType = "cyber" | "general" | null;

const ReportPage = () => {
  const [reportType, setReportType] = useState<ReportType>(null);
  const [anonymous, setAnonymous] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [description, setDescription] = useState("");

  if (submitted) {
    return (
      <div className="min-h-screen bg-background pb-24 flex flex-col items-center justify-center px-5">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-safe/10 flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-safe" />
          </div>
          <h2 className="text-xl font-bold">Report Submitted</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Your report has been received. {anonymous ? "Your identity is protected." : ""} You can convert this into an official complaint later.
          </p>
          <Button onClick={() => { setSubmitted(false); setReportType(null); }}>Submit Another</Button>
        </motion.div>
        <BottomNav />
      </div>
    );
  }

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
            <div className={`w-5 h-5 rounded-full bg-card absolute top-0.5 transition-transform ${anonymous ? "translate-x-4" : "translate-x-0.5"}`} />
          </div>
        </button>

        {/* Description */}
        <div className="space-y-2">
          <Label>Describe the incident</Label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What happened? Include as much detail as possible..."
            className="w-full min-h-[120px] rounded-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        {/* Evidence Upload */}
        <div className="space-y-2">
          <Label>Evidence (optional)</Label>
          <div className="glass rounded-xl p-6 text-center border-dashed border-2 border-border">
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Tap to upload screenshots or files</p>
            <p className="text-xs text-muted-foreground mt-1">PNG, JPG, PDF up to 10MB</p>
          </div>
        </div>

        {/* Severity */}
        {reportType === "general" && (
          <div className="glass rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-warning" />
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

        <Button onClick={() => setSubmitted(true)} className="w-full" size="lg" disabled={!description.trim()}>
          Submit Report
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
