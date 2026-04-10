import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Video, Image, FileAudio, File, MapPin, Clock,
  Lock, ArrowLeft, Inbox, Unlock, AlertCircle
} from "lucide-react";
import { Film } from "lucide-react";
import BottomNav from "@/components/BottomNav";
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

const typeLabel: Record<EvidenceItem["type"], string> = {
  "sos-recording": "SOS REC",
  "report-media":  "REPORT",
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
          <div className="min-h-screen pb-24 flex flex-col pt-12 items-center bg-black px-6">
              <button
                onClick={() => navigate(-1)}
                className="self-start text-muted-foreground flex items-center gap-2 text-sm z-10 hover:text-foreground transition-colors mb-12"
               >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <div className="flex flex-col items-center mt-10">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 mb-6">
                     <Lock className="w-8 h-8 text-primary" />
                  </div>
                  <h1 className="text-2xl font-bold font-heading tracking-wide text-foreground mb-2">Evidence Locker</h1>
                  <p className="text-sm text-muted-foreground text-center max-w-[260px]">
                      Enter your 4-digit PIN to access secured emergency recordings and reports. (Demo: 0000)
                  </p>
              </div>

              {/* Pin Dots */}
              <motion.div 
                 animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
                 transition={{ duration: 0.4 }}
                 className="flex gap-4 mt-8 mb-12"
              >
                  {[0, 1, 2, 3].map(i => (
                      <div key={i} className={`w-4 h-4 rounded-full border-2 transition-colors duration-300 ${pin.length > i ? 'bg-primary border-primary' : error ? 'border-red-500 bg-red-500/20' : 'border-muted-foreground/30'}`} />
                  ))}
              </motion.div>

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-5 max-w-[280px] w-full mt-auto mb-10">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                      <button key={num} onClick={() => handlePinInput(num)} className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-2xl font-mono font-medium text-foreground bg-card border border-border/50 active:scale-95 transition-transform">
                          {num}
                      </button>
                  ))}
                  <div /> {/* Empty space */}
                  <button onClick={() => handlePinInput(0)} className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-2xl font-mono font-medium text-foreground bg-card border border-border/50 active:scale-95 transition-transform">
                      0
                  </button>
                  <button onClick={handleDelete} className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-sm font-bold font-heading text-muted-foreground active:scale-95 transition-transform">
                      DEL
                  </button>
              </div>
          </div>
      )
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "hsl(var(--background))" }}>

      {/* Header */}
      <div className="px-5 pt-8 pb-5 border-b border-border/40">
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-8 h-8 transition-colors border border-border rounded bg-transparent"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1">
            <p className="section-label mb-0.5" style={{ color: "hsl(var(--safe))" }}>Authenticated Access</p>
            <h1 className="text-2xl font-black tracking-tight text-foreground font-heading uppercase">
              EVIDENCE LOCKER
            </h1>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-sm bg-safe/10 border border-safe/20">
            <Unlock className="w-3.5 h-3.5 text-safe" />
            <span className="text-[9px] font-bold tracking-wider text-safe uppercase">
              UNLOCKED
            </span>
          </div>
        </div>

        {/* Summary strip */}
        {evidenceLocker.length > 0 && (
          <div className="mt-4 flex items-center gap-4 px-4 py-2.5 status-line bg-muted rounded">
            <div>
              <p className="text-xl font-bold font-mono text-foreground">
                {evidenceLocker.length}
              </p>
              <p className="text-[9px] font-medium text-muted-foreground">TOTAL</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div>
              <p className="text-xl font-bold font-mono text-sos">
                {sosCount}
              </p>
              <p className="text-[9px] font-medium text-muted-foreground">SOS REC</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div>
              <p className="text-xl font-bold font-mono" style={{ color: "hsl(215 60% 60%)" }}>
                {reportCount}
              </p>
              <p className="text-[9px] font-medium text-muted-foreground">REPORTS</p>
            </div>
          </div>
        )}
      </div>

      <div className="px-5 pt-5 pb-6">
        <AnimatePresence>
          {evidenceLocker.length === 0 ? (
            /* Empty State */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-24 gap-4"
            >
              <div className="w-16 h-16 flex items-center justify-center border border-border rounded-full bg-card">
                <Inbox className="w-7 h-7 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-bold tracking-tight text-foreground/60">
                  No Evidence Stored
                </p>
                <p className="text-xs mt-1 text-muted-foreground">
                  SOS recordings and report media will securely sync here.
                </p>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {evidenceLocker.map((item, i) => {
                const Icon = getFileIcon(item);
                const date = new Date(item.timestamp);
                const dateStr = date.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
                const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                const isSOS   = item.type === "sos-recording";

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex flex-col overflow-hidden bg-card border border-border rounded-xl shadow-sm"
                  >
                     {/* Media Preview Header Box */}
                     <div className="relative h-32 w-full flex items-center justify-center bg-[#111] overflow-hidden border-b border-border">
                        {item.fileUrl && item.fileType?.startsWith("image/") ? (
                           <img src={item.fileUrl} alt={item.name} className="w-full h-full object-cover opacity-80 mix-blend-screen" />
                        ) : isSOS ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <div className="absolute top-2 right-3 flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-sos animate-pulse" />
                                    <span className="text-[10px] font-mono text-sos uppercase font-bold">REC</span>
                                </div>
                                <Video className="w-8 h-8 text-white/50 mb-2" />
                                <div className="w-2/3 h-1 bg-white/10 rounded overflow-hidden">
                                    <div className="w-1/3 h-full bg-white/40 rounded" />
                                </div>
                            </div>
                        ) : (
                            <Icon className="w-10 h-10 text-muted-foreground/40" />
                        )}
                        
                        {/* Overlay Tag */}
                        <div className={`absolute bottom-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold tracking-wider font-mono uppercase ${isSOS ? 'bg-sos text-white' : 'bg-muted-foreground/80 text-white'}`}>
                            {typeLabel[item.type]}
                        </div>
                     </div>

                     {/* Metadata Footer */}
                     <div className="p-3">
                        <p className="text-sm font-semibold text-foreground truncate mb-2">{item.name}</p>
                        
                        <div className="flex flex-col gap-1.5">
                             <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-[11px] font-medium text-muted-foreground font-mono">
                                  {dateStr} <span className="mx-1">•</span> {timeStr}
                                </span>
                             </div>
                             {item.location && (
                                <div className="flex items-center gap-2">
                                   <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                                   <span className="text-[11px] font-medium text-muted-foreground truncate">
                                     {item.location}
                                   </span>
                                </div>
                             )}
                        </div>
                     </div>
                  </motion.div>
                );
              })}
              <div className="flex bg-muted/50 items-center justify-center gap-2 px-4 py-3 rounded text-[11px] text-muted-foreground mt-6 font-medium">
                   <AlertCircle className="w-3.5 h-3.5" /> Items are mathematically hashed and immutable.
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  );
};
