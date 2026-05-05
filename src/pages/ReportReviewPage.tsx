import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield, AlertTriangle, CheckCircle, FileText, Clock,
  MapPin, Image, Film, FileAudio, File, ArrowLeft,
  BookLock, BarChart3, Gavel, Bell, Check, ChevronLeft
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useApp } from "@/context/AppContext";
import { toast } from "@/components/ui/use-toast";
import type { Report } from "@/context/AppContext";

/* ── Mock AI Logic ───────────────────────────────────────────── */

const LEGAL_KEYWORDS: Record<string, string[]> = {
  "Online Harassment":  ["harass", "abuse", "threat", "message", "dm", "text", "chat"],
  "Cyber Bullying":     ["bully", "bullied", "taunt", "insult", "mock", "troll", "comment"],
  "Stalking":           ["follow", "stalk", "track", "watch", "spy", "followed"],
  "Physical Assault":   ["hit", "punch", "kick", "assault", "attack", "beat", "hurt", "slap"],
  "Sexual Harassment":  ["touch", "grope", "inappropriate", "sexual", "molest", "rape"],
  "Blackmail":          ["blackmail", "extort", "money", "nude", "leak", "expose"],
  "Domestic Violence":  ["husband", "wife", "partner", "family", "home", "domestic", "violence"],
};

