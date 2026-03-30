import { motion } from "framer-motion";
import { Shield, Mic, MapPin, MessageCircle, FileWarning, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import ThemeToggle from "@/components/ThemeToggle";

const quickActions = [
  { icon: Mic, label: "Voice SOS", desc: "Activate by voice", path: "/sos", color: "bg-sos/10 text-sos" },
  { icon: MessageCircle, label: "AI Assistant", desc: "Chat with Sakhi", path: "/assistant", color: "bg-primary/10 text-primary" },
  { icon: FileWarning, label: "Report", desc: "Anonymous reporting", path: "/report", color: "bg-accent/10 text-accent" },
  { icon: MapPin, label: "Safe Routes", desc: "Risk prediction", path: "/risk-map", color: "bg-safe/10 text-safe" },
];

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Hello,</p>
          <h1 className="text-xl font-bold">Stay Safe ✨</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
        </div>
      </div>

      <div className="px-5 space-y-6">
        {/* SOS Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/sos")}
          className="w-full rounded-2xl bg-sos p-6 text-sos-foreground sos-pulse relative overflow-hidden"
        >
          <div className="relative z-10 flex items-center justify-between">
            <div className="text-left">
              <h2 className="text-lg font-bold">Emergency SOS</h2>
              <p className="text-sm opacity-80">Tap or say "Hey Sakhi, help me"</p>
            </div>
            <div className="w-14 h-14 rounded-full bg-sos-foreground/20 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" />
            </div>
          </div>
        </motion.button>

        {/* Status Card */}
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-safe animate-pulse" />
          <div>
            <p className="text-sm font-medium">You're in a safe zone</p>
            <p className="text-xs text-muted-foreground">Location monitoring active</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, i) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => navigate(action.path)}
                className="glass rounded-xl p-4 text-left hover:border-primary/30 transition-colors"
              >
                <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center mb-3`}>
                  <action.icon className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold">{action.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{action.desc}</p>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Recent Alerts */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Safety Insights</h3>
          <div className="space-y-2">
            <div className="glass rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-warning" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Elevated risk near MG Road after 10 PM</p>
                <p className="text-xs text-muted-foreground">2 reports this week</p>
              </div>
            </div>
            <div className="glass rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-safe/10 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-safe" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Your regular route is safe today</p>
                <p className="text-xs text-muted-foreground">Updated 5 min ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default HomePage;
