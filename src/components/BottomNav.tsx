import { useLocation, useNavigate } from "react-router-dom";
import { Home, Map, MessageSquare, ShieldCheck, Asterisk } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { motion } from "framer-motion";

const navItems = [
  { icon: Home,         path: "/home",           label: "Home" },
  { icon: Map,          path: "/risk-map",        label: "Safety Map" },
  { icon: "FAB",        path: "/sos",             label: "SOS" },
  { icon: MessageSquare,path: "/assistant",       label: "Sakhi AI" },
  { icon: ShieldCheck,  path: "/guardian",        label: "Guardian" },
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
      <div className="mx-4 mb-4 h-[4.5rem] max-w-[500px] w-full bg-white/90 backdrop-blur-xl border border-slate-100 flex items-center justify-around px-4 relative pointer-events-auto shadow-[0_8px_30px_rgba(0,0,0,0.04)] rounded-[24px]">
        {navItems.map((item, i) => {
          if (item.icon === "FAB") {
            return (
              <div key="sos-fab" className="relative flex-1 flex justify-center pointer-events-none">
                <motion.button
                  onClick={handleSOSClick}
                  animate={{ 
                    scale: [1, 1.05, 1],
                    boxShadow: [
                      "0 0 0px rgba(239, 68, 68, 0)",
                      "0 0 20px rgba(239, 68, 68, 0.3)",
                      "0 0 0px rgba(239, 68, 68, 0)"
                    ]
                  }}
                  transition={{ 
                    duration: 3, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                  whileHover={{ scale: 1.1, backgroundColor: "#dc2626" }}
                  whileTap={{ scale: 0.9 }}
                  className="absolute bottom-4 w-[4.2rem] h-[4.2rem] bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-200 transition-colors pointer-events-auto z-[60] border-4 border-white"
                >
                  <Asterisk className="w-8 h-8" />
                </motion.button>
              </div>
            );
          }

          const IconComp = item.icon as React.ElementType;
          const active = location.pathname === item.path;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex-1 flex flex-col justify-center items-center h-full gap-1 transition-all duration-250 pointer-events-auto group"
            >
              <motion.div 
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
                className={`p-2 rounded-xl transition-all duration-300 ${active ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600"}`}
              >
                <IconComp className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
              </motion.div>
              <span className={`text-[9px] font-bold tracking-tight ${active ? "text-slate-900" : "text-slate-400"}`}>
                {item.label}
              </span>
              {active && (
                 <motion.div 
                   layoutId="nav-dot"
                   className="absolute bottom-2 w-1.5 h-1.5 bg-slate-900 rounded-full" 
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
