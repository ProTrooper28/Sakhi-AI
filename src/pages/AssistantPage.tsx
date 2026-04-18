import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import BottomNav from "@/components/BottomNav";
import { Mic, ArrowUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isTyping?: boolean;
};

type ChatMode = "normal" | "emergency";
type Intent = "greeting" | "emotional" | "danger" | "recovery" | "report" | "map" | "knowledge" | "unknown";

// ─── Intent Classifier ────────────────────────────────────────────────────────
function analyzeIntent(text: string): Intent {
  const lower = text.toLowerCase().trim();
  
  if (["help", "unsafe", "scared", "following", "danger", "stalker", "threat", "emergency"].some(w => lower.includes(w))) return "danger";
  if (["safe now", "okay now", "i am fine", "false alarm", "stop", "i'm good"].some(w => lower.includes(w))) return "recovery";
  if (["hi", "hello", "hey", "start", "good morning", "good evening", "how are you", "what's up"].some(w => lower.includes(w))) return "greeting";
  if (["bored", "sad", "lonely", "talk", "depressed", "scary", "anxious", "upset"].some(w => lower.includes(w))) return "emotional";
  if (["report", "harassment", "file", "incident", "police", "complaint"].some(w => lower.includes(w))) return "report";
  if (["location", "map", "route", "zone", "where"].some(w => lower.includes(w))) return "map";
  if (["tell me about", "what is", "how to", "menstrual", "period", "health", "tips", "advice", "explain"].some(w => lower.includes(w))) return "knowledge";
  
  return "unknown";
}

// ─── Knowledge Bank (Mock DB) ────────────────────────────────────────────────
const knowledgeBank: { keywords: string[], response: string }[] = [
  {
    keywords: ["menstrual", "period", "cycle"],
    response: "A menstrual cycle is a natural process in the body that prepares for pregnancy each month. It involves hormonal changes and typically lasts about 28 days. Maintaining good hygiene, tracking your cycle, and staying hydrated is highly recommended. Need help with tracking?"
  },
  {
    keywords: ["safety tip", "how to stay safe", "advice"],
    response: "Always trust your instincts. Walk with purpose, keep emergency contacts on speed dial, and avoid distracted walking at night. Don't forget that I'm here tracking your environment if you need me!"
  },
  {
    keywords: ["stress", "anxious", "anxiety", "panic"],
    response: "It's completely normal to feel stressed. Try taking deep, slow breaths. Focus on objects around you to ground yourself. I'm here if you need a distraction or someone to talk to."
  }
];

// ─── Phrase Variations ──────────────────────────────────────────────────────
function getRandomPhrase(phrases: string[]) {
  return phrases[Math.floor(Math.random() * phrases.length)];
}

const RESPONSES = {
  greeting: [
    "Hey! I'm right here with you. How’s your day going?",
    "Hello there. I'm here to support you. What's on your mind?",
    "Hi! Sakhi here. How can I help you today?",
    "Hey, it's good to hear from you! Need anything or just chatting?"
  ],
  emotional: [
    "I'm sorry you're feeling that way. Do you want to vent about it, or should I suggest something to distract you?",
    "I'm always here to listen. You're not alone. What's bothering you?",
    "That sounds tough. Take a deep breath. Want to talk it through?",
    "Your feelings are completely valid. I'm right here in your corner. We can just chat or look into some comforting activities."
  ],
  recovery: [
    "That's such a relief to hear. Keep me posted if you need anything else.",
    "Glad you're safe. I've secured the alarms. I'm still monitoring just in case.",
    "Understood. Shutting down emergency state. Always remember I'm a tap away.",
    "Happy you're okay. Catch your breath, I'm staying right here."
  ],
  unknown: [
    "I'm here to help, but I'm not entirely sure I caught that. Could you tell me a bit more about what's happening?",
    "I'm listening closely, though I didn't fully understand. Can you rephrase or tell me what's on your mind?",
    "Let's figure this out. I didn't quite catch your meaning. Could you explain a bit more?"
  ],
  knowledge_generic: [
    "That's an interesting question! I am still learning daily, but I can definitely help you research that or direct you to safe resources.",
    "I focus mostly on your daily safety and wellbeing. While I might not have the exact encyclopedia answer for that right now, I'm taking notes to learn it for next time!",
    "Great topic. I'll need to brush up on my knowledge regarding that. Are there any other health or safety topics you want to explore?"
  ]
};


