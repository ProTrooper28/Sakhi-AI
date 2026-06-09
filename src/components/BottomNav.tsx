import { useLocation, useNavigate } from "react-router-dom";
import { Home, Heart, Users, Map, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { icon: Home,          path: "/home",      label: "Home" },
  { icon: Heart,         path: "/assistant", label: "Help" },
  { icon: AlertTriangle, path: "/sos",       label: "SOS", isSos: true },
  { icon: Users,         path: "/guardian",  label: "Apne" },
  { icon: Map,           path: "/location",  label: "Path" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div
        className="mx-3 mb-3 rounded-[28px] flex items-center justify-around px-1.5 h-[72px]"
        style={{
          background: "rgba(255, 252, 248, 0.97)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: "0 -2px 24px rgba(139,58,47,0.06), 0 8px 32px rgba(139,58,47,0.08)",
          border: "1px solid rgba(242,149,106,0.14)",
        }}
      >
        {navItems.map((item) => {
          const IconComp = item.icon as React.ElementType;
          const active = location.pathname === item.path;

          if (item.isSos) {
            return (
              <button
                key={item.path}
                id="nav-sos-quick"
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center justify-center -mt-6 z-10 cursor-pointer relative"
              >
                {/* Pulsing ring indicator around SOS quick action */}
                <span className="absolute inset-0 rounded-full bg-[#D4455C]/20 animate-ping scale-110" />
                
                <motion.div
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: "spring", stiffness: 450, damping: 15 }}
                  className="flex items-center justify-center w-14 h-14 rounded-full text-white shadow-lg border-[3px] border-[#FFF3C7]"
                  style={{
                    background: "linear-gradient(135deg, #D4455C 0%, #B8324A 100%)",
                    boxShadow: "0 6px 18px rgba(212,69,92,0.45)",
                  }}
                >
                  <IconComp className="w-6 h-6 stroke-[2.5]" />
                </motion.div>
                <span
                  style={{
                    fontFamily: "Nunito, sans-serif",
                    fontWeight: 800,
                    fontSize: 9,
                    color: "#D4455C",
                    marginTop: 4,
                  }}
                >
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.path}
              id={`nav-${item.label.toLowerCase()}`}
              onClick={() => navigate(item.path)}
              className="flex-1 flex flex-col items-center justify-center gap-1.5 h-full cursor-pointer"
            >
              <motion.div
                whileTap={{ scale: 0.88 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="flex items-center justify-center w-10 h-10 rounded-[15px] transition-all duration-200"
                style={{
                  background: active
                    ? "linear-gradient(135deg, #F2956A 0%, #E8784A 100%)"
                    : "transparent",
                  boxShadow: active
                    ? "0 4px 10px rgba(242,149,106,0.25)"
                    : "none",
                }}
              >
                <IconComp
                  style={{
                    width: 19,
                    height: 19,
                    color: active ? "#ffffff" : "#9E7A6A",
                    strokeWidth: active ? 2.5 : 1.8,
                  }}
                />
              </motion.div>
              <span
                style={{
                  fontFamily: "Nunito, sans-serif",
                  fontWeight: active ? 800 : 600,
                  fontSize: 10,
                  color: active ? "#F2956A" : "#9E7A6A",
                  lineHeight: 1,
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
