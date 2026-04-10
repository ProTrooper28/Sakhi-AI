import { AnimatePresence, motion } from "framer-motion";
import {
  Video, Image, FileAudio, File, MapPin, Clock,
  Lock, ArrowLeft, Inbox,
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

const EvidenceLockerPage = () => {
  const { evidenceLocker } = useApp();
  const navigate = useNavigate();

  const sosCount     = evidenceLocker.filter((e) => e.type === "sos-recording").length;
  const reportCount  = evidenceLocker.filter((e) => e.type === "report-media").length;

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "hsl(var(--background))" }}>

      {/* Header */}
      <div className="px-5 pt-8 pb-5 border-b border-border/40">
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-8 h-8 transition-colors"
            style={{
              border: "1px solid hsl(var(--border))",
              borderRadius: "4px",
              backgroundColor: "transparent",
            }}
          >
            <ArrowLeft className="w-4 h-4" style={{ color: "hsl(var(--muted-foreground))" }} />
          </button>
          <div className="flex-1">
            <p className="section-label mb-0.5">Secured Storage</p>
            <h1
              className="text-2xl font-black tracking-wide"
              style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}
            >
              EVIDENCE LOCKER
            </h1>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" style={{ color: "hsl(var(--safe))" }} />
            <span
              className="text-[9px] font-mono font-bold tracking-wider"
              style={{ color: "hsl(var(--safe))" }}
            >
              READ-ONLY
            </span>
          </div>
        </div>

        {/* Summary strip */}
        {evidenceLocker.length > 0 && (
          <div
            className="mt-4 flex items-center gap-4 px-4 py-2.5 status-line"
            style={{
              backgroundColor: "hsl(var(--muted))",
              borderRadius: "4px",
            }}
          >
            <div>
              <p className="text-lg font-black font-mono" style={{ color: "hsl(var(--foreground))" }}>
                {evidenceLocker.length}
              </p>
              <p className="text-[9px] font-mono" style={{ color: "hsl(var(--muted-foreground))" }}>
                TOTAL ITEMS
              </p>
            </div>
            <div
              className="w-px h-8"
              style={{ backgroundColor: "hsl(var(--border))" }}
            />
            <div>
              <p className="text-lg font-black font-mono" style={{ color: "hsl(var(--sos))" }}>
                {sosCount}
              </p>
              <p className="text-[9px] font-mono" style={{ color: "hsl(var(--muted-foreground))" }}>
                SOS REC
              </p>
            </div>
            <div
              className="w-px h-8"
              style={{ backgroundColor: "hsl(var(--border))" }}
            />
            <div>
              <p className="text-lg font-black font-mono" style={{ color: "hsl(215 60% 60%)" }}>
                {reportCount}
              </p>
              <p className="text-[9px] font-mono" style={{ color: "hsl(var(--muted-foreground))" }}>
                REPORTS
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="px-5 pt-5">
        <AnimatePresence>
          {evidenceLocker.length === 0 ? (
            /* Empty State */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-24 gap-4"
            >
              <div
                className="w-16 h-16 flex items-center justify-center"
                style={{
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "4px",
                }}
              >
                <Inbox className="w-7 h-7" style={{ color: "hsl(var(--muted-foreground))" }} />
              </div>
              <div className="text-center">
                <p
                  className="font-black font-mono tracking-wider text-sm"
                  style={{ color: "hsl(var(--foreground) / 0.5)" }}
                >
                  NO EVIDENCE STORED
                </p>
                <p className="text-xs mt-2" style={{ color: "hsl(var(--muted-foreground))" }}>
                  SOS recordings and report media appear here automatically
                </p>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-px">
              {evidenceLocker.map((item, i) => {
                const Icon = getFileIcon(item);
                const date = new Date(item.timestamp);
                const dateStr = date.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
                const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                const isSOS   = item.type === "sos-recording";

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-4 px-4 py-3.5 select-none"
                    style={{
                      backgroundColor: "hsl(var(--card))",
                      borderBottom: i < evidenceLocker.length - 1
                        ? "1px solid hsl(var(--border) / 0.4)"
                        : undefined,
                      borderRadius:
                        i === 0
                          ? "4px 4px 0 0"
                          : i === evidenceLocker.length - 1
                          ? "0 0 4px 4px"
                          : undefined,
                    }}
                  >
                    {/* File type tag */}
                    <div
                      className="flex-shrink-0 flex flex-col items-center justify-center w-14 h-12 rounded"
                      style={{
                        backgroundColor: isSOS ? "hsl(var(--sos) / 0.1)" : "hsl(var(--muted))",
                        border: `1px solid ${isSOS ? "hsl(var(--sos) / 0.3)" : "hsl(var(--border))"}`,
                      }}
                    >
                      {item.fileUrl && item.fileType?.startsWith("image/") ? (
                        <img
                          src={item.fileUrl}
                          alt={item.name}
                          className="w-full h-full object-cover rounded"
                          draggable={false}
                        />
                      ) : (
                        <>
                          <Icon
                            className="w-4 h-4"
                            style={{ color: isSOS ? "hsl(var(--sos))" : "hsl(var(--muted-foreground))" }}
                          />
                          <span
                            className="text-[8px] font-mono font-bold mt-0.5 tracking-wider"
                            style={{ color: isSOS ? "hsl(var(--sos))" : "hsl(var(--muted-foreground))" }}
                          >
                            {typeLabel[item.type]}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <p
                        className="text-xs font-mono font-medium truncate"
                        style={{ color: "hsl(var(--foreground))" }}
                      >
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <Clock
                          className="w-3 h-3 flex-shrink-0"
                          style={{ color: "hsl(var(--muted-foreground))" }}
                        />
                        <span
                          className="text-[10px] font-mono"
                          style={{ color: "hsl(var(--muted-foreground))" }}
                        >
                          {dateStr} · {timeStr}
                        </span>
                      </div>
                      {item.location && (
                        <div className="flex items-center gap-2">
                          <MapPin
                            className="w-3 h-3 flex-shrink-0"
                            style={{ color: "hsl(var(--muted-foreground))" }}
                          />
                          <span
                            className="text-[10px] font-mono truncate"
                            style={{ color: "hsl(var(--muted-foreground))" }}
                          >
                            {item.location}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Lock */}
                    <Lock
                      className="w-3.5 h-3.5 flex-shrink-0"
                      style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}
                    />
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
