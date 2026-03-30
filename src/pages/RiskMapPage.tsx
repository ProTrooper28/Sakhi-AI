import { motion } from "framer-motion";
import { MapPin, AlertTriangle, Navigation, Clock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";

const zones = [
  { name: "MG Road", risk: "high", reports: 12, time: "After 10 PM" },
  { name: "Koramangala 5th Block", risk: "medium", reports: 5, time: "After 11 PM" },
  { name: "Indiranagar", risk: "low", reports: 1, time: "All hours" },
  { name: "Whitefield Station", risk: "high", reports: 8, time: "After 9 PM" },
];

const riskColor = (risk: string) => {
  switch (risk) {
    case "high": return "bg-sos/10 text-sos border-sos/20";
    case "medium": return "bg-warning/10 text-warning border-warning/20";
    default: return "bg-safe/10 text-safe border-safe/20";
  }
};

const RiskMapPage = () => {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-xl font-bold">Risk Prediction</h1>
        <p className="text-sm text-muted-foreground">Stay aware, stay safe</p>
      </div>

      <div className="px-5 space-y-5">
        {/* Map Placeholder */}
        <div className="relative rounded-2xl overflow-hidden bg-muted h-52 flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-accent/5" />
          <div className="text-center z-10">
            <MapPin className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium">Interactive map coming soon</p>
            <p className="text-xs text-muted-foreground">Based on FIR data & user reports</p>
          </div>
        </div>

        {/* Safe Route Button */}
        <Button className="w-full" size="lg" variant="outline">
          <Navigation className="w-4 h-4 mr-2" />
          Find Safer Route
        </Button>

        {/* Risk Zones */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Nearby Risk Zones</h3>
          <div className="space-y-3">
            {zones.map((zone, i) => (
              <motion.div
                key={zone.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`glass rounded-xl p-4 border ${riskColor(zone.risk)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {zone.risk === "high" ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : zone.risk === "medium" ? (
                        <Clock className="w-5 h-5" />
                      ) : (
                        <Shield className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{zone.name}</p>
                      <p className="text-xs text-muted-foreground">{zone.reports} reports · Risky {zone.time}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${riskColor(zone.risk)}`}>
                    {zone.risk}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground">
            Risk data is based on historical FIR records and community reports. Alerts are more frequent during night hours and in isolated areas.
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default RiskMapPage;
