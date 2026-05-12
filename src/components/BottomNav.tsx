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
      <div className="mx-4 mb-4 h-[4rem] max-w-[500px] w-full bg-white/95 backdrop-blur-xl border-t border-slate-100/50 flex items-center justify-around px-2 relative pointer-events-auto shadow-[0_-8px_30px_rgba(0,0,0,0.02)] rounded-[20px]">
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
                className={`p-1.5 rounded-xl transition-all duration-300 ${active ? "text-slate-900 bg-slate-50" : "text-slate-400 group-hover:text-slate-600"}`}
              >
                <IconComp className="w-[18px] h-[18px]" strokeWidth={active ? 2.5 : 2} />
              </motion.div>
              <span className={`text-[8px] font-black uppercase tracking-widest ${active ? "text-slate-900" : "text-slate-400"}`}>
                {item.label}
              </span>
              {active && (
                 <motion.div 
                   layoutId="nav-dot"
                   className="absolute bottom-1 w-1 h-1 bg-slate-900 rounded-full" 
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
