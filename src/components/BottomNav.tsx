import { useLocation, useNavigate } from "react-router-dom";
import { Home, AlertTriangle, MessageCircle, FileWarning, Archive, Map } from "lucide-react";

const navItems = [
  { icon: Home,          label: "Home",      path: "/home" },
  { icon: AlertTriangle, label: "SOS",       path: "/sos" },
  { icon: MessageCircle, label: "Assistant", path: "/assistant" },
  { icon: FileWarning,   label: "Report",    path: "/report" },
  { icon: Map,           label: "Map",       path: "/risk-map" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-lg border-t border-border px-2 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const active = location.pathname === item.path ||
            (item.path === "/report" && location.pathname.startsWith("/report-review"));
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon
                className={`w-5 h-5 ${
                  item.label === "SOS" && active
                    ? "text-sos"
                    : item.label === "Locker" && active
                    ? "text-safe"
                    : ""
                }`}
              />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
