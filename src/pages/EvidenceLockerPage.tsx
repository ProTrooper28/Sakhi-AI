import { useState } from "react";
import { Lock, Unlock, Shield, Calendar, MapPin, Eye, Download, Trash2, ShieldCheck, MoreVertical, Search, Filter, Grid, List as ListIcon, FileVideo, FileAudio, FileText, Clock, X, ChevronRight } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { motion, AnimatePresence } from "framer-motion";

import { useApp } from "@/context/AppContext";
const EvidenceLockerPage = () => {
  const { evidenceLocker, sosState } = useApp();
  const [isLocked, setIsLocked] = useState(true);
  const [pin, setPin] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [filterActive, setFilterActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleDownload = (item: any) => {
    if (item.fileUrl) {
      const a = document.createElement("a");
      a.href = item.fileUrl;
      a.download = item.name;
      a.click();
    } else {
      alert(`Downloading: ${item.name}`);
    }
  };

  const filteredList = (list: any[]) => {
    if (!searchQuery.trim()) return list;
    return list.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.location.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  const evidenceList = [
    { id: 1, type: "video", name: "SOS_Incident_001.mp4", date: "Oct 24, 2023", time: "22:15", size: "4.2 MB", location: "Sector 18, Noida", icon: FileVideo, color: "text-blue-500", bg: "bg-blue-50", fileUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" },
    { id: 2, type: "audio", name: "Voice_Log_Oct23.wav", date: "Oct 23, 2023", time: "18:45", size: "1.8 MB", location: "Cyber Hub, Gurgaon", icon: FileAudio, color: "text-teal-500", bg: "bg-teal-50", fileUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
    { id: 3, type: "report", name: "Harassment_Report_Final.pdf", date: "Oct 20, 2023", time: "14:20", size: "0.5 MB", location: "MG Road, Pune", icon: FileText, color: "text-orange-500", bg: "bg-orange-50", textContent: "INCIDENT REPORT\n\nDate: Oct 20, 2023\nLocation: MG Road, Pune\n\nDescription:\nUser reported feeling unsafe due to an unidentified individual following them for approximately 15 minutes near MG Road metro station. SOS was triggered at 14:20, automatically recording 3 minutes of audio evidence. Emergency contacts were notified instantly. The individual departed when the user entered a crowded cafe.\n\nStatus: Resolved - Guardian Network verified user reached home safely." },
    { id: 4, type: "video", name: "Evidence_Clip_394.mp4", date: "Oct 18, 2023", time: "23:55", size: "12.4 MB", location: "Indiranagar, Bangalore", icon: FileVideo, color: "text-blue-500", bg: "bg-blue-50" }, // Intentionally left without fileUrl to test fallback
  ];

  const dynamicEvidence = evidenceLocker.map(item => {
    const d = new Date(item.timestamp);
    const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const timeStr = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    
    let icon = FileVideo;
    let color = "text-blue-500";
    let bg = "bg-blue-50";
    let type = "video";
    
    if (item.type === "report-media" || item.fileType?.includes("audio")) {
      icon = FileAudio;
      color = "text-teal-500";
      bg = "bg-teal-50";
      type = "audio";
    }

    return {
      id: item.id,
      type: type,
      name: item.name,
      date: dateStr,
      time: timeStr,
      size: sosState.active && item.id.startsWith("ev_sos_") ? "LIVE" : "Unknown Size",
      location: item.location || "Unknown Location",
      icon: icon,
      color: color,
      bg: bg,
      fileUrl: item.fileUrl,
      isLive: sosState.active && item.id.startsWith("ev_sos_") && (Date.now() - d.getTime() < 86400000)
    };
  });

  const allEvidence = [...dynamicEvidence, ...evidenceList];

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === "1234") {
      setIsLocked(false);
    } else {
      alert("Invalid Security PIN");
      setPin("");
    }
  };

  if (isLocked) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-full bg-background p-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-[440px] bg-slate-900/40 backdrop-blur-2xl rounded-[40px] p-12 shadow-2xl border border-slate-800/50 flex flex-col items-center"
          >
            <motion.div 
              animate={{ y: [0, -5, 0], scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="w-20 h-20 bg-teal-500 rounded-[24px] flex items-center justify-center text-slate-950 mb-8 shadow-[0_0_30px_rgba(20,184,166,0.3)]"
            >
              <Lock className="w-8 h-8" />
            </motion.div>
            
            <h1 className="text-2xl font-black text-slate-100 mb-2 uppercase tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>Secure Ops Vault</h1>
            <p className="text-slate-500 font-black text-[10px] text-center mb-10 leading-relaxed uppercase tracking-[0.2em]">End-to-End Encrypted Evidence Storage</p>
            
            <form onSubmit={handlePinSubmit} className="w-full space-y-6">
              <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Enter Security PIN</label>
                <div className="relative group">
                   <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-teal-500 transition-colors" />
                   <input
                     type="password"
                     maxLength={4}
                     value={pin}
                     onChange={(e) => setPin(e.target.value)}
                     placeholder="••••"
                     className="w-full bg-slate-950/50 border border-slate-800/50 rounded-2xl py-4.5 pl-14 text-center text-2xl font-black tracking-[0.5em] text-slate-100 placeholder:text-slate-800 focus:outline-none focus:border-teal-500/50 transition-all"
                   />
                </div>
              </div>
              
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full py-4.5 bg-teal-500 text-slate-950 font-black text-[12px] uppercase tracking-widest rounded-2xl shadow-[0_0_20px_rgba(20,184,166,0.3)] flex items-center justify-center gap-3 transition-all hover:bg-teal-400"
              >
                Unlock Repository <Unlock className="w-4 h-4" />
              </motion.button>
            </form>
            
            <div className="mt-10 flex items-center gap-2 text-slate-600">
               <ShieldCheck className="w-4 h-4 text-teal-500/50" />
               <span className="text-[9px] font-black uppercase tracking-[0.2em]">Certified Encryption Standard</span>
            </div>
          </motion.div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full bg-background">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-10 py-10 bg-slate-900/40 backdrop-blur-md border-b border-slate-800/50 flex items-center justify-between shrink-0"
        >
          <motion.div initial={{ x: -20 }} animate={{ x: 0 }}>
            <div className="flex items-center gap-4 mb-3">
               <div className="w-10 h-10 bg-teal-500/10 rounded-xl flex items-center justify-center border border-teal-500/20">
                  <ShieldCheck className="w-5 h-5 text-teal-500" />
               </div>
               <h1 className="text-2xl font-black text-slate-100 tracking-tight uppercase" style={{ fontFamily: "Manrope, sans-serif" }}>Secure Ops Vault</h1>
            </div>
            <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.25em] ml-14">System Integrity: Optimal • Active Packets: {allEvidence.length}</p>
          </motion.div>
          
          <div className="flex items-center gap-5">
             <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800/50">
                <button onClick={() => setViewMode("grid")} className={`p-2.5 rounded-xl transition-all cursor-pointer ${viewMode === "grid" ? "bg-slate-800 text-teal-500 shadow-xl" : "text-slate-600 hover:text-slate-400"}`}><Grid className="w-4 h-4" /></button>
                <button onClick={() => setViewMode("list")} className={`p-2.5 rounded-xl transition-all cursor-pointer ${viewMode === "list" ? "bg-slate-800 text-teal-500 shadow-xl" : "text-slate-600 hover:text-slate-400"}`}><ListIcon className="w-4 h-4" /></button>
             </div>
             <motion.button 
               whileHover={{ scale: 1.05, backgroundColor: "#334155" }}
               whileTap={{ scale: 0.95 }}
               onClick={() => setIsLocked(true)}
               className="px-6 py-3.5 bg-slate-800 text-slate-200 font-black text-[11px] rounded-xl border border-slate-700 uppercase tracking-widest transition-all shadow-xl"
             >
               Relock Node
             </motion.button>
          </div>
        </motion.div>

        {/* Filters & Content Area */}
        <div className="flex-1 overflow-y-auto p-10">
           {/* Search & Filters */}
           <div className="flex flex-col md:flex-row gap-4 mb-10">
              <div className="flex-1 relative group">
                 <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-teal-500 transition-colors" />
                 <input
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value)}
                   placeholder="Search secure repository..."
                   className="w-full bg-slate-900/40 border border-slate-800/50 rounded-2xl py-4.5 pl-14 pr-4 text-[13px] font-black text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-teal-500/30 transition-all shadow-xl"
                 />
              </div>
              <button
                onClick={() => setFilterActive(v => !v)}
                className={`px-8 border rounded-2xl flex items-center gap-3 font-black text-[11px] uppercase tracking-widest transition-all shadow-xl cursor-pointer ${
                  filterActive ? "bg-teal-500 border-teal-600 text-slate-950" : "bg-slate-900/40 border-slate-800/50 text-slate-500 hover:bg-slate-800"
                }`}
              >
                 <Filter className="w-4 h-4" /> {filterActive ? "Nodes Active" : "Categories"}
              </button>
           </div>

           {/* Grid Layout */}
           <div className={`grid gap-6 ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"}`}>
             <AnimatePresence>
                {filteredList(allEvidence).map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ y: -5, borderColor: "rgba(20, 184, 166, 0.3)" }}
                    className="bg-slate-900/40 backdrop-blur-md rounded-[32px] p-8 border border-slate-800/50 shadow-xl flex flex-col group transition-all relative"
                  >
                   <div className="flex justify-between items-start mb-6">
                       <div className={`w-14 h-14 rounded-2xl bg-slate-950/50 ${item.color} flex items-center justify-center shadow-lg border border-slate-800/50`}>
                          <item.icon className="w-7 h-7" />
                       </div>
                      <div className="relative">
                         <button
                           onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                           className="text-slate-600 hover:text-teal-500 transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-slate-950/50"
                         >
                           <MoreVertical className="w-5 h-5" />
                         </button>
                        <AnimatePresence>
                          {openMenuId === item.id && (
                             <motion.div
                               initial={{ opacity: 0, scale: 0.9, y: -4 }}
                               animate={{ opacity: 1, scale: 1, y: 0 }}
                               exit={{ opacity: 0, scale: 0.9, y: -4 }}
                               className="absolute right-0 top-10 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden min-w-[150px]"
                             >
                              {[
                                { label: "View", icon: Eye, action: () => { setSelectedItem(item); setOpenMenuId(null); } },
                                { label: "Download", icon: Download, action: () => { handleDownload(item); setOpenMenuId(null); } },
                                { label: "Delete", icon: Trash2, action: () => { setOpenMenuId(null); alert("File deleted"); }, danger: true },
                              ].map(m => (
                                <button
                                  key={m.label}
                                  onClick={m.action}
                                   className={`w-full flex items-center justify-between px-4 py-3 text-[11px] font-black uppercase tracking-widest transition-colors cursor-pointer border-b border-slate-900 last:border-0 ${
                                     m.danger ? "text-red-500 hover:bg-red-500/10" : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                                   }`}
                                 >
                                   {m.label} <m.icon className="w-3.5 h-3.5 opacity-60" />
                                 </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                   </div>

                    <div className="flex items-start justify-between mb-1.5">
                      <h3 className="text-[15px] font-black text-slate-100 truncate pr-2 tracking-tight uppercase">{item.name}</h3>
                     {item.isLive && (
                       <span className="flex items-center gap-1.5 px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-[9px] font-black tracking-widest shrink-0 animate-pulse">
                         <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span> RECORDING...
                       </span>
                     )}
                   </div>
                    <div className="flex items-center gap-4 text-[10px] font-black text-slate-500 mb-6 uppercase tracking-[0.2em]">
                       <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-teal-500/50" /> {item.date}</span>
                       <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-teal-500/50" /> {item.time}</span>
                    </div>

                    <div className="mt-auto pt-8 border-t border-slate-800/50 flex flex-col gap-4">
                        <div className="flex items-center gap-3 text-slate-500 mb-2">
                           <MapPin className="w-3.5 h-3.5 text-teal-500/50" />
                           <span className="text-[10px] font-black uppercase tracking-[0.15em] truncate">{item.location}</span>
                        </div>
                       <div className="flex gap-3">
                          <motion.button
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedItem(item)}
                            className="flex-1 py-3.5 bg-slate-800/50 text-slate-300 border border-slate-700/50 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-700 transition-all cursor-pointer"
                          >
                             <Eye className="w-3.5 h-3.5" /> View
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            onClick={() => handleDownload(item)}
                            className="flex-1 py-3.5 bg-teal-500 text-slate-950 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-teal-400 transition-all cursor-pointer shadow-lg shadow-teal-500/10"
                          >
                             <Download className="w-3.5 h-3.5" /> Save
                          </motion.button>
                       </div>
                    </div>
                 </motion.div>
               ))}
             </AnimatePresence>
           </div>

           {/* Preview Modal */}
           <AnimatePresence>
             {selectedItem && (
               <motion.div
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 onClick={() => setSelectedItem(null)}
                 className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 md:p-6"
               >
                 <motion.div
                   initial={{ opacity: 0, scale: 0.95, y: 20 }}
                   animate={{ opacity: 1, scale: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.95, y: 20 }}
                   onClick={e => e.stopPropagation()}
                   className="bg-[#0B1220] rounded-3xl overflow-hidden w-full max-w-4xl shadow-2xl border border-slate-800 flex flex-col max-h-[90vh]"
                 >
                   {/* Modal Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
                          <selectedItem.icon className="w-5 h-5 text-teal-500" />
                        </div>
                        <div>
                          <h2 className="text-[15px] font-black text-slate-100 truncate uppercase tracking-tight">{selectedItem.name}</h2>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Secure Preview Mode Active</p>
                        </div>
                      </div>
                      <button onClick={() => setSelectedItem(null)} className="p-3 text-slate-400 hover:text-white transition-all bg-slate-800 hover:bg-red-500/20 hover:text-red-500 rounded-2xl cursor-pointer border border-slate-700">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                   {/* Preview Content Area */}
                   <div className="flex-1 p-6 flex flex-col items-center justify-center min-h-[300px] bg-[#050B14] overflow-y-auto">
                     {selectedItem.fileUrl || selectedItem.textContent ? (
                       selectedItem.type === "video" ? (
                         <video src={selectedItem.fileUrl} controls autoPlay className="max-w-full rounded-xl shadow-lg border border-slate-800 max-h-[60vh] outline-none" />
                       ) : selectedItem.type === "audio" ? (
                         <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 w-full max-w-md flex flex-col items-center gap-6 shadow-xl">
                           <div className="w-16 h-16 rounded-full bg-teal-500/10 flex items-center justify-center">
                             <FileAudio className="w-8 h-8 text-teal-500" />
                           </div>
                           <audio src={selectedItem.fileUrl} controls autoPlay className="w-full" />
                         </div>
                       ) : selectedItem.type === "report" ? (
                         <div className="bg-white p-8 md:p-12 rounded-xl text-slate-800 max-w-2xl w-full mx-auto shadow-lg text-sm leading-relaxed whitespace-pre-wrap font-medium">
                           {selectedItem.textContent}
                         </div>
                       ) : (
                         <div className="text-slate-400 font-bold">Unsupported file format</div>
                       )
                     ) : (
                       <div className="flex flex-col items-center text-slate-500">
                         <selectedItem.icon className="w-16 h-16 mb-4 opacity-50" />
                         <p className="text-lg font-black tracking-wide">Preview not available</p>
                         <p className="text-xs font-bold mt-2 opacity-60 max-w-xs text-center leading-relaxed">This file has been securely encrypted and must be downloaded to view.</p>
                       </div>
                     )}
                                       {/* Metadata & Actions Footer */}
                    <div className="p-6 bg-slate-900/80 backdrop-blur-xl border-t border-slate-800 flex items-center justify-between w-full">
                      <div className="flex gap-6">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Asset Size</span>
                          <span className="text-[11px] font-black text-slate-300 uppercase">{selectedItem.size}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Injection Date</span>
                          <span className="text-[11px] font-black text-slate-300 uppercase">{selectedItem.date}</span>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={() => handleDownload(selectedItem)}
                        className="px-8 py-3.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-[11px] uppercase tracking-widest rounded-2xl shadow-2xl shadow-teal-500/10 flex items-center gap-3 transition-all cursor-pointer"
                      >
                        <Download className="w-4 h-4" /> Save Local Copy
                      </motion.button>
                    </div>          </div>
                 </motion.div>
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      </div>
    </AppLayout>
  );
};

export default EvidenceLockerPage;
