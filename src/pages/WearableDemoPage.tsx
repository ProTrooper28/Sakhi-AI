import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ShieldAlert, HeartPulse, MapPin } from "lucide-react";

export default function WearableDemoPage() {
  const navigate = useNavigate();
  const { triggerSOS, sosState } = useApp();
  const [pulse, setPulse] = useState(72);
  const [triggering, setTriggering] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Simulate heart rate changes
  useEffect(() => {
    const id = setInterval(() => {
      setPulse(prev => {
        const variation = Math.floor(Math.random() * 5) - 2;
        let next = prev + variation;
        if (triggering || sosState.active) {
            next = Math.min(140, next + 5); // Spike heart rate on panic
        } else {
            next = Math.max(65, Math.min(85, next)); // Normal resting rate
        }
        return next;
      });
    }, 1500);
    return () => clearInterval(id);
  }, [triggering, sosState.active]);

  // Handle SOS hold trigger
  useEffect(() => {
    let timer: any;
    if (triggering && !sosState.active) {
      if (countdown > 0) {
        timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      } else {
        triggerSOS();
      }
    }
    return () => clearTimeout(timer);
  }, [triggering, countdown, sosState.active, triggerSOS]);

  const handlePointerDown = () => {
    if (!sosState.active) {
      setTriggering(true);
      setCountdown(3);
    }
  };

  const handlePointerUp = () => {
    if (!sosState.active) {
      setTriggering(false);
      setCountdown(3);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center py-10 relative overflow-hidden">
      
      {/* Background ambient glow */}
      <div 
        className="absolute inset-0 pointer-events-none transition-colors duration-1000" 
        style={{ 
            background: sosState.active ? "radial-gradient(circle at center, rgba(220, 38, 38, 0.15) 0%, black 70%)" : "radial-gradient(circle at center, rgba(34, 211, 238, 0.05) 0%, black 70%)" 
        }} 
      />

      <button
        onClick={() => navigate("/home")}
        className="absolute top-6 left-6 text-muted-foreground flex items-center gap-2 text-sm z-10 hover:text-foreground transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Exit Demo
      </button>

      <div className="text-center mb-10 z-10">
        <h1 className="text-xl font-bold tracking-tight text-white font-heading">Wearable Integration</h1>
        <p className="text-sm text-gray-500 mt-1 max-w-[250px]">
           Simulated smartwatch interface. Hold the SOS button to trigger a live emergency alert across all synced devices.
        </p>
      </div>

      {/* Watch Hardware Frame */}
      <div className="relative w-[320px] h-[320px] rounded-full bg-[#111] border-[12px] border-[#222] shadow-[0_0_50px_rgba(0,0,0,1)] flex items-center justify-center overflow-hidden z-10">
        
        {/* Watch screen wrapper */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-white text-center">
            
            <AnimatePresence mode="wait">
              {sosState.active ? (
                // ACTIVE SOS STATE
                <motion.div 
                    key="active"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center justify-center h-full w-full bg-red-600/20 rounded-full"
                >
                    <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center mb-3 animate-pulse shadow-[0_0_30px_rgba(220,38,38,0.8)]">
                        <ShieldAlert className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-xl font-bold tracking-wider font-heading text-red-500 mb-1">SOS ACTIVE</p>
                    <p className="text-[10px] text-red-300 font-mono">BROADCASTING</p>
                </motion.div>
              ) : triggering ? (
                // TRIGGERING STATE (Holding)
                <motion.div 
                    key="triggering" 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col items-center"
                >
                    <div className="relative w-32 h-32 flex items-center justify-center">
                        <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                            <circle cx="64" cy="64" r="60" stroke="#333" strokeWidth="8" fill="none" />
                            <motion.circle 
                                cx="64" cy="64" r="60" stroke="#ef4444" strokeWidth="8" fill="none" 
                                strokeDasharray="377" strokeDashoffset="377"
                                animate={{ strokeDashoffset: 0 }}
                                transition={{ duration: 3, ease: "linear" }}
                            />
                        </svg>
                        <p className="text-4xl font-bold font-mono text-red-500 z-10">{countdown}</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-4 font-mono">HOLD TO CONFIRM</p>
                </motion.div>
              ) : (
                // STANDBY STATE
                <motion.div 
                    key="standby"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col justify-center items-center h-full w-full"
                >
                    {/* Time */}
                    <div className="mb-4">
                        <p className="text-4xl font-bold font-mono tracking-tight">10:42</p>
                        <p className="text-[10px] text-gray-500 font-heading font-medium tracking-widest mt-1">FRI, OCT 27</p>
                    </div>

                    {/* Vitals & Status */}
                    <div className="flex items-center gap-5 mb-5 px-3">
                        <div className="flex flex-col items-center">
                            <HeartPulse className={`w-4 h-4 ${pulse > 100 ? 'text-red-500 animate-pulse' : 'text-green-500'} mb-1`} />
                            <span className="text-xs font-mono font-bold text-gray-300">{pulse}</span>
                        </div>
                        <div className="w-px h-6 bg-gray-800" />
                        <div className="flex flex-col items-center">
                            <MapPin className="w-4 h-4 text-blue-400 mb-1" />
                            <span className="text-[9px] font-mono font-bold text-gray-300 uppercase tracking-widest">Rohini</span>
                        </div>
                    </div>

                    {/* SOS Action Button */}
                    <motion.div 
                        onPointerDown={handlePointerDown}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                        whileTap={{ scale: 0.9 }}
                        className="w-[140px] py-3 rounded-full bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.4)] flex items-center justify-center gap-2 cursor-pointer select-none border border-red-500 hover:bg-red-500 transition-colors"
                    >
                       <ShieldAlert className="w-4 h-4 text-white" />
                       <span className="text-sm font-bold tracking-widest font-heading text-white">SOS</span>
                    </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

        </div>
      </div>
      
      <p className="text-xs text-gray-600 mt-6 max-w-[200px] text-center">
          In a real-life scenario, this interface runs directly on WearOS or Apple Watch.
      </p>

    </div>
  );
}
