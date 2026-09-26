import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, X } from "lucide-react";

/**
 * HelpDialog — a small (?) button + short explainer card for any screen.
 * Content lives in HELP_CONTENT so each feature explains: what it does,
 * why it's useful, and how to use it — three lines each.
 */
export type HelpEntry = {
  title: string;
  what: string;
  why: string;
  how: string[];
};

export const HELP_CONTENT: Record<string, HelpEntry> = {
  journey: {
    title: "Safety Journey",
    what: "Shares your live route with a trusted guardian while AI monitors your trip.",
    why: "If anything goes wrong, someone already knows where you are and where you were heading — before you can even call.",
    how: [
      "Search and select your destination.",
      "Pick your travel mode and tap Start Journey.",
      "Your guardian sees live updates; AI watches your ETA.",
      "If you don't arrive on time, a Safe Check-in asks if you're okay.",
    ],
  },
  assistant: {
    title: "AI Companion",
    what: "A 24/7 chat that answers safety questions and coaches you proactively.",
    why: "Guidance before an emergency matters as much as help during one — Sakhi uses your live context (journey, battery, time) to advise you.",
    how: [
      "Type any safety question — travel, legal rights, cyber safety.",
      "Tap a suggestion chip to act instantly (journey, guardian, Fake Call).",
      "If you say you're scared or in danger, emergency mode takes over.",
    ],
  },
  evidence: {
    title: "Evidence Locker",
    what: "A PIN-protected vault for photos, audio and documents collected during incidents.",
    why: "Evidence collected in the moment is easy to lose — the locker keeps it safe, organised and ready to share with authorities.",
    how: [
      "Enter your PIN to unlock (default 1234 — change it in Settings).",
      "Evidence from SOS incidents is saved here automatically.",
      "Use the ⋮ menu on any item to view, download or delete.",
    ],
  },
  guardian: {
    title: "Guardian Dashboard",
    what: "The calm monitoring view your trusted person sees: live location, journey, battery, timeline and AI alerts.",
    why: "One glance tells a guardian you're safe — and flags instantly when you might not be.",
    how: [
      "Live Map shows real-time position while a journey runs.",
      "Active Journeys show ETA, battery and the AI Safe Check-in timeline.",
      "An SOS flips the whole dashboard into emergency mode automatically.",
    ],
  },
  sos: {
    title: "Emergency SOS",
    what: "One tap alerts your guardians, shares your live location and records evidence.",
    why: "In an emergency there's no time to navigate menus — SOS does everything at once.",
    how: [
      "Hold or tap the red button to trigger.",
      "Guardians receive your location instantly on their dashboard.",
      "\"I'm Safe\" resolves the alert and checks you in.",
    ],
  },
  "fake-call": {
    title: "Fake Call",
    what: "A realistic incoming call from \"Mom\", \"Dad\" or anyone — that you trigger.",
    why: "The safest way out of an uncomfortable situation is a believable excuse to leave. No guardian alert, no SOS — totally private.",
    how: [
      "Tap Fake Call on Home or during a Journey.",
      "Choose the caller, the delay and what they'll say.",
      "When your phone \"rings\", accept and step away.",
    ],
  },
};

const HelpDialog = ({ topic }: { topic: keyof typeof HELP_CONTENT | string }) => {
  const [open, setOpen] = useState(false);
  const help = HELP_CONTENT[topic as string];
  if (!help) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={`About ${help.title}`}
        title={`About ${help.title}`}
        className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer flex-shrink-0"
        style={{ background: "rgba(158,122,106,0.1)", color: "#9E7A6A", border: "none" }}
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9996] bg-slate-950/45 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white rounded-[28px] shadow-2xl p-6"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(242,149,106,0.12)" }}>
                    <HelpCircle className="w-4.5 h-4.5" style={{ color: "#D4455C" }} />
                  </div>
                  <h3 className="text-base font-black text-[#3D2315]" style={{ fontFamily: "Nunito,sans-serif" }}>{help.title}</h3>
                </div>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-full hover:bg-[#FDF6EE] cursor-pointer" aria-label="Close help">
                  <X className="w-4 h-4 text-[#9E7A6A]" />
                </button>
              </div>

              <p className="text-[12.5px] font-bold text-[#3D2315] leading-relaxed">{help.what}</p>
              <p className="text-[12px] font-semibold text-[#9E7A6A] leading-relaxed mt-2">{help.why}</p>

              <div className="mt-4 space-y-2">
                {help.how.map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5"
                      style={{ background: "rgba(212,69,92,0.1)", color: "#D4455C" }}
                    >
                      {i + 1}
                    </span>
                    <p className="text-[12px] font-semibold text-[#5C4030] leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default HelpDialog;
