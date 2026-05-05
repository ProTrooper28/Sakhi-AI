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
          <div className="w-full max-w-5xl flex items-center justify-start gap-4 mb-10">
             <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-black text-white text-[10px] font-bold flex items-center justify-center">1</div>
                <span className="text-[13px] font-bold text-slate-900">Select Report Type</span>
             </div>
             <div className="w-12 h-[2px] bg-slate-100 mx-2" />
             <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-white border-2 border-slate-200 text-slate-400 text-[10px] font-bold flex items-center justify-center">2</div>
                <span className="text-[13px] font-semibold text-slate-400">Report Details</span>
             </div>
             <div className="w-12 h-[2px] bg-slate-100 mx-2" />
             <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-white border-2 border-slate-200 text-slate-400 text-[10px] font-bold flex items-center justify-center">3</div>
                <span className="text-[13px] font-semibold text-slate-400">Review & Submit</span>
             </div>
          </div>

          <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-8 pb-10">
             
             {/* Left Column - Step 1 Classification */}
             <div className="w-full lg:w-[340px] shrink-0">
                <h2 className="text-[17px] font-bold text-slate-900 mb-5">Step 1: Classification</h2>
                <div className="space-y-4">
                   
                   {/* Physical Incident */}
                   <button 
                     onClick={() => setReportType("physical")}
                     className={`w-full text-left p-6 rounded-2xl border-2 transition-all relative ${reportType === "physical" ? "border-slate-900 bg-white shadow-sm" : "border-slate-100 bg-white hover:border-slate-200"}`}
                   >
                     {reportType === "physical" && (
                        <div className="absolute top-5 right-5 w-5 h-5 bg-black rounded-full flex items-center justify-center">
                           <Check className="w-3 h-3 text-white" />
                        </div>
                     )}
                     <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${reportType === "physical" ? "bg-[#1e293b] text-white" : "bg-slate-50 border border-slate-100 text-slate-400"}`}>
                        <Shield className="w-5 h-5" />
                     </div>
                     <h3 className={`text-[15px] font-bold mb-2 ${reportType === "physical" ? "text-slate-900" : "text-slate-500"}`}>Physical Incident</h3>
                     <p className="text-[11px] text-slate-500 font-medium leading-relaxed pr-2">Assault, physical harassment, theft, or real-world threats encountered in public or private spaces.</p>
                   </button>

                   {/* Digital Incident */}
                   <button 
                     onClick={() => setReportType("cyber")}
                     className={`w-full text-left p-6 rounded-2xl border-2 transition-all relative ${reportType === "cyber" ? "border-slate-900 bg-white shadow-sm" : "border-slate-100 bg-white hover:border-slate-200"}`}
                   >
                     {reportType === "cyber" && (
                        <div className="absolute top-5 right-5 w-5 h-5 bg-black rounded-full flex items-center justify-center">
                           <Check className="w-3 h-3 text-white" />
                        </div>
                     )}
                     <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${reportType === "cyber" ? "bg-[#1e293b] text-white" : "bg-slate-50 border border-slate-100 text-slate-400"}`}>
                        <Shield className="w-5 h-5" /> {/* Could use a different icon like AlertTriangle or Wifi */}
                     </div>
                     <h3 className={`text-[15px] font-bold mb-2 ${reportType === "cyber" ? "text-slate-900" : "text-slate-500"}`}>Digital / Online Threat</h3>
                     <p className="text-[11px] text-slate-500 font-medium leading-relaxed pr-2">Cyber stalking, digital harassment, or unauthorized access to sensitive accounts.</p>
                   </button>

                   {/* General Observation */}
                   <button 
                     onClick={() => setReportType("general")}
                     className={`w-full text-left p-6 rounded-2xl border-2 transition-all relative ${reportType === "general" ? "border-slate-900 bg-white shadow-sm" : "border-slate-100 bg-white hover:border-slate-200"}`}
                   >
                     {reportType === "general" && (
                        <div className="absolute top-5 right-5 w-5 h-5 bg-black rounded-full flex items-center justify-center">
                           <Check className="w-3 h-3 text-white" />
                        </div>
                     )}
                     <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${reportType === "general" ? "bg-[#1e293b] text-white" : "bg-slate-50 border border-slate-100 text-slate-400"}`}>
                        <Shield className="w-5 h-5" />
                     </div>
                     <h3 className={`text-[15px] font-bold mb-2 ${reportType === "general" ? "text-slate-900" : "text-slate-500"}`}>General Observation</h3>
                     <p className="text-[11px] text-slate-500 font-medium leading-relaxed pr-2">Suspicious activity or environmental hazards that require non-emergency monitoring.</p>
                   </button>

                </div>
             </div>

             {/* Right Column - Step 2 Details */}
             <div className="flex-1 bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-8">
                <h2 className="text-[17px] font-bold text-slate-900 mb-6">Step 2: Incident Details</h2>
                
                <div className="space-y-7">
                   {/* Description */}
                   <div>
                      <label className="block text-[13px] font-bold text-slate-700 mb-2">Incident Description</label>
                      <textarea
                         value={description}
                         onChange={(e) => setDescription(e.target.value)}
                         placeholder={reportType === "physical" ? "Describe the physical incident with as much detail as possible. What happened? Who was involved?" : "Describe the nature of the cyber threat, harassment, or unauthorized access..."}
                         className="w-full h-36 p-4 rounded-xl border border-slate-200 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-shadow resize-none"
                      />
                      <p className="text-[11px] text-slate-400 italic mt-2">Encryption: This data is end-to-end encrypted before storage.</p>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Location */}
                      <div>
                         <div className="flex items-center justify-between mb-2">
                            <label className="text-[13px] font-bold text-slate-700">Location</label>
                            <div className="flex items-center gap-2">
                               <span className="text-[11px] font-medium text-slate-400">Auto-detect</span>
                               <button 
                                 onClick={() => setAutoDetectLoc(!autoDetectLoc)}
                                 className={`w-8 h-[18px] rounded-full relative transition-colors ${autoDetectLoc ? "bg-slate-900" : "bg-slate-200"}`}
                               >
                                  <div className={`w-[14px] h-[14px] bg-white rounded-full absolute top-[2px] shadow-sm transition-transform ${autoDetectLoc ? "left-4" : "left-0.5"}`} />
                               </button>
                            </div>
                         </div>
                         <div className="relative">
                            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                               type="text" 
                               value={locationStr}
                               onChange={(e) => setLocationStr(e.target.value)}
                               placeholder={autoDetectLoc ? "34.0522° N, 118.2437° W" : "Enter location..."}
                               disabled={autoDetectLoc}
                               className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-[13px] text-slate-900 bg-slate-50/50 focus:outline-none focus:border-slate-400 disabled:opacity-70"
                            />
                         </div>
                      </div>

                      {/* Time */}
                      <div>
                         <label className="block text-[13px] font-bold text-slate-700 mb-2">Time of Incident</label>
                         <div className="relative">
                            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                               type="text" 
                               value={timeStr}
                               onChange={(e) => setTimeStr(e.target.value)}
                               placeholder="05/20/2024 02:30 PM"
                               className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-[13px] text-slate-900 focus:outline-none focus:border-slate-400"
                            />
                         </div>
                      </div>
                   </div>

                   {/* Evidence Upload */}
                   <div>
                      <div className="flex items-center justify-between mb-2">
                         <label className="text-[13px] font-bold text-slate-700">Evidence Upload <span className="font-normal text-slate-400">(Optional)</span></label>
                         <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md">
                            <Shield className="w-3.5 h-3.5" /> Secured
                         </div>
                      </div>
                      
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,audio/*,video/*,application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />

                      <div
                        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={handleDrop}
                        className={`w-full rounded-2xl border-2 border-dashed p-8 flex flex-col items-center justify-center transition-colors ${dragging ? "border-slate-400 bg-slate-50" : "border-slate-200 bg-[#fafafa]"}`}
                      >
                         <div className="w-12 h-12 bg-white shadow-sm border border-slate-100 rounded-xl flex items-center justify-center mb-4 text-slate-600">
                            <Upload className="w-5 h-5" />
                         </div>
                         <p className="text-[14px] font-bold text-slate-900 mb-1">Drag and drop media here</p>
                         <p className="text-[12px] text-slate-500 font-medium mb-6 text-center max-w-[300px]">Support for Photos (JPG, PNG), Video (MP4), and Audio (WAV, MP3)</p>
                         
                         <div className="flex items-center gap-3">
                            <button onClick={handleFilePick} className="px-5 py-2.5 rounded-lg border border-slate-200 text-[12px] font-bold text-slate-700 bg-white shadow-sm hover:bg-slate-50 transition-colors">
                               Select Files
                            </button>
                            <button className="px-5 py-2.5 rounded-lg text-[12px] font-bold text-white bg-[#0f172a] shadow-sm hover:bg-black transition-colors flex items-center gap-2">
                               <Camera className="w-3.5 h-3.5" /> Use AI Camera
                            </button>
                         </div>
                      </div>

                      {/* File List */}
                      {uploadedFiles.length > 0 && (
                         <div className="mt-4 space-y-2">
                            {uploadedFiles.map((uf) => {
                               const Icon = getFileIcon(uf.file.type);
                               return (
                                 <div key={uf.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white shadow-sm">
                                    {uf.previewUrl ? (
                                      <img src={uf.previewUrl} alt={uf.file.name} className="w-10 h-10 object-cover rounded flex-shrink-0 border border-slate-100" />
                                    ) : (
                                      <div className="w-10 h-10 flex items-center justify-center rounded flex-shrink-0 bg-slate-100 text-slate-500">
                                        <Icon className="w-5 h-5" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[12px] font-bold text-slate-900 truncate">{uf.file.name}</p>
                                      <p className="text-[10px] text-slate-500">{formatSize(uf.file.size)}</p>
                                    </div>
                                    <button onClick={() => removeFile(uf.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                                      <X className="w-4 h-4" />
                                    </button>
                                 </div>
                               );
                            })}
                         </div>
                      )}
                   </div>

                   {/* Footer Actions */}
                   <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                      <button className="text-[14px] font-bold text-slate-500 hover:text-slate-900 transition-colors">
                         Save Draft
                      </button>
                      <button 
                         onClick={handleSubmit}
                         disabled={!description.trim() || submitting}
                         className={`px-6 py-3.5 rounded-xl text-[14px] font-bold text-white transition-all flex items-center gap-2 ${(!description.trim() || submitting) ? "bg-slate-300 cursor-not-allowed" : "bg-black hover:bg-slate-900 shadow-md hover:shadow-lg"}`}
                      >
                         {submitting ? "Processing..." : "Continue to Review"} <ChevronRight className="w-4 h-4" />
                      </button>
                   </div>
                </div>

             </div>

          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ReportPage;
