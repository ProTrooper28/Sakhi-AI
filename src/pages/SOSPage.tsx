import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Mic, WifiOff, EyeOff, Phone, MapPin, Video, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";

const modes = [
  { id: "voice", icon: Mic, label: "Voice", desc: 'Say "Hey Sakhi, help me"' },
  { id: "offline", icon: WifiOff, label: "Offline", desc: "SMS alerts when no internet" },
  { id: "silent", icon: EyeOff, label: "Silent", desc: "Discreet SOS activation" },
] as const;

const SOSPage = () => {
  const [activeMode, setActiveMode] = useState<string>("voice");
  const [sosActive, setSosActive] = useState(false);

  const activateSOS = () => setSosActive(true);
  const deactivateSOS = () => setSosActive(false);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-xl font-bold">Emergency SOS</h1>
        <p className="text-sm text-muted-foreground">Choose your activation mode</p>
      </div>

      <div className="px-5 space-y-6">
        {/* Mode Selector */}
        <div className="flex gap-2">
          {modes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              className={`flex-1 rounded-xl p-3 text-center transition-all ${
                activeMode === mode.id
                  ? "bg-primary text-primary-foreground"
                  : "glass"
              }`}
            >
              <mode.icon className="w-5 h-5 mx-auto mb-1" />
              <p className="text-xs font-semibold">{mode.label}</p>
            </button>
          ))}
        </div>

        {/* Mode Description */}
        <div className="glass rounded-xl p-4">
          <p className="text-sm text-muted-foreground">
            {modes.find((m) => m.id === activeMode)?.desc}
          </p>
        </div>

        {/* SOS Button */}
        <div className="flex justify-center py-8">
          <AnimatePresence mode="wait">
            {!sosActive ? (
              <motion.button
                key="inactive"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                whileTap={{ scale: 0.9 }}
                onClick={activateSOS}
                className="w-44 h-44 rounded-full bg-sos text-sos-foreground flex flex-col items-center justify-center sos-pulse shadow-2xl"
              >
                <AlertTriangle className="w-10 h-10 mb-2" />
                <span className="text-lg font-bold">SOS</span>
                <span className="text-xs opacity-80">Hold to activate</span>
              </motion.button>
            ) : (
              <motion.div
                key="active"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center space-y-4"
              >
                <div className="w-44 h-44 rounded-full bg-sos/20 border-4 border-sos flex flex-col items-center justify-center mx-auto animate-pulse">
                  <Shield className="w-10 h-10 text-sos mb-1" />
                  <span className="text-sm font-bold text-sos">SOS Active</span>
                </div>
                <Button variant="outline" onClick={deactivateSOS} className="mt-4">
                  Cancel SOS
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Active SOS Info */}
        <AnimatePresence>
          {sosActive && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <div className="glass rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-sos/10 flex items-center justify-center">
                  <Video className="w-4 h-4 text-sos" />
                </div>
                <p className="text-sm">Recording audio & video...</p>
              </div>
              <div className="glass rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <p className="text-sm">Sharing live location with contacts</p>
              </div>
              <div className="glass rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-safe/10 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-safe" />
                </div>
                <p className="text-sm">Alerting nearby authorities</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Emotion Detection */}
        {activeMode === "voice" && !sosActive && (
          <div className="glass rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold">Emotion Detection</h3>
            <div className="flex gap-2">
              {["Calm", "Neutral", "Stress", "Panic"].map((emotion, i) => (
                <div
                  key={emotion}
                  className={`flex-1 text-center py-2 rounded-lg text-xs font-medium ${
                    i === 0 ? "bg-safe/10 text-safe" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {emotion}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Auto-triggers SOS on panic detection
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default SOSPage;
