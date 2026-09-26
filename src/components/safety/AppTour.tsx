import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, X, Compass } from "lucide-react";
import { FEATURES } from "@/lib/featureRegistry";

/**
 * Take App Tour — a dialog walkthrough of every major feature, one tooltip
 * card per step with Next / Previous / Finish, and a "Visit" jump that
 * navigates straight to the feature. Opened from Settings → Take App Tour.
 */
const AppTour = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const features = FEATURES;
  const total = features.length;
  const f = features[step];
  const isLast = step === total - 1;

  const close = () => {
    onClose();
    setStep(0);
  };

  const visit = () => {
    close();
    navigate(f.path);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9997] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={close}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.97 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-[28px] shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-3 flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#F2956A,#D4455C)" }}>
                  <Compass className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#F2956A]">App Tour</p>
                  <h3 className="text-base font-black text-[#3D2315] leading-tight" style={{ fontFamily: "Nunito,sans-serif" }}>
                    {f.name}
                  </h3>
                </div>
              </div>
              <button onClick={close} className="p-1.5 rounded-full hover:bg-[#FDF6EE] cursor-pointer" aria-label="Close tour">
                <X className="w-4 h-4 text-[#9E7A6A]" />
              </button>
            </div>

            {/* Tooltip card body */}
            <AnimatePresence mode="wait">
              <motion.div
                key={f.id}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18 }}
                className="px-5"
              >
                <div className="rounded-2xl p-4 mb-3" style={{ background: "var(--sakhi-cream)", border: "1px solid var(--sakhi-border)" }}>
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-2.5" style={{ background: "rgba(212,69,92,0.08)" }}>
                    <f.icon className="w-5.5 h-5.5" style={{ color: "#D4455C" }} />
                  </div>
                  <p className="text-[13px] font-bold text-[#3D2315] leading-relaxed">
                    This is <span className="font-black">{f.name}</span>. {f.description}
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-wider mt-2" style={{ color: "#3D9970" }}>
                    Status: {f.status().text}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-1 px-5 pb-3 flex-wrap">
              {features.map((_, i) => (
                <span
                  key={i}
                  className="rounded-full"
                  style={{
                    width: i === step ? 16 : 5,
                    height: 5,
                    background: i === step ? "#D4455C" : "rgba(212,69,92,0.2)",
                  }}
                />
              ))}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 px-5 pb-5">
              <button
                onClick={visit}
                className="px-3.5 py-2.5 rounded-2xl text-[11px] font-black cursor-pointer"
                style={{ fontFamily: "Nunito,sans-serif", color: "#7A2B73", background: "rgba(122,43,115,0.08)" }}
              >
                Visit
              </button>
              <div className="flex-1" />
              <button
                onClick={() => setStep((v) => Math.max(0, v - 1))}
                disabled={step === 0}
                className="px-3.5 py-2.5 rounded-2xl text-[11px] font-black cursor-pointer disabled:opacity-40"
                style={{ fontFamily: "Nunito,sans-serif", color: "#9E7A6A", background: "#FDF6EE" }}
              >
                <ChevronLeft className="w-3.5 h-3.5 inline" /> Previous
              </button>
              {isLast ? (
                <button
                  onClick={close}
                  className="px-4 py-2.5 rounded-2xl text-[11px] font-black text-white cursor-pointer"
                  style={{ fontFamily: "Nunito,sans-serif", background: "linear-gradient(135deg,#F2956A,#D4455C)" }}
                >
                  Finish
                </button>
              ) : (
                <button
                  onClick={() => setStep((v) => v + 1)}
                  className="px-4 py-2.5 rounded-2xl text-[11px] font-black text-white cursor-pointer flex items-center gap-1"
                  style={{ fontFamily: "Nunito,sans-serif", background: "linear-gradient(135deg,#F2956A,#D4455C)" }}
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AppTour;
