import { useLocation, useNavigate } from "react-router-dom";
import { Home, Heart, Users, Map, AlertTriangle, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

type NavItem = { icon: typeof Home; path: string; label: string; isSos?: boolean };

const USER_NAV: NavItem[] = [
  { icon: Home,          path: "/home",      label: "Home" },
  { icon: Heart,         path: "/assistant", label: "Help" },
  { icon: AlertTriangle, path: "/sos",       label: "SOS", isSos: true },
  { icon: Users,         path: "/guardians", label: "Guard" },
  { icon: Map,           path: "/location",  label: "Live" },
];

const GUARDIAN_NAV: NavItem[] = [
  { icon: Home,   path: "/guardian", label: "Home" },
  { icon: Users,  path: "/guardian", label: "Family" },
  { icon: Map,    path: "/guardian/live", label: "Live" },
  { icon: Settings, path: "/settings", label: "Settings" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useAuth();
  const navItems = role === "parent" ? GUARDIAN_NAV : USER_NAV;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div
        className="mx-3 mb-3 rounded-[16px] flex items-center justify-around px-1 h-[60px]"
        style={{
          background: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: "0 -1px 12px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)",
          border: "1px solid var(--sakhi-border)",
        }}
      >
        {navItems.map((item) => {
          const IconComp = item.icon as React.ElementType;
          const active = location.pathname === item.path;

          if (item.isSos) {
            return (
              <button
                key={item.path}
                id="nav-sos-quick"
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center justify-center -mt-5 z-10 cursor-pointer relative"
              >
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  className="flex items-center justify-center w-12 h-12 rounded-full text-white"
                  style={{
                    background: "var(--sakhi-red)",
                    boxShadow: "0 4px 12px rgba(220,38,38,0.3)",
                  }}
                >
                  <IconComp className="w-5 h-5 stroke-[2.5]" />
                </motion.div>
                <span style={{ fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 9, color: "var(--sakhi-red)", marginTop: 3 }}>
                  SOS
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center gap-0.5 cursor-pointer py-1"
              style={{ minWidth: 48 }}
            >
              <IconComp
                className="w-5 h-5 transition-colors"
                style={{ color: active ? "var(--sakhi-primary)" : "var(--sakhi-text-muted)" }}
              />
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontWeight: active ? 600 : 500,
                  fontSize: 10,
                  color: active ? "var(--sakhi-primary)" : "var(--sakhi-text-muted)",
                  transition: "color 0.15s",
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
