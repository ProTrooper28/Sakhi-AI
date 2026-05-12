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

const knowledgeBank = [
  { keywords: ["menstrual", "period", "cycle"], response: "A menstrual cycle is a natural process in the body that prepares for pregnancy each month. It involves hormonal changes and typically lasts about 28 days. Maintaining good hygiene, tracking your cycle, and staying hydrated is highly recommended. Need help with tracking?" },
  { keywords: ["safety tip", "how to stay safe", "advice"], response: "Always trust your instincts. Walk with purpose, keep emergency contacts on speed dial, and avoid distracted walking at night. Don't forget that I'm here tracking your environment if you need me!" },
  { keywords: ["stress", "anxious", "anxiety", "panic"], response: "It's completely normal to feel stressed. Try taking deep, slow breaths. Focus on objects around you to ground yourself. I'm here if you need a distraction or someone to talk to." }
];

const RESPONSES = {
  greeting: ["Hey! I'm right here with you. How’s your day going?", "Hello there. I'm here to support you. What's on your mind?", "Hi! Sakhi here. How can I help you today?"],
  emotional: ["I'm sorry you're feeling that way. Do you want to vent about it, or should I suggest something to distract you?", "I'm always here to listen. You're not alone. What's bothering you?"],
  recovery: ["That's such a relief to hear. Keep me posted if you need anything else.", "Glad you're safe. I've secured the alarms. I'm still monitoring just in case."],
  unknown: ["I'm here to help, but I'm not entirely sure I caught that. Could you tell me a bit more about what's happening?", "I'm listening closely, though I didn't fully understand. Can you rephrase or tell me what's on your mind?"],
  knowledge_generic: ["That's an interesting question! I am still learning daily, but I can definitely help you research that or direct you to safe resources."]
};

function generateResponse(text: string, intent: Intent, currentMode: ChatMode, lastIntent: Intent | null): { text: string; newMode: ChatMode; action?: string } {
  let newMode = currentMode;
  let reply = "";
  let action: string | undefined = undefined;
  if (intent === "danger") { newMode = "emergency"; reply = "This looks serious. Activating safety protocols now."; action = "trigger_sos"; } 
  else if (intent === "recovery" && currentMode === "emergency") { newMode = "normal"; reply = RESPONSES.recovery[Math.floor(Math.random() * RESPONSES.recovery.length)]; }
  else if (currentMode === "emergency") { reply = "I'm actively tracking your location and alerting your trusted contacts. Tap 'Trigger SOS' if you need immediate police response."; }
  else {
    switch (intent) {
      case "greeting": reply = RESPONSES.greeting[Math.floor(Math.random() * RESPONSES.greeting.length)]; break;
      case "emotional": reply = RESPONSES.emotional[Math.floor(Math.random() * RESPONSES.emotional.length)]; break;
      case "recovery": reply = RESPONSES.recovery[Math.floor(Math.random() * RESPONSES.recovery.length)]; break;
      case "report": reply = "I can help you document this. I'll securely open the reporting portal for you."; action = "nav_report"; break;
      case "map": reply = "Let's check the area. I'll pull up the live tracking map so we can analyze the surroundings."; action = "nav_map"; break;
      case "knowledge":
        const lowerInput = text.toLowerCase();
        let foundMatch = false;
        for (const kb of knowledgeBank) { if (kb.keywords.some(k => lowerInput.includes(k))) { reply = kb.response; foundMatch = true; break; } }
        if (!foundMatch) reply = RESPONSES.knowledge_generic[0];
        break;
      case "unknown":
      default:
        if (lastIntent === "emotional") reply = "I'm still listening. Tell me everything.";
        else reply = RESPONSES.unknown[Math.floor(Math.random() * RESPONSES.unknown.length)];
        break;
    }
  }
  return { text: reply, newMode, action };
}

