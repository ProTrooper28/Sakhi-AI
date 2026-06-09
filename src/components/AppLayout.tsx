import { type ReactNode, useEffect, useRef, useState } from "react";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Settings, LogOut, Shield, ChevronRight, X, CheckCircle2, AlertOctagon, MapPin, Sparkles } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";

interface AppLayoutProps {
  children: ReactNode;
}

const notifications = [
  { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", title: "Ghar pahunch gayi safely 🏠", time: "Abhi abhi" },
  { icon: Shield,       color: "text-orange-500",  bg: "bg-orange-50",  title: "Priya didi is watching over you", time: "5 min pehle" },
  { icon: AlertOctagon, color: "text-rose-500",    bg: "bg-rose-50",    title: "SOS Test Complete ✓", time: "1 ghante pehle" },
  { icon: MapPin,       color: "text-amber-500",   bg: "bg-amber-50",   title: "Location shared with Priya", time: "Kal" },
];

// ── Notifications panel ──────────────────────────────────────────────────────
const NotificationsContent = ({ onClose }: { onClose: () => void }) => (
  <div>
    <div
      className="flex items-center justify-between px-4 py-3"
      style={{ borderBottom: "1px solid rgba(242,149,106,0.14)" }}
    >
      <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 13, color: "#8B3A2F" }}>
        Khabar (सूचनाएं)
      </span>
      <button onClick={onClose} className="icon-btn w-6 h-6" style={{ color: "#9E7A6A" }}>
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
    <div>
      {notifications.map((n, i) => (
        <button
          key={i}
          onClick={onClose}
          className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer"
          style={{ borderBottom: i < notifications.length - 1 ? "1px solid rgba(242,149,106,0.08)" : "none" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(242,149,106,0.06)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <div className={`w-9 h-9 rounded-2xl ${n.bg} ${n.color} flex items-center justify-center flex-shrink-0`}>
            <n.icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 12, color: "#3D2315" }} className="leading-tight">{n.title}</p>
            <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 10, color: "#9E7A6A" }} className="mt-0.5">{n.time}</p>
          </div>
        </button>
      ))}
    </div>
    <div className="p-3" style={{ borderTop: "1px solid rgba(242,149,106,0.1)" }}>
      <button onClick={onClose} className="w-full text-center py-1 cursor-pointer" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 11, color: "#D4455C" }}>
        Sab padha ✓ (Mark all read)
      </button>
    </div>
  </div>
);

// ── Profile dropdown ─────────────────────────────────────────────────────────
const ProfileContent = ({ navigate, onClose }: { navigate: (p: string) => void; onClose: () => void }) => {
  const go = (path: string) => { onClose(); navigate(path); };
  return (
    <div>
      <div className="px-4 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(242,149,106,0.14)" }}>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-xs"
          style={{ background: "linear-gradient(135deg,#F2956A,#D4455C)" }}
        >PS</div>
        <div>
          <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 13, color: "#3D2315" }}>Preeti Sharma</p>
          <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 10, color: "#3D9970" }}>✓ Sakhi Protected</p>
        </div>
      </div>
      <div className="py-1">
        {[
          { label: "Safety Preferences", path: "/settings", icon: Settings },
          { label: "Aapke Apnewale",     path: "/guardian", icon: Shield },
        ].map(({ label, path, icon: Icon }) => (
          <button
            key={path} onClick={() => go(path)}
            className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer text-left"
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(242,149,106,0.07)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <Icon className="w-4 h-4" style={{ color: "#9E7A6A" }} />
            <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 13, color: "#3D2315" }} className="flex-1">{label}</span>
            <ChevronRight className="w-3.5 h-3.5" style={{ color: "#FDDCCC" }} />
          </button>
        ))}
        <div style={{ borderTop: "1px solid rgba(242,149,106,0.14)" }} className="mt-1">
          <button
            onClick={() => go("/")}
            className="w-full flex items-center gap-3 px-4 py-2.5 cursor-pointer text-left transition-colors"
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(212,69,92,0.06)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 13 }} className="text-rose-600">Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Mobile header ────────────────────────────────────────────────────────────
const MobileHeader = () => {
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="flex items-center justify-between px-4 py-3 md:hidden" style={{ background: "transparent" }}>
      {/* Brand */}
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm"
          style={{ background: "linear-gradient(135deg,#F2956A,#D4455C)" }}
        >
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 17, color: "#8B3A2F" }}>Sakhi</span>
      </div>

      {/* Notification bell */}
      <div className="relative" ref={notifRef}>
        <button
          id="mobile-notif-btn"
          onClick={() => setNotifOpen(v => !v)}
          className="icon-btn w-10 h-10 relative"
          style={{ color: "#8B3A2F" }}
        >
          <Bell style={{ width: 20, height: 20 }} />
          <span
            className="absolute top-2 right-2 w-2 h-2 rounded-full border-2"
            style={{ background: "#D4455C", borderColor: "var(--sakhi-cream)" }}
          />
        </button>
        <AnimatePresence>
          {notifOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="dropdown-panel w-72"
            >
              <NotificationsContent onClose={() => setNotifOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ── Desktop top bar ──────────────────────────────────────────────────────────
const DesktopTopBar = () => {
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div
      className="hidden md:flex items-center justify-end gap-3 px-6 py-3"
      style={{ borderBottom: "1px solid rgba(242,149,106,0.12)", background: "rgba(253,240,233,0.82)", backdropFilter: "blur(10px)" }}
    >
      <div className="relative" ref={notifRef}>
        <button id="desktop-notif-btn" onClick={() => { setNotifOpen(v => !v); setProfileOpen(false); }} className="icon-btn w-9 h-9 relative" style={{ color: "#8B3A2F" }}>
          <Bell style={{ width: 18, height: 18 }} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: "#D4455C" }} />
        </button>
        <AnimatePresence>
          {notifOpen && (
            <motion.div initial={{ opacity: 0, y: -8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.95 }} transition={{ duration: 0.15 }} className="dropdown-panel w-72">
              <NotificationsContent onClose={() => setNotifOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="relative" ref={profileRef}>
        <button id="desktop-profile-btn" onClick={() => { setProfileOpen(v => !v); setNotifOpen(false); }} className="icon-btn w-9 h-9 overflow-hidden rounded-full border-2" style={{ borderColor: "rgba(242,149,106,0.3)" }}>
          <div className="w-full h-full rounded-full flex items-center justify-center text-white font-black text-xs" style={{ background: "linear-gradient(135deg,#F2956A,#D4455C)" }}>PS</div>
        </button>
        <AnimatePresence>
          {profileOpen && (
            <motion.div initial={{ opacity: 0, y: -8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.95 }} transition={{ duration: 0.15 }} className="dropdown-panel w-56">
              <ProfileContent navigate={navigate} onClose={() => setProfileOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ── App Layout ───────────────────────────────────────────────────────────────
const AppLayout = ({ children }: AppLayoutProps) => {
  useEffect(() => {
    const handleResize = () => {};
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="page-with-sidebar" style={{ background: "var(--sakhi-cream)" }}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-h-screen">
        <MobileHeader />
        <DesktopTopBar />
        <main className="main-content flex-1">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
};

export default AppLayout;