// ─── Reponse Engine ─────────────────────────────────────────────────────────
function generateResponse(text: string, intent: Intent, currentMode: ChatMode, lastIntent: Intent | null): { text: string; newMode: ChatMode; action?: string } {
  let newMode = currentMode;
  let reply = "";
  let action: string | undefined = undefined;

  // 1. Hard Overrides & Escalations
  if (intent === "danger") {
    newMode = "emergency";
    const emergencyResponses = [
      "This looks serious. Activating safety protocols now.",
      "Stay calm. I'm securing your location and alerting contacts.",
      "Got it. Situation marked unsafe. Deploying SOS measures immediately."
    ];
    reply = getRandomPhrase(emergencyResponses);
    action = "trigger_sos";
  } 
  else if (intent === "recovery" && currentMode === "emergency") {
    newMode = "normal";
    reply = getRandomPhrase(RESPONSES.recovery);
  }
  else if (currentMode === "emergency") {
    // Hard override if we are in an emergency and they respond vaguely
    reply = "I'm actively tracking your location and alerting your trusted contacts. Tap 'Trigger SOS' if you need immediate police response.";
  }
  else {
    // 2. Normal Mode Logic
    switch (intent) {
      case "greeting":
        reply = getRandomPhrase(RESPONSES.greeting);
        break;
      case "emotional":
        reply = getRandomPhrase(RESPONSES.emotional);
        break;
      case "recovery":
        reply = getRandomPhrase(RESPONSES.recovery);
        break;
      case "report":
        reply = "I can help you document this. I'll securely open the reporting portal for you.";
        action = "nav_report";
        break;
      case "map":
        reply = "Let's check the area. I'll pull up the live tracking map so we can analyze the surroundings.";
        action = "nav_map";
        break;
      case "knowledge":
        const lowerInput = text.toLowerCase();
        let foundMatch = false;
        // Search knowledge bank for exact topic
        for (const kb of knowledgeBank) {
           if (kb.keywords.some(k => lowerInput.includes(k))) {
              reply = kb.response;
              foundMatch = true;
              break;
           }
        }
        if (!foundMatch) {
           reply = getRandomPhrase(RESPONSES.knowledge_generic);
        }
        break;
      case "unknown":
      default:
        // Memory fallback handling
        if (lastIntent === "emotional") {
            reply = "I'm still listening. Tell me everything.";
        } else {
            reply = getRandomPhrase(RESPONSES.unknown);
        }
        break;
    }
  }

  return { text: reply, newMode, action };
}


const NORMAL_SUGGESTIONS = ["Tell me a safety tip", "Show safe places", "Call someone"];
const EMERGENCY_SUGGESTIONS = ["Trigger SOS", "Share location", "Call emergency"];

// ─────────────────────────────────────────────────────────────────────────────

