import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BatteryCharging,
  Box,
  ChevronLeft,
  Cpu,
  Gem,
  HeartPulse,
  Layers,
  MonitorSmartphone,
  RotateCcw,
  Satellite,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { WatchStage, type WatchView } from "@/components/watch3d/WatchStage";

const VIEWS: Array<{ id: WatchView; label: string; icon: ReactNode }> = [
  { id: "front", label: "Front", icon: <MonitorSmartphone className="w-4 h-4" /> },
  { id: "perspective", label: "45°", icon: <Box className="w-4 h-4" /> },
  { id: "left", label: "Left", icon: <ChevronLeft className="w-4 h-4" /> },
  { id: "right", label: "Right", icon: <ArrowRight className="w-4 h-4" /> },
  { id: "rear", label: "Rear", icon: <RotateCcw className="w-4 h-4" /> },
  { id: "exploded", label: "Exploded", icon: <Layers className="w-4 h-4" /> },
  { id: "floating", label: "Floating", icon: <Sparkles className="w-4 h-4" /> },
];

const SPECS = [
  {
    icon: <Gem className="w-5 h-5" />,
    title: "Materials",
    points: ["Grade-5 titanium case", "Matte gunmetal finish", "Sapphire crystal glass", "Emerald + rose-gold accents"],
    accent: "#22E6A0",
  },
  {
    icon: <MonitorSmartphone className="w-5 h-5" />,
    title: "Display",
    points: ["1.4″ AMOLED, always-on", "12:45 · live vitals face", "Heart rate 74 BPM", "GPS + Guardian connected"],
    accent: "#F2956A",
  },
  {
    icon: <HeartPulse className="w-5 h-5" />,
    title: "Sensors",
    points: ["Heart-rate sensor", "SpO₂ + temperature", "Stress sensing", "Magnetic charging pins"],
    accent: "#FF5A5F",
  },
  {
    icon: <Satellite className="w-5 h-5" />,
    title: "Connectivity",
    points: ["Dual-band GPS", "Wi-Fi + Bluetooth", "Live location sharing", "Instantly pings your Guardian"],
    accent: "#6FB7FF",
  },
  {
    icon: <BatteryCharging className="w-5 h-5" />,
    title: "Battery",
    points: ["92% · 3-day typical", "Fast magnetic charging", "SOS reserve mode", "Battery shared live"],
    accent: "#F5C97B",
  },
  {
    icon: <Cpu className="w-5 h-5" />,
    title: "Protection",
    points: ["Dedicated SOS button", "3-second hold to trigger", "IP68 rugged build", "24×7 emergency monitoring"],
    accent: "#17C98C",
  },
];

