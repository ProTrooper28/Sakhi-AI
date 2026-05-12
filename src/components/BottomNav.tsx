import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, Map, MessageSquare, ShieldCheck, Asterisk } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { motion } from "framer-motion";

const navItems = [
  { icon: Home,         path: "/home",           label: "Home" },
  { icon: Map,          path: "/location",        label: "Map" },
  { icon: MessageSquare,path: "/assistant",       label: "AI Chat" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { triggerSOS } = useApp();

  const handleSOSClick = () => {
    triggerSOS();
    navigate("/sos");
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 pb-[env(safe-area-inset-bottom)] z-50 pointer-events-none flex justify-center md:hidden">
      {/* Floating Bottom Nav */}
      <div className="mx-4 mb-6 h-[4.5rem] max-w-[500px] w-full bg-slate-900/60 backdrop-blur-2xl border border-slate-800/50 flex items-center justify-around px-4 relative pointer-events-auto shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-[28px]">
        {navItems.map((item, i) => {
          const IconComp = item.icon as React.ElementType;
          const active = location.pathname === item.path;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex-1 flex flex-col justify-center items-center h-full gap-0.5 transition-all duration-250 pointer-events-auto group"
            >
              <motion.div 
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.9 }}
                className={`p-2 rounded-xl transition-all duration-300 ${active ? "text-teal-500 bg-teal-500/10 border border-teal-500/20 shadow-[0_0_15px_rgba(20,184,166,0.1)]" : "text-slate-600 group-hover:text-slate-400"}`}
              >
                <IconComp className="w-6 h-6" strokeWidth={active ? 2.5 : 2} />
              </motion.div>
              <span className={`text-[9px] font-black uppercase tracking-[0.15em] ${active ? "text-teal-400" : "text-slate-500"}`}>
                {item.label}
              </span>
              {active && (
                  <motion.div 
                    layoutId="nav-dot"
                    className="absolute -bottom-1 w-1.5 h-1.5 bg-teal-500 rounded-full shadow-[0_0_8px_rgba(20,184,166,0.6)]" 
                  />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
