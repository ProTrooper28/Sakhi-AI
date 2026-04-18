import { useLocation, useNavigate } from "react-router-dom";
import { Home, Map, Terminal, FileWarning } from "lucide-react";
import { useApp } from "@/context/AppContext";

const navItems = [
  { icon: Home, path: "/home" },
  { icon: Map, path: "/risk-map" },
  { icon: "FAB", path: "/sos" }, // Placeholder for Center SOS
  { icon: Terminal, path: "/assistant" },
  { icon: FileWarning, path: "/report" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { triggerSOS } = useApp();

  return (
    <div
      className="fixed bottom-0 left-0 right-0 pb-[env(safe-area-inset-bottom)] z-50 pointer-events-none"
    >
      <div 
        className="h-[4.5rem] bg-background/95 backdrop-blur-md border-t border-border flex items-center justify-around px-2 relative pointer-events-auto shadow-[0_-4px_20px_rgba(0,0,0,0.02)]"
      >
        {navItems.map((item, i) => {
          if (item.icon === "FAB") {
            return (
              <div key="sos-fab" className="relative flex-1 flex justify-center -mt-6">
                <button
                  onClick={triggerSOS}
                  className="w-[3.5rem] h-[3.5rem] bg-sos text-white rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-[1.05] active:scale-[0.95]"
                  style={{ boxShadow: "0 8px 30px rgba(220, 38, 38, 0.4)" }}
                >
                  <span className="font-bold text-sm tracking-widest text-center leading-none mt-0.5">SOS</span>
                </button>
              </div>
            );
          }

          const IconComp = item.icon as React.ElementType;
          const active = location.pathname === item.path || (item.path === "/report" && location.pathname.startsWith("/report-review"));

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex-1 flex justify-center items-center h-full transition-all duration-300"
            >
              <div
                className={`p-2.5 rounded-2xl transition-all duration-300 ${
                  active ? "bg-primary/10 text-primary scale-110" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <IconComp
                  className="w-6 h-6"
                  strokeWidth={active ? 2.5 : 2}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
