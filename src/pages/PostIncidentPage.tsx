import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Archive, Users, Phone, Shield, FileWarning, ChevronRight, HeartHandshake,
  CheckCircle2, MapPin,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useApp } from "@/context/AppContext";
import { buildPostIncidentChecklist, HELPLINES } from "@/lib/safety";

const STEP_ICONS = {
  "review-evidence": Archive,
  "contact-guardian": Users,
  helplines: Phone,
  "nearby-police": MapPin,
  "prepare-report": FileWarning,
} as const;

const STEP_COLORS = {
  "review-evidence": "#7A2B73",
  "contact-guardian": "#3D9970",
  helplines: "#B7770D",
  "nearby-police": "#2563EB",
  "prepare-report": "#D4455C",
} as const;

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
});

const PostIncidentPage = () => {
  const navigate = useNavigate();
  const { evidenceLocker, reports } = useApp();
  const [done, setDone] = useState<Record<string, boolean>>({});

  const steps = useMemo(
    () =>
      buildPostIncidentChecklist({
        evidenceCount: evidenceLocker.length,
        hasGuardians: true, // guardians feature always offers the management page
        reportCount: reports.length,
      }),
    [evidenceLocker.length, reports.length],
  );

  const completedCount = steps.filter((s) => done[s.id]).length;

  return (
    <AppLayout>
      <div className="min-h-screen pb-32" style={{ background: "#FDF6EE" }}>
        <div className="max-w-lg mx-auto px-4 pt-6">
          {/* Header */}
          <motion.div {...fadeUp(0)} className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--sakhi-primary)", fontFamily: "var(--font-sans)" }}>
                Aftercare
              </span>
            </div>
            <h1 className="text-2xl font-black text-[#3D2315] flex items-center gap-2" style={{ fontFamily: "Nunito,sans-serif" }}>
              <HeartHandshake className="w-6 h-6" style={{ color: "var(--sakhi-primary)" }} />
              Post-Incident Support
            </h1>
            <p className="text-[13px] font-semibold text-[#9E7A6A] mt-1 leading-relaxed">
              You did the right thing by reaching out. Take it one step at a time — each one protects you and helps you recover.
            </p>
          </motion.div>

          {/* Progress */}
          <motion.div {...fadeUp(0.06)} className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black text-[#8B3A2F]" style={{ fontFamily: "Nunito,sans-serif" }}>
                {completedCount}/{steps.length} steps completed
              </span>
              {completedCount === steps.length && (
                <span className="flex items-center gap-1 text-[11px] font-black text-[#3D9970]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> All done — you're in control
                </span>
              )}
            </div>
            <div className="h-2 rounded-full bg-[#F5E4D6] overflow-hidden">
              <motion.div
                animate={{ width: `${(completedCount / steps.length) * 100}%` }}
                transition={{ duration: 0.5 }}
                className="h-full rounded-full"
                style={{ background: "var(--sakhi-primary)" }}
              />
            </div>
          </motion.div>

          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step, i) => {
              const Icon = STEP_ICONS[step.id];
              const color = STEP_COLORS[step.id];
              const isDone = done[step.id];
              return (
                <motion.div
                  key={step.id}
                  {...fadeUp(0.1 + i * 0.05)}
                  className="rounded-[22px] p-4 bg-white shadow-sm border transition-all"
                  style={{ borderColor: isDone ? "rgba(61,153,112,0.3)" : "rgba(242,149,106,0.12)" }}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={() => setDone((d) => ({ ...d, [step.id]: !d[step.id] }))}
                      className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer border-2 transition-all mt-0.5 ${
                        isDone ? "bg-[#3D9970] border-[#3D9970]" : "border-[#D6C9BC] hover:border-[#F2956A]"
                      }`}
                      aria-label={`Mark ${step.title} as done`}
                    >
                      {isDone && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}14` }}>
                          <Icon className="w-3.5 h-3.5" style={{ color }} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color }}>
                          Step {i + 1}
                        </span>
                      </div>
                      <h3 className="text-[15px] font-black text-[#3D2315] mt-1" style={{ fontFamily: "Nunito,sans-serif" }}>
                        {step.title}
                      </h3>
                      <p className="text-[12px] font-semibold text-[#9E7A6A] leading-relaxed mt-0.5">{step.description}</p>

                      <button
                        onClick={() => navigate(step.path)}
                        className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black text-white cursor-pointer transition-transform active:scale-95"
                        style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, fontFamily: "Nunito,sans-serif" }}
                      >
                        {step.cta} <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Helplines strip */}
          <motion.div {...fadeUp(0.3)} className="mt-5 rounded-[22px] p-4" style={{ background: "linear-gradient(135deg,#5C2018,#8B3A2F)" }}>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#FBCDA8] mb-3 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Emergency Helplines
            </p>
            <div className="grid grid-cols-2 gap-2">
              {HELPLINES.map((h) => (
                <a
                  key={h.label}
                  href={`tel:${h.num}`}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 transition-colors"
                >
                  <span className="text-[11px] font-bold text-white/85">{h.label}</span>
                  <span className="text-[11px] font-black text-[#FBCDA8]" style={{ fontFamily: "Nunito,sans-serif" }}>{h.num}</span>
                </a>
              ))}
            </div>
          </motion.div>

          {/* Encouragement */}
          <motion.div {...fadeUp(0.36)} className="mt-5 text-center pb-4">
            <p className="text-[12px] font-bold text-[#9E7A6A]">
              You are not alone. <span className="text-[#D4455C]">Sakhi is here</span>, and so is your guardian.
            </p>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
};

export default PostIncidentPage;
