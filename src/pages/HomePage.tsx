import { Shield, MapPin, Navigation2, Clock, CheckCircle2, Users, MessageSquare, AlertOctagon, Watch, BatteryMedium, Asterisk, Radio } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import AppLayout from "@/components/AppLayout";
import { useApp } from "@/context/AppContext";

const quickActions = [
  { icon: AlertOctagon, label: "SOS Emergency", path: "/sos", color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" },
  { icon: Users, label: "Guardian View", path: "/guardian", color: "text-slate-200", bg: "bg-slate-800/40", border: "border-slate-700/50" },
  { icon: MessageSquare, label: "AI Companion", path: "/assistant", color: "text-teal-500", bg: "bg-teal-500/10", border: "border-teal-500/20" },
  { icon: MapPin, label: "Safety Map", path: "/risk-map", color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
];

const recentActivity = [
  { icon: CheckCircle2, label: "Reached Home Safely", time: "Just now", color: "text-teal-500", bg: "bg-teal-500/10" },
  { icon: Shield, label: "Guardian Session Ended", time: "20m ago", color: "text-slate-400", bg: "bg-slate-800/40" },
  { icon: MapPin, label: "Location Shared — Priya", time: "1h ago", color: "text-blue-500", bg: "bg-blue-500/10" },
];

const HomePage = () => {
  const navigate = useNavigate();
  const { locationState, requestLocation, triggerSOS } = useApp();

  return (
    <AppLayout>
      <div className="bg-background min-h-screen pb-40">
        <div className="max-w-[1400px] mx-auto px-6 pt-6">
          
          {/* ── Top Header Section (Mobile Optimized) ── */}
          <div className="flex flex-col gap-4 mb-10">
            <div className="flex items-center justify-between w-full">
                <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} className="space-y-2">
                  <h1 className="text-3xl font-black text-slate-100 tracking-tight uppercase" style={{ fontFamily: "Manrope, sans-serif" }}>
                    Node Access: <span className="text-teal-500">Active</span>
                  </h1>
                  <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em]">Sector Monitoring Active • Operational Readiness: 100%</p>
               </motion.div>

               {/* Mobile Status Badge */}
               <div className="inline-flex items-center gap-3 px-4 py-2 bg-slate-900/40 rounded-2xl border border-slate-800/50 backdrop-blur-md">
                  <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-1.5 h-1.5 rounded-full bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.6)]" />
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Tactical Link Link</span>
               </div>
            </div>
          </div>

          {/* ── Stats Row (Compact & Vertically Stacked on Mobile) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {[
              { label: "Safety Index", value: "98", unit: "/100", color: "text-teal-500", bg: "bg-teal-500/10" },
              { label: "Node Guardians", value: "3", unit: " Active", color: "text-blue-500", bg: "bg-blue-500/10" },
              { label: "Signal Density", value: "High", unit: "", color: "text-slate-100", bg: "bg-slate-800/40" },
              { label: "Vault Status", value: "Locked", unit: "", color: "text-indigo-400", bg: "bg-indigo-500/10" },
            ].map((stat, i) => (
              <motion.div 
                key={stat.label} 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: i * 0.05 }}
                className="p-6 rounded-[32px] border border-slate-800 shadow-2xl bg-slate-900/40 backdrop-blur-md flex justify-between items-center group hover:border-slate-700 transition-all"
              >
                <div>
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] mb-2">{stat.label}</p>
                  <p className={`text-xl font-black ${stat.color} uppercase tracking-tight`} style={{ fontFamily: "Manrope, sans-serif" }}>
                    {stat.value}<span className="text-[10px] font-black opacity-40 ml-1 uppercase">{stat.unit}</span>
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform`}>
                  {i === 0 && <Shield className="w-4 h-4 text-teal-500" />}
                  {i === 1 && <Users className="w-4 h-4 text-blue-500" />}
                  {i === 2 && <Radio className="w-4 h-4 text-slate-400" />}
                  {i === 3 && <Clock className="w-4 h-4 text-indigo-400" />}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
               <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="relative rounded-[28px] overflow-hidden bg-gradient-to-br from-[#0f172a] to-[#334155] p-8 shadow-xl">
                  <div className="absolute top-0 right-0 w-60 h-60 bg-teal-500/10 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2" />
                  <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[9px] font-black uppercase tracking-widest mb-4">
                       <Shield className="w-3 h-3" /> Enhanced Protection
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2 leading-tight">AI Guardian Session</h2>
                    <p className="text-slate-400 text-[13px] font-medium leading-relaxed mb-6">
                       Real-time GPS & environment monitoring.
                    </p>
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate("/assistant")}
                      className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-teal-500 text-slate-900 font-black text-[13px] rounded-xl transition-all shadow-lg shadow-teal-500/20"
                    >
                       Start Companion <Navigation2 className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                         <div>
                  <h3 className="text-[15px] font-black text-slate-100 uppercase tracking-widest mb-4 ml-1 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                    Quick Actions
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {quickActions.map(({ icon: Icon, label, path, color, bg, border }, i) => (
                      <motion.button
                        key={path}
                        whileHover={{ y: -4, scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => path === "/sos" ? (triggerSOS(), navigate("/sos")) : navigate(path)}
                        className="group bg-slate-900/40 backdrop-blur-md p-6 rounded-[28px] border border-slate-800/50 shadow-lg flex flex-col items-center text-center gap-3 transition-all"
                      >
                        <div className={`w-12 h-12 rounded-2xl ${bg} ${color} flex items-center justify-center transition-all group-hover:scale-110 border border-white/5`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-slate-300 text-[11px] font-black tracking-tight">{label}</span>
                      </motion.button>
                    ))}
                  </div>
                   <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/40 backdrop-blur-md p-8 rounded-[32px] border border-slate-800/50 shadow-2xl mt-6">
                   <div className="flex items-center justify-between mb-8">
                     <h3 className="text-[14px] font-black text-slate-100 uppercase tracking-[0.15em]">Activity Stream</h3>
                     <button onClick={() => navigate("/report")} className="text-[10px] font-black text-teal-500 hover:text-teal-400 transition-colors uppercase tracking-[0.2em] cursor-pointer">Archive</button>
                   </div>
                   <div className="space-y-5">
                     {recentActivity.map((item, i) => (
                       <motion.button
                         key={i}
                         whileHover={{ x: 6, backgroundColor: "rgba(20, 184, 166, 0.05)" }}
                         whileTap={{ scale: 0.98 }}
                         onClick={() => navigate("/evidence-locker")}
                         className="w-full flex items-center gap-5 p-5 rounded-2xl transition-all cursor-pointer text-left border border-slate-800/30 hover:border-teal-500/20"
                       >
                         <div className={`w-11 h-11 rounded-xl ${item.bg} ${item.color} flex items-center justify-center flex-shrink-0 border border-white/5 shadow-lg`}>
                            <item.icon className="w-5 h-5" />
                         </div>
                         <div className="flex-1">
                           <p className="text-slate-100 text-[13px] font-black uppercase tracking-tight leading-none mb-2">{item.label}</p>
                           <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.15em]">{item.time} • LOG_ENTRY: 00{i+1}</p>
                         </div>
                       </motion.button>
                     ))}
                   </div>
                </motion.div>
               </div>
            </div>

            <div className="space-y-6">
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-slate-900/40 backdrop-blur-md p-8 rounded-[32px] border border-slate-800/50 shadow-2xl">
                   <div className="flex items-center justify-between mb-6">
                     <h3 className="text-[14px] font-black text-slate-100 uppercase tracking-widest">Live Sync</h3>
                     <motion.button whileHover={{ scale: 1.1, rotate: 180 }} onClick={requestLocation} className="text-teal-500">
                        <Navigation2 className="w-4 h-4" />
                     </motion.button>
                   </div>
                   <div className="bg-slate-950/50 rounded-2xl p-5 mb-6 border border-slate-800/50">
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] mb-2">Current Coordinates</p>
                      <p className="text-slate-100 text-[12px] font-black uppercase tracking-tight leading-relaxed truncate">
                         {locationState.loading ? "Locating Vector..." : locationState.address || "Sector 18, Noida"}
                      </p>
                   </div>
                   <div className="w-full aspect-[16/10] bg-[#020617] rounded-[24px] overflow-hidden relative border border-slate-800/50 shadow-inner group">
                      <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity" style={{ backgroundImage: "linear-gradient(rgba(20,184,166,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(20,184,166,0.1) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                         <motion.div animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 3 }} className="w-4 h-4 bg-teal-500 rounded-full border-2 border-slate-900 shadow-[0_0_20px_rgba(20,184,166,0.8)]" />
                      </div>
                   </div>
                   <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => navigate("/risk-map")} className="w-full mt-6 py-4 bg-teal-500/5 border border-teal-500/20 text-teal-500 font-black text-[11px] rounded-2xl uppercase tracking-[0.2em] hover:bg-teal-500/10 transition-all cursor-pointer">Open Tactical Map</motion.button>
                </motion.div>

               <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-slate-900/40 backdrop-blur-md p-8 rounded-[32px] border border-slate-800/50 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                       <Watch className="w-3.5 h-3.5 text-teal-500" />
                       <h3 className="text-[14px] font-black text-slate-100 uppercase tracking-widest">Wearable Device</h3>
                    </div>
                    <span className="text-[9px] font-black text-teal-500 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20 uppercase tracking-wider">Sync Active</span>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                     <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: "85%" }} className="h-full bg-teal-500 rounded-full" />
                     </div>
                     <span className="text-[12px] font-black text-slate-300 flex items-center gap-1"><BatteryMedium className="w-3.5 h-3.5 text-teal-500" /> 85%</span>
                  </div>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { triggerSOS(); navigate("/sos"); }} className="w-full py-3.5 bg-red-500/10 border border-red-500/20 text-red-500 font-black text-[11px] rounded-xl uppercase tracking-widest hover:bg-red-500/20 transition-all">Test Emergency Trigger</motion.button>
               </motion.div>        </motion.div>
            </div>
          </div>
        </div>

        {/* ── Anchored SOS Button (Mobile Only) ── */}
        <div className="fixed bottom-[5.5rem] left-0 right-0 flex justify-center z-40 pointer-events-none md:hidden">
            <motion.button
              onClick={() => { triggerSOS(); navigate("/sos"); }}
              initial={{ scale: 1 }}
              animate={{ 
                scale: [1, 1.05, 1],
              }}
              transition={{ 
                duration: 2.5, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              style={{ transformOrigin: "center" }}
              className="w-20 h-20 bg-red-600 text-white rounded-full flex flex-col items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.5)] pointer-events-auto border-[4px] border-white/20 relative"
            >
              <Radio className="w-7 h-7 mb-0.5" />
              <span className="text-[8px] font-black uppercase tracking-tighter">Emergency</span>
              
              {/* Trust Glow */}
              <motion.div 
                animate={{ opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-full bg-red-400/20"
              />
            </motion.button>
        </div>

      </div>
    </AppLayout>
  );
};

export default HomePage;
