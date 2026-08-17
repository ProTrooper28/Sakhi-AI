import { useLocation, useNavigate } from "react-router-dom";
import { SakhiMark } from "@/components/SakhiLogo";
import {
  Shield,
  LayoutDashboard,
  AlertOctagon,
  Users,
  Archive,
  FileWarning,
  Map,
  FileText,
  MessageSquare,
  Settings,
  LogOut,
  Watch,
  X,
  Navigation2,
  HeartHandshake,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";

type NavItem = { icon: typeof Shield; label: string; path: string };

// The two apps share a sidebar shell but expose completely different sections:
//   • user (or guest/demo)  → the personal safety app
//   • parent                → the emergency monitoring dashboard
type NavSection = { label: string; items: NavItem[] };

const USER_SECTIONS: NavSection[] = [
  {
    label: "Navigation",
    items: [
      { icon: LayoutDashboard, label: "Home",                path: "/home" },
      { icon: AlertOctagon,    label: "SOS Settings",        path: "/sos" },
      { icon: Users,           label: "Guardian Management", path: "/guardians" },
      { icon: MessageSquare,   label: "AI Companion",        path: "/assistant" },
    ],
  },
  {
    label: "Safety Tools",
    items: [
      { icon: Navigation2,     label: "Safety Journey",      path: "/journey" },
      { icon: Map,             label: "Location Tracking",   path: "/location" },
      { icon: Archive,         label: "Evidence Locker",     path: "/evidence-locker" },
      { icon: FileWarning,     label: "Anonymous Reports",   path: "/report" },
      { icon: FileText,        label: "My Reports",          path: "/my-reports" },
      { icon: HeartHandshake,  label: "Post-Incident Support", path: "/post-incident" },
    ],
  },
  {
    label: "Account",
    items: [
      { icon: Watch,           label: "Wearable Device",     path: "/wearable" },
      { icon: Settings,        label: "Settings",            path: "/settings" },
    ],
  },
];

const GUARDIAN_SECTIONS: NavSection[] = [
  {
    label: "Guardian App",
    items: [
      { icon: LayoutDashboard, label: "Guardian Dashboard", path: "/guardian" },
      { icon: Users,           label: "Family Members",     path: "/guardian" },
      { icon: Settings,        label: "Settings",           path: "/settings" },
    ],
  },
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSidebarOpen, setSidebarOpen } = useApp();
  const { displayName, initials, role, signOut } = useAuth();
  const isParent = role === "parent";
  const sections = isParent ? GUARDIAN_SECTIONS : USER_SECTIONS;
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const sidebarContainerRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    void signOut();
    handleNavClick("/");
  };

  // Sync mobile/desktop view width
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle escape key to close sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isSidebarOpen) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSidebarOpen, setSidebarOpen]);

  // Click outside to close sidebar (works on both mobile and desktop)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!isSidebarOpen) return;

      // Check if clicking inside the sidebar container
      if (sidebarContainerRef.current && sidebarContainerRef.current.contains(e.target as Node)) {
        return;
      }

      // Check if clicking the hamburger buttons
      const desktopToggle = document.getElementById("desktop-sidebar-toggle");
      if (desktopToggle && desktopToggle.contains(e.target as Node)) return;

      setSidebarOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSidebarOpen, setSidebarOpen]);

  // Default open state on desktop when page starts
  useEffect(() => {
    if (window.innerWidth > 768) {
      setSidebarOpen(true);
    }
  }, [setSidebarOpen]);

  const handleNavClick = (path: string) => {
    navigate(path);
    if (isMobile) setSidebarOpen(false);
  };

  const SidebarContent = (
    <aside 
      className={`sidebar h-full flex flex-col ${
        isMobile ? "w-full" : "w-[var(--sidebar-width)]"
      }`}
      style={{
        background: "linear-gradient(180deg, #5C2018 0%, #8B3A2F 100%)",
      }}
    >
      {/* ── Logo & Title ── */}
      <div className="flex items-center justify-between px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/10 ring-1 ring-white/15"
          >
            <SakhiMark className="w-6 h-6" />
          </div>
          <div>
            <p
              className="font-bold text-white leading-none font-heading text-[15px]"
            >
              Sakhi Safety
            </p>
            <p className="text-[10px] text-white/40 mt-0.5 tracking-widest uppercase font-semibold">
              Safety Companion
            </p>
          </div>
        </div>
        
        {/* Toggle close button (X) - visible whenever the sidebar is open */}
        <button 
          onClick={() => setSidebarOpen(false)} 
          className="text-white/40 hover:text-white/70 transition-colors p-1 rounded-lg hover:bg-white/5 cursor-pointer"
          title="Close Menu"
        >
          <X className="w-5.5 h-5.5" />
        </button>
      </div>

      {/* ── Status pill ── */}
      <div className="px-6 py-4">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-teal-400/10 border border-teal-400/20"
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

      {/* ── Navigation List ── */}
      <nav className="flex-1 px-3 pb-4 space-y-1 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.label} className="mb-1">
            <p className="section-label px-3 pb-2 pt-3 text-white/30 uppercase tracking-widest text-[9px] font-bold">
              {section.label}
            </p>
            {section.items.map((item) => {
              const active =
                location.pathname === item.path ||
                (item.path === "/report" && location.pathname.startsWith("/report-review"));
              const Icon = item.icon;
              return (
                <button
                  key={`${section.label}-${item.path}`}
                  onClick={() => handleNavClick(item.path)}
                  className={`sidebar-item flex items-center gap-3 w-full px-4 py-2.5 rounded-full text-left transition-all text-sm font-semibold hover:bg-white/10 active:scale-95 cursor-pointer ${
                    active 
                      ? "bg-white/15 text-white shadow-sm font-bold border-l-4 border-l-[#F2956A] pl-3" 
                      : "text-[#FDDCCC]/80 hover:text-white"
                  }`}
                >
                  <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── User Footer ── */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 bg-teal-400/30"
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{displayName}</p>
            <p className="text-white/40 text-[10px] truncate">
              {isParent ? "Guardian" : "Protected"}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-white/40 hover:text-white/70 transition-colors p-1 rounded-lg hover:bg-white/5 cursor-pointer"
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
      {/* Desktop sidebar */}
      {!isMobile && (
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              ref={sidebarContainerRef}
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "var(--sidebar-width)", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden flex flex-col h-screen sticky top-0 z-40 border-r border-white/5"
            >
              {SidebarContent}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Mobile drawer sidebar */}
      {isMobile && (
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-[110] bg-slate-950/50 backdrop-blur-sm md:hidden flex justify-start"
            >
              <motion.div
                ref={sidebarContainerRef}
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="h-full w-[80%] max-w-[320px] shadow-2xl"
              >
                {SidebarContent}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </>
  );
};

export default Sidebar;
