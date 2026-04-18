import { Shield, MapPin, Navigation2, Clock, CheckCircle2, MoreVertical, Edit2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import { useApp } from "@/context/AppContext";

const HomePage = () => {
  const navigate = useNavigate();
  const { locationState, requestLocation } = useApp();

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.3 }}
      className="min-h-screen pb-[6.5rem] bg-background"
    >
      {/* ─── 1. Header Section ────────────────────────────────────────────── */}
      <div className="px-5 pt-10 pb-6 border-b border-border/20 bg-gradient-to-b from-background to-background/50">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
               <span className="dot-active" />
            </div>
            <span className="font-bold tracking-tight text-foreground/80 font-heading">Sakhi AI</span>
          </div>
          
          {/* Status Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-safe/10 border border-safe/20 rounded-full">
            <span className="w-2 h-2 rounded-full bg-safe animate-pulse" />
            <span className="text-[10px] font-bold text-safe uppercase tracking-wider">Monitoring Active</span>
          </div>
        </div>

        <div>
           <h1 className="text-[28px] font-bold tracking-tight text-foreground font-heading leading-tight">
             Good evening, Preeti
           </h1>
           <p className="text-sm font-medium text-muted-foreground mt-1 tracking-wide">
             You are safe with Sakhi.
           </p>
        </div>
      </div>

      {/* ─── 2. Main Grids ────────────────────────────────────────────────── */}
      <div className="px-5 pt-6 flex flex-col gap-4">
        
        {/* UPPER ROW: Companion (Left) + Contacts (Right) */}
        <div className="grid grid-cols-[1.2fr_1fr] md:grid-cols-2 gap-4">
          
          {/* Main Feature Card (Left) */}
          <div className="relative p-5 rounded-[1.5rem] bg-slate-900 overflow-hidden shadow-lg border border-slate-800 flex flex-col justify-between">
            {/* Top Glow Spotlight Effect */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-20 bg-primary/40 blur-[40px] pointer-events-none" />
            
            <div className="relative z-10">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mb-3 text-primary">
                 <Shield className="w-4 h-4" />
              </div>
              <h2 className="text-white font-bold text-base tracking-tight mb-2">Companion Mode</h2>
              <p className="text-slate-400 text-[11px] font-medium leading-relaxed">
                Walking home? Activate AI voice monitoring to stay connected until you reach your door.
              </p>
            </div>

            <button 
               onClick={() => navigate("/assistant")}
               className="relative z-10 mt-5 w-full py-2.5 bg-safe text-white text-[12px] font-bold rounded-xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] hover:shadow-[0_0_15px_rgba(34,197,94,0.4)] flex justify-center items-center gap-1.5 cursor-pointer"
            >
               Start Session <Navigation2 className="w-3 h-3 rotate-90" strokeWidth={3} />
            </button>
          </div>

          {/* Trusted Contacts Card (Right) */}
          <div className="p-4 rounded-[1.5rem] bg-card border border-border/60 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
               <h2 className="text-sm font-bold text-foreground">Trusted Contacts</h2>
            </div>
            
            <div className="flex-1 flex flex-col justify-center space-y-3">
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">M</div>
                 <div>
                    <p className="text-xs font-bold text-foreground">Mom</p>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Primary</p>
                 </div>
               </div>
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs">P</div>
                 <div>
                    <p className="text-xs font-bold text-foreground">Priya</p>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Guardian</p>
                 </div>
               </div>
            </div>

            <button className="mt-3 w-full py-2 bg-muted/40 text-muted-foreground text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all hover:bg-muted duration-300 cursor-pointer flex items-center justify-center gap-1.5">
               <Edit2 className="w-3 h-3" /> Edit Circle
            </button>
          </div>

        </div>

        {/* LOWER ROW: Safety History (Left) + Location Card (Right) */}
        <div className="grid grid-cols-[1fr_1.1fr] md:grid-cols-2 gap-4">
          
          {/* Safety History (Left) */}
          <div className="p-4 rounded-[1.5rem] bg-card border border-border/60 shadow-sm flex flex-col">
             <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-xs font-bold text-foreground">History</h2>
             </div>
             
             <div className="relative pl-3 space-y-4 before:absolute before:inset-0 before:ml-[7px] before:w-[2px] before:bg-muted">
                <div className="relative flex items-start gap-3">
                   <div className="absolute -left-3 mt-1 w-[10px] h-[10px] rounded-full bg-safe border-2 border-background" />
                   <div>
                     <p className="text-[11px] font-bold text-foreground leading-tight">Reached Home</p>
                     <p className="text-[9px] text-muted-foreground mt-0.5">22:15 PM</p>
                   </div>
                </div>
                <div className="relative flex items-start gap-3">
                   <div className="absolute -left-3 mt-1 w-[10px] h-[10px] rounded-full bg-muted-foreground border-2 border-background" />
                   <div>
                     <p className="text-[11px] font-bold text-foreground leading-tight">Session Ended</p>
                     <p className="text-[9px] text-muted-foreground mt-0.5">20:30 PM</p>
                   </div>
                </div>
             </div>
          </div>

          {/* Location Card (Right) */}
          <button 
             onClick={(e) => {
                if (locationState.error) {
                   e.preventDefault();
                   requestLocation();
                } else {
                   navigate("/risk-map");
                }
             }}
             className="text-left p-4 rounded-[1.5rem] bg-gradient-to-br from-blue-50 to-indigo-50/30 border border-blue-100 shadow-sm flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
             <div>
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                   <MapPin className="w-4 h-4 text-primary" />
                </div>
                
                {locationState.error ? (
                  <>
                     <h2 className="text-[11px] font-bold text-sos uppercase tracking-wider mb-1">Access Required</h2>
                     <p className="text-sm font-bold text-slate-800 leading-snug">Tap to enable Location access</p>
                  </>
                ) : (
                  <>
                    <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                       Current Location
                       {!locationState.loading && (
                         <span className="flex items-center gap-1 text-[9px] text-safe whitespace-nowrap">
                           <span className="w-1.5 h-1.5 bg-safe rounded-full animate-pulse" /> Live
                         </span>
                       )}
                    </h2>
                    <p className="text-sm font-bold text-slate-800 leading-snug">
                       {locationState.loading ? "Locating..." : locationState.address || "Unknown Area"}
                    </p>
                  </>
                )}
             </div>
             
             {/* 3D Minimal Illustration Placeholder Block */}
             <div className="mt-4 w-full h-[3.5rem] rounded-xl bg-blue-200/50 border border-blue-200 overflow-hidden relative">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.4)_50%,transparent_75%)] bg-[length:24px_24px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full border-2 border-white shadow-sm" />
             </div>
          </button>

        </div>
      </div>

      <BottomNav />
    </motion.div>
  );
};

export default HomePage;
