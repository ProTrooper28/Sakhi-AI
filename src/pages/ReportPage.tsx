import { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Upload, X, Image, Film, FileAudio, File,
  Bell, Shield, Check, MapPin, Calendar, Camera, ChevronRight
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import type { EvidenceItem } from "@/context/AppContext";

type ReportType = "physical" | "cyber" | "general" | null;
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
  const [reportType, setReportType] = useState<ReportType>("physical");
  const [description, setDescription] = useState("");
  const [locationStr, setLocationStr] = useState("");
  const [timeStr, setTimeStr] = useState("");
  const [autoDetectLoc, setAutoDetectLoc] = useState(true);
  
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

    let finalLoc = locationStr;
    if (autoDetectLoc && !finalLoc) {
       try {
         const pos = await new Promise<GeolocationPosition>((res, rej) =>
           navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 })
         );
         finalLoc = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
       } catch {
         finalLoc = "Unknown";
       }
    }

    const evidence: EvidenceItem[] = uploadedFiles.map((uf) => ({
      id: uf.id,
      type: "report-media" as const,
      name: uf.file.name,
      fileUrl: uf.previewUrl,
      fileType: uf.file.type,
      timestamp: new Date().toISOString(),
      location: finalLoc,
    }));

    const id = addReport({ 
       reportType: reportType === "physical" ? "general" : reportType, 
       description, 
       anonymous: true, 
       location: finalLoc, 
       evidence, 
       status: "pending" 
    });
    setSubmitting(false);
    navigate(`/report-review/${id}`);
  };

  return (
    <AppLayout>
      <div className="flex flex-col min-h-screen bg-slate-950">
        {/* Top Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-800/50 bg-slate-900/20 backdrop-blur-md shrink-0">
          <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }}>
             <h1 className="text-2xl font-black text-slate-100 leading-tight tracking-tight uppercase" style={{ fontFamily: "Manrope, sans-serif" }}>Incident Documentation</h1>
             <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-2">Protocol: Zero-Knowledge Encryption • Secure Node: Active</p>
          </motion.div>
          <div className="flex items-center gap-5">
             <motion.button whileHover={{ scale: 1.1 }} className="text-slate-600 hover:text-white transition-colors"><Bell className="w-5 h-5" /></motion.button>
             <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center text-slate-950 font-black shadow-lg">
                P
             </div>
          </div>
        </div>

        <div className="flex flex-col flex-1 p-8 items-center justify-start relative bg-slate-950 overflow-y-auto">
          
          {/* Progress Tracker */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-5xl flex items-center justify-start gap-4 mb-10"
          >
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-teal-500 text-slate-950 text-[11px] font-black flex items-center justify-center shadow-lg uppercase">1</div>
                <span className="text-[11px] font-black text-slate-100 uppercase tracking-widest">Classification</span>
             </div>
             <div className="w-12 h-px bg-slate-800" />
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 text-slate-600 text-[11px] font-black flex items-center justify-center">2</div>
                <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Evidence Details</span>
             </div>
             <div className="w-12 h-px bg-slate-800" />
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 text-slate-600 text-[11px] font-black flex items-center justify-center">3</div>
                <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Protocol Review</span>
             </div>
          </motion.div>

          <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-8 pb-10">
             
             {/* Left Column - Step 1 Classification */}
             <div className="w-full lg:w-[360px] shrink-0">
                <h2 className="text-[14px] font-black text-slate-100 mb-6 flex items-center gap-2 uppercase tracking-[0.1em]">
                   Select Incident Vector
                </h2>
                <div className="space-y-4">
                  {[
                    { id: "physical", title: "Physical Threat", desc: "Assault, stalking, or immediate physical hazards encountered." },
                    { id: "cyber", title: "Digital Vector", desc: "Cyber stalking, digital harassment, or account compromises." },
                    { id: "general", title: "Field Observation", desc: "Suspicious activities or environmental monitoring required." }
                  ].map((type, i) => (
                      <motion.button 
                        key={type.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setReportType(type.id as ReportType)}
                        className={`w-full text-left p-6 rounded-[28px] border-2 transition-all relative group ${reportType === type.id ? "border-teal-500/50 bg-slate-900/60 shadow-2xl" : "border-slate-800 bg-slate-900/20 hover:border-slate-700"}`}
                      >
                        <AnimatePresence>
                          {reportType === type.id && (
                             <motion.div 
                               initial={{ scale: 0 }}
                               animate={{ scale: 1 }}
                               exit={{ scale: 0 }}
                               className="absolute top-6 right-6 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center"
                             >
                                <Check className="w-3 h-3 text-slate-950" />
                             </motion.div>
                          )}
                        </AnimatePresence>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-all border ${reportType === type.id ? "bg-teal-500/10 text-teal-500 border-teal-500/20" : "bg-slate-950 text-slate-700 border-slate-800 group-hover:text-slate-500"}`}>
                           <Shield className="w-5 h-5" />
                        </div>
                        <h3 className={`text-[15px] font-black mb-2 uppercase tracking-tight transition-colors ${reportType === type.id ? "text-slate-100" : "text-slate-500"}`}>{type.title}</h3>
                        <p className="text-[11px] text-slate-500 font-black uppercase tracking-widest leading-relaxed">{type.desc}</p>
                      </motion.button>
                    ))}
                </div>
             </div>

             {/* Right Column - Step 2 Details */}
             <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="flex-1 bg-slate-900/40 backdrop-blur-md rounded-[32px] border border-slate-800/50 shadow-2xl p-10"
              >
                <h2 className="text-[14px] font-black text-slate-100 mb-8 uppercase tracking-[0.1em]">Incident Packet Details</h2>
                
                <div className="space-y-8">
                   {/* Description */}
                    <div>
                       <label className="block text-[10px] font-black text-slate-500 mb-3 uppercase tracking-[0.2em]">Detailed Narrative</label>
                       <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Provide a comprehensive timeline of events..."
                          className="w-full h-40 p-6 rounded-2xl border border-slate-800 bg-slate-950/50 text-[14px] font-black text-slate-100 placeholder:text-slate-800 focus:outline-none focus:border-teal-500/30 transition-all resize-none uppercase tracking-tight"
                       />
                    </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Location */}
                      <div>
                          <div className="flex items-center justify-between mb-3">
                             <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">GPS Telemetry</label>
                             <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Auto-detect</span>
                                <button 
                                  onClick={() => setAutoDetectLoc(!autoDetectLoc)}
                                  className={`w-8 h-[18px] rounded-full relative transition-colors ${autoDetectLoc ? "bg-teal-500" : "bg-slate-800"}`}
                                >
                                   <motion.div 
                                     animate={{ x: autoDetectLoc ? 16 : 2 }}
                                     className={`w-[14px] h-[14px] rounded-full absolute top-[2px] shadow-sm ${autoDetectLoc ? "bg-slate-950" : "bg-slate-500"}`}
                                   />
                                </button>
                             </div>
                          </div>
                          <div className="relative">
                             <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
                             <input 
                                type="text" 
                                value={locationStr}
                                onChange={(e) => setLocationStr(e.target.value)}
                                placeholder={autoDetectLoc ? "Awaiting Signal..." : "Enter manually..."}
                                disabled={autoDetectLoc}
                                className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-800 bg-slate-950/50 text-[11px] font-black text-slate-100 uppercase tracking-widest placeholder:text-slate-800 focus:outline-none focus:border-teal-500/30 transition-all"
                             />
                          </div>
                       </div>

                      {/* Time */}
                       <div>
                          <label className="block text-[10px] font-black text-slate-500 mb-3 uppercase tracking-[0.2em]">Timestamp</label>
                          <div className="relative">
                             <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
                             <input 
                                type="text" 
                                value={timeStr}
                                onChange={(e) => setTimeStr(e.target.value)}
                                placeholder="Today, 14:30 HRS"
                                className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-800 bg-slate-950/50 text-[11px] font-black text-slate-100 uppercase tracking-widest placeholder:text-slate-800 focus:outline-none focus:border-teal-500/30 transition-all"
                             />
                          </div>
                       </div>
                   </div>

                   {/* Evidence Upload */}
                    <div>
                       <div className="flex items-center justify-between mb-4">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Encrypted Evidence</label>
                          <div className="flex items-center gap-2 text-[9px] font-black text-teal-500 bg-teal-500/10 px-3 py-1.5 rounded-full border border-teal-500/20 uppercase tracking-widest">
                             <Shield className="w-3 h-3" /> Secure Packet
                          </div>
                       </div>
                      
                      <input ref={fileInputRef} type="file" multiple accept="image/*,audio/*,video/*,application/pdf" onChange={handleFileChange} className="hidden" />
                      <motion.div
                        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={handleDrop}
                        whileHover={{ borderColor: "rgba(20, 184, 166, 0.3)" }}
                        className={`w-full rounded-[28px] border-2 border-dashed p-12 flex flex-col items-center justify-center transition-all ${dragging ? "border-teal-500 bg-teal-500/5" : "border-slate-800 bg-slate-950/30"}`}
                      >
                         <div className="w-14 h-14 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center mb-6 text-slate-600 transition-colors shadow-2xl">
                            <Upload className="w-6 h-6" />
                         </div>
                         <p className="text-[13px] font-black text-slate-100 mb-1 uppercase tracking-widest">Inject Media Objects</p>
                         <p className="text-[9px] text-slate-500 font-black mb-8 text-center max-w-[280px] uppercase tracking-[0.2em]">Drag files into portal or initiate live link</p>
                         
                         <div className="flex items-center gap-4">
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleFilePick} className="px-8 py-3.5 rounded-xl border border-slate-800 text-[10px] font-black text-slate-300 bg-slate-900 uppercase tracking-widest shadow-xl hover:text-white transition-all">
                               Select Assets
                            </motion.button>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-8 py-3.5 rounded-xl text-[10px] font-black text-slate-950 bg-teal-500 shadow-[0_0_20px_rgba(20,184,166,0.2)] hover:bg-teal-400 transition-all flex items-center gap-3 uppercase tracking-widest">
                               <Camera className="w-4 h-4" /> Tactical Link
                            </motion.button>
                         </div>
                      </motion.div>

                      {/* File List */}
                      <AnimatePresence>
                        {uploadedFiles.length > 0 && (
                           <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-6 space-y-3">
                              {uploadedFiles.map((uf) => {
                                 const Icon = getFileIcon(uf.file.type);
                                 return (
                                    <motion.div 
                                     key={uf.id} 
                                     initial={{ opacity: 0, x: -10 }} 
                                     animate={{ opacity: 1, x: 0 }}
                                     className="flex items-center gap-4 p-4 rounded-2xl border border-slate-800 bg-slate-950/50 shadow-sm group"
                                   >
                                      {uf.previewUrl ? (
                                        <img src={uf.previewUrl} alt={uf.file.name} className="w-12 h-12 object-cover rounded-xl flex-shrink-0 border border-slate-800 shadow-lg" />
                                      ) : (
                                        <div className="w-12 h-12 flex items-center justify-center rounded-xl flex-shrink-0 bg-slate-900 text-slate-600 border border-slate-800">
                                          <Icon className="w-5 h-5" />
                                        </div>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[12px] font-black text-slate-100 truncate uppercase tracking-tight">{uf.file.name}</p>
                                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1">{formatSize(uf.file.size)} • Encrypted Node</p>
                                      </div>
                                      <button onClick={() => removeFile(uf.id)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 text-slate-600 hover:text-red-500 hover:bg-red-500/10 transition-all border border-slate-800">
                                        <X className="w-4 h-4" />
                                      </button>
                                   </motion.div>
                                 );
                              })}
                           </motion.div>
                        )}
                      </AnimatePresence>
                   </div>

                   {/* Footer Actions */}
                   <div className="flex items-center justify-between pt-10 border-t border-slate-800/50">
                      <button className="text-[10px] font-black text-slate-600 hover:text-slate-300 transition-colors uppercase tracking-[0.2em]">
                         Hold for Review
                      </button>
                      <motion.button 
                         whileHover={{ scale: 1.02 }}
                         whileTap={{ scale: 0.98 }}
                         onClick={handleSubmit}
                         disabled={!description.trim() || submitting}
                         className={`px-10 py-4.5 rounded-2xl text-[11px] font-black text-slate-950 transition-all flex items-center gap-3 uppercase tracking-widest shadow-2xl ${(!description.trim() || submitting) ? "bg-slate-800 text-slate-600 cursor-not-allowed" : "bg-teal-500 hover:bg-teal-400 shadow-teal-500/10"}`}
                      >
                         {submitting ? "Finalizing Encryption..." : "Initiate Protocol"} <ChevronRight className="w-4 h-4" />
                      </motion.button>
                   </div>
                </div>

             </motion.div>

          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ReportPage;
