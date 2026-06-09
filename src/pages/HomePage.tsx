import { Heart, MapPin, Sparkles, ChevronRight, Phone, Shield, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import AppLayout from "@/components/AppLayout";
import { useApp } from "@/context/AppContext";

const apnewale = [
  { name: "Priya didi", initials: "PR", color: "#F2956A", online: true },
  { name: "Rahul bhai", initials: "RK", color: "#3D9970",  online: true },
  { name: "Maa",        initials: "MA", color: "#D4455C",  online: false },
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
});

const HomePage = () => {
  const navigate = useNavigate();
  const { triggerSOS, sosState } = useApp();

  return (
    <AppLayout>
      <div style={{ minHeight: "100vh", background: "var(--sakhi-cream)", paddingBottom: "7rem" }}>
        <div className="max-w-lg mx-auto px-4 pt-2">

          {/* ── Greeting ── */}
          <motion.div {...fadeUp(0)} className="flex items-start justify-between mb-5">
            <div>
              <p style={{ fontFamily: "var(--font-deva)", fontWeight: 600, fontSize: 15, color: "#9E7A6A" }} className="mb-0.5">
                नमस्ते 🌸
              </p>
              <h1 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 30, color: "#3D2315", lineHeight: 1.1 }}>
                Hey, Preeti didi
              </h1>
            </div>
            <div className="relative mt-1 flex-shrink-0">
              <div
                className="w-13 h-13 rounded-full flex items-center justify-center text-white font-black text-sm shadow-lg"
                style={{ width: 52, height: 52, background: "linear-gradient(135deg,#F2956A,#D4455C)" }}
              >
                PS
              </div>
              <div
                className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2"
                style={{ background: "#3D9970", borderColor: "var(--sakhi-cream)" }}
              />
            </div>
          </motion.div>

          {/* ── Hero Card — Safe & Sound ── */}
          <motion.div {...fadeUp(0.06)} className="mb-6 relative rounded-[28px] overflow-hidden" style={{ background: "linear-gradient(145deg,#F2956A 0%,#E8784A 55%,#E06235 100%)", padding: "24px 22px 20px", minHeight: 195 }}>
            {/* Decorative circles */}
            <div className="absolute" style={{ top: -28, right: -32, width: 160, height: 160, borderRadius: "50%", background: "rgba(251,221,208,0.48)" }} />
            <div className="absolute" style={{ top: 22, right: 24, width: 96, height: 96, borderRadius: "50%", background: "rgba(251,221,208,0.28)" }} />

            <div className="relative z-10">
              <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 600, fontSize: 13, color: "rgba(255,255,255,0.88)" }} className="mb-0.5">
                Today, you are
              </p>
              <h2 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 36, color: "#5C2018", lineHeight: 1.05 }} className="mb-2">
                Safe &amp; sound
              </h2>
              <div className="text-3xl mb-3">💗✨</div>
              <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 500, fontSize: 13, color: "rgba(255,255,255,0.92)", lineHeight: 1.55 }} className="mb-4">
                Your 3 Apnewale are nearby.<br />Sakhi is listening if you need.
              </p>
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
                style={{ background: "rgba(255,255,255,0.88)", backdropFilter: "blur(8px)" }}
              >
                <span style={{ fontSize: 14 }}>💗</span>
                <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 13, color: "#8B3A2F" }}>Safety: 92%</span>
              </div>
            </div>
          </motion.div>

          {/* ── What's on your mind ── */}
          <motion.div {...fadeUp(0.1)}>
            <h2 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 20, color: "#3D2315" }} className="mb-4">
              What's on your mind?
            </h2>
            <div className="grid grid-cols-2 gap-3 mb-6">

              {/* I feel okay */}
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={() => navigate("/assistant")}
                className="rounded-[22px] p-5 flex flex-col items-start gap-2.5 text-left"
                style={{ background: "#D6F5EA", minHeight: 110 }}
              >
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-2xl" style={{ background: "rgba(61,153,112,0.12)" }}>😊</div>
                <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 13, color: "#2E7D56", lineHeight: 1.3 }}>Sab theek lag raha hai</span>
              </motion.button>

              {/* Something feels off */}
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={() => navigate("/assistant")}
                className="rounded-[22px] p-5 flex flex-col items-start gap-2.5 text-left"
                style={{ background: "#FEF3CD", minHeight: 110 }}
              >
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-2xl" style={{ background: "rgba(243,156,18,0.12)" }}>⚠️</div>
                <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 13, color: "#B7770D", lineHeight: 1.3 }}>Kuch theek nahi lag raha</span>
              </motion.button>

              {/* SOS */}
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                onClick={() => { triggerSOS(); navigate("/sos"); }}
                className="rounded-[22px] p-5 flex flex-col items-start gap-2.5 text-left"
                style={{ background: "#FBDDE3", minHeight: 110 }}
              >
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-2xl" style={{ background: "rgba(212,69,92,0.12)" }}>🆘</div>
                <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 13, color: "#D4455C", lineHeight: 1.3 }}>Madad chahiye abhi!</span>
              </motion.button>

              {/* Where am I */}
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={() => navigate("/location")}
                className="rounded-[22px] p-5 flex flex-col items-start gap-2.5 text-left"
                style={{ background: "#DEEEFF", minHeight: 110 }}
              >
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-2xl" style={{ background: "rgba(59,130,246,0.1)" }}>🗺️</div>
                <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 13, color: "#2563EB", lineHeight: 1.3 }}>Main kahan hoon?</span>
              </motion.button>

            </div>
          </motion.div>

          {/* ── Apnewale row ── */}
          <motion.div {...fadeUp(0.15)} className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <h2 style={{ fontFamily: "Nunito,sans-serif", fontWeight: 900, fontSize: 18, color: "#3D2315" }}>Aapke Apnewale 💛</h2>
              <button onClick={() => navigate("/guardian")} className="flex items-center gap-1 cursor-pointer" style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 12, color: "#D4455C" }}>
                Sab dekho <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="rounded-[24px] p-4 flex items-center gap-4" style={{ background: "white", boxShadow: "0 4px 24px rgba(139,58,47,0.06)" }}>
              {apnewale.map((p, i) => (
                <motion.div key={p.name} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.18 + i * 0.05 }} className="flex flex-col items-center gap-1.5">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-sm shadow" style={{ background: p.color }}>
                      {p.initials}
                    </div>
                    {p.online && <div className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2" style={{ background: "#3D9970", borderColor: "white" }} />}
                  </div>
                  <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 10, color: "#9E7A6A" }}>{p.name}</span>
                </motion.div>
              ))}
              <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={() => navigate("/guardian")} className="flex flex-col items-center gap-1.5 cursor-pointer">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold" style={{ background: "var(--sakhi-cream-deep)", border: "2px dashed rgba(242,149,106,0.5)", color: "#9E7A6A" }}>+</div>
                <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 10, color: "#9E7A6A" }}>Add</span>
              </motion.button>
            </div>
          </motion.div>

          {/* ── Sakhi AI sister CTA ── */}
          <motion.button {...fadeUp(0.2)} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/assistant")}
            className="w-full rounded-[24px] p-4 flex items-center gap-4 text-left mb-4 cursor-pointer"
            style={{ background: "linear-gradient(135deg,#FDDCCC,#FBDDE3)", boxShadow: "0 4px 20px rgba(212,69,92,0.08)" }}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: "linear-gradient(135deg,#F2956A,#D4455C)" }}>
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 15, color: "#8B3A2F" }}>Sakhi — Tumhari AI didi 💜</p>
              <p style={{ fontFamily: "Nunito,sans-serif", fontWeight: 500, fontSize: 12, color: "#9E7A6A" }} className="mt-0.5 truncate">"Aaj kaisi ho, didi? Main yahan hoon."</p>
            </div>
            <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: "#D4455C" }} />
          </motion.button>

          {/* ── Safety features strip ── */}
          <motion.div {...fadeUp(0.23)} className="grid grid-cols-3 gap-2.5 mb-5">
            {[
              { emoji: "📍", label: "Live Path",   path: "/location" },
              { emoji: "🛡️", label: "Evidence",    path: "/evidence-locker" },
              { emoji: "⚙️", label: "Settings",    path: "/settings" },
            ].map(item => (
              <motion.button key={item.label} whileTap={{ scale: 0.93 }} onClick={() => navigate(item.path)}
                className="rounded-[18px] p-3 flex flex-col items-center gap-1.5 cursor-pointer"
                style={{ background: "white", boxShadow: "0 2px 12px rgba(139,58,47,0.05)" }}
              >
                <span style={{ fontSize: 22 }}>{item.emoji}</span>
                <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 700, fontSize: 11, color: "#8B3A2F" }}>{item.label}</span>
              </motion.button>
            ))}
          </motion.div>

          {/* ── Quick Helplines ── */}
          <motion.div {...fadeUp(0.26)} className="flex items-center justify-center gap-3 flex-wrap">
            {[{ num: "1091", label: "Women Helpline" }, { num: "112", label: "Emergency" }, { num: "1098", label: "Child Line" }].map(h => (
              <button key={h.num} onClick={() => { window.location.href = `tel:${h.num}`; }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer transition-all"
                style={{ background: "rgba(212,69,92,0.08)", border: "1px solid rgba(212,69,92,0.18)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(212,69,92,0.14)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(212,69,92,0.08)")}
              >
                <Phone className="w-3 h-3" style={{ color: "#D4455C" }} />
                <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 11, color: "#D4455C" }}>{h.label}: {h.num}</span>
              </button>
            ))}
          </motion.div>

        </div>
      </div>
    </AppLayout>
  );
};

export default HomePage;
