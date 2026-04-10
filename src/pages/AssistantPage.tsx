import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import BottomNav from "@/components/BottomNav";
import { Mic, ShieldAlert, FileText, Map as MapIcon, Lock } from "lucide-react";

// ─── Intent → Action Mapping ─────────────────────────────────────────────────
const intentMap: { keywords: string[]; route: string; label: string; triggerSOS?: boolean }[] = [
  {
    keywords: ["help", "help me", "emergency", "sos", "attack", "scared", "save me", "danger", "dangerous", "unsafe", "someone is following me", "i am in danger", "following me", "in danger", "threat"],
    route: "/sos",
    label: "SOS Activated",
    triggerSOS: true,
  },
  {
    keywords: ["report", "harassment", "cyber", "incident", "complaint", "file"],
    route: "/report",
    label: "Opening Report",
  },
  {
    keywords: ["location", "map", "route", "area", "zone", "heatmap", "where"],
    route: "/risk-map",
    label: "Opening Map",
  },
  {
    keywords: ["evidence", "locker", "proof", "recording", "stored", "files"],
    route: "/evidence-locker",
    label: "Opening Evidence Locker",
  },
];

const quickCommands = [
  { label: "Help Me",      command: "help me",  icon: ShieldAlert },
  { label: "Report Issue", command: "report",   icon: FileText },
  { label: "Check Map",    command: "map",      icon: MapIcon },
  { label: "My Evidence",  command: "evidence", icon: Lock },
];

function resolveIntent(input: string) {
  const lower = input.toLowerCase().trim();
  for (const entry of intentMap) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry;
    }
  }
  return null;
}

const AssistantPage = () => {
  const navigate    = useNavigate();
  const { triggerSOS } = useApp();
  const [input, setInput]         = useState("");
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [noMatch, setNoMatch]     = useState(false);
  const [dispatched, setDispatched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const dispatch = (text: string) => {
    if (!text.trim()) return;
    setNoMatch(false);
    setDispatched(false);

    const intent = resolveIntent(text);
    if (intent) {
      setLastAction(intent.label);
      setDispatched(true);
      setInput("");
      // Trigger SOS immediately if mapped
      if (intent.triggerSOS) {
        triggerSOS();
      }
      setTimeout(() => navigate(intent.route), 400);
    } else {
      setNoMatch(true);
      setLastAction(null);
    }
  };

  const handleCommand = (cmd: string) => {
    setInput(cmd);
    dispatch(cmd);
  };

  return (
    <div className="min-h-screen pb-24 flex flex-col" style={{ backgroundColor: "hsl(var(--background))" }}>

      {/* Header */}
      <div className="px-5 pt-8 pb-4 border-b border-border/40 bg-card/30 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
             <span className="dot-active" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground/90 leading-tight">
               Smart Safety Assistant
            </h1>
            <p className="text-xs font-medium text-muted-foreground">Always listening, ready to help.</p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-6 flex-1 flex flex-col gap-6">

        {/* System description (Humanized) */}
        <div className="card-surface px-4 py-4 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full pointer-events-none" />
             <p className="text-[13px] font-medium leading-relaxed text-foreground/80 relative z-10">
               Describe what you need or your current situation. I'll instantly guide you to the right tool or trigger an emergency response. No conversational delays.
             </p>
        </div>

        {/* Quick Actions (Replacing Quick Commands) */}
        <div>
          <p className="section-label mb-3 text-[11px] opacity-80 pl-1">Suggested Actions</p>
          <div className="grid grid-cols-2 gap-3">
            {quickCommands.map((qc) => (
              <button
                key={qc.label}
                onClick={() => handleCommand(qc.command)}
                className="flex items-center gap-3 px-3 py-3.5 card-surface transition-all active:scale-[0.98] hover:border-primary/30"
              >
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border border-border/50 shrink-0">
                   <qc.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="text-xs font-semibold text-foreground/90 tracking-wide text-left">{qc.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Action Status Output */}
        <div className="mt-auto pt-4 space-y-3">
           {dispatched && lastAction && (
            <div className="flex items-center gap-3 px-4 py-3.5 card-surface" style={{ borderColor: lastAction.includes("SOS") ? "hsl(var(--sos)/0.4)" : "hsl(var(--safe)/0.3)" }}>
               <span className="dot-active" style={{ backgroundColor: lastAction.includes("SOS") ? "hsl(var(--sos))" : "hsl(var(--safe))" }} />
               <p className="text-sm font-semibold" style={{ color: lastAction.includes("SOS") ? "hsl(var(--sos))" : "hsl(var(--safe))" }}>
                 {lastAction} — routing...
               </p>
            </div>
           )}

           {noMatch && (
             <div className="flex items-center gap-3 px-4 py-3 card-surface border-warning/40">
                <p className="text-xs font-medium text-warning">
                  I didn't quite catch that. Try saying "help", "report", or "map".
                </p>
             </div>
           )}

          {/* Humanized Input Field */}
          <div className="relative group">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); setNoMatch(false); }}
              onKeyDown={(e) => { if (e.key === "Enter") dispatch(input); }}
              placeholder="Describe what's happening..."
              autoComplete="off"
              className="input-soft pl-4 pr-12 focus:ring-2 focus:ring-primary/20 
                         shadow-[0_2px_10px_rgba(0,0,0,0.2)] focus:shadow-[0_4px_15px_rgba(200,20,20,0.1)]"
            />
             <button
              onClick={() => dispatch(input)}
              aria-label="Send"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center 
                         rounded-full bg-primary text-white transition-transform active:scale-95
                         shadow-sm hover:bg-primary/90"
            >
               <Mic className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] font-medium text-center text-muted-foreground/70 tracking-wide mt-3 px-2">
            Emergency phrases instantly bypass to SOS.
          </p>
        </div>

      </div>

      <BottomNav />
    </div>
  );
};

export default AssistantPage;
