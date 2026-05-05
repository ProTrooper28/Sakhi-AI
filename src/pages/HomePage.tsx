import { Shield, MapPin, Navigation2, Clock, CheckCircle2, Users, MessageSquare, AlertOctagon, Watch, BatteryMedium, Bell, Search, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
      <div className="bg-[#fcfcfd] min-h-screen pb-12">
        <div className="max-w-[1400px] mx-auto px-8 pt-8">
          {/* ── Top Header Bar ── */}
          <div className="flex items-center justify-between mb-10">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
               <h1 className="text-3xl font-black text-slate-900 tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
                 Hi, Preeti 👋
               </h1>
               <p className="text-slate-500 font-medium text-[15px] mt-1">Welcome back. Your safety is our priority.</p>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-4">
               <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-100 shadow-sm">
                  <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-2 h-2 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]" />
                  <span className="text-[13px] font-bold text-slate-700">Active Monitoring</span>
               </div>
               <motion.button whileHover={{ scale: 1.1, rotate: 10 }} whileTap={{ scale: 0.9 }} className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-600 shadow-sm">
                  <Bell className="w-5 h-5" />
               </motion.button>
               <div className="w-10 h-10 rounded-full bg-slate-900 overflow-hidden shadow-sm border-2 border-white">
                  <img src="https://ui-avatars.com/api/?name=Preeti&background=0F172A&color=fff" alt="User" />
               </div>
            </motion.div>
          </div>

          {/* ── Stats Row ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {[
              { label: "Safety Score", value: "98", unit: "/100", color: "text-teal-600", bg: "bg-teal-50/50", border: "border-teal-100/50" },
              { label: "Guardians", value: "3", unit: " Active", color: "text-blue-600", bg: "bg-blue-50/50", border: "border-blue-100/50" },
              { label: "Reports", value: "0", unit: " Pending", color: "text-slate-700", bg: "bg-slate-50", border: "border-slate-100" },
              { label: "Storage", value: "1.2", unit: " GB used", color: "text-indigo-600", bg: "bg-indigo-50/50", border: "border-indigo-100/50" },
            ].map((stat, i) => (
              <motion.div 
                key={stat.label} 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5, shadow: "0 10px 25px rgba(0,0,0,0.03)" }}
                className={`p-6 rounded-[24px] border ${stat.bg} ${stat.border} bg-white shadow-sm transition-all duration-300`}
              >
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">{stat.label}</p>
                <p className={`text-3xl font-black ${stat.color}`} style={{ fontFamily: "Manrope, sans-serif" }}>
                  {stat.value}<span className="text-[15px] font-bold opacity-60 ml-1">{stat.unit}</span>
                </p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 space-y-8">
               <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="relative rounded-[32px] overflow-hidden bg-gradient-to-br from-[#0f172a] to-[#334155] p-10 shadow-xl">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2" />
                  <div className="relative z-10 max-w-lg">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-bold uppercase tracking-wider mb-6">
                       <Shield className="w-3.5 h-3.5" /> Enhanced Protection
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4 leading-tight">Start AI Guardian Session</h2>
                    <p className="text-slate-300 text-[15px] font-medium leading-relaxed mb-8">
                       Walking home late? Our AI stays on the line, monitoring environmental sounds and GPS in real-time.
                    </p>
                    <motion.button 
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => navigate("/assistant")}
                      className="inline-flex items-center gap-3 px-8 py-4 bg-teal-500 hover:bg-teal-400 text-slate-900 font-black text-[15px] rounded-2xl transition-all shadow-[0_8px_25px_rgba(20,184,166,0.3)]"
                    >
                       Start Companion <Navigation2 className="w-4 h-4" />
                    </motion.button>
                  </div>
               </motion.div>

               <div>
                  <h3 className="text-[17px] font-bold text-slate-900 mb-5 ml-2">Quick Actions</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {quickActions.map(({ icon: Icon, label, path, color, bg, border }, i) => (
                      <motion.button
                        key={path}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + i * 0.1 }}
                        whileHover={{ y: -5, shadow: "0 10px 25px rgba(0,0,0,0.03)" }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => path === "/sos" ? (triggerSOS(), navigate("/sos")) : navigate(path)}
                        className="group bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col items-center text-center gap-4 transition-all"
                      >
                        <div className={`w-14 h-14 rounded-2xl ${bg} ${color} flex items-center justify-center transition-all group-hover:scale-110`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <span className="text-slate-700 text-[13px] font-bold tracking-tight">{label}</span>
                      </motion.button>
                    ))}
                  </div>
               </div>

               <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-[17px] font-bold text-slate-900">Recent Activity</h3>
                    <button className="text-[13px] font-bold text-slate-400 hover:text-slate-900 transition-colors">View All History</button>
                  </div>
                  <div className="space-y-6">
                    {recentActivity.map((item, i) => (
                      <motion.div key={i} whileHover={{ x: 5 }} className="flex items-center gap-4 transition-transform">
                        <div className={`w-10 h-10 rounded-xl ${item.bg} ${item.color} flex items-center justify-center`}>
                           <item.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-slate-900 text-[14px] font-bold leading-none mb-1">{item.label}</p>
                          <p className="text-slate-400 text-[12px] font-medium">{item.time}</p>
                        </div>
                        <span className="text-[11px] font-bold text-slate-300">Detailed View</span>
                      </motion.div>
                    ))}
                  </div>
               </motion.div>
            </div>

            <div className="space-y-8">
               <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[15px] font-bold text-slate-900">Live Location</h3>
                    <motion.button whileHover={{ scale: 1.1, rotate: 180 }} onClick={requestLocation} className="text-blue-600 transition-transform">
                       <Navigation2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Current Address</p>
                     <p className="text-slate-900 text-[13px] font-bold leading-relaxed">
                        {locationState.loading ? "Fetching current point..." : locationState.address || "Sector 18, Noida, Uttar Pradesh"}
                     </p>
                  </div>
                  <div className="w-full aspect-[4/3] bg-slate-100 rounded-2xl overflow-hidden relative border border-slate-200">
                     <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(rgba(100,116,139,0.2) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(100,116,139,0.2) 1.5px, transparent 1.5px)", backgroundSize: "20px 20px" }} />
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                        <motion.div animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg" />
                        <div className="mt-2 bg-white px-3 py-1 rounded-full shadow-md border border-slate-100">
                           <span className="text-[9px] font-black text-slate-900 uppercase">You Are Here</span>
                        </div>
                     </div>
                  </div>
                  <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => navigate("/risk-map")} className="w-full mt-6 py-4 bg-slate-50 border border-slate-100 text-slate-700 font-bold text-[13px] rounded-2xl transition-all">Open Full Safety Map</motion.button>
               </motion.div>

               <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }} className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                       <Watch className="w-4 h-4 text-teal-600" />
                       <h3 className="text-[15px] font-bold text-slate-900">Sakhi Ring</h3>
                    </div>
                    <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded uppercase tracking-wider">Connected</span>
                  </div>
                  <div className="flex items-center gap-3 mb-6">
                     <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: "85%" }} transition={{ duration: 1, delay: 0.8 }} className="h-full bg-teal-500 rounded-full" />
                     </div>
                     <span className="text-[13px] font-black text-slate-700 flex items-center gap-1"><BatteryMedium className="w-4 h-4 text-teal-600" /> 85%</span>
                  </div>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { triggerSOS(); navigate("/sos"); }} className="w-full py-4 bg-red-50 border border-red-100 text-red-600 font-bold text-[13px] rounded-2xl transition-all">Emergency Signal Test</motion.button>
               </motion.div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default HomePage;