export default function Watch3DPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<WatchView>("front");
  const [explode, setExplode] = useState(0);

  const explodeRef = useRef(0);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const animateExplode = (target: number) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const from = explodeRef.current;
    const start = performance.now();
    const dur = 700;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const val = from + (target - from) * eased;
      explodeRef.current = val;
      setExplode(val);
      if (t < 1) animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
  };

  const selectView = (id: WatchView) => {
    setView(id);
    animateExplode(id === "exploded" ? 1 : 0);
  };

  const active = VIEWS.find((vw) => vw.id === view);

  return (
    <div className="relative min-h-screen bg-[#05070B] text-white overflow-hidden font-heading">
      {/* Ambient glows */}
      <div
        className="pointer-events-none absolute -top-40 -left-40 h-[34rem] w-[34rem] rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle, #17C98C 0%, transparent 65%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-48 -right-40 h-[38rem] w-[38rem] rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #D4455C 0%, transparent 65%)" }}
      />
      <div
        className="pointer-events-none absolute top-1/3 right-1/4 h-96 w-96 rounded-full opacity-10 blur-3xl"
        style={{ background: "radial-gradient(circle, #F2956A 0%, transparent 70%)" }}
      />

      <div className="relative z-10 mx-auto max-w-6xl px-5 py-6 sm:px-8">
        {/* ── Header ── */}
        <header className="flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 backdrop-blur transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className="hidden items-center gap-2 sm:flex">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#22E6A0] shadow-[0_0_10px_#22E6A0]" />
            <span className="text-xs tracking-[0.3em] text-white/50">SAKHI AI · WEARABLES</span>
          </div>

          <button
            onClick={() => navigate("/wearable-demo")}
            className="flex cursor-pointer items-center gap-2 rounded-full bg-[#D4455C] px-5 py-2 text-sm font-bold text-white shadow-[0_6px_24px_rgba(212,69,92,0.4)] transition hover:bg-[#B8324A]"
          >
            <ShieldCheck className="h-4 w-4" /> Try SOS Demo
          </button>
        </header>

        {/* ── Hero ── */}
        <section className="mt-8 text-center sm:mt-10">
          <p className="text-xs font-bold tracking-[0.35em] text-[#22E6A0]">SAKHI AI SMART SAFETY WATCH</p>
          <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-5xl">
            Protection you wear.
            <br />
            <span className="bg-gradient-to-r from-[#F2956A] via-[#D4455C] to-[#17C98C] bg-clip-text text-transparent">
              Reassurance you can see.
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl font-sans text-sm text-white/55 sm:text-base">
            A premium safety companion built for every moment — titanium body, sapphire crystal, a dedicated SOS
            button, and a live Guardian link that never sleeps.
          </p>
        </section>

        {/* ── Stage + specs ── */}
        <section className="mt-10 grid items-start gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          {/* 3D stage */}
          <div>
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
              <div className="h-[min(72vh,600px)] w-full">
                <WatchStage view={view} explode={explode} />
              </div>

              {/* current view label */}
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-bold tracking-wider text-white/80 backdrop-blur">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={view}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-center gap-2"
                  >
                    {active?.icon}
                    {active?.label} SHOT
                  </motion.span>
                </AnimatePresence>
              </div>

              {/* interaction hint */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/40 px-4 py-1.5 text-[11px] tracking-wide text-white/55 backdrop-blur">
                Drag to rotate · Scroll to zoom
              </div>
            </div>

            {/* view chips */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              {VIEWS.map((vw) => {
                const isActive = view === vw.id;
                return (
                  <button
                    key={vw.id}
                    onClick={() => selectView(vw.id)}
                    className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition ${
                      isActive
                        ? "border-[#22E6A0]/60 bg-[#22E6A0]/15 text-white shadow-[0_0_18px_rgba(34,230,160,0.25)]"
                        : "border-white/10 bg-white/[0.04] text-white/55 hover:border-white/25 hover:text-white"
                    }`}
                  >
                    {vw.icon}
                    {vw.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-center text-[11px] tracking-wide text-white/35">
              Seven studio shots — front hero, 45° perspective, side details, rear sensors, exploded internals and a
              floating product shot.
            </p>
          </div>

          {/* Specs */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {SPECS.map((spec) => (
              <div
                key={spec.title}
                className="group rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10"
                    style={{ color: spec.accent, background: `${spec.accent}14` }}
                  >
                    {spec.icon}
                  </span>
                  <h3 className="text-lg font-extrabold">{spec.title}</h3>
                </div>
                <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 font-sans">
                  {spec.points.map((pt) => (
                    <li key={pt} className="flex items-center gap-1.5 text-xs text-white/60">
                      <span className="h-1 w-1 shrink-0 rounded-full" style={{ background: spec.accent }} />
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ── Footer CTA ── */}
        <section className="mt-12 flex flex-col items-center gap-6 rounded-[2rem] border border-white/10 bg-gradient-to-r from-[#D4455C]/15 via-[#F2956A]/10 to-[#17C98C]/15 p-8 text-center sm:p-10">
          <div>
            <h2 className="text-2xl font-black sm:text-3xl">Safe · Connected · Protected</h2>
            <p className="mx-auto mt-2 max-w-xl font-sans text-sm text-white/55">
              This is the watch face your Guardian sees in real time. Press the SOS button in the live demo and watch
              the emergency flow light up — just like the hardware would.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => navigate("/wearable-demo")}
              className="flex cursor-pointer items-center gap-2 rounded-full bg-[#D4455C] px-7 py-3 text-sm font-extrabold text-white shadow-[0_8px_30px_rgba(212,69,92,0.45)] transition hover:bg-[#B8324A]"
            >
              <ShieldCheck className="h-4 w-4" /> Try the interactive SOS demo
            </button>
            <button
              onClick={() => navigate("/home")}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-bold text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              Open the Sakhi app
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
