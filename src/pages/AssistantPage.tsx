import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import AppLayout from "@/components/AppLayout";
import { Mic, Send, MapPin, Shield, AlertTriangle, Lock, Sparkles, Check, Phone, Clock, Volume2, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { recommendForText, type SafetyAction } from "@/lib/safety";
import { shareLocation } from "@/pages/location/helpers";
import { sendMessageToApi } from "@/lib/chatApi";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isTyping?: boolean;
  suggestions?: { label: string; action: string }[];
};

type ChatMode = "normal" | "emergency";

export default function AssistantPage() {
  const navigate = useNavigate();
  const { triggerSOS, cancelSOS, sosState, locationState } = useApp();
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ChatMode>("normal");
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: "init", 
      role: "assistant", 
      content: "Namaste didi! I am monitoring your location via GPS. If you feel unsafe or see someone following you, tell me right away. I'm here to watch over you.",
      suggestions: [
        { label: "Share Live Path", action: "share_path" },
        { label: "Start Check-in", action: "start_checkin" },
        { label: "Call Apnewale", action: "call_apne" }
      ]
    }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check-in timer state
  const [checkinActive, setCheckinActive] = useState(false);
  const [checkinSeconds, setCheckinSeconds] = useState(0);
  const checkinTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync mode with global SOS state
  useEffect(() => {
    if (sosState.active) {
      setMode("emergency");
    } else {
      setMode("normal");
    }
  }, [sosState.active]);

  // Handle countdown check-in timer
  useEffect(() => {
    if (checkinActive && checkinSeconds > 0) {
      checkinTimerRef.current = setInterval(() => {
        setCheckinSeconds(s => {
          if (s <= 1) {
            clearInterval(checkinTimerRef.current!);
            setCheckinActive(false);
            triggerSOS();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => {
      if (checkinTimerRef.current) clearInterval(checkinTimerRef.current);
    };
  }, [checkinActive, checkinSeconds, triggerSOS]);

  const startCheckin = (minutes: number) => {
    setCheckinSeconds(minutes * 60);
    setCheckinActive(true);
    const checkinMsg: Message = {
      id: `checkin_${Date.now()}`,
      role: "assistant",
      content: `I've set a ${minutes}-minute safety check-in, didi. If you don't confirm you're safe before the countdown ends, I will trigger your SOS and alert your Apnewale.`
    };
    setMessages(prev => [...prev, checkinMsg]);
  };

  const stopCheckin = () => {
    setCheckinActive(false);
    setCheckinSeconds(0);
    if (checkinTimerRef.current) clearInterval(checkinTimerRef.current);
    const stopMsg: Message = {
      id: `checkin_stop_${Date.now()}`,
      role: "assistant",
      content: "Check-in timer cleared, didi. Stay safe!"
    };
    setMessages(prev => [...prev, stopMsg]);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const startVoiceInput = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Voice input not supported in this browser.");
      return;
    }
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing, checkinActive, checkinSeconds]);

  // Route every AI-recommended action (and legacy actions) to the right place.
  const dispatchAction = (action: string) => {
    const coords = locationState.coords;
    switch (action) {
      case "start-journey":
      case "share_path":
        navigate("/journey");
        break;
      case "share-location":
        if (coords) void shareLocation(coords.lat, coords.lng, locationState.address);
        else navigate("/location");
        break;
      case "call-guardian":
      case "call_apne":
        window.location.href = "tel:+919810000001";
        break;
      case "prepare-sos":
      case "trigger_sos":
        triggerSOS();
        navigate("/sos");
        break;
      case "nearby-safe":
        navigate("/risk-map");
        break;
      case "file-report":
      case "nav_report":
        navigate("/report");
        break;
      case "review-evidence":
        navigate("/evidence-locker");
        break;
      case "helplines":
        navigate("/post-incident");
        break;
      case "start_checkin":
        startCheckin(3); // Default 3 minutes check-in
        break;
      default:
        break;
    }
  };

  const dispatch = async (text: string) => {
    if (!text.trim() || isProcessing) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    const typingId = "typing_" + Date.now();
    const typingMsg: Message = { id: typingId, role: "assistant", content: "...", isTyping: true };
    
    setMessages(prev => [...prev, userMsg, typingMsg]);
    setInput("");
    setIsProcessing(true);

    // Local intent detection for safety action buttons + emergency escalation.
    const rec = recommendForText(text);
    const newMode = rec.escalate ? "emergency" : "normal";
    setMode(newMode);

    // Build conversation history for the Groq backend.
    const conversationHistory = [...messages, userMsg]
      .filter((m) => !m.isTyping)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    try {
      const reply = await sendMessageToApi(conversationHistory);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === typingId
            ? {
                ...msg,
                content: reply,
                isTyping: false,
                suggestions: rec.actions.map((a) => ({ label: a.label, action: a.id })),
              }
            : msg,
        ),
      );

      // High-risk auto-actions driven by the local safety engine.
      if (rec.intent === "panic") {
        triggerSOS();
      } else if (rec.intent === "recovery") {
        cancelSOS();
      }
    } catch {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === typingId
            ? {
                ...msg,
                content:
                  "I couldn't reach my servers right now. Please try again — or use the SOS button for immediate help.",
                isTyping: false,
                suggestions: [
                  { label: "Emergency SOS", action: "trigger_sos" },
                  { label: "Call Guardian", action: "call_apne" },
                ],
              }
            : msg,
        ),
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AppLayout>
      <div 
        className="flex flex-col min-h-screen text-[#3D2315] font-sans pb-24 md:pb-6"
        style={{ background: mode === "emergency" ? "#160404" : "#FDF6EE" }}
      >
        {/* Top Header Card */}
        <div className="px-4 md:px-8 pt-6 pb-3 shrink-0">
          <div className="flex justify-between items-center w-full">
            <div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-[#9E7A6A] tracking-wider uppercase mb-0.5">
                <Sparkles className="w-3.5 h-3.5 text-[#F2956A]" />
                Your AI Sister
              </div>
              <h1 className="text-2xl font-extrabold font-heading tracking-tight" style={{ color: mode === "emergency" ? "#FFFFFF" : "#3D2315" }}>
                Sakhi Companion
              </h1>
            </div>

            <motion.div 
              animate={{ 
                scale: mode === "emergency" ? [1, 1.05, 1] : 1,
                borderColor: mode === "emergency" ? "#D4455C" : "rgba(242,149,106,0.25)"
              }}
              transition={{ repeat: mode === "emergency" ? Infinity : 0, duration: 1.5 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-white shadow-sm"
            >
              <span className={`w-2 h-2 rounded-full ${mode === "emergency" ? "bg-[#D4455C] animate-pulse" : "bg-[#3D9970]"}`} />
              <span className="text-xs font-extrabold text-[#3D2315]">
                {mode === "emergency" ? "Emergency Mode" : "Sakhi watching"}
              </span>
            </motion.div>
          </div>
        </div>

        {/* Check-In Timer Banner */}
        <AnimatePresence>
          {checkinActive && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mx-4 md:mx-8 mb-4 p-4 rounded-2xl border flex items-center justify-between shadow-sm transition-all"
              style={{
                background: "linear-gradient(135deg, #FFF3C7 0%, #FFEBA3 100%)",
                borderColor: "rgba(242,149,106,0.3)"
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#B7770D]">
                  <Clock className="w-5.5 h-5.5 animate-spin" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-[#3D2315] uppercase tracking-wide">Safety Check-in Active</p>
                  <p className="text-xs font-semibold text-[#8B3A2F] mt-0.5">SOS triggers in <span className="font-extrabold text-sm">{formatTime(checkinSeconds)}</span></p>
                </div>
              </div>
              <button 
                onClick={stopCheckin}
                className="px-4 py-2 bg-white text-xs font-bold text-[#8B3A2F] rounded-xl hover:bg-[#FDF6EE] shadow-sm transition-all cursor-pointer"
              >
                I am Safe
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Message Panel */}
        <div 
          ref={scrollRef} 
          className="flex-1 overflow-y-auto px-4 md:px-8 pt-2 pb-6 space-y-5 flex flex-col h-[calc(100vh-270px)]" 
          style={{ scrollBehavior: "smooth" }}
        >
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className="flex flex-col max-w-[85%]">
                  <div 
                    className="rounded-[24px] p-4 text-sm font-semibold leading-relaxed shadow-sm transition-all"
                    style={{
                      backgroundColor: msg.role === "user" 
                        ? "#F9C5B0" 
                        : (mode === "emergency" ? "#2B1010" : "#FFFFFF"),
                      color: msg.role === "user" 
                        ? "#3D2315" 
                        : (mode === "emergency" ? "#FFD6D6" : "#3D2315"),
                      border: msg.role === "assistant" && mode === "emergency" 
                        ? "1px solid rgba(212,69,92,0.3)" 
                        : "1px solid rgba(242,149,106,0.12)",
                      borderRadius: msg.role === "user" 
                        ? "24px 24px 4px 24px" 
                        : "24px 24px 24px 4px"
                    }}
                  >
                    {msg.role === "assistant" && idx > 0 && !msg.isTyping && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#9E7A6A] mb-1">
                        <Shield className="w-3.5 h-3.5 text-[#F2956A]" />
                        Sakhi Didi
                      </div>
                    )}

                    {msg.isTyping ? (
                      <div className="flex items-center gap-1.5 py-1">
                        {[0, 1, 2].map(i => (
                          <motion.span 
                            key={i} 
                            animate={{ y: [0, -4, 0] }} 
                            transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }} 
                            className="w-1.5 h-1.5 bg-[#F2956A] rounded-full" 
                          />
                        ))}
                      </div>
                    ) : (
                      <span>{msg.content}</span>
                    )}
                  </div>

                  {/* Attachment Shortcuts */}
                  {msg.suggestions && !msg.isTyping && (
                    <div className="flex flex-wrap gap-2.5 mt-3 ml-1">
                      {msg.suggestions.map((btn, i) => (
                        <button 
                          key={i} 
                          onClick={() => dispatchAction(btn.action)}
                          className="flex items-center gap-1 px-3.5 py-1.5 rounded-full border border-[#F5E4D6] bg-white shadow-sm text-xs font-bold text-[#8B3A2F] hover:bg-[#FDF6EE] transition-all cursor-pointer"
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Bottom Quick Tools Row */}
        <div className="px-4 md:px-8 pb-3 flex gap-2 overflow-x-auto shrink-0 scrollbar-none">
          <button 
            onClick={() => startCheckin(3)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold bg-[#FFF3C7] border border-[#F2956A]/20 text-[#3D2315] hover:bg-[#FFEBA3] transition-all shrink-0 cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-[#B7770D]" />
            Timer Check-in
          </button>
          <button 
            onClick={() => navigate("/location")}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold bg-[#DEEEFF] border border-blue-200 text-blue-800 hover:bg-[#CBE4FF] transition-all shrink-0 cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            Check safe streets
          </button>
          <button 
            onClick={() => triggerSOS()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold bg-[#FBDDE3] border border-red-200 text-[#D4455C] hover:bg-[#FBDDED] transition-all shrink-0 cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-[#D4455C]" />
            Emergency SOS
          </button>
        </div>

        {/* Input Panel */}
        <div className="shrink-0 px-4 md:px-8 pb-4">
          <div className="flex items-center gap-3">
            {/* SOS floating action icon */}
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={triggerSOS}
              className="w-12 h-12 rounded-full bg-[#D4455C] text-white flex items-center justify-center shrink-0 shadow-md hover:bg-[#b8324a] transition-colors cursor-pointer"
              title="Immediate SOS"
            >
              <AlertTriangle className="w-5.5 h-5.5 text-white animate-pulse" />
            </motion.button>

            <div className="flex-1 relative flex items-center bg-white border border-[#F5E4D6] rounded-2xl shadow-sm px-4 py-2.5 focus-within:ring-2 focus-within:ring-[#F2956A]/20 transition-all">
              <input 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                onKeyDown={(e) => { if (e.key === "Enter") dispatch(input); }} 
                placeholder="Talk to Sakhi didi..." 
                disabled={isProcessing} 
                className="flex-1 bg-transparent outline-none text-xs md:text-sm text-[#3D2315] font-semibold placeholder:text-[#9E7A6A]" 
              />
              <div className="flex items-center gap-2.5 shrink-0 text-[#9E7A6A]">
                <button
                  onClick={startVoiceInput}
                  className={`transition-colors cursor-pointer rounded-full p-1 ${
                    isListening ? "text-[#D4455C] animate-pulse" : "hover:text-[#3D2315]"
                  }`}
                  title={isListening ? "Listening..." : "Voice input"}
                >
                  <Mic className="w-4.5 h-4.5" />
                </button>
                <button 
                  onClick={() => dispatch(input)} 
                  disabled={!input.trim() || isProcessing} 
                  className="transition-colors cursor-pointer disabled:opacity-40"
                >
                  <Send className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-1 mt-3 text-[10px] font-bold text-[#9E7A6A] opacity-75">
            <Lock className="w-3 h-3 text-[#3D9970]" />
            <span>Encrypted chat monitored for your personal security</span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
