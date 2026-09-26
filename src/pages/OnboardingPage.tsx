import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, Navigation2, Users, AlertTriangle, Sparkles, ChevronRight,
  ShieldCheck, ShieldAlert, BatteryCharging, PhoneCall, Archive, FileWarning,
  MapPinned, Mic, Vibrate,
} from "lucide-react";
import { SakhiMark } from "@/components/SakhiLogo";
import { ONBOARDING_HIGHLIGHTS } from "@/lib/featureRegistry";

export const ONBOARDING_DONE_KEY = "sakhi_onboarding_done_v1";

/**
 * First-run onboarding — five short slides after login explaining the core
 * pillars (Welcome, Safety Journey, Emergency SOS, AI Companion, Guardian
 * Dashboard), then "Get Started" lands on Home. Skippable at any point and
 * re-runnable from Settings → Take App Tour.
 */
const OnboardingPage = () => {
  const navigate = useNavigate();
  const [slide, setSlide] = useState(0);
  const isLast = slide === 4;

  const finish = () => {
    try {
      localStorage.setItem(ONBOARDING_DONE_KEY, new Date().toISOString());
    } catch {
      // ignore
    }
    navigate("/home");
  };

  const slides = [
    {
      key: "welcome",
      icon: null,
      title: "Welcome to Sakhi AI",
      subtitle: "Your personal safety companion",
      body: "Sakhi watches over you 24/7 — before, during and after anything feels wrong. Five things to know and you're ready.",
      bullets: [
        { icon: Navigation2, text: "Safety Journey — share your live route" },
        { icon: AlertTriangle, text: "Emergency SOS — one tap for help" },
        { icon: MessageSquare, text: "AI Companion — answers and coaching" },
        { icon: Users, text: "Guardians — your trusted people" },
      ],
      cta: null,
    },
    {
      key: "journey",
      icon: Navigation2,
      title: "Safety Journey",
      subtitle: "Never walk alone",
      body: "Pick a destination and Sakhi shares your live route with your guardian, scores every route for risk, and monitors your ETA.",
      bullets: [
        { icon: ShieldCheck, text: "AI Safety Score rates each route 0–100" },
        { icon: ShieldAlert, text: "AI Safe Check-in if you miss your ETA" },
        { icon: BatteryCharging, text: "Battery alerts before tracking stops" },
        { icon: PhoneCall, text: "Fake Call to exit uncomfortable moments" },
      ],
      cta: { label: "Try it now", path: "/journey" },
    },
    {
      key: "sos",
      icon: AlertTriangle,
      title: "Emergency SOS",
      subtitle: "Help is one tap away",
      body: "The red button alerts your guardians, shares your live location and starts recording evidence — all at once.",
      bullets: [
        { icon: Mic, text: "Voice SOS — say \"Help me\" or \"Bachao\"" },
        { icon: Vibrate, text: "Shake SOS — shake firmly, no buttons" },
        { icon: Archive, text: "Evidence Locker keeps recordings safe" },
        { icon: FileWarning, text: "File anonymous reports afterwards" },
      ],
      cta: { label: "Set up SOS", path: "/settings" },
    },
    {
      key: "companion",
      icon: MessageSquare,
      title: "AI Companion",
      subtitle: "Ask anything, any time",
      body: "Sakhi Didi chats 24/7 — safety tips, legal rights, cyber safety — and coaches you proactively based on your journey, battery and time of day.",
      bullets: [
        { icon: Sparkles, text: "Knows your live context automatically" },
        { icon: MapPinned, text: "Finds safe places and charging points" },
        { icon: PhoneCall, text: "Suggests a Fake Call when you feel uneasy" },
        { icon: AlertTriangle, text: "Switches to emergency help instantly" },
      ],
      cta: { label: "Chat with Sakhi", path: "/assistant" },
    },
    {
      key: "guardian",
      icon: Users,
      title: "Guardian Dashboard",
      subtitle: "Your circle, always informed",
      body: "Link a parent or friend with your invite code. They see your live location, journey ETA, battery and AI alerts the moment anything changes.",
      bullets: [
        { icon: MapPinned, text: "Live location with journey timeline" },
        { icon: BatteryCharging, text: "Battery status, updated in real time" },
        { icon: ShieldAlert, text: "AI alerts only when you stay unresponsive" },
        { icon: Archive, text: "Shared evidence access in emergencies" },
      ],
      cta: { label: "Link a guardian", path: "/guardians" },
    },
  ];

  const s = slides[slide];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--sakhi-cream)" }}>
      {/* Top: skip + progress */}
      <div className="flex items-center justify-between px-5 pt-5">
        <div className="flex items-center gap-1.5">
          <SakhiMark className="w-6 h-6" />
          <span style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: 15, color: "#8B3A2F" }}>Sakhi</span>
        </div>
        <button
          onClick={finish}
          className="text-xs font-bold cursor-pointer px-3 py-1.5 rounded-full"
          style={{ fontFamily: "var(--font-sans)", color: "#9E7A6A", background: "rgba(158,122,106,0.08)" }}
        >
          Skip
        </button>
      </div>

      {/* Slides */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={s.key}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
            className="w-full text-center"
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.08, type: "spring", stiffness: 220, damping: 16 }}
              className="w-20 h-20 mx-auto mb-5 rounded-[24px] flex items-center justify-center shadow-lg"
              style={{ background: "linear-gradient(135deg,#F2956A,#D4455C)" }}
            >
              {s.icon ? (
                <s.icon className="w-10 h-10 text-white" />
              ) : (
                <SakhiMark className="w-11 h-11" />
              )}
            </motion.div>

            <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: 26, color: "#3D2315" }}>
              {s.title}
            </h1>
            <p style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 13, color: "#D4455C", marginTop: 4 }}>
              {s.subtitle}
            </p>
            <p style={{ fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 13.5, color: "#9E7A6A", lineHeight: 1.65, marginTop: 10 }}>
              {s.body}
            </p>

            <div className="mt-6 space-y-2.5 text-left max-w-sm mx-auto">
              {s.bullets.map((b, i) => (
                <motion.div
                  key={b.text}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + i * 0.06 }}
                  className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3"
                  style={{ border: "1px solid var(--sakhi-border)" }}
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(212,69,92,0.08)" }}>
                    <b.icon className="w-4 h-4" style={{ color: "#D4455C" }} />
                  </div>
                  <p style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 12.5, color: "#3D2315" }}>{b.text}</p>
                </motion.div>
              ))}
            </div>

            {s.cta && (
              <button
                onClick={() => {
                  finish();
                  navigate(s.cta!.path);
                }}
                className="mt-5 text-xs font-black cursor-pointer px-4 py-2 rounded-full"
                style={{ fontFamily: "var(--font-sans)", color: "#7A2B73", background: "rgba(122,43,115,0.08)" }}
              >
                {s.cta.label} →
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom: dots + next */}
      <div className="pb-8 pt-4">
        <div className="flex items-center justify-center gap-1.5 mb-5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              aria-label={`Go to slide ${i + 1}`}
              className="rounded-full transition-all cursor-pointer"
              style={{
                width: i === slide ? 22 : 8,
                height: 8,
                background: i === slide ? "#D4455C" : "rgba(212,69,92,0.25)",
              }}
            />
          ))}
        </div>
        <div className="px-6 max-w-sm mx-auto">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => (isLast ? finish() : setSlide((v) => v + 1))}
            className="w-full py-4 rounded-2xl text-white text-sm font-black cursor-pointer flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg,#F2956A,#D4455C)", fontFamily: "var(--font-sans)" }}
          >
            {isLast ? "Get Started" : "Next"} <ChevronRight className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
