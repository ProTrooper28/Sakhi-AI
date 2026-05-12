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
      <div className="flex flex-col min-h-screen bg-[#fcfcfd]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-white shrink-0">
          <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }}>
             <h1 className="text-2xl font-black text-slate-900 leading-tight tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>Anonymous Reporting</h1>
             <p className="text-[13px] text-slate-500 font-bold uppercase tracking-widest mt-1">Safe • Encrypted • Untraceable</p>
          </motion.div>
          <div className="flex items-center gap-5">
             <motion.button whileHover={{ scale: 1.1 }} className="text-slate-400 hover:text-slate-900 transition-colors"><Bell className="w-5 h-5" /></motion.button>
             <div className="w-9 h-9 rounded-full bg-slate-900 overflow-hidden border-2 border-white shadow-sm">
                <img src="https://ui-avatars.com/api/?name=User&background=0F172A&color=fff" alt="User" />
             </div>
          </div>
        </div>

        <div className="flex flex-col flex-1 p-8 items-center justify-start relative bg-[#fcfcfd] overflow-y-auto">
          
          {/* Progress Tracker */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-5xl flex items-center justify-start gap-4 mb-10"
          >
             <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-[11px] font-black flex items-center justify-center shadow-lg">1</div>
                <span className="text-[14px] font-black text-slate-900">Classification</span>
             </div>
             <div className="w-12 h-[2px] bg-slate-100 mx-2" />
             <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-white border-2 border-slate-100 text-slate-300 text-[11px] font-black flex items-center justify-center">2</div>
                <span className="text-[14px] font-bold text-slate-300">Details</span>
             </div>
             <div className="w-12 h-[2px] bg-slate-100 mx-2" />
             <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-white border-2 border-slate-100 text-slate-300 text-[11px] font-black flex items-center justify-center">3</div>
                <span className="text-[14px] font-bold text-slate-300">Review</span>
             </div>
          </motion.div>

          <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-8 pb-10">
             
             {/* Left Column - Step 1 Classification */}
             <div className="w-full lg:w-[360px] shrink-0">
                <h2 className="text-[17px] font-black text-slate-900 mb-6 flex items-center gap-2">
                   Select Category
                </h2>
                <div className="space-y-4">
                   {[
                     { id: "physical", title: "Physical Incident", desc: "Assault, physical harassment, theft, or real-world threats encountered." },
                     { id: "cyber", title: "Digital / Online", desc: "Cyber stalking, digital harassment, or unauthorized access to accounts." },
                     { id: "general", title: "Observation", desc: "Suspicious activity or environmental hazards that require monitoring." }
                   ].map((type, i) => (
                     <motion.button 
                       key={type.id}
                       initial={{ opacity: 0, x: -20 }}
                       animate={{ opacity: 1, x: 0 }}
                       transition={{ delay: i * 0.1 }}
                       whileHover={{ scale: 1.02, y: -2 }}
                       whileTap={{ scale: 0.98 }}
                       onClick={() => setReportType(type.id as ReportType)}
                       className={`w-full text-left p-6 rounded-[28px] border-2 transition-all relative group ${reportType === type.id ? "border-slate-900 bg-white shadow-xl shadow-slate-100" : "border-slate-50 bg-white hover:border-slate-100"}`}
                     >
                       <AnimatePresence>
                         {reportType === type.id && (
                            <motion.div 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              className="absolute top-6 right-6 w-5 h-5 bg-slate-900 rounded-full flex items-center justify-center"
                            >
                               <Check className="w-3 h-3 text-white" />
                            </motion.div>
                         )}
                       </AnimatePresence>
                       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-colors ${reportType === type.id ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-300 group-hover:text-slate-500"}`}>
                          <Shield className="w-6 h-6" />
                       </div>
                       <h3 className={`text-[16px] font-black mb-2 transition-colors ${reportType === type.id ? "text-slate-900" : "text-slate-400"}`}>{type.title}</h3>
                       <p className="text-[12px] text-slate-400 font-bold leading-relaxed">{type.desc}</p>
                     </motion.button>
                   ))}
                </div>
             </div>

             {/* Right Column - Step 2 Details */}
             <motion.div 
               initial={{ opacity: 0, scale: 0.98 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ delay: 0.3 }}
               className="flex-1 bg-white rounded-[32px] border border-slate-50 shadow-[0_10px_40px_rgba(0,0,0,0.02)] p-10"
             >
                <h2 className="text-[17px] font-black text-slate-900 mb-8">Document Incident</h2>
                
                <div className="space-y-8">
                   {/* Description */}
                   <div>
                      <label className="block text-[13px] font-black text-slate-700 mb-3 uppercase tracking-widest">Incident Description</label>
                      <textarea
                         value={description}
                         onChange={(e) => setDescription(e.target.value)}
                         placeholder="Describe the incident with as much detail as possible..."
                         className="w-full h-40 p-5 rounded-2xl border border-slate-100 bg-slate-50/30 text-[14px] text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-100 transition-all resize-none font-medium"
                      />
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Location */}
                      <div>
                         <div className="flex items-center justify-between mb-3">
                            <label className="text-[13px] font-black text-slate-700 uppercase tracking-widest">Location</label>
                            <div className="flex items-center gap-2">
                               <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Auto-detect</span>
                               <button 
                                 onClick={() => setAutoDetectLoc(!autoDetectLoc)}
                                 className={`w-8 h-[18px] rounded-full relative transition-colors ${autoDetectLoc ? "bg-slate-900" : "bg-slate-200"}`}
                               >
                                  <motion.div 
                                    animate={{ x: autoDetectLoc ? 16 : 2 }}
                                    className="w-[14px] h-[14px] bg-white rounded-full absolute top-[2px] shadow-sm" 
                                  />
                               </button>
                            </div>
                         </div>
                         <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                               type="text" 
                               value={locationStr}
                               onChange={(e) => setLocationStr(e.target.value)}
                               placeholder={autoDetectLoc ? "Auto-detecting..." : "Enter location..."}
                               disabled={autoDetectLoc}
                               className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 text-[13px] font-bold text-slate-900 placeholder:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-50 transition-all"
                            />
                         </div>
                      </div>

                      {/* Time */}
                      <div>
                         <label className="block text-[13px] font-black text-slate-700 mb-3 uppercase tracking-widest">Incident Time</label>
                         <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                               type="text" 
                               value={timeStr}
                               onChange={(e) => setTimeStr(e.target.value)}
                               placeholder="Today, 02:30 PM"
                               className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 text-[13px] font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-50 transition-all"
                            />
                         </div>
                      </div>
                   </div>

                   {/* Evidence Upload */}
                   <div>
                      <div className="flex items-center justify-between mb-4">
                         <label className="text-[13px] font-black text-slate-700 uppercase tracking-widest">Evidence Files</label>
                         <div className="flex items-center gap-1.5 text-[10px] font-black text-teal-600 bg-teal-50 px-3 py-1 rounded-full border border-teal-100">
                            <Shield className="w-3 h-3" /> Secure Upload
                         </div>
                      </div>
                      
                      <input ref={fileInputRef} type="file" multiple accept="image/*,audio/*,video/*,application/pdf" onChange={handleFileChange} className="hidden" />

                      <motion.div
                        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={handleDrop}
                        whileHover={{ borderColor: "#cbd5e1" }}
                        className={`w-full rounded-[24px] border-2 border-dashed p-10 flex flex-col items-center justify-center transition-all ${dragging ? "border-slate-900 bg-slate-50" : "border-slate-100 bg-slate-50/30"}`}
                      >
                         <div className="w-14 h-14 bg-white shadow-xl shadow-slate-100 border border-slate-50 rounded-2xl flex items-center justify-center mb-5 text-slate-400 group-hover:text-slate-900 transition-colors">
                            <Upload className="w-6 h-6" />
                         </div>
                         <p className="text-[14px] font-black text-slate-900 mb-1">Upload Media Evidence</p>
                         <p className="text-[12px] text-slate-400 font-bold mb-8 text-center max-w-[280px]">Drop files here or use the secure camera</p>
                         
                         <div className="flex items-center gap-4">
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleFilePick} className="px-6 py-3 rounded-xl border border-slate-200 text-[12px] font-black text-slate-700 bg-white shadow-sm hover:border-slate-300 transition-all">
                               Select Files
                            </motion.button>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-6 py-3 rounded-xl text-[12px] font-black text-white bg-slate-900 shadow-xl shadow-slate-200 hover:bg-black transition-all flex items-center gap-2">
                               <Camera className="w-4 h-4" /> AI Camera
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
                                     className="flex items-center gap-4 p-4 rounded-2xl border border-slate-50 bg-white shadow-sm group"
                                   >
                                      {uf.previewUrl ? (
                                        <img src={uf.previewUrl} alt={uf.file.name} className="w-11 h-11 object-cover rounded-xl flex-shrink-0 border border-slate-50 shadow-sm" />
                                      ) : (
                                        <div className="w-11 h-11 flex items-center justify-center rounded-xl flex-shrink-0 bg-slate-50 text-slate-400">
                                          <Icon className="w-5 h-5" />
                                        </div>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-black text-slate-900 truncate">{uf.file.name}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatSize(uf.file.size)} • Encrypted</p>
                                      </div>
                                      <button onClick={() => removeFile(uf.id)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
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
                   <div className="flex items-center justify-between pt-10 border-t border-slate-50">
                      <button className="text-[13px] font-black text-slate-300 hover:text-slate-900 transition-colors uppercase tracking-widest">
                         Save Draft
                      </button>
                      <motion.button 
                         whileHover={{ scale: 1.02 }}
                         whileTap={{ scale: 0.98 }}
                         onClick={handleSubmit}
                         disabled={!description.trim() || submitting}
                         className={`px-8 py-4 rounded-2xl text-[13px] font-black text-white transition-all flex items-center gap-3 shadow-xl ${(!description.trim() || submitting) ? "bg-slate-200 shadow-none cursor-not-allowed" : "bg-slate-900 hover:bg-black shadow-slate-200"}`}
                      >
                         {submitting ? "Processing..." : "Continue to Review"} <ChevronRight className="w-4 h-4" />
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
