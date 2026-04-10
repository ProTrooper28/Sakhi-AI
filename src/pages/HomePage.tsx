import { Shield, AlertTriangle, MapPin, Lock, FileWarning, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";

const quickActions = [
  {
    label: "SOS",
    sublabel: "Emergency Alert",
    path: "/sos",
    danger: true,
  },
  {
    label: "Report Incident",
    sublabel: "Anonymous Filing",
    path: "/report",
    danger: false,
  },
  {
    label: "Live Map",
    sublabel: "Threat Overview",
    path: "/risk-map",
    danger: false,
  },
  {
    label: "Evidence Locker",
    sublabel: "Secured Storage",
    path: "/evidence-locker",
    danger: false,
  },
];

const recentActivity = [
  { time: "22:14", label: "Elevated risk detected — MG Road sector", level: "warn" },
  { time: "21:03", label: "Current route confirmed safe", level: "safe" },
  { time: "19:47", label: "Evidence locker accessed", level: "info" },
];

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "hsl(var(--background))" }}>

      {/* Header */}
      <div className="px-5 pt-8 pb-5 flex items-center justify-between border-b border-border/40">
        <div>
          <p className="section-label mb-1">Sakhi Safety System</p>
          <h1
            className="text-2xl font-black tracking-tight"
            style={{ color: "hsl(var(--foreground))", letterSpacing: "-0.02em" }}
          >
            DASHBOARD
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge-active">
            <span className="dot-active" />
            System Active
          </span>
        </div>
      </div>

      <div className="px-5 space-y-5 pt-5">

        {/* SOS Banner */}
        <button
          id="home-sos-banner"
          onClick={() => navigate("/sos")}
          className="w-full text-left relative overflow-hidden border border-red-600/40 status-line-sos"
          style={{
            backgroundColor: "hsl(var(--sos) / 0.08)",
            borderRadius: "4px",
            padding: "1.25rem 1.25rem 1.25rem 1.5rem",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="section-label" style={{ color: "hsl(var(--sos))" }}>Emergency</p>
              <p
                className="text-xl font-black tracking-wide mt-1"
                style={{ color: "hsl(var(--sos))", letterSpacing: "0.05em", fontFamily: "var(--font-mono)" }}
              >
                SOS
              </p>
              <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                Tap to activate emergency alert system
              </p>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <AlertTriangle className="w-8 h-8" style={{ color: "hsl(var(--sos))" }} />
              <ChevronRight className="w-4 h-4" style={{ color: "hsl(var(--sos) / 0.6)" }} />
            </div>
          </div>
        </button>

        {/* Status Row */}
        <div
          className="flex items-center justify-between px-4 py-3 status-line"
          style={{ borderRadius: "4px", backgroundColor: "hsl(var(--muted))" }}
        >
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" style={{ color: "hsl(var(--safe))" }} />
            <div>
              <p className="text-xs font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                Current Zone: Safe
              </p>
              <p className="text-[10px] font-mono" style={{ color: "hsl(var(--muted-foreground))" }}>
                Location monitoring active
              </p>
            </div>
          </div>
          <Shield className="w-4 h-4" style={{ color: "hsl(var(--safe))" }} />
        </div>

        {/* Quick Actions Grid */}
        <div>
          <p className="section-label mb-3">Quick Access</p>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                id={`action-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
                onClick={() => navigate(action.path)}
                className="text-left border hover:border-current/40 transition-all"
                style={{
                  backgroundColor: action.danger ? "hsl(var(--sos) / 0.07)" : "hsl(var(--card))",
                  borderColor: action.danger ? "hsl(var(--sos) / 0.35)" : "hsl(var(--border))",
                  borderRadius: "4px",
                  padding: "1rem",
                }}
              >
                <p
                  className="text-sm font-bold tracking-wide"
                  style={{
                    color: action.danger ? "hsl(var(--sos))" : "hsl(var(--foreground))",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {action.label}
                </p>
                <p
                  className="text-[10px] mt-1 font-mono"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  {action.sublabel}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <p className="section-label mb-3">Recent Activity</p>
          <div className="space-y-px">
            {recentActivity.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-4 py-3 px-4"
                style={{
                  backgroundColor: "hsl(var(--card))",
                  borderBottom: i < recentActivity.length - 1 ? "1px solid hsl(var(--border) / 0.4)" : undefined,
                  borderRadius: i === 0 ? "4px 4px 0 0" : i === recentActivity.length - 1 ? "0 0 4px 4px" : undefined,
                }}
              >
                <span
                  className="text-[10px] font-mono mt-0.5 shrink-0"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  {item.time}
                </span>
                <div className="flex items-center gap-2 flex-1">
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0 mt-0.5"
                    style={{
                      backgroundColor:
                        item.level === "warn"
                          ? "hsl(var(--warning))"
                          : item.level === "safe"
                            ? "hsl(var(--safe))"
                            : "hsl(var(--muted-foreground))",
                    }}
                  />
                  <p className="text-xs" style={{ color: "hsl(var(--foreground) / 0.8)" }}>
                    {item.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      <BottomNav />
    </div>
  );
};

export default HomePage;
