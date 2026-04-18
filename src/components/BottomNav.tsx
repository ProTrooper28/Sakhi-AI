import { useLocation, useNavigate } from "react-router-dom";
import { Home, AlertTriangle, Terminal, FileWarning, Map } from "lucide-react";

const navItems = [
  { icon: Home,          label: "HOME",    path: "/home"      },
  { icon: AlertTriangle, label: "SOS",     path: "/sos"       },
  { icon: Terminal,      label: "COMMAND", path: "/assistant" },
  { icon: FileWarning,   label: "REPORT",  path: "/report"    },
  { icon: Map,           label: "MAP",     path: "/risk-map"  },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div
      className="fixed bottom-0 left-0 right-0 pb-[env(safe-area-inset-bottom)]"
      style={{
        backgroundColor: "hsl(var(--background))",
        borderTop: "1px solid hsl(var(--border))",
      }}
    >
      <div className="flex items-stretch justify-around h-[4.5rem] max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const active =
            location.pathname === item.path ||
            (item.path === "/report" && location.pathname.startsWith("/report-review"));
          const isSOS = item.label === "SOS";

          return (
            <button
              key={item.path}
              id={`nav-${item.label.toLowerCase()}`}
              onClick={() => navigate(item.path)}
              className="relative flex flex-col items-center justify-center gap-1.5 flex-1 transition-all"
              style={{
                color: isSOS
                  ? "hsl(var(--sos))"
                  : active
                  ? "hsl(var(--primary))"
                  : "hsl(var(--muted-foreground))",
              }}
            >
              {/* Active pill indicator */}
              {active && (
                <div
                  className="absolute top-0 left-1/2"
                  style={{
                    width: "32px",
                    height: "3px",
                    borderRadius: "0 0 4px 4px",
                    backgroundColor: isSOS ? "hsl(var(--sos))" : "hsl(var(--primary))",
                    transform: "translateX(-50%)",
                  }}
                />
              )}

              <div
                className={`p-2 rounded-xl transition-all ${active && !isSOS ? 'bg-primary/10' : ''} ${isSOS ? 'bg-sos/10' : ''}`}
              >
                <item.icon
                  className="w-[18px] h-[18px]"
                  strokeWidth={active || isSOS ? 2.5 : 2}
                />
              </div>
              <span
                style={{
                  fontSize: "8px",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
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
