import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import BottomNav from "@/components/BottomNav";
import { Mic, ArrowUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Intent → Action Mapping ─────────────────────────────────────────────────
const intentMap: { keywords: string[]; route: string; feedback: string; triggerSOS?: boolean }[] = [
  {
    keywords: ["help", "help me", "emergency", "sos", "attack", "scared", "save me", "danger", "dangerous", "unsafe", "someone is following me", "i am in danger", "following me", "in danger", "threat"],
    route: "/sos",
    feedback: "High risk detected. Activating emergency protocol immediately.",
    triggerSOS: true,
  },
  {
    keywords: ["report", "harassment", "cyber", "incident", "complaint", "file"],
    route: "/report",
    feedback: "I understand. Bringing up the incident report form.",
  },
  {
    keywords: ["location", "map", "route", "area", "zone", "heatmap", "where"],
    route: "/risk-map",
    feedback: "Locating nearby safe zones. Opening live map.",
  },
  {
    keywords: ["evidence", "locker", "proof", "recording", "stored", "files"],
    route: "/evidence-locker",
    feedback: "Accessing your secured evidence locker.",
  },
];

const quickReplies = ["I need help", "Report an incident", "Show safe map", "Open locker"];

function resolveIntent(input: string) {
  const lower = input.toLowerCase().trim();
  for (const entry of intentMap) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry;
    }
  }
  return null;
}

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStatus?: boolean;
};

const AssistantPage = () => {
  const navigate = useNavigate();
  const { triggerSOS } = useApp();
  
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "assistant",
      content: "Hello. I'm your Smart Safety Assistant. Describe what you need or your current situation, and I'll jump into action."
    }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const dispatch = (text: string) => {
    if (!text.trim() || isProcessing) return;
    
    // 1. Add user message
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    
    // 2. Add assistant "Analyzing..." state
    const analyzingId = "analyzing_" + Date.now();
    const analyzingMsg: Message = { id: analyzingId, role: "assistant", content: "Analyzing situation...", isStatus: true };
    
    setMessages(prev => [...prev, userMsg, analyzingMsg]);
    setInput("");
    setIsProcessing(true);

    const intent = resolveIntent(text);

    // 3. Update assistant response after short delay
    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === analyzingId 
            ? { ...msg, content: intent ? intent.feedback : "I'm here to help. Try saying 'I need help', 'report an incident', or 'show map'.", isStatus: false }
            : msg
        )
      );

      // 4. Trigger actions after reading the response
      setTimeout(() => {
        setIsProcessing(false);
        if (intent) {
          if (intent.triggerSOS) {
            triggerSOS();
          }
          navigate(intent.route);
        }
      }, 1000);
    }, 800);
  };

  return (
    <div className="min-h-screen pb-24 flex flex-col" style={{ backgroundColor: "hsl(var(--background))" }}>
      
      {/* Header */}
      <div className="px-5 pt-8 pb-4 border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
             <span className="dot-active" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground/90 leading-tight">
               Smart Safety Assistant
            </h1>
            <p className="text-[11px] font-medium text-safe mt-0.5">Online & processing intents</p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 pt-6 pb-2 space-y-4"
        style={{ scrollBehavior: "smooth" }}
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div 
                className={`max-w-[85%] px-4 py-3 text-[13px] font-medium leading-relaxed ${
                  msg.role === "user" 
                    ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm"
                    : msg.isStatus
                      ? "bg-card border border-border text-foreground/70 rounded-2xl rounded-tl-sm animate-pulse"
                      : "bg-card border border-border text-foreground/90 rounded-2xl rounded-tl-sm"
                }`}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex-shrink-0">
        {/* Quick Replies (show only if conversation is just starting) */}
        {messages.length === 1 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="px-5 pb-3 flex flex-wrap gap-2"
          >
            {quickReplies.map(qr => (
              <button
                key={qr}
                onClick={() => dispatch(qr)}
                disabled={isProcessing}
                className="text-xs font-semibold px-3 py-2 card-surface rounded-full text-foreground/80 hover:bg-muted transition-colors active:scale-95"
              >
                {qr}
              </button>
            ))}
          </motion.div>
        )}

        {/* Input Area */}
        <div className="px-5 pt-2">
          <div className="relative group">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") dispatch(input); }}
                placeholder="Describe what's happening..."
                autoComplete="off"
                disabled={isProcessing}
                className="input-soft pl-4 pr-20 focus:ring-2 focus:ring-primary/20 
                           shadow-[0_2px_10px_rgba(0,0,0,0.2)] focus:shadow-[0_4px_15px_rgba(200,20,20,0.1)]
                           disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                 <button
                    type="button"
                    className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
                    disabled={isProcessing}
                    aria-label="Use Voice"
                 >
                   <Mic className="w-4 h-4" />
                 </button>
                 <button
                    onClick={() => dispatch(input)}
                    disabled={!input.trim() || isProcessing}
                    aria-label="Send"
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white transition-transform active:scale-95 shadow-sm hover:bg-primary/90 disabled:opacity-50 disabled:scale-100"
                  >
                   <ArrowUp className="w-4 h-4" />
                 </button>
              </div>
          </div>
          <p className="text-[10px] font-medium text-center text-muted-foreground/60 tracking-wide mt-3 px-2">
              Emergency phrases bypass conversation logic.
          </p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default AssistantPage;