const AssistantPage = () => {
  const navigate = useNavigate();
  const { triggerSOS } = useApp();
  
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ChatMode>("normal");
  const [lastIntent, setLastIntent] = useState<Intent | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "assistant",
      content: "Hi there. I'm Sakhi. Whether you want to chat about your day, ask a question, or need me to protect you — I'm right here."
    }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  const dispatch = (text: string) => {
    if (!text.trim() || isProcessing) return;
    
    // User Message
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    
    // Typing Indicator
    const typingId = "typing_" + Date.now();
    const typingMsg: Message = { id: typingId, role: "assistant", content: "Sakhi is thinking...", isTyping: true };
    
    setMessages(prev => [...prev, userMsg, typingMsg]);
    setInput("");
    setIsProcessing(true);

    const intent = analyzeIntent(text);

    // Simulated network delay
    setTimeout(() => {
      const response = generateResponse(text, intent, mode, lastIntent);
      
      setLastIntent(intent);
      setMode(response.newMode);

      setMessages(prev => 
        prev.map(msg => 
          msg.id === typingId 
            ? { ...msg, content: response.text, isTyping: false }
            : msg
        )
      );

      // Trigger Side Effects
      setTimeout(() => {
        setIsProcessing(false);
        if (response.action === "trigger_sos") {
           triggerSOS();
        } else if (response.action === "nav_report") {
           navigate("/report");
        } else if (response.action === "nav_map") {
           navigate("/risk-map");
        }
      }, 500);
    }, Math.random() * 800 + 800);
  };

  const currentSuggestions = mode === "emergency" ? EMERGENCY_SUGGESTIONS : NORMAL_SUGGESTIONS;

  return (
    <div className="min-h-screen pb-24 flex flex-col" style={{ backgroundColor: "hsl(var(--background))" }}>
      
      {/* Header */}
      <div className="px-5 pt-8 pb-4 border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-10 flex-shrink-0 transition-colors duration-500" 
           style={{ backgroundColor: mode === "emergency" ? "hsl(var(--sos)/0.05)" : undefined}}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-500 border ${mode === "emergency" ? 'bg-sos/10 border-sos/30' : 'bg-primary/10 border-primary/20'}`}>
             <span className={mode === "emergency" ? "w-2.5 h-2.5 rounded-full bg-sos animate-pulse" : "dot-active"} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground/90 leading-tight">
               Sakhi AI
            </h1>
            <p className={`text-[11px] font-medium mt-0.5 transition-colors ${mode === "emergency" ? 'text-sos font-bold animate-pulse' : 'text-safe'}`}>
               {mode === "emergency" ? "Emergency Mode Active" : "Online & listening"}
            </p>
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
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div 
                className={`max-w-[85%] px-4 py-3 text-[14px] font-medium leading-relaxed ${
                  msg.role === "user" 
                    ? "bg-primary text-primary-foreground rounded-[1.25rem] rounded-tr-sm shadow-sm"
                    : msg.isTyping
                      ? "bg-card border border-border text-muted-foreground rounded-[1.25rem] rounded-tl-sm shadow-sm italic"
                      : mode === "emergency" 
                            ? "bg-sos text-white rounded-[1.25rem] rounded-tl-sm shadow-md"
                            : "bg-card border border-border text-foreground/90 rounded-[1.25rem] rounded-tl-sm shadow-sm"
                }`}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex-shrink-0 bg-background pt-2">
        
        {/* Dynamic Suggestions */}
        <AnimatePresence mode="popLayout">
           {!isProcessing && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="px-5 pb-3 flex gap-2 overflow-x-auto no-scrollbar"
              >
                {currentSuggestions.map(qs => (
                  <button
                    key={qs}
                    onClick={() => dispatch(qs)}
                    className={`whitespace-nowrap flex-shrink-0 text-[12px] font-bold px-3.5 py-2 rounded-full transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] cursor-pointer border ${
                        mode === "emergency" 
                          ? "bg-sos/10 text-sos border-sos/30 shadow-sm hover:bg-sos/20" 
                          : "bg-card text-foreground/80 border-border shadow-sm hover:text-primary hover:border-primary/30"
                    }`}
                  >
                    {qs}
                  </button>
                ))}
              </motion.div>
           )}
        </AnimatePresence>

        {/* Input Area */}
        <div className="px-5 pb-5">
          <div className="relative group">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") dispatch(input); }}
                placeholder="Message Sakhi..."
                autoComplete="off"
                disabled={isProcessing}
                className="input-soft pl-4 pr-24 py-[0.9rem] focus:ring-2 focus:ring-primary/20 
                           shadow-sm hover:shadow-md transition-all duration-300 rounded-[1.25rem]
                           disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                 <button
                    type="button"
                    className="w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
                    disabled={isProcessing}
                    aria-label="Use Voice"
                 >
                   <Mic className="w-[18px] h-[18px]" />
                 </button>
                 <button
                    onClick={() => dispatch(input)}
                    disabled={!input.trim() || isProcessing}
                    aria-label="Send"
                    className={`w-9 h-9 flex items-center justify-center rounded-full text-white transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm disabled:opacity-50 disabled:scale-100 cursor-pointer ${
                        mode === "emergency" ? "bg-sos" : "bg-primary"
                    }`}
                  >
                   <ArrowUp className="w-[18px] h-[18px]" strokeWidth={2.5} />
                 </button>
              </div>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default AssistantPage;
