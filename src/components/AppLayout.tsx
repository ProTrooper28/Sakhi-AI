import { type ReactNode, useEffect, useRef, useState } from "react";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, Bell, User, Settings, LogOut, Shield, ChevronRight, X, CheckCircle2, AlertOctagon, MapPin } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";

interface AppLayoutProps {
  children: ReactNode;
}

// ── Helpline Ticker ────────────────────────────────────────────────────────────
const TopHelplineBar = () => {
  const call = (num: string) => {
    window.location.href = `tel:${num}`;
  };

  return (
    <div className="sticky top-0 z-[100] w-full bg-white/95 backdrop-blur-md border-b border-slate-100 h-9 overflow-hidden flex items-center">
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-animate {
          display: flex;
          white-space: nowrap;
          animation: ticker 25s linear infinite;
          gap: 4rem;
          padding-left: 1rem;
        }
        .ticker-animate:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className="ticker-animate">
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-8">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-teal-500 animate-pulse" />
              Quick Help
            </span>
            <button onClick={() => call("1091")} className="text-[10px] font-black text-slate-600 hover:text-teal-600 transition-colors uppercase tracking-tight cursor-pointer">
              Women <span className="text-teal-600 ml-1">1091</span>
            </button>
            <button onClick={() => call("1098")} className="text-[10px] font-black text-slate-600 hover:text-blue-600 transition-colors uppercase tracking-tight cursor-pointer">
              Child <span className="text-blue-600 ml-1">1098</span>
            </button>
            <button onClick={() => call("112")} className="text-[10px] font-black text-red-600 hover:text-red-700 transition-colors uppercase tracking-tight flex items-center gap-1 cursor-pointer">
              Emergency <span className="underline underline-offset-4 font-black bg-red-50 px-1 rounded">112</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Notifications Panel ────────────────────────────────────────────────────────
const notifications = [
  { icon: CheckCircle2, color: "text-teal-600", bg: "bg-teal-50", title: "Reached Home Safely", time: "Just now" },
  { icon: Shield, color: "text-blue-600", bg: "bg-blue-50", title: "Guardian Session Started", time: "5m ago" },
  { icon: AlertOctagon, color: "text-red-500", bg: "bg-red-50", title: "SOS Test Completed", time: "1h ago" },
  { icon: MapPin, color: "text-indigo-600", bg: "bg-indigo-50", title: "Location shared with Priya", time: "Yesterday" },
];

// ── Mobile Header (with notification + profile) ────────────────────────────────
const MobileHeader = () => {
  const { setSidebarOpen } = useApp();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100 md:hidden">
      <button
        id="mobile-menu-btn"
        onClick={() => setSidebarOpen(true)}
        className="icon-btn w-9 h-9 text-slate-900"
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="font-black text-slate-900 text-sm uppercase tracking-widest" style={{ fontFamily: "Manrope, sans-serif" }}>Sakhi AI</div>

      <div className="flex items-center gap-2">
        {/* Notification */}
        <div className="relative" ref={notifRef}>
          <button
            id="mobile-notif-btn"
            onClick={() => { setNotifOpen(v => !v); setProfileOpen(false); }}
            className="icon-btn w-9 h-9 text-slate-600 relative"
          >
            <Bell className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-white" />
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

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            id="mobile-profile-btn"
            onClick={() => { setProfileOpen(v => !v); setNotifOpen(false); }}
            className="icon-btn w-9 h-9 overflow-hidden border-2 border-white shadow-sm rounded-full"
          >
            <img src="https://ui-avatars.com/api/?name=Preeti&background=0F172A&color=fff" alt="User" className="w-full h-full rounded-full" />
          </button>
          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="dropdown-panel w-56"
              >
                <ProfileContent navigate={navigate} onClose={() => setProfileOpen(false)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// ── Shared dropdown content ────────────────────────────────────────────────────
const NotificationsContent = ({ onClose }: { onClose: () => void }) => (
  <div>
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
      <span className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Notifications</span>
      <button onClick={onClose} className="icon-btn w-6 h-6 text-slate-400 hover:text-slate-900"><X className="w-3.5 h-3.5" /></button>
    </div>
    <div className="divide-y divide-slate-50">
      {notifications.map((n, i) => (
        <button
          key={i}
          onClick={onClose}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer text-left"
        >
          <div className={`w-8 h-8 rounded-xl ${n.bg} ${n.color} flex items-center justify-center flex-shrink-0`}>
            <n.icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-900 text-[12px] font-bold leading-tight truncate">{n.title}</p>
            <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider mt-0.5">{n.time}</p>
          </div>
        </button>
      ))}
    </div>
    <div className="p-3 border-t border-slate-50">
      <button onClick={onClose} className="w-full text-center text-[11px] font-black text-teal-600 hover:text-teal-700 uppercase tracking-widest py-1 cursor-pointer">
        Mark all read
      </button>
    </div>
  </div>
);

const ProfileContent = ({ navigate, onClose }: { navigate: (path: string) => void; onClose: () => void }) => {
  const go = (path: string) => { onClose(); navigate(path); };
  return (
    <div>
      <div className="px-4 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-100">
          <img src="https://ui-avatars.com/api/?name=Preeti&background=0F172A&color=fff" alt="User" className="w-full h-full" />
        </div>
        <div>
          <p className="text-slate-900 text-[13px] font-black leading-none">Preeti Sharma</p>
          <p className="text-teal-600 text-[10px] font-bold uppercase tracking-widest mt-0.5">Protected</p>
        </div>
      </div>
      <div className="py-1">
        {[
          { label: "Settings", path: "/settings", icon: Settings },
          { label: "Guardian View", path: "/guardian", icon: Shield },
        ].map(({ label, path, icon: Icon }) => (
          <button
            key={path}
            onClick={() => go(path)}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer text-left"
          >
            <Icon className="w-4 h-4 text-slate-500" />
            <span className="text-slate-800 text-[13px] font-semibold flex-1">{label}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          </button>
        ))}
        <div className="border-t border-slate-100 mt-1">
          <button
            onClick={() => go("/")}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 transition-colors cursor-pointer text-left"
          >
            <LogOut className="w-4 h-4 text-red-500" />
            <span className="text-red-600 text-[13px] font-semibold">Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Desktop Top Bar (notification + profile on right) ─────────────────────────
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
    <div className="hidden md:flex items-center justify-end gap-3 px-6 py-3 bg-white/80 backdrop-blur-sm border-b border-slate-100/60">
      {/* Notification */}
      <div className="relative" ref={notifRef}>
        <button
          id="desktop-notif-btn"
          onClick={() => { setNotifOpen(v => !v); setProfileOpen(false); }}
          className="icon-btn w-9 h-9 text-slate-600 relative"
        >
          <Bell style={{ width: 18, height: 18 }} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-white" />
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

      {/* Profile */}
      <div className="relative" ref={profileRef}>
        <button
          id="desktop-profile-btn"
          onClick={() => { setProfileOpen(v => !v); setNotifOpen(false); }}
          className="icon-btn w-9 h-9 overflow-hidden border-2 border-white shadow-sm rounded-full"
        >
          <img src="https://ui-avatars.com/api/?name=Preeti&background=0F172A&color=fff" alt="User" className="w-full h-full rounded-full" />
        </button>
        <AnimatePresence>
          {profileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="dropdown-panel w-56"
            >
              <ProfileContent navigate={navigate} onClose={() => setProfileOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ── App Layout ─────────────────────────────────────────────────────────────────
const AppLayout = ({ children }: AppLayoutProps) => {
  const { isSidebarOpen, setSidebarOpen } = useApp();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="page-with-sidebar bg-[#fcfcfd]">
      <Sidebar />

      <div className="flex flex-col flex-1 min-h-screen">
        <TopHelplineBar />
        <MobileHeader />
        <DesktopTopBar />
        <main className="main-content flex-1">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
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
