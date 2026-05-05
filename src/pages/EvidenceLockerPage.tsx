import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Video, Image, FileAudio, File, MapPin, Clock,
  Lock, ArrowLeft, Inbox, Unlock, AlertCircle, ShieldAlert, Film, Search, Download, Share2
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useApp } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";
import type { EvidenceItem } from "@/context/AppContext";

const getFileIcon = (item: EvidenceItem) => {
  if (item.type === "sos-recording") return Video;
  if (!item.fileType) return File;
  if (item.fileType.startsWith("image/")) return Image;
  if (item.fileType.startsWith("video/")) return Film;
  if (item.fileType.startsWith("audio/")) return FileAudio;
  return File;
};

export default function EvidenceLockerPage() {
  const { evidenceLocker } = useApp();
  const navigate = useNavigate();

  const [isLocked, setIsLocked] = useState(true);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const sosCount     = evidenceLocker.filter((e) => e.type === "sos-recording").length;
  const reportCount  = evidenceLocker.filter((e) => e.type === "report-media").length;

  const handlePinInput = (num: number) => {
    if (pin.length >= 4) return;
    const newPin = pin + num;
    setPin(newPin);
    
    if (newPin.length === 4) {
      if (newPin === "0000") {
        setIsLocked(false);
      } else {
        setError(true);
        setTimeout(() => {
          setPin("");
          setError(false);
        }, 800);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  if (isLocked) {
      return (
          <div className="min-h-screen pb-24 flex flex-col pt-12 items-center px-8 relative bg-[#fcfcfd]">
              <button
                onClick={() => navigate(-1)}
                className="self-start text-slate-400 flex items-center gap-2 text-[13px] font-bold z-10 hover:text-slate-900 transition-colors mb-8"
               >
                <ArrowLeft className="w-4 h-4" /> Back to Safety
              </button>

              <div className="flex flex-col items-center mt-12 relative z-10">
                  <div className="w-24 h-24 rounded-[32px] flex items-center justify-center bg-white border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] mb-8">
                     <Lock className="w-10 h-10 text-slate-900" />
                  </div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>Secure Evidence</h1>
                  <p className="text-[14px] font-medium text-slate-400 text-center max-w-[280px] leading-relaxed">
                      Please enter your 4-digit security PIN to unlock your encrypted recordings.
                  </p>
              </div>

              {/* Pin Dots */}
              <motion.div 
                 animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
                 transition={{ duration: 0.4 }}
                 className="flex gap-4 mt-12 mb-16 relative z-10"
              >
                  {[0, 1, 2, 3].map(i => (
                      <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${pin.length > i ? 'bg-slate-900 border-slate-900 scale-110' : error ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-slate-100'}`} />
                  ))}
              </motion.div>

              {/* Numpad - Light Premium Style */}
              <div className="grid grid-cols-3 gap-8 max-w-[320px] w-full mt-auto relative z-10">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                      <button key={num} onClick={() => handlePinInput(num)} className="w-[76px] h-[76px] rounded-full flex items-center justify-center text-2xl font-bold text-slate-900 bg-white border border-slate-100 shadow-sm active:scale-95 transition-all hover:bg-slate-50">
                          {num}
                      </button>
                  ))}
                  <div /> 
                  <button onClick={() => handlePinInput(0)} className="w-[76px] h-[76px] rounded-full flex items-center justify-center text-2xl font-bold text-slate-900 bg-white border border-slate-100 shadow-sm active:scale-95 transition-all hover:bg-slate-50">
                      0
                  </button>
                  <button onClick={handleDelete} className="w-[76px] h-[76px] rounded-full flex items-center justify-center text-[13px] font-black text-slate-400 active:scale-95 transition-all hover:text-slate-900">
                      DELETE
                  </button>
              </div>

              <div className="mt-12 flex items-center gap-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                 <ShieldAlert className="w-4 h-4" /> Military Grade Encryption Active
              </div>
          </div>
      )
  }

  return (
    <AppLayout>
      <div className="flex flex-col min-h-screen bg-[#fcfcfd]">
        
        {/* Header Redesign */}
        <div className="px-8 pt-10 pb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
                Evidence Locker
              </h1>
              <span className="px-3 py-1 rounded-full bg-teal-50 border border-teal-100 text-[10px] font-black text-teal-600 uppercase tracking-widest">Secure</span>
            </div>
            <button onClick={() => setIsLocked(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-full text-[12px] font-bold shadow-lg shadow-slate-200">
               <Lock className="w-3.5 h-3.5" /> Lock Session
            </button>
          </div>
          <p className="text-[15px] font-medium text-slate-400">Manage your encrypted security recordings and audit trails.</p>
        </div>

        {/* Stats Grid Redesign */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-8 mb-10">
          {[
            { icon: Video, label: "Recordings", value: sosCount, color: "text-blue-600", bg: "bg-blue-50" },
            { icon: FileAudio, label: "Audio Logs", value: reportCount, color: "text-indigo-600", bg: "bg-indigo-50" },
            { icon: MapPin, label: "Positions", value: "Active", color: "text-teal-600", bg: "bg-teal-50" },
            { icon: ShieldAlert, label: "Audit Trait", value: "Locked", color: "text-slate-600", bg: "bg-slate-50" },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm transition-transform hover:-translate-y-1">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-4`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-xl font-black text-slate-900">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters & Search */}
        <div className="px-8 mb-8 flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[280px] relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Filter by incident ID or date..." 
              className="w-full bg-white border border-slate-100 rounded-2xl pl-12 pr-4 py-3.5 text-[14px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-slate-100 transition-all shadow-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="px-5 py-3.5 text-[13px] font-bold text-slate-900 bg-white border border-slate-100 rounded-2xl shadow-sm hover:bg-slate-50 transition-colors">Latest</button>
            <button className="px-5 py-3.5 text-[13px] font-bold text-slate-400 hover:text-slate-900 transition-colors">Archive</button>
          </div>
        </div>

        {/* Evidence Grid Redesign */}
        <div className="px-8 pb-12 flex-1">
          <AnimatePresence>
            {evidenceLocker.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-32 gap-6"
              >
                <div className="w-20 h-20 flex items-center justify-center border border-slate-100 rounded-[32px] bg-white shadow-sm">
                  <Inbox className="w-8 h-8 text-slate-300" />
                </div>
                <div className="text-center">
                  <p className="text-[17px] font-black text-slate-900">Vault Empty</p>
                  <p className="text-[14px] mt-1 font-medium text-slate-400">All session recordings will appear here automatically.</p>
                </div>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {evidenceLocker.map((item, i) => {
                  const Icon = getFileIcon(item);
                  const date = new Date(item.timestamp);
                  const dateStr = date.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
                  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  const isSOS = item.type === "sos-recording";

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08, ease: "easeOut" }}
                      className="bg-white rounded-[32px] overflow-hidden flex flex-col border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.02)] group hover:shadow-md transition-all duration-300"
                    >
                      {/* Media Thumbnail */}
                      <div className="relative h-56 w-full bg-slate-900 flex items-center justify-center overflow-hidden">
                        {isSOS || item.fileType?.startsWith("video/") ? (
                            <video src={item.fileUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        ) : item.fileType?.startsWith("audio/") ? (
                            <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-slate-800">
                                <FileAudio className="w-12 h-12 text-slate-500 mb-4" />
                                <div className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Voice Memo Log</div>
                            </div>
                        ) : item.fileUrl && item.fileType?.startsWith("image/") ? (
                           <img src={item.fileUrl} alt={item.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        ) : (
                            <Icon className="w-12 h-12 text-slate-600" />
                        )}
                        
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        {/* Play Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                           <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
                              <Unlock className="w-6 h-6 text-white" />
                           </div>
                        </div>

                        {/* Tag */}
                        <div className="absolute top-4 left-4">
                          <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5 ${isSOS ? 'bg-red-500 text-white' : 'bg-slate-900 text-white'}`}>
                              {isSOS && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                              {isSOS ? 'SOS Event' : 'Report Log'}
                          </div>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="p-7">
                        <div className="flex items-start justify-between mb-2">
                           <h3 className="text-[15px] font-black text-slate-900 truncate" title={item.name}>
                              {item.name.replace(".webm", "").replace("SOS_Evidence_", "Session ")}
                           </h3>
                           <span className="text-[10px] font-black text-slate-300">{item.fileType?.split("/")[1]?.toUpperCase() || "BIN"}</span>
                        </div>
                        
                        <p className="text-[13px] font-bold text-slate-400 mb-6 flex items-center gap-2">
                           <Clock className="w-3.5 h-3.5" /> {dateStr} • {timeStr}
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                           <button className="flex items-center justify-center gap-2 py-3.5 bg-slate-50 border border-slate-100 text-slate-900 text-[12px] font-black rounded-2xl hover:bg-slate-100 transition-colors">
                              <Download className="w-3.5 h-3.5" /> Save
                           </button>
                           <button className="flex items-center justify-center gap-2 py-3.5 bg-slate-50 border border-slate-100 text-slate-900 text-[12px] font-black rounded-2xl hover:bg-slate-100 transition-colors">
                              <Share2 className="w-3.5 h-3.5" /> Share
                           </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Audit Trail */}
        <div className="mt-auto border-t border-slate-100 bg-white py-10 px-8 flex justify-center gap-10 text-[10px] font-black tracking-widest text-slate-300 uppercase">
             <div className="flex items-center gap-2"><Lock className="w-4 h-4 text-teal-500" /> End-to-End Encrypted</div>
             <div className="flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-teal-500" /> Tamper-Proof Logs</div>
             <div className="flex items-center gap-2"><Unlock className="w-4 h-4 text-teal-500" /> Access Verified</div>
        </div>

      </div>
    </AppLayout>
  );
}
