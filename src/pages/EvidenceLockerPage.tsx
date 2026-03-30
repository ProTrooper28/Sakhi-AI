import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Video, Image, FileAudio, File, MapPin, Clock,
  Lock, ArrowLeft, Inbox,
} from "lucide-react";
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

import { Film } from "lucide-react";

const typeLabel: Record<EvidenceItem["type"], string> = {
  "sos-recording": "SOS Recording",
  "report-media":  "Report Media",
};

const typeBadge: Record<EvidenceItem["type"], string> = {
  "sos-recording": "bg-sos/15 text-sos",
  "report-media":  "bg-primary/15 text-primary",
};

const EvidenceLockerPage = () => {
  const { evidenceLocker } = useApp();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl glass flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Evidence Locker</h1>
            <p className="text-xs text-muted-foreground">Read-only · Secured locally</p>
          </div>
          <div className="ml-auto w-9 h-9 rounded-xl bg-safe/10 flex items-center justify-center">
            <Lock className="w-4 h-4 text-safe" />
          </div>
        </div>

        {/* Summary strip */}
        {evidenceLocker.length > 0 && (
          <div className="mt-3 glass rounded-xl p-3 flex items-center gap-3">
            <Shield className="w-4 h-4 text-safe" />
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{evidenceLocker.length}</span> item{evidenceLocker.length !== 1 ? "s" : ""} stored ·
              {" "}<span className="font-semibold text-foreground">{evidenceLocker.filter((e) => e.type === "sos-recording").length}</span> SOS recording{evidenceLocker.filter((e) => e.type === "sos-recording").length !== 1 ? "s" : ""} ·
              {" "}<span className="font-semibold text-foreground">{evidenceLocker.filter((e) => e.type === "report-media").length}</span> report media
            </p>
          </div>
        )}
      </div>

      <div className="px-5">
        <AnimatePresence>
          {evidenceLocker.length === 0 ? (
            /* Empty State */
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-24 gap-4"
            >
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                <Inbox className="w-9 h-9 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-base">No Evidence Stored</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  SOS recordings and uploaded report media will appear here automatically.
                </p>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {evidenceLocker.map((item, i) => {
                const Icon = getFileIcon(item);
                const date = new Date(item.timestamp);
                const dateStr = date.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
                const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="glass rounded-2xl p-4 flex items-center gap-4 select-none"
                  >
                    {/* Thumbnail or Icon */}
                    {item.fileUrl && item.fileType?.startsWith("image/") ? (
                      <img
                        src={item.fileUrl}
                        alt={item.name}
                        className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                        draggable={false}
                      />
                    ) : (
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        item.type === "sos-recording" ? "bg-sos/10" : "bg-primary/10"
                      }`}>
                        <Icon className={`w-7 h-7 ${item.type === "sos-recording" ? "text-sos" : "text-primary"}`} />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeBadge[item.type]}`}>
                          {typeLabel[item.type]}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {dateStr} · {timeStr}
                        </span>
                      </div>
                      {item.location && (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          {item.location}
                        </span>
                      )}
                    </div>

                    {/* Lock icon — read-only indicator */}
                    <Lock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  );
};

export default EvidenceLockerPage;
