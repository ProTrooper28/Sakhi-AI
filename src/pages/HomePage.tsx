import { Shield, AlertTriangle, MapPin, Lock, FileWarning, ChevronRight, Watch } from "lucide-react";
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
  {
    label: "Wearables",
    sublabel: "Watch Integrations",
    path: "/wearable",
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
      <div className="px-5 pt-8 pb-5 flex items-center justify-between border-b border-border/40 bg-gradient-to-b from-background to-muted/20">
        <div>
          <p className="section-label mb-1 normal-case tracking-normal font-semibold text-muted-foreground">Good evening,</p>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "hsl(var(--foreground))", letterSpacing: "-0.01em" }}
          >
            You are safe.
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge-active bg-card/80 backdrop-blur rounded-xl">
            <span className="dot-active" />
            Monitoring
          </span>
        </div>
      </div>

      {/* Safety Ticker */}
      <div className="ticker-wrap flex items-center h-10 border-b border-border/40 bg-card rounded-b-[1.5rem]">
        <div className="ticker-content text-[11px] font-sans font-medium tracking-wide normal-case text-muted-foreground opacity-90">
          Sakhi AI is actively protecting you • Women Helpline: <span className="text-primary font-bold">1091</span> &nbsp;&nbsp;|&nbsp;&nbsp; 
          Emergency: <span className="text-sos font-bold">112</span> &nbsp;&nbsp;|&nbsp;&nbsp; 
          Stay Calm • Stay Safe • Sakhi AI is actively protecting you
        </div>
      </div>

      <div className="px-5 space-y-5 pt-5">

        {/* SOS Banner */}
        <button
          id="home-sos-banner"
          onClick={() => navigate("/sos")}
          className="w-full text-left relative overflow-hidden shadow-sm transition-all active:scale-[0.98]"
          style={{
            borderRadius: "var(--radius)",
            backgroundColor: "hsl(var(--sos) / 0.1)",
            border: "1px solid hsl(var(--sos) / 0.2)",
            padding: "1.25rem 1.25rem 1.25rem 1.5rem",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: "hsl(var(--sos) / 0.8)" }}>Emergency</p>
              <p
                className="text-xl font-bold mt-1"
                style={{ color: "hsl(var(--sos))", letterSpacing: "0.02em" }}
              >
                SOS Alert
              </p>
              <p className="text-xs mt-1 font-medium" style={{ color: "hsl(var(--sos) / 0.7)" }}>
                Tap if you need immediate help
              </p>
            </div>
            <div className="flex flex-col items-center justify-center p-3 rounded-full bg-sos/10">
              <AlertTriangle className="w-7 h-7" style={{ color: "hsl(var(--sos))" }} />
            </div>
          </div>
        </button>

        {/* Status Row */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderRadius: "1rem", backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-safe/10 rounded-full">
              <MapPin className="w-4 h-4 text-safe" />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: "hsl(var(--foreground))" }}>
                Current Zone: <span className="font-bold text-safe">Safe</span>
              </p>
              <p className="text-[11px] font-medium opacity-70" style={{ color: "hsl(var(--muted-foreground))" }}>
                Location monitoring is active.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div>
          <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-3 px-1">Quick Access</p>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                id={`action-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
                onClick={() => navigate(action.path)}
                className={`text-left transition-all active:scale-95 flex flex-col justify-center bg-card`}
                style={{
                  border: action.danger ? "1px solid hsl(var(--sos) / 0.4)" : "1px solid hsl(var(--border))",
                  borderRadius: "1rem",
                  padding: "1rem",
                }}
              >
                <p
                  className="text-[13px] font-semibold"
                  style={{
                    color: action.danger ? "hsl(var(--sos))" : "hsl(var(--foreground))",
                  }}
                >
                  {action.label}
                </p>
                <p
                  className="text-[11px] mt-1 font-medium"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  {action.sublabel}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="pb-4">
          <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-3 px-1">Recent Activity</p>
          <div className="space-y-2">
            {recentActivity.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-4 py-3 px-4 bg-card"
                style={{
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "1rem",
                }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor:
                      item.level === "warn"
                        ? "hsl(var(--warning))"
                        : item.level === "safe"
                          ? "hsl(var(--safe))"
                          : "hsl(var(--muted-foreground))",
                  }}
                />
                <p className="text-[13px] font-medium flex-1 text-foreground">
                  {item.label}
                </p>
                <span
                  className="text-[11px] font-medium shrink-0"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  {item.time}
                </span>
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