const detectLegalCategory = (description: string): string => {
  const lower = description.toLowerCase();
  for (const [category, keywords] of Object.entries(LEGAL_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return "General Safety Incident";
}

const generateSummary = (report: Report): string => {
  const cat = detectLegalCategory(report.description);
  const time = new Date(report.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const evidenceNote = report.evidence.length > 0
    ? `${report.evidence.length} piece(s) of evidence were attached.`
    : "No supporting evidence was uploaded at this time.";
  return `A ${report.reportType} incident was reported at ${time} and flagged as a potential case of ${cat}. ${evidenceNote} ${report.anonymous ? "The reporter chose to remain anonymous." : "The reporter's identity is on record."} This report has been reviewed by Sakhi AI for credibility and legal categorisation.`;
};

type Credibility = "Low" | "Medium" | "High";
const getCredibility = (evidence: Report["evidence"]): { level: Credibility; color: string; bg: string; pct: number; detail: string } => {
  if (evidence.length === 0)  return { level: "Low",    color: "text-red-500",     bg: "bg-red-500",     pct: 18,  detail: "No supporting files uploaded" };
  if (evidence.length === 1)  return { level: "Medium", color: "text-amber-500", bg: "bg-amber-500", pct: 55,  detail: "1 file attached" };
  return                             { level: "High",   color: "text-teal-500",    bg: "bg-teal-500",    pct: 90,  detail: `${evidence.length} files attached` };
};

const getFileIcon = (type?: string) => {
  if (!type) return File;
  if (type.startsWith("image/")) return Image;
  if (type.startsWith("video/")) return Film;
  if (type.startsWith("audio/")) return FileAudio;
  return File;
};

const ReportReviewPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getReport, updateReport } = useApp();

  const report = id ? getReport(id) : undefined;

  if (!report) {
    return (
      <AppLayout>
      <div className="min-h-screen bg-[#fcfcfd] flex flex-col items-center justify-center gap-4 px-5">
        <AlertTriangle className="w-12 h-12 text-amber-500" />
        <h2 className="text-lg font-bold text-slate-900">Report Not Found</h2>
        <button onClick={() => navigate("/report")} className="px-5 py-2.5 rounded-lg bg-slate-900 text-white font-bold text-[13px]">Go Back</button>
      </div>
      </AppLayout>
    );
  }

  const cred = getCredibility(report.evidence);
  const summary = generateSummary(report);
  const legalCategory = detectLegalCategory(report.description);
  const reportTime = new Date(report.timestamp).toLocaleString();

  const handleAnonymousSave = () => {
    updateReport(report.id, { status: "anonymous" });
    toast({ title: "✅ Saved Anonymously", description: "Your report is stored securely." });
    navigate("/evidence-locker");
  };

  const handleHighRisk = () => {
    updateReport(report.id, { status: "high-risk", flaggedHighRisk: true });
    toast({
      title: "⚠️ Marked High Risk",
      description: "This no-evidence case has been flagged for monitoring.",
      variant: "destructive",
    });
    navigate("/evidence-locker");
  };

  return (
    <AppLayout>
      <div className="flex flex-col min-h-screen bg-[#fcfcfd]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-white shrink-0">
          <div>
             <h1 className="text-2xl font-bold text-slate-900 leading-tight" style={{ fontFamily: "Manrope, sans-serif" }}>Anonymous Reporting</h1>
             <p className="text-[13px] text-slate-500 font-medium">Secure, encrypted, and untraceable incident logging.</p>
          </div>
          <div className="flex items-center gap-5">
             <Bell className="w-5 h-5 text-slate-600" />
             <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                <img src="https://ui-avatars.com/api/?name=User&background=0F172A&color=fff" alt="User" />
             </div>
          </div>
        </div>

        <div className="flex flex-col flex-1 p-8 items-center justify-start relative bg-[#fcfcfd] overflow-y-auto">
          
          {/* Progress Tracker */}
          <div className="w-full max-w-4xl flex items-center justify-start gap-4 mb-10">
             <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 text-[10px] font-bold flex items-center justify-center"><Check className="w-3 h-3" /></div>
             </div>
             <div className="w-12 h-[2px] bg-slate-200 mx-2" />
             <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 text-[10px] font-bold flex items-center justify-center"><Check className="w-3 h-3" /></div>
             </div>
             <div className="w-12 h-[2px] bg-slate-200 mx-2" />
             <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-black text-white text-[10px] font-bold flex items-center justify-center">3</div>
                <span className="text-[13px] font-bold text-slate-900">Review & Submit</span>
             </div>
          </div>

          <div className="w-full max-w-4xl flex flex-col md:flex-row gap-8 pb-10">
             
             {/* Left Column - Summary & AI */}
             <div className="flex-1 space-y-6">
                
                {/* AI Summary */}
                <div className="bg-gradient-to-br from-indigo-50 to-white rounded-[24px] border border-indigo-100 shadow-sm p-6 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-indigo-500/5 blur-2xl -translate-y-8 translate-x-8 pointer-events-none" />
                   
                   <div className="flex items-center gap-2 mb-4">
                      <Shield className="w-5 h-5 text-indigo-600" />
                      <span className="text-[15px] font-bold text-slate-900">Sakhi AI Summary</span>
                      <span className="ml-auto text-[10px] bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-bold">AI Generated</span>
                   </div>
                   <p className="text-[13px] leading-relaxed text-slate-700 relative z-10 mb-4">{summary}</p>
                   <div className="flex items-center gap-2 pt-4 border-t border-indigo-100/50 relative z-10">
                      <Gavel className="w-4 h-4 text-slate-500" />
                      <span className="text-[12px] font-medium text-slate-500">Legal Category:</span>
                      <span className="text-[12px] font-bold text-indigo-700">{legalCategory}</span>
                   </div>
                </div>

                {/* Report Details */}
                <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-6">
                   <div className="flex items-center gap-2 mb-4">
                      <FileText className="w-5 h-5 text-slate-900" />
                      <span className="text-[15px] font-bold text-slate-900">Incident Details</span>
                   </div>
                   <p className="text-[13px] leading-relaxed text-slate-600 mb-5">{report.description}</p>
                   
                   <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg">
                         <Clock className="w-3.5 h-3.5" /> {reportTime}
                      </div>
                      {report.location && (
                         <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg">
                            <MapPin className="w-3.5 h-3.5" /> {report.location}
                         </div>
                      )}
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg">
                         {report.reportType === "cyber" ? "Cyber Threat" : "Physical Incident"}
                      </div>
                      {report.anonymous && (
                         <div className="flex items-center gap-1.5 text-[11px] font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-100">
                            Anonymous
                         </div>
                      )}
                   </div>

                   {/* Attached Files */}
                   {report.evidence.length > 0 && (
                      <div className="space-y-2 pt-6">
                         <p className="text-[12px] font-bold text-slate-700 mb-3">Attached Evidence</p>
                         {report.evidence.map((ev) => {
                            const Icon = getFileIcon(ev.fileType);
                            return (
                               <div key={ev.id} className="flex items-center gap-3 border border-slate-100 rounded-xl px-3 py-2 bg-slate-50/50">
                                  {ev.fileUrl ? (
                                     <img src={ev.fileUrl} alt={ev.name} className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                                  ) : (
                                     <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center text-slate-500">
                                        <Icon className="w-5 h-5" />
                                     </div>
                                  )}
                                  <p className="text-[12px] font-medium text-slate-700 truncate flex-1">{ev.name}</p>
                               </div>
                            );
                         })}
                      </div>
                   )}
                </div>

             </div>

             {/* Right Column - Score & Actions */}
             <div className="w-full md:w-[320px] shrink-0 space-y-6">
                
                {/* Credibility */}
                <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-6">
                   <div className="flex items-center gap-2 mb-4">
                      <BarChart3 className="w-5 h-5 text-slate-900" />
                      <span className="text-[15px] font-bold text-slate-900">Credibility Score</span>
                   </div>
                   
                   <div className="flex items-end justify-between mb-3">
                      <span className={`text-3xl font-black ${cred.color}`}>{cred.level}</span>
                      <span className="text-[11px] font-medium text-slate-500 mb-1">{cred.detail}</span>
                   </div>
                   
                   {/* Animated progress bar */}
                   <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden mb-4">
                      <motion.div
                         initial={{ width: 0 }}
                         animate={{ width: `${cred.pct}%` }}
                         transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                         className={`h-full rounded-full ${cred.bg}`}
                      />
                   </div>
                   
                   <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                      {cred.level === "Low"    && "Add photos, screenshots, or recordings to increase credibility."}
                      {cred.level === "Medium" && "Good start. Adding more evidence will strengthen your case."}
                      {cred.level === "High"   && "Strong case. Multiple pieces of evidence significantly help."}
                   </p>
                </div>

                {/* Actions */}
                <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-6">
                   <div className="flex items-center gap-2 mb-5">
                      <CheckCircle className="w-5 h-5 text-slate-900" />
                      <span className="text-[15px] font-bold text-slate-900">Final Actions</span>
                   </div>

                   <div className="space-y-3">
                      <button 
                        onClick={handleAnonymousSave} 
                        className="w-full bg-[#0f172a] hover:bg-black text-white px-5 py-3.5 rounded-xl text-[13px] font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
                      >
                        <BookLock className="w-4 h-4" /> Save as Anonymous Report
                      </button>

                      {report.evidence.length === 0 && (
                         <button 
                           onClick={handleHighRisk}
                           className="w-full bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 px-5 py-3.5 rounded-xl text-[13px] font-bold transition-colors flex items-center justify-center gap-2"
                         >
                           <AlertTriangle className="w-4 h-4" /> Mark High Risk (No Evidence)
                         </button>
                      )}

                      <button className="w-full bg-slate-50 text-slate-400 border border-slate-100 px-5 py-3.5 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 cursor-not-allowed">
                        <Gavel className="w-4 h-4" /> Proceed to Official Complaint
                        <span className="ml-1 text-[9px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-sm">Soon</span>
                      </button>
                   </div>
                   
                   <p className="text-[10px] text-center text-slate-400 font-medium mt-5">
                      All data is stored locally and never shared without your consent.
                   </p>
                </div>
                
                <button onClick={() => navigate("/report")} className="w-full flex items-center justify-center gap-2 text-[13px] font-bold text-slate-500 hover:text-slate-900 transition-colors py-2">
                   <ChevronLeft className="w-4 h-4" /> Back to Edit Details
                </button>

             </div>

          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ReportReviewPage;
