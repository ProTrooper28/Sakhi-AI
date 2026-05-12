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
  { icon: LayoutDashboard, label: "Home",             path: "/home" },
  { icon: AlertOctagon,    label: "SOS Settings",     path: "/sos" },
  { icon: Users,           label: "Guardian View",    path: "/guardian" },
  { icon: Archive,         label: "Evidence Locker",  path: "/evidence-locker" },
  { icon: FileWarning,     label: "Anonymous Reports",path: "/report" },
  { icon: MessageSquare,   label: "AI Companion",     path: "/assistant" },
  { icon: Map,             label: "Location Tracking",path: "/location" },
  { icon: Watch,           label: "Wearable Device",  path: "/wearable" },
  { icon: Settings,        label: "Settings",         path: "/settings" },
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
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(20,184,166,0.2)" }}
          >
            <Shield className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <p
              className="font-bold text-white leading-none"
              style={{ fontFamily: "Manrope, sans-serif", fontSize: "1rem" }}
            >
              Sakhi AI
            </p>
            <p className="text-[10px] text-white/40 mt-0.5 tracking-widest uppercase">
              Safety Companion
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
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: "rgba(20,184,166,0.1)", border: "1px solid rgba(20,184,166,0.2)" }}
        >
          <span
            className="w-2 h-2 rounded-full bg-teal-400"
            style={{ animation: "dot-pulse 2s ease-in-out infinite" }}
          />
          <span className="text-teal-400 text-[11px] font-semibold tracking-wider uppercase">
            Monitoring Active
          </span>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 pb-4 space-y-1 overflow-y-auto">
        <p className="section-label px-3 pb-2 text-white/30">Navigation</p>
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

        <p className="section-label px-3 pt-4 pb-2 text-white/30">Safety Tools</p>
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

        <p className="section-label px-3 pt-4 pb-2 text-white/30">Account</p>
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
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ background: "rgba(20,184,166,0.3)" }}
          >
            P
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">Preeti Sharma</p>
            <p className="text-white/40 text-[10px] truncate">Protected</p>
          </div>
          <button
            onClick={() => handleNavClick("/")}
            className="text-white/40 hover:text-white/70 transition-colors"
            title="Log out"
          >
            <LogOut style={{ width: 14, height: 14 }} />
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
