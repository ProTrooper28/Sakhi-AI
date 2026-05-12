import { Shield, MapPin, Navigation2, Clock, CheckCircle2, Users, MessageSquare, AlertOctagon, Watch, BatteryMedium, Asterisk } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import AppLayout from "@/components/AppLayout";
import { useApp } from "@/context/AppContext";

const quickActions = [
  { icon: AlertOctagon, label: "SOS Emergency", path: "/sos", color: "text-red-600", bg: "bg-red-50", border: "border-red-100" },
  { icon: Users, label: "Guardian View", path: "/guardian", color: "text-slate-700", bg: "bg-slate-50", border: "border-slate-100" },
  { icon: MessageSquare, label: "AI Companion", path: "/assistant", color: "text-teal-600", bg: "bg-teal-50", border: "border-teal-100" },
  { icon: MapPin, label: "Safety Map", path: "/risk-map", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
];

const recentActivity = [
  { icon: CheckCircle2, label: "Reached Home Safely", time: "Today 22:15", color: "text-teal-600", bg: "bg-teal-50" },
  { icon: Shield, label: "Guardian Session Ended", time: "Today 20:30", color: "text-slate-500", bg: "bg-slate-50" },
  { icon: MapPin, label: "Location Shared — Priya", time: "Yesterday 18:45", color: "text-blue-600", bg: "bg-blue-50" },
];

const HomePage = () => {
  const navigate = useNavigate();
  const { locationState, requestLocation, triggerSOS } = useApp();

  return (
    <AppLayout>
      <div className="bg-[#fcfcfd] min-h-screen pb-40">
        <div className="max-w-[1400px] mx-auto px-6 pt-6">
          
          {/* ── Top Header Section (Mobile Optimized) ── */}
          <div className="flex flex-col gap-4 mb-8">
            <div className="flex items-center justify-between w-full">
               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
                    Hi, Preeti <span className="text-xl">👋</span>
                  </h1>
                  <p className="text-slate-400 font-bold text-[13px] uppercase tracking-wider">Welcome back. Safe travels.</p>
               </motion.div>

               {/* Mobile Status Badge */}
               <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-50 rounded-full border border-teal-100">
                  <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-1.5 h-1.5 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]" />
                  <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest">Live Monitoring</span>
               </div>
            </div>
          </div>

          {/* ── Stats Row (Compact & Vertically Stacked on Mobile) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Safety Score", value: "98", unit: "/100", color: "text-teal-600", bg: "bg-teal-50/50" },
              { label: "Guardians", value: "3", unit: " Active", color: "text-blue-600", bg: "bg-blue-50/50" },
              { label: "Reports", value: "0", unit: " Pending", color: "text-slate-700", bg: "bg-slate-50" },
              { label: "Storage", value: "1.2", unit: " GB", color: "text-indigo-600", bg: "bg-indigo-50/50" },
            ].map((stat, i) => (
              <motion.div 
                key={stat.label} 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: i * 0.05 }}
                className={`p-4 rounded-[20px] border border-slate-100/50 ${stat.bg} bg-white shadow-sm flex justify-between items-center`}
              >
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">{stat.label}</p>
                  <p className={`text-xl font-black ${stat.color}`} style={{ fontFamily: "Manrope, sans-serif" }}>
                    {stat.value}<span className="text-[12px] font-bold opacity-60 ml-0.5">{stat.unit}</span>
                  </p>
                </div>
                <div className={`w-8 h-8 rounded-full ${stat.bg} flex items-center justify-center`}>
                  {i === 0 && <Shield className="w-4 h-4 text-teal-600" />}
                  {i === 1 && <Users className="w-4 h-4 text-blue-600" />}
                  {i === 2 && <Clock className="w-4 h-4 text-slate-600" />}
                  {i === 3 && <MapPin className="w-4 h-4 text-indigo-600" />}
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
               </motion.div>

               <div>
                  <h3 className="text-[15px] font-black text-slate-900 uppercase tracking-widest mb-4 ml-1">Quick Actions</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {quickActions.map(({ icon: Icon, label, path, color, bg, border }, i) => (
                      <motion.button
                        key={path}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => path === "/sos" ? (triggerSOS(), navigate("/sos")) : navigate(path)}
                        className="group bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex flex-col items-center text-center gap-3 transition-all"
                      >
                        <div className={`w-12 h-12 rounded-2xl ${bg} ${color} flex items-center justify-center transition-all group-hover:scale-110`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-slate-700 text-[11px] font-black tracking-tight">{label}</span>
                      </motion.button>
                    ))}
                  </div>
               </div>

               <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[15px] font-black text-slate-900 uppercase tracking-widest">Recent Activity</h3>
                    <button onClick={() => navigate("/report")} className="text-[11px] font-black text-slate-400 hover:text-teal-600 transition-colors uppercase tracking-widest cursor-pointer">View All</button>
                  </div>
                  <div className="space-y-4">
                    {recentActivity.map((item, i) => (
                      <motion.button
                        key={i}
                        whileHover={{ x: 3, backgroundColor: "#f8fafc" }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate("/evidence-locker")}
                        className="w-full flex items-center gap-4 p-3 rounded-2xl transition-colors cursor-pointer text-left"
                      >
                        <div className={`w-9 h-9 rounded-xl ${item.bg} ${item.color} flex items-center justify-center flex-shrink-0`}>
                           <item.icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-slate-900 text-[13px] font-black leading-none mb-1">{item.label}</p>
                          <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">{item.time}</p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
               </motion.div>
            </div>

            <div className="space-y-6">
               <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[14px] font-black text-slate-900 uppercase tracking-widest">Live Location</h3>
                    <motion.button whileHover={{ scale: 1.1, rotate: 180 }} onClick={requestLocation} className="text-blue-600">
                       <Navigation2 className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3 mb-4 border border-slate-100">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Address</p>
                     <p className="text-slate-900 text-[12px] font-bold leading-relaxed truncate">
                        {locationState.loading ? "Fetching..." : locationState.address || "Sector 18, Noida"}
                     </p>
                  </div>
                  <div className="w-full aspect-[16/9] bg-slate-100 rounded-2xl overflow-hidden relative border border-slate-100">
                     <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(rgba(100,116,139,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(100,116,139,0.1) 1px, transparent 1px)", backgroundSize: "15px 15px" }} />
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                        <motion.div animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-lg" />
                     </div>
                  </div>
                  <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => navigate("/risk-map")} className="w-full mt-4 py-3 bg-slate-50 border border-slate-100 text-slate-700 font-black text-[11px] rounded-xl uppercase tracking-widest">Full Map</motion.button>
               </motion.div>

               <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                       <Watch className="w-3.5 h-3.5 text-teal-600" />
                       <h3 className="text-[14px] font-black text-slate-900 uppercase tracking-widest">Sakhi Ring</h3>
                    </div>
                    <span className="text-[9px] font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded uppercase tracking-wider">Connected</span>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                     <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: "85%" }} className="h-full bg-teal-500 rounded-full" />
                     </div>
                     <span className="text-[12px] font-black text-slate-700 flex items-center gap-1"><BatteryMedium className="w-3.5 h-3.5 text-teal-600" /> 85%</span>
                  </div>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { triggerSOS(); navigate("/sos"); }} className="w-full py-3 bg-red-50 border border-red-100 text-red-600 font-black text-[11px] rounded-xl uppercase tracking-widest">Test Signal</motion.button>
               </motion.div>
            </div>
          </div>
        </div>

        {/* ── Anchored SOS Button (Mobile Only) ── */}
        <div className="fixed bottom-[5.5rem] left-0 right-0 flex justify-center z-40 pointer-events-none md:hidden">
            <motion.button
              onClick={() => { triggerSOS(); navigate("/sos"); }}
              initial={{ scale: 1 }}
              animate={{ 
                scale: [1, 1.08, 1],
              }}
              transition={{ 
                duration: 2.5, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              style={{ transformOrigin: "center" }}
              className="w-16 h-16 bg-red-600 text-white rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.4)] pointer-events-auto border-[3px] border-white relative"
            >
              <Asterisk className="w-8 h-8 font-black" />
              {/* Inner Glow (Non-layout shifting) */}
              <motion.div 
                animate={{ opacity: [0.3, 0.6, 0.3] }}
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