const AssistantPage = () => {
  const navigate = useNavigate();
  const { triggerSOS } = useApp();
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ChatMode>("normal");
  const [lastIntent, setLastIntent] = useState<Intent | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { id: "init", role: "assistant", content: "I'm here with you. I've increased my sensitivity to environmental sounds and am monitoring your path via GPS. How can I help make you feel more secure?" }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const startVoiceInput = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Voice input not supported in this browser."); return; }
    const recognition = new SR();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setIsListening(true);
    recognition.start();
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
  };

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, isProcessing]);

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
      setMessages(prev => prev.map(msg => msg.id === typingId ? { ...msg, content: response.text, isTyping: false } : msg));
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
      <div className="flex flex-col bg-slate-950" style={{ height: "calc(100vh - 0px)" }}>
        <div className="px-8 pt-10 pb-4 shrink-0">
          <div className="flex justify-between items-start w-full">
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Operational Link Active</p>
              <h1 className="text-3xl font-black text-slate-100 mt-2 tracking-tight uppercase" style={{ fontFamily: "Manrope, sans-serif" }}>Console: Preeti</h1>
            </motion.div>
            <motion.div 
              animate={{ 
                scale: [1, 1.02, 1],
                backgroundColor: mode === "emergency" ? "rgba(239, 68, 68, 0.1)" : "rgba(20, 184, 166, 0.05)"
              }}
              transition={{ repeat: Infinity, duration: 3 }}
              className={`flex items-center gap-3 px-5 py-2.5 rounded-full border ${mode === "emergency" ? "border-red-500/30 text-red-500" : "border-teal-500/20 text-teal-500"} shadow-2xl transition-colors`}
            >
                <motion.div 
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className={`w-2 h-2 rounded-full ${mode === "emergency" ? "bg-red-500" : "bg-teal-500"}`}
              />
              <span className="text-[11px] font-black uppercase tracking-widest">{mode === "emergency" ? "Mode: Emergency" : "Mode: Tactical"}</span>
            </motion.div>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 pt-2 pb-6 space-y-6 flex flex-col" style={{ scrollBehavior: "smooth" }}>
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className="flex flex-col max-w-[85%]">
                  <div className={`flex items-start gap-4 px-6 py-4.5 text-[14px] font-black tracking-tight leading-relaxed ${
                    msg.role === "user" ? "bg-teal-500 text-slate-950 rounded-[28px] rounded-br-[4px] shadow-lg ml-auto uppercase" :
                    msg.isTyping ? "bg-slate-900/40 text-slate-500 rounded-[28px] rounded-bl-[4px] border border-slate-800/50" :
                    mode === "emergency" ? "bg-red-500/10 text-red-400 border border-red-500/30 rounded-[28px] rounded-bl-[4px] shadow-2xl" :
                    "bg-slate-900/60 text-slate-100 rounded-[28px] rounded-bl-[4px] border border-slate-800/50 shadow-xl"
                  }`}>
                    {msg.role === "assistant" && idx > 0 && !msg.isTyping && (
                       <div className="w-8 h-8 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0 mt-0.5">
                         <Asterisk className="w-4 h-4 text-teal-500" />
                       </div>
                    )}
                    {msg.isTyping ? (
                      <div className="flex items-center gap-1.5 py-1">
                        {[0, 1, 2].map(i => (
                          <motion.div key={i} animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }} className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                        ))}
                      </div>
                    ) : (
                      <span className="pt-0.5">{msg.content}</span>
                    )}
                  </div>

                  {msg.role === "assistant" && idx === 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex gap-3 mt-5 ml-2">
                      {[
                        { icon: MapPin, label: "Sync Location", onClick: () => navigate("/risk-map"), color: "text-slate-300", bg: "bg-slate-900/60" },
                        { icon: Shield, label: "Contact Guardian", onClick: () => dispatch("Call my guardian"), color: "text-slate-300", bg: "bg-slate-900/60" },
                        { icon: AlertTriangle, label: "Trigger SOS", onClick: triggerSOS, color: "text-red-500", bg: "bg-red-500/10" }
                      ].map((btn, i) => (
                        <motion.button 
                          key={i} 
                          whileHover={{ scale: 1.05, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={btn.onClick} 
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-full border border-slate-800/50 shadow-xl text-[10px] font-black uppercase tracking-widest ${btn.color} ${btn.bg} transition-all`}
                        >
                          <btn.icon className="w-3.5 h-3.5" /> {btn.label}
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="shrink-0 px-8 pb-8">
          <div className="flex items-center gap-4">
            <motion.button 
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={triggerSOS}
              className="w-[52px] h-[52px] rounded-full bg-red-500 text-slate-950 flex items-center justify-center shrink-0 shadow-[0_0_30px_rgba(239,68,68,0.3)] transition-all"
            >
              <Asterisk className="w-7 h-7" />
            </motion.button>

            <div className="flex-1 relative flex items-center bg-slate-900/60 border border-slate-800/50 rounded-full shadow-2xl px-6 py-4 focus-within:border-teal-500/30 transition-all">
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") dispatch(input); }} placeholder="Input command or query..." disabled={isProcessing} className="flex-1 bg-transparent outline-none text-[13px] text-slate-100 font-black uppercase tracking-widest placeholder:text-slate-700" />
              <div className="flex items-center gap-4 shrink-0 text-slate-500">
                <motion.button
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={startVoiceInput}
                  className={`transition-colors cursor-pointer rounded-full p-1 ${
                    isListening ? "text-red-500 animate-pulse" : "hover:text-teal-500"
                  }`}
                  title={isListening ? "Listening..." : "Voice input"}
                >
                  <Mic className="w-[20px] h-[20px]" />
                </motion.button>
                <motion.button whileHover={{ scale: 1.2, color: "#14b8a6" }} onClick={() => dispatch(input)} disabled={!input.trim() || isProcessing} className="transition-colors cursor-pointer"><Send className="w-[20px] h-[20px]" /></motion.button>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mt-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-600"><Lock className="w-3 h-3 text-teal-500/50" /><span>Encrypted Tactical Link • Real-time Monitoring Active</span></div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AssistantPage;
