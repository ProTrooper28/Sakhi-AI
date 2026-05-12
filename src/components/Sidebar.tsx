import { useLocation, useNavigate } from "react-router-dom";
import {
  Shield,
  LayoutDashboard,
  AlertOctagon,
  Users,
  Archive,
  FileWarning,
  Map,
  MessageSquare,
  MapPin,
  Settings,
  LogOut,
  Watch,
  X,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard",        path: "/home" },
  { icon: Shield,          label: "Guardian Core",    path: "/guardian-live" },
  { icon: AlertOctagon,    label: "SOS Protocols",    path: "/sos" },
  { icon: Archive,         label: "Evidence Locker",  path: "/evidence-locker" },
  { icon: FileWarning,     label: "Report Portal",    path: "/report" },
  { icon: MessageSquare,   label: "AI Companion",     path: "/assistant" },
  { icon: Map,             label: "Live Tracking",    path: "/location" },
  { icon: Watch,           label: "Hardware Hub",     path: "/wearable" },
  { icon: Settings,        label: "Configuration",    path: "/settings" },
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSidebarOpen, setSidebarOpen } = useApp();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleNavClick = (path: string) => {
    navigate(path);
    if (isMobile) setSidebarOpen(false);
  };

  const SidebarContent = (
    <aside className={`sidebar ${isMobile ? 'fixed inset-y-0 left-0 z-[110] w-[80%] max-w-[320px] !flex' : ''}`}>
      {/* ── Logo ── */}
      <div className="flex items-center justify-between px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center border border-teal-500/20 bg-teal-500/10 shadow-[0_0_15px_rgba(20,184,166,0.1)]"
          >
            <Shield className="w-5 h-5 text-teal-500" />
          </div>
          <div>
            <p
              className="font-black text-slate-100 leading-none tracking-tight uppercase"
              style={{ fontFamily: "Manrope, sans-serif", fontSize: "0.9rem" }}
            >
              Sakhi Ops
            </p>
            <p className="text-[9px] text-slate-500 mt-1.5 tracking-[0.2em] font-black uppercase">
              Command Center
            </p>
          </div>
        </div>
        {isMobile && (
          <button onClick={() => setSidebarOpen(false)} className="text-white/40 hover:text-white/70 transition-colors">
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* ── Status pill ── */}
      <div className="px-6 py-4">
        <div
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-950/50 border border-slate-800/50 shadow-inner"
        >
          <div className="relative">
            <span className="block w-2 h-2 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.6)]" />
            <span className="absolute inset-0 w-2 h-2 rounded-full bg-teal-500 animate-ping opacity-40" />
          </div>
          <span className="text-slate-400 text-[10px] font-black tracking-[0.15em] uppercase">
            Systems: Optimal
          </span>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 pb-4 space-y-0.5 overflow-y-auto custom-scrollbar">
        <p className="px-4 pt-6 pb-2 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Operational Console</p>
        {navItems.slice(0, 2).map((item) => {
          const active =
            location.pathname === item.path ||
            (item.path === "/report" && location.pathname.startsWith("/report-review"));
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={`sidebar-item ${active ? "active" : ""}`}
            >
              <Icon className="w-4.5 h-4.5 flex-shrink-0" style={{ width: 18, height: 18 }} />
              {item.label}
            </button>
          );
        })}

        <p className="px-4 pt-8 pb-2 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Defense Modules</p>
        {navItems.slice(2, 8).map((item) => {
          const active =
            location.pathname === item.path ||
            (item.path === "/report" && location.pathname.startsWith("/report-review"));
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={`sidebar-item ${active ? "active" : ""}`}
            >
              <Icon className="flex-shrink-0" style={{ width: 18, height: 18 }} />
              {item.label}
            </button>
          );
        })}

        <p className="px-4 pt-8 pb-2 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">System Config</p>
        {navItems.slice(8).map((item) => {
          const active = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={`sidebar-item ${active ? "active" : ""}`}
            >
              <Icon className="flex-shrink-0" style={{ width: 18, height: 18 }} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* ── User footer ── */}
      <div className="px-4 py-6 border-t border-slate-800/50">
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950/40 border border-slate-800/30 group">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[13px] font-black text-slate-900 flex-shrink-0 bg-teal-500 shadow-lg shadow-teal-500/10"
          >
            P
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-100 text-[12px] font-black truncate uppercase tracking-tight">Preeti S.</p>
            <p className="text-teal-500 text-[9px] font-black truncate uppercase tracking-widest mt-1 flex items-center gap-1">
               <span className="w-1 h-1 bg-teal-500 rounded-full" /> Level 4
            </p>
          </div>
          <button
            onClick={() => handleNavClick("/")}
            className="p-2 text-slate-600 hover:text-red-500 transition-all cursor-pointer"
            title="Terminate Session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {!isMobile && SidebarContent}
      <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-[110] bg-slate-900/40 backdrop-blur-sm md:hidden"
          >
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="h-full w-[80%] max-w-[320px]"
            >
              {SidebarContent}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
