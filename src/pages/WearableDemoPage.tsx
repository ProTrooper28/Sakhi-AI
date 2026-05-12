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
    <div className="min-h-screen bg-slate-950 flex flex-col items-center py-12 relative overflow-hidden">
      
      {/* Background ambient glow */}
      <div 
        className="absolute inset-0 pointer-events-none transition-colors duration-1000" 
        style={{ 
            background: sosState.active ? "radial-gradient(circle at center, rgba(220, 38, 38, 0.15) 0%, black 70%)" : "radial-gradient(circle at center, rgba(34, 211, 238, 0.05) 0%, black 70%)" 
        }} 
      />

      <button
        onClick={() => navigate("/home")}
        className="absolute top-8 left-10 text-slate-500 hover:text-teal-500 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] z-20 transition-all cursor-pointer group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Tactical Console
      </button>

      <div className="text-center mb-12 z-10">
        <h1 className="text-2xl font-black tracking-tight text-white uppercase" style={{ fontFamily: "Manrope, sans-serif" }}>Hardware Node Sync</h1>
        <p className="text-[10px] text-slate-500 mt-3 max-w-[300px] font-black uppercase tracking-[0.25em] leading-relaxed mx-auto">
           Biometric Telemetry Link • Secure Encryption Phase: Active
        </p>
      </div>

      {/* Watch Hardware Frame */}
      <div className="relative w-[340px] h-[340px] rounded-full bg-slate-950 border-[18px] border-slate-900 shadow-[0_0_100px_rgba(0,0,0,0.9)] flex items-center justify-center overflow-hidden z-10 after:absolute after:inset-0 after:rounded-full after:border after:border-white/10 after:pointer-events-none">
        
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
                    <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center mb-4 animate-pulse shadow-[0_0_40px_rgba(239,68,68,0.4)]">
                        <ShieldAlert className="w-8 h-8 text-slate-950" />
                    </div>
                    <p className="text-xl font-black tracking-[0.2em] text-red-500 mb-2">SOS ACTIVE</p>
                    <p className="text-[9px] text-red-400 font-black uppercase tracking-[0.3em]">Telemetry Broadcast</p>
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
                        <p className="text-5xl font-black text-red-500 z-10 tracking-tighter">{countdown}</p>
                    </div>
                    <p className="text-[9px] text-slate-500 mt-6 font-black uppercase tracking-[0.3em]">Confirming Threat</p>
                </motion.div>
              ) : (
                // STANDBY STATE
                <motion.div 
                    key="standby"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col justify-center items-center h-full w-full"
                >
                    {/* Time */}
                    <div className="mb-6">
                        <p className="text-5xl font-black text-slate-100 tracking-tighter">10:42</p>
                        <p className="text-[10px] text-slate-500 font-black tracking-[0.3em] uppercase mt-2">Oct 27 • Friday</p>
                    </div>

                    {/* Vitals & Status */}
                    <div className="flex items-center gap-6 mb-8 px-4">
                        <div className="flex flex-col items-center">
                            <HeartPulse className={`w-4 h-4 ${pulse > 100 ? 'text-red-500 animate-pulse' : 'text-teal-500'} mb-2`} />
                            <span className="text-[11px] font-black text-slate-300">{pulse}</span>
                        </div>
                        <div className="w-px h-8 bg-slate-800/50" />
                        <div className="flex flex-col items-center">
                            <MapPin className="w-4 h-4 text-teal-500/50 mb-2" />
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Rohini</span>
                        </div>
                    </div>

                    {/* SOS Action Button */}
                    <motion.div 
                        onPointerDown={handlePointerDown}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                        whileTap={{ scale: 0.94 }}
                        className="w-[180px] py-4 rounded-full bg-red-600 text-slate-950 flex items-center justify-center gap-3 cursor-pointer select-none border border-white/20 shadow-[0_0_40px_rgba(220,38,38,0.4)] hover:bg-red-500 transition-all"
                    >
                       <ShieldAlert className="w-4 h-4" />
                       <span className="text-[11px] font-black tracking-[0.25em] uppercase">Emergency</span>
                    </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

        </div>
      </div>
      
      <p className="text-[9px] text-slate-600 mt-10 max-w-[240px] text-center font-black uppercase tracking-[0.2em] leading-relaxed">
          Operational Demo Mode • Sync Active across all Guardian nodes
      </p>

    </div>
  );
}
