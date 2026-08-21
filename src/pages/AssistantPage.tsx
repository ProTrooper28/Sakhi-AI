import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import AppLayout from "@/components/AppLayout";
import {
  Mic,
  Send,
  MapPin,
  AlertTriangle,
  Lock,
  Clock,
  ShieldAlert,
  Paperclip,
  RefreshCw,
  Sparkle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { recommendForText } from "@/lib/safety";
import { shareLocation } from "@/pages/location/helpers";
import { sendMessageToApi } from "@/lib/chatApi";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isTyping?: boolean;
  isStreaming?: boolean;
  suggestions?: { label: string; action: string }[];
  timestamp: number;
  isError?: boolean;
};

type ChatMode = "normal" | "emergency";

/** Simulate streaming by revealing text character by character. */
function useTypewriter(text: string, speed = 18) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!text) {
      setDone(true);
      return;
    }
    setDisplayed("");
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);

  return { displayed, done };
}

/** Format timestamp as short time string. */
function formatTimestamp(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Streaming message bubble with typewriter effect. */
function StreamingBubble({ msg }: { msg: Message }) {
  const { displayed, done } = useTypewriter(msg.content);

  useEffect(() => {
    // Auto-scroll as text streams
    const el = document.getElementById("chat-scroll-container");
    if (el) el.scrollTop = el.scrollHeight;
  }, [displayed]);

  if (!done) {
    return (
      <div>
        <span className="whitespace-pre-wrap">{displayed}</span>
        <motion.span
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
          className="inline-block w-[2px] h-4 bg-[#0D9488] ml-0.5 align-middle"
        />
      </div>
    );
  }
  return <span className="whitespace-pre-wrap">{displayed}</span>;
}

export default function AssistantPage() {
  const navigate = useNavigate();
  const { triggerSOS, cancelSOS, sosState, locationState } = useApp();
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ChatMode>("normal");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "assistant",
      content:
        "Namaste! I'm Sakhi AI, your personal safety companion. I'm here to watch over you 24/7. If you ever feel unsafe or need help, just tell me — I'll guide you through the right steps immediately.",
      suggestions: [
        { label: "Share Live Location", action: "share_path" },
        { label: "Start Check-in", action: "start_checkin" },
        { label: "Call Guardian", action: "call_apne" },
      ],
      timestamp: Date.now(),
    },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Check-in timer
  const [checkinActive, setCheckinActive] = useState(false);
  const [checkinSeconds, setCheckinSeconds] = useState(0);
  const checkinTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync mode with SOS state
  useEffect(() => {
    setMode(sosState.active ? "emergency" : "normal");
  }, [sosState.active]);

  // Check-in countdown
  useEffect(() => {
    if (checkinActive && checkinSeconds > 0) {
      checkinTimerRef.current = setInterval(() => {
        setCheckinSeconds((s) => {
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
    setMessages((prev) => [
      ...prev,
      {
        id: `checkin_${Date.now()}`,
        role: "assistant",
        content: `Safety check-in set for ${minutes} minutes. I'll alert your guardian if you don't confirm you're safe before time runs out.`,
        timestamp: Date.now(),
      },
    ]);
  };

  const stopCheckin = () => {
    setCheckinActive(false);
    setCheckinSeconds(0);
    if (checkinTimerRef.current) clearInterval(checkinTimerRef.current);
    setMessages((prev) => [
      ...prev,
      {
        id: `checkin_stop_${Date.now()}`,
        role: "assistant",
        content: "Check-in cancelled. You're all set!",
        timestamp: Date.now(),
      },
    ]);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Voice input
  const startVoiceInput = () => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setIsListening(true);
    recognition.start();
    recognition.onresult = (e: any) => {
      setInput(e.results[0][0].transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
  };

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing, checkinActive, checkinSeconds]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height =
        Math.min(inputRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  // Route actions
  const dispatchAction = (action: string) => {
    const coords = locationState.coords;
    switch (action) {
      case "start-journey":
      case "share_path":
        navigate("/journey");
        break;
      case "share-location":
        if (coords)
          void shareLocation(coords.lat, coords.lng, locationState.address);
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
        startCheckin(3);
        break;
      default:
        break;
    }
  };

  // Retry last failed message
  const retryLast = useCallback(() => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      // Remove error messages
      setMessages((prev) => prev.filter((m) => !m.isError));
      dispatch(lastUserMsg.content);
    }
  }, [messages]);

  const dispatch = async (text: string) => {
    if (!text.trim() || isProcessing) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    const streamingId = "streaming_" + Date.now();
    const streamingMsg: Message = {
      id: streamingId,
      role: "assistant",
      content: "",
      isStreaming: true,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg, streamingMsg]);
    setInput("");
    setIsProcessing(true);

    const rec = recommendForText(text);
    setMode(rec.escalate ? "emergency" : "normal");

    const conversationHistory = [...messages, userMsg]
      .filter((m) => !m.isTyping && !m.isStreaming && !m.isError)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    try {
      const reply = await sendMessageToApi(conversationHistory);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === streamingId
            ? {
                ...msg,
                content: reply,
                isStreaming: false,
                suggestions: rec.actions.map((a) => ({
                  label: a.label,
                  action: a.id,
                })),
                timestamp: Date.now(),
              }
            : msg
        )
      );

      if (rec.intent === "panic") triggerSOS();
      else if (rec.intent === "recovery") cancelSOS();
    } catch {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === streamingId
            ? {
                ...msg,
                content:
                  "I'm having trouble connecting right now. Please try again in a moment.",
                isStreaming: false,
                isError: true,
                timestamp: Date.now(),
              }
            : msg
        )
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const isEmergency = mode === "emergency";

  return (
    <AppLayout>
      <div
        className="flex flex-col h-full"
        style={{
          background: isEmergency ? "#0A0A0A" : "var(--sakhi-cream)",
          color: isEmergency ? "#E5E5E5" : "var(--sakhi-text)",
        }}
      >
        {/* ── Header ── */}
        <div
          className="shrink-0 px-4 md:px-6 py-3"
          style={{
            borderBottom: isEmergency
              ? "1px solid rgba(220,38,38,0.15)"
              : "1px solid var(--sakhi-border-light)",
            background: isEmergency
              ? "rgba(10,10,10,0.95)"
              : "rgba(248,246,244,0.92)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="max-w-[780px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: isEmergency
                    ? "linear-gradient(135deg, #DC2626, #991B1B)"
                    : "linear-gradient(135deg, #0D9488, #0F766E)",
                }}
              >
                <Sparkle className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <h1
                  className="text-[15px] font-bold leading-tight"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Sakhi AI
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isEmergency ? "bg-red-500 animate-pulse" : "bg-[#16A34A]"
                    }`}
                  />
                  <span
                    className="text-[11px] font-medium"
                    style={{ color: isEmergency ? "#FCA5A5" : "var(--sakhi-text-secondary)" }}
                  >
                    {isEmergency ? "Emergency active" : "Online"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {checkinActive && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{
                    background: "var(--sakhi-amber-light)",
                    border: "1px solid rgba(217,119,6,0.2)",
                  }}
                >
                  <Clock className="w-3.5 h-3.5 text-[#D97706] animate-spin" />
                  <span className="text-xs font-bold text-[#D97706]">
                    {formatTime(checkinSeconds)}
                  </span>
                </motion.div>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={triggerSOS}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{
                  background: isEmergency ? "#991B1B" : "var(--sakhi-red-light)",
                  color: isEmergency ? "#FEE2E2" : "var(--sakhi-red)",
                }}
                title="Emergency SOS"
              >
                <AlertTriangle className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </div>

        {/* ── Check-in Banner ── */}
        <AnimatePresence>
          {checkinActive && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="shrink-0 mx-4 md:mx-6 mt-3 max-w-[780px] md:mx-auto w-[calc(100%-2rem)]"
            >
              <div
                className="flex items-center justify-between px-4 py-3 rounded-xl"
                style={{
                  background: "var(--sakhi-amber-light)",
                  border: "1px solid rgba(217,119,6,0.15)",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-[#D97706] animate-pulse" />
                  <div>
                    <p className="text-xs font-bold text-[#92400E]">
                      Safety Check-in
                    </p>
                    <p className="text-[11px] font-medium text-[#B45309]">
                      SOS in{" "}
                      <span className="font-bold">{formatTime(checkinSeconds)}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={stopCheckin}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all"
                  style={{
                    background: "white",
                    color: "#92400E",
                    border: "1px solid rgba(217,119,6,0.2)",
                  }}
                >
                  I'm Safe
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Chat Messages ── */}
        <div
          id="chat-scroll-container"
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 md:px-6"
          style={{ scrollBehavior: "smooth" }}
        >
          <div className="max-w-[780px] mx-auto py-4 space-y-1">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  } mb-3`}
                >
                  {msg.role === "assistant" ? (
                    /* ── AI Message ── */
                    <div className="flex gap-2.5 max-w-[85%] md:max-w-[75%]">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1"
                        style={{
                          background: isEmergency
                            ? "rgba(220,38,38,0.15)"
                            : "var(--sakhi-primary-muted)",
                        }}
                      >
                        <Sparkle
                          className="w-3.5 h-3.5"
                          style={{ color: isEmergency ? "#FCA5A5" : "var(--sakhi-primary)" }}
                        />
                      </div>
                      <div className="flex flex-col">
                        <div
                          className="px-4 py-3 text-[14px] leading-relaxed"
                          style={{
                            background: isEmergency ? "rgba(255,255,255,0.05)" : "white",
                            color: isEmergency ? "#E5E5E5" : "var(--sakhi-text)",
                            border: isEmergency
                              ? "1px solid rgba(255,255,255,0.08)"
                              : "1px solid var(--sakhi-border-light)",
                            borderRadius: "4px 16px 16px 16px",
                            boxShadow: isEmergency
                              ? "none"
                              : "0 1px 3px rgba(0,0,0,0.03)",
                          }}
                        >
                          {msg.isStreaming ? (
                            <StreamingBubble msg={msg} />
                          ) : (
                            <span className="whitespace-pre-wrap">{msg.content}</span>
                          )}
                        </div>

                        {/* Suggested chips */}
                        {msg.suggestions && !msg.isStreaming && msg.suggestions.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2.5">
                            {msg.suggestions.map((btn, i) => (
                              <button
                                key={i}
                                onClick={() => dispatchAction(btn.action)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all"
                                style={{
                                  background: isEmergency
                                    ? "rgba(255,255,255,0.06)"
                                    : "var(--sakhi-primary-muted)",
                                  color: isEmergency ? "#A7F3D0" : "var(--sakhi-primary)",
                                  border: isEmergency
                                    ? "1px solid rgba(255,255,255,0.1)"
                                    : "1px solid rgba(13,148,136,0.15)",
                                }}
                              >
                                {btn.label}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Error retry */}
                        {msg.isError && (
                          <button
                            onClick={retryLast}
                            className="flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all"
                            style={{
                              background: "var(--sakhi-red-light)",
                              color: "var(--sakhi-red)",
                              border: "1px solid rgba(220,38,38,0.15)",
                            }}
                          >
                            <RefreshCw className="w-3 h-3" />
                            Retry
                          </button>
                        )}

                        {/* Timestamp */}
                        {!msg.isStreaming && (
                          <span
                            className="text-[10px] font-medium mt-1 ml-1"
                            style={{
                              color: isEmergency ? "#737373" : "var(--sakhi-text-muted)",
                            }}
                          >
                            {formatTimestamp(msg.timestamp)}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* ── User Message ── */
                    <div className="flex flex-col items-end max-w-[85%] md:max-w-[70%]">
                      <div
                        className="px-4 py-3 text-[14px] leading-relaxed"
                        style={{
                          background: isEmergency
                            ? "rgba(220,38,38,0.15)"
                            : "var(--sakhi-primary)",
                          color: "white",
                          borderRadius: "16px 4px 16px 16px",
                        }}
                      >
                        <span className="whitespace-pre-wrap">{msg.content}</span>
                      </div>
                      <span
                        className="text-[10px] font-medium mt-1 mr-1"
                        style={{
                          color: isEmergency ? "#737373" : "var(--sakhi-text-muted)",
                        }}
                      >
                        {formatTimestamp(msg.timestamp)}
                      </span>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* ── Typing Indicator ── */}
            {isProcessing &&
              !messages.some((m) => m.isStreaming) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start mb-3"
                >
                  <div className="flex gap-2.5">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: isEmergency
                          ? "rgba(220,38,38,0.15)"
                          : "var(--sakhi-primary-muted)",
                      }}
                    >
                      <Sparkle
                        className="w-3.5 h-3.5"
                        style={{ color: isEmergency ? "#FCA5A5" : "var(--sakhi-primary)" }}
                      />
                    </div>
                    <div
                      className="px-4 py-3 flex items-center gap-1.5"
                      style={{
                        background: isEmergency ? "rgba(255,255,255,0.05)" : "white",
                        border: isEmergency
                          ? "1px solid rgba(255,255,255,0.08)"
                          : "1px solid var(--sakhi-border-light)",
                        borderRadius: "4px 16px 16px 16px",
                      }}
                    >
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          animate={{ y: [0, -3, 0] }}
                          transition={{
                            repeat: Infinity,
                            duration: 0.5,
                            delay: i * 0.12,
                          }}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            background: isEmergency ? "#FCA5A5" : "var(--sakhi-primary)",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
          </div>
        </div>

        {/* ── Input Area ── */}
        <div
          className="shrink-0"
          style={{
            borderTop: isEmergency
              ? "1px solid rgba(255,255,255,0.06)"
              : "1px solid var(--sakhi-border-light)",
            background: isEmergency
              ? "rgba(10,10,10,0.95)"
              : "rgba(248,246,244,0.95)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="max-w-[780px] mx-auto px-4 md:px-6 py-3">
            {/* Suggested quick actions (only when idle) */}
            {!isProcessing && messages.length <= 1 && (
              <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { label: "Timer Check-in", action: () => startCheckin(3), icon: Clock, color: "#D97706", bg: "var(--sakhi-amber-light)" },
                  { label: "Safe Streets", action: () => navigate("/location"), icon: MapPin, color: "#2563EB", bg: "#EFF6FF" },
                  { label: "Emergency SOS", action: () => triggerSOS(), icon: ShieldAlert, color: "var(--sakhi-red)", bg: "var(--sakhi-red-light)" },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold shrink-0 cursor-pointer transition-all"
                    style={{
                      background: item.bg,
                      color: item.color,
                      border: `1px solid ${item.color}20`,
                    }}
                  >
                    <item.icon className="w-3.5 h-3.5" />
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2.5">
              {/* Attachment button */}
              <button
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-all"
                style={{
                  background: isEmergency ? "rgba(255,255,255,0.06)" : "var(--sakhi-cream-deep)",
                  color: isEmergency ? "#A3A3A3" : "var(--sakhi-text-secondary)",
                  border: isEmergency
                    ? "1px solid rgba(255,255,255,0.08)"
                    : "1px solid var(--sakhi-border)",
                }}
                title="Attach file"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Input field */}
              <div
                className="flex-1 flex items-end gap-2 rounded-2xl px-4 py-2.5 transition-all"
                style={{
                  background: isEmergency ? "rgba(255,255,255,0.06)" : "white",
                  border: isEmergency
                    ? "1px solid rgba(255,255,255,0.1)"
                    : "1px solid var(--sakhi-border)",
                }}
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      dispatch(input);
                    }
                  }}
                  placeholder="Ask Sakhi AI anything..."
                  disabled={isProcessing}
                  rows={1}
                  className="flex-1 bg-transparent outline-none text-sm resize-none leading-snug placeholder:opacity-40"
                  style={{
                    color: isEmergency ? "#E5E5E5" : "var(--sakhi-text)",
                    maxHeight: "120px",
                  }}
                />

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Voice button */}
                  <button
                    onClick={startVoiceInput}
                    className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all"
                    style={{
                      color: isListening
                        ? "var(--sakhi-red)"
                        : isEmergency
                        ? "#A3A3A3"
                        : "var(--sakhi-text-secondary)",
                    }}
                    title={isListening ? "Listening..." : "Voice input"}
                  >
                    <Mic
                      className={`w-4 h-4 ${isListening ? "animate-pulse" : ""}`}
                    />
                  </button>

                  {/* Send button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => dispatch(input)}
                    disabled={!input.trim() || isProcessing}
                    className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all disabled:opacity-30"
                    style={{
                      background: input.trim()
                        ? isEmergency
                          ? "#991B1B"
                          : "var(--sakhi-primary)"
                        : "transparent",
                      color: input.trim()
                        ? "white"
                        : isEmergency
                        ? "#A3A3A3"
                        : "var(--sakhi-text-muted)",
                    }}
                  >
                    <Send className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-center gap-1 mt-2.5">
              <Lock
                className="w-3 h-3"
                style={{ color: isEmergency ? "#525252" : "var(--sakhi-green)" }}
              />
              <span
                className="text-[10px] font-medium"
                style={{ color: isEmergency ? "#525252" : "var(--sakhi-text-muted)" }}
              >
                End-to-end encrypted · Sakhi AI
              </span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
