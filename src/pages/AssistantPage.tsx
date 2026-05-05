import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import AppLayout from "@/components/AppLayout";
import { Mic, Send, MapPin, Shield, AlertTriangle, Lock, Asterisk } from "lucide-react";
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
    "Hi! Sakhi here. How can I help you today?"
  ],
  emotional: [
    "I'm sorry you're feeling that way. Do you want to vent about it, or should I suggest something to distract you?",
    "I'm always here to listen. You're not alone. What's bothering you?"
  ],
  recovery: [
    "That's such a relief to hear. Keep me posted if you need anything else.",
    "Glad you're safe. I've secured the alarms. I'm still monitoring just in case."
  ],
  unknown: [
    "I'm here to help, but I'm not entirely sure I caught that. Could you tell me a bit more about what's happening?",
    "I'm listening closely, though I didn't fully understand. Can you rephrase or tell me what's on your mind?"
  ],
  knowledge_generic: [
    "That's an interesting question! I am still learning daily, but I can definitely help you research that or direct you to safe resources."
  ]
};

// ─── Reponse Engine ─────────────────────────────────────────────────────────
function generateResponse(text: string, intent: Intent, currentMode: ChatMode, lastIntent: Intent | null): { text: string; newMode: ChatMode; action?: string } {
  let newMode = currentMode;
  let reply = "";
  let action: string | undefined = undefined;

  if (intent === "danger") {
    newMode = "emergency";
    reply = "This looks serious. Activating safety protocols now.";
    action = "trigger_sos";
  } 
  else if (intent === "recovery" && currentMode === "emergency") {
    newMode = "normal";
    reply = getRandomPhrase(RESPONSES.recovery);
  }
  else if (currentMode === "emergency") {
    reply = "I'm actively tracking your location and alerting your trusted contacts. Tap 'Trigger SOS' if you need immediate police response.";
  }
  else {
    switch (intent) {
      case "greeting": reply = getRandomPhrase(RESPONSES.greeting); break;
      case "emotional": reply = getRandomPhrase(RESPONSES.emotional); break;
      case "recovery": reply = getRandomPhrase(RESPONSES.recovery); break;
      case "report": reply = "I can help you document this. I'll securely open the reporting portal for you."; action = "nav_report"; break;
      case "map": reply = "Let's check the area. I'll pull up the live tracking map so we can analyze the surroundings."; action = "nav_map"; break;
      case "knowledge":
        const lowerInput = text.toLowerCase();
        let foundMatch = false;
        for (const kb of knowledgeBank) {
           if (kb.keywords.some(k => lowerInput.includes(k))) {
              reply = kb.response;
              foundMatch = true;
              break;
           }
        }
        if (!foundMatch) reply = getRandomPhrase(RESPONSES.knowledge_generic);
        break;
      case "unknown":
      default:
        if (lastIntent === "emotional") reply = "I'm still listening. Tell me everything.";
        else reply = getRandomPhrase(RESPONSES.unknown);
        break;
    }
  }

  return { text: reply, newMode, action };
}

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
      content: "I'm here with you. I've increased my sensitivity to environmental sounds and am monitoring your path via GPS. How can I help make you feel more secure?"
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
    
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    const typingId = "typing_" + Date.now();
    const typingMsg: Message = { id: typingId, role: "assistant", content: "Sakhi is thinking...", isTyping: true };
    
    setMessages(prev => [...prev, userMsg, typingMsg]);
    setInput("");
    setIsProcessing(true);

    const intent = analyzeIntent(text);

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

      setTimeout(() => {
        setIsProcessing(false);
        if (response.action === "trigger_sos") triggerSOS();
        else if (response.action === "nav_report") navigate("/report");
        else if (response.action === "nav_map") navigate("/risk-map");
      }, 500);
    }, Math.random() * 800 + 800);
  };

  return (
    <AppLayout>
      <div className="flex flex-col bg-[#fcfcfd]" style={{ height: "calc(100vh - 0px)" }}>
        
        {/* Header matching screenshot */}
        <div className="px-8 pt-10 pb-4 shrink-0 bg-[#fcfcfd]">
          <div className="flex justify-between items-start w-full">
            <div>
              <p className="text-slate-500 text-[14px] font-medium">Good evening,</p>
              <h1 className="text-3xl font-bold text-slate-900 mt-1 tracking-tight">Hi, Sarah</h1>
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-green-100 shadow-[0_4px_20px_rgba(34,197,94,0.15)]">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
              <span className="text-[13px] font-bold text-slate-600">Mood: Calm</span>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-8 pt-2 pb-6 space-y-6 flex flex-col"
          style={{ scrollBehavior: "smooth" }}
        >
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className="flex flex-col max-w-[85%]">
                  <div 
                    className={`flex items-start gap-3 px-5 py-4 text-[14.5px] font-medium leading-relaxed ${
                      msg.role === "user" 
                        ? "bg-[#dbeafe] text-[#334155] rounded-[24px] rounded-br-[8px] shadow-sm ml-auto"
                        : msg.isTyping
                          ? "bg-[#f3f4f6] text-[#64748b] rounded-[24px] rounded-bl-[8px] shadow-sm italic"
                          : mode === "emergency" 
                                ? "bg-red-50 text-red-900 border border-red-100 rounded-[24px] rounded-bl-[8px] shadow-sm"
                                : "bg-[#f3f4f6] text-[#334155] rounded-[24px] rounded-bl-[8px] shadow-sm"
                    }`}
                  >
                    {/* Add Sakhi Logo for subsequent assistant messages, like in screenshot */}
                    {msg.role === "assistant" && idx > 0 && !msg.isTyping && (
                       <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center shrink-0 mt-0.5">
                         <Asterisk className="w-5 h-5 text-white" />
                       </div>
                    )}
                    <span className="pt-0.5">{msg.content}</span>
                  </div>

                  {/* Inline Suggestions for the first message (like screenshot) */}
                  {msg.role === "assistant" && idx === 0 && (
                    <div className="flex gap-3 mt-4 ml-1">
                      <button onClick={() => navigate("/risk-map")} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                        <MapPin className="w-3.5 h-3.5" /> Share Location
                      </button>
                      <button onClick={() => dispatch("Call my guardian")} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                        <Shield className="w-3.5 h-3.5" /> Contact Guardian
                      </button>
                      <button onClick={triggerSOS} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-red-50 border border-red-100 text-red-500 shadow-sm text-[11px] font-bold hover:bg-red-100 transition-colors">
                        <AlertTriangle className="w-3.5 h-3.5" /> Trigger SOS
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Input Area */}
        <div className="shrink-0 px-8 pb-6 bg-[#fcfcfd]">
          <div className="flex items-center gap-4">
            {/* SOS / Menu button */}
            <button 
              onClick={triggerSOS}
              className="w-[46px] h-[46px] rounded-full bg-[#ef4444] text-white flex items-center justify-center shrink-0 shadow-[0_4px_15px_rgba(239,68,68,0.3)] hover:scale-105 active:scale-95 transition-transform"
            >
              <Asterisk className="w-6 h-6" />
            </button>

            {/* Input Field */}
            <div className="flex-1 relative flex items-center bg-white border border-slate-200 rounded-full shadow-sm px-5 py-3 focus-within:ring-2 focus-within:ring-slate-200 focus-within:border-slate-300 transition-all">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") dispatch(input); }}
                placeholder="Talk to Sakhi..."
                disabled={isProcessing}
                className="flex-1 bg-transparent outline-none text-[14px] text-slate-700 font-medium placeholder:text-slate-400 disabled:opacity-50"
              />
              <div className="flex items-center gap-3 shrink-0 text-slate-400">
                <button aria-label="Use voice" className="hover:text-slate-700 transition-colors disabled:opacity-50" disabled={isProcessing}>
                  <Mic className="w-[18px] h-[18px]" />
                </button>
                <button 
                  onClick={() => dispatch(input)}
                  disabled={!input.trim() || isProcessing}
                  aria-label="Send" 
                  className="hover:text-slate-900 transition-colors disabled:opacity-50"
                >
                  <Send className="w-[18px] h-[18px]" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-1.5 mt-4 text-[10px] font-medium text-slate-400">
            <Lock className="w-3 h-3" />
            <span>Conversations are encrypted and monitored for your safety</span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AssistantPage;
