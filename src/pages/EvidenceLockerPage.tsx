import { useState } from "react";
import { Lock, Unlock, Shield, Calendar, MapPin, Eye, Download, Trash2, ShieldCheck, MoreVertical, Search, Filter, Grid, List as ListIcon, FileVideo, FileAudio, FileText, Clock, X, ChevronRight } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { motion, AnimatePresence } from "framer-motion";

const EvidenceLockerPage = () => {
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
    { id: 1, type: "video", name: "SOS_Incident_001.mp4", date: "Oct 24, 2023", time: "22:15", size: "4.2 MB", location: "Sector 18, Noida", icon: FileVideo, color: "text-blue-500", bg: "bg-blue-50" },
    { id: 2, type: "audio", name: "Voice_Log_Oct23.wav", date: "Oct 23, 2023", time: "18:45", size: "1.8 MB", location: "Cyber Hub, Gurgaon", icon: FileAudio, color: "text-teal-500", bg: "bg-teal-50" },
    { id: 3, type: "report", name: "Harassment_Report_Final.pdf", date: "Oct 20, 2023", time: "14:20", size: "0.5 MB", location: "MG Road, Pune", icon: FileText, color: "text-orange-500", bg: "bg-orange-50" },
    { id: 4, type: "video", name: "Evidence_Clip_394.mp4", date: "Oct 18, 2023", time: "23:55", size: "12.4 MB", location: "Indiranagar, Bangalore", icon: FileVideo, color: "text-blue-500", bg: "bg-blue-50" },
  ];

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
        <div className="flex flex-col items-center justify-center h-full bg-[#fcfcfd] p-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-[440px] bg-white rounded-[40px] p-12 shadow-[0_10px_50px_rgba(0,0,0,0.04)] border border-slate-50 flex flex-col items-center"
          >
            <motion.div 
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="w-20 h-20 bg-slate-900 rounded-[24px] flex items-center justify-center text-white mb-8 shadow-xl shadow-slate-200"
            >
              <Lock className="w-8 h-8" />
            </motion.div>
            
            <h1 className="text-2xl font-black text-slate-900 mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>Secure Vault</h1>
            <p className="text-slate-400 font-bold text-[13px] text-center mb-10 leading-relaxed uppercase tracking-widest">End-to-end encrypted storage for your safety evidence</p>
            
            <form onSubmit={handlePinSubmit} className="w-full space-y-6">
              <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Enter Security PIN</label>
                <div className="relative group">
                   <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-slate-900 transition-colors" />
                   <input
                     type="password"
                     maxLength={4}
                     value={pin}
                     onChange={(e) => setPin(e.target.value)}
                     placeholder="••••"
                     className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-14 text-center text-2xl font-black tracking-[0.5em] text-slate-900 placeholder:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-100 transition-all"
                   />
                </div>
              </div>
              
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full py-4 bg-slate-900 text-white font-black text-[13px] rounded-2xl shadow-xl shadow-slate-200 flex items-center justify-center gap-3 transition-all"
              >
                Access Vault <Unlock className="w-4 h-4" />
              </motion.button>
            </form>
            
            <div className="mt-10 flex items-center gap-2 text-slate-300">
               <ShieldCheck className="w-4 h-4" />
               <span className="text-[10px] font-black uppercase tracking-widest">Certified Encryption Standard</span>
            </div>
          </motion.div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full bg-[#fcfcfd]">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-10 py-10 bg-white border-b border-slate-50 flex items-center justify-between shrink-0"
        >
          <div>
            <div className="flex items-center gap-3 mb-2">
               <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                  <ShieldCheck className="w-4 h-4" />
               </div>
               <h1 className="text-2xl font-black text-slate-900 tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>Evidence Locker</h1>
            </div>
            <p className="text-slate-400 font-bold text-[13px] uppercase tracking-widest ml-11">4 Total Files Secured</p>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
                <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-slate-900" : "text-slate-400 hover:text-slate-600"}`}><Grid className="w-4 h-4" /></button>
                <button onClick={() => setViewMode("list")} className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-white shadow-sm text-slate-900" : "text-slate-400 hover:text-slate-600"}`}><ListIcon className="w-4 h-4" /></button>
             </div>
             <motion.button 
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
               onClick={() => setIsLocked(true)}
               className="px-6 py-3 bg-slate-900 text-white font-black text-[11px] rounded-xl shadow-lg shadow-slate-200 uppercase tracking-widest"
             >
               Lock Vault
             </motion.button>
          </div>
        </motion.div>

        {/* Filters & Content Area */}
        <div className="flex-1 overflow-y-auto p-10">
           {/* Search & Filters */}
           <div className="flex flex-col md:flex-row gap-4 mb-10">
              <div className="flex-1 relative group">
                 <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                 <input
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value)}
                   placeholder="Search files by name, location or date..."
                   className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-14 pr-4 text-[14px] font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-50 transition-all shadow-sm"
                 />
              </div>
              <button
                onClick={() => setFilterActive(v => !v)}
                className={`px-6 border rounded-2xl flex items-center gap-3 font-bold text-[13px] transition-colors shadow-sm cursor-pointer ${
                  filterActive ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
                }`}
              >
                 <Filter className="w-4 h-4" /> {filterActive ? "Filtered" : "Filter"}
              </button>
           </div>

           {/* Grid Layout */}
           <div className={`grid gap-6 ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"}`}>
             <AnimatePresence>
               {filteredList(evidenceList).map((item, i) => (
                 <motion.div
                   key={item.id}
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: i * 0.1 }}
                   whileHover={{ y: -5 }}
                   className="bg-white rounded-[32px] p-8 border border-slate-50 shadow-sm flex flex-col group transition-all relative"
                 >
                   <div className="flex justify-between items-start mb-6">
                      <div className={`w-14 h-14 rounded-2xl ${item.bg} ${item.color} flex items-center justify-center shadow-sm`}>
                         <item.icon className="w-7 h-7" />
                      </div>
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                          className="text-slate-300 hover:text-slate-900 transition-colors cursor-pointer p-1 rounded-lg hover:bg-slate-50"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        <AnimatePresence>
                          {openMenuId === item.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9, y: -4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9, y: -4 }}
                              className="absolute right-0 top-8 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden min-w-[140px]"
                            >
                              {[
                                { label: "View", icon: Eye, action: () => { setSelectedItem(item); setOpenMenuId(null); } },
                                { label: "Download", icon: Download, action: () => { handleDownload(item); setOpenMenuId(null); } },
                                { label: "Delete", icon: Trash2, action: () => { setOpenMenuId(null); alert("File deleted"); }, danger: true },
                              ].map(m => (
                                <button
                                  key={m.label}
                                  onClick={m.action}
                                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-[12px] font-bold transition-colors cursor-pointer ${
                                    m.danger ? "text-red-500 hover:bg-red-50" : "text-slate-700 hover:bg-slate-50"
                                  }`}
                                >
                                  <m.icon className="w-3.5 h-3.5" /> {m.label}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                   </div>

                   <h3 className="text-[15px] font-black text-slate-900 mb-1 truncate">{item.name}</h3>
                   <div className="flex items-center gap-4 text-[11px] font-bold text-slate-400 mb-6 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {item.date}</span>
                      <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {item.time}</span>
                   </div>

                   <div className="mt-auto pt-6 border-t border-slate-50 flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-slate-500 mb-2">
                         <MapPin className="w-3.5 h-3.5" />
                         <span className="text-[12px] font-bold">{item.location}</span>
                      </div>
                      <div className="flex gap-3">
                         <motion.button
                           whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                           onClick={() => setSelectedItem(item)}
                           className="flex-1 py-3 bg-slate-50 text-slate-700 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-100 transition-all cursor-pointer"
                         >
                            <Eye className="w-3.5 h-3.5" /> View
                         </motion.button>
                         <motion.button
                           whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                           onClick={() => handleDownload(item)}
                           className="flex-1 py-3 bg-slate-50 text-slate-700 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-100 transition-all cursor-pointer"
                         >
                            <Download className="w-3.5 h-3.5" /> Save
                         </motion.button>
                      </div>
                   </div>
                 </motion.div>
               ))}
             </AnimatePresence>
           </div>

           {/* Detail Modal */}
           <AnimatePresence>
             {selectedItem && (
               <motion.div
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 onClick={() => setSelectedItem(null)}
                 className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6"
               >
                 <motion.div
                   initial={{ opacity: 0, scale: 0.92, y: 20 }}
                   animate={{ opacity: 1, scale: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.92, y: 20 }}
                   onClick={e => e.stopPropagation()}
                   className="bg-white rounded-[32px] p-10 max-w-md w-full shadow-2xl"
                 >
                   <div className="flex items-start justify-between mb-6">
                     <div className={`w-16 h-16 rounded-2xl ${selectedItem.bg} ${selectedItem.color} flex items-center justify-center shadow-sm`}>
                       <selectedItem.icon className="w-8 h-8" />
                     </div>
                     <button onClick={() => setSelectedItem(null)} className="icon-btn w-8 h-8 text-slate-400 hover:text-slate-900">
                       <X className="w-4 h-4" />
                     </button>
                   </div>
                   <h2 className="text-[18px] font-black text-slate-900 mb-1">{selectedItem.name}</h2>
                   <p className="text-slate-400 text-[12px] font-bold uppercase tracking-widest mb-6">{selectedItem.size} • {selectedItem.type.toUpperCase()}</p>
                   <div className="space-y-3 mb-8">
                     <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                       <Calendar className="w-4 h-4 text-slate-400" />
                       <span className="text-slate-700 text-[13px] font-bold">{selectedItem.date} at {selectedItem.time}</span>
                     </div>
                     <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                       <MapPin className="w-4 h-4 text-slate-400" />
                       <span className="text-slate-700 text-[13px] font-bold">{selectedItem.location}</span>
                     </div>
                   </div>
                   <div className="flex gap-3">
                     <motion.button
                       whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                       onClick={() => handleDownload(selectedItem)}
                       className="flex-1 py-4 bg-slate-900 text-white font-black text-[13px] rounded-2xl shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                     >
                       <Download className="w-4 h-4" /> Download
                     </motion.button>
                     <motion.button
                       whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                       onClick={() => setSelectedItem(null)}
                       className="px-6 py-4 bg-slate-100 text-slate-700 font-black text-[13px] rounded-2xl cursor-pointer"
                     >
                       Close
                     </motion.button>
                   </div>
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
