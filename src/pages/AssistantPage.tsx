import { useState, useRef, useEffect, useCallback, useMemo } from "react";
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
  RefreshCw,
  Sparkle,
  Trash2,
  Globe,
  Phone,
  FileText,
  Shield,
  Heart,
  HelpCircle,
  Navigation,
  CheckCircle2,
  Copy,
  Check,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { recommendForText } from "@/lib/safety";
import { shareLocation } from "@/pages/location/helpers";
import { streamMessageToApi, type ChatApiMessage } from "@/lib/chatApi";

// ── Types ──

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  suggestions?: { label: string; action: string }[];
  timestamp: number;
  isError?: boolean;
  isSystem?: boolean;
};

type ChatMode = "normal" | "emergency";

// ── Conversation persistence ──

const STORAGE_KEY = "sakhi_chat_history";
const MAX_STORED_CONVERSATIONS = 20;

interface StoredConversation {
  id: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  title: string;
}

function loadConversations(): StoredConversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveConversations(convs: StoredConversation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(convs.slice(0, MAX_STORED_CONVERSATIONS)));
  } catch { /* quota exceeded — silently drop oldest */ }
}

function generateConversationId() {
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getConversationTitle(messages: Message[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "New Chat";
  const text = firstUser.content.slice(0, 50);
  return text.length < firstUser.content.length ? text + "…" : text;
}

// ── Markdown-like rendering (bold, italic, lists, line breaks) ──

function renderContent(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  lines.forEach((line, lineIdx) => {
    // Bullet list items
    if (/^\s*[-•*]\s/.test(line)) {
      const content = line.replace(/^\s*[-•*]\s/, "");
      elements.push(
        <div key={lineIdx} className="flex gap-2 ml-1 my-0.5">
          <span className="text-[var(--sakhi-primary)] mt-0.5 shrink-0">•</span>
          <span>{renderInline(content)}</span>
        </div>,
      );
      return;
    }

    // Numbered list items
    const numMatch = line.match(/^\s*(\d+)\.\s/);
    if (numMatch) {
      const content = line.replace(/^\s*\d+\.\s/, "");
      elements.push(
        <div key={lineIdx} className="flex gap-2 ml-1 my-0.5">
          <span className="text-[var(--sakhi-primary)] font-bold mt-0.5 shrink-0 text-xs">{numMatch[1]}.</span>
          <span>{renderInline(content)}</span>
        </div>,
      );
      return;
    }

    // Empty line = paragraph break
    if (line.trim() === "") {
      elements.push(<div key={lineIdx} className="h-2" />);
      return;
    }

    elements.push(
      <div key={lineIdx}>{renderInline(line)}</div>,
    );
  });

  return elements;
}

function renderInline(text: string): React.ReactNode {
  // Process bold (**text** or __text__), italic (*text* or _text_), and `code`
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*|__(.+?)__/);
    // Italic
    const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)|(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/);
    // Inline code
    const codeMatch = remaining.match(/`([^`]+)`/);

    // Find earliest match
    const matches = [
      boldMatch ? { type: "bold" as const, index: boldMatch.index!, match: boldMatch } : null,
      italicMatch ? { type: "italic" as const, index: italicMatch.index!, match: italicMatch } : null,
      codeMatch ? { type: "code" as const, index: codeMatch.index!, match: codeMatch } : null,
    ].filter(Boolean).sort((a, b) => a!.index - b!.index);

    if (matches.length === 0) {
      parts.push(remaining);
      break;
    }

    const first = matches[0]!;
    // Add text before the match
    if (first.index > 0) {
      parts.push(remaining.slice(0, first.index));
    }

    if (first.type === "bold") {
      parts.push(
        <strong key={key++} className="font-bold">{first.match[1] ?? first.match[2]}</strong>,
      );
      remaining = remaining.slice(first.index + (first.match[0]?.length ?? 0));
    } else if (first.type === "italic") {
      parts.push(
        <em key={key++} className="italic opacity-90">{first.match[1] ?? first.match[2]}</em>,
      );
      remaining = remaining.slice(first.index + (first.match[0]?.length ?? 0));
    } else if (first.type === "code") {
      parts.push(
        <code key={key++} className="px-1.5 py-0.5 rounded text-xs font-mono"
          style={{ background: "rgba(13,148,136,0.08)", color: "var(--sakhi-primary)" }}>
          {first.match[1]}
        </code>,
      );
      remaining = remaining.slice(first.index + first.match[0].length);
    }
  }

  return <>{parts}</>;
}

// ── Copy button for messages ──

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
      style={{ color: "var(--sakhi-text-muted)" }}
      title="Copy message"
    >
      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

// ── Quick action categories ──

const QUICK_ACTIONS = [
  { label: "Safety Tips", icon: Shield, color: "#0D9488", bg: "rgba(13,148,136,0.08)", prompt: "Give me some essential safety tips for women" },
  { label: "Know Your Rights", icon: FileText, color: "#7C3AED", bg: "rgba(124,58,237,0.08)", prompt: "What are my legal rights as a woman in India?" },
  { label: "Emergency SOS", icon: AlertTriangle, color: "var(--sakhi-red)", bg: "var(--sakhi-red-light)", action: "sos" },
  { label: "Health Basics", icon: Heart, color: "#EC4899", bg: "rgba(236,72,153,0.08)", prompt: "Tell me about basic women's health and wellness tips" },
  { label: "Safe Routes", icon: Navigation, color: "#2563EB", bg: "rgba(37,99,235,0.08)", action: "location" },
  { label: "Helplines", icon: Phone, color: "#D97706", bg: "rgba(217,119,6,0.08)", prompt: "List all important emergency helpline numbers in India" },
];

// ── Main Component ──

export default function AssistantPage() {
  const navigate = useNavigate();
  const { triggerSOS, cancelSOS, sosState, locationState } = useApp();
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ChatMode>("normal");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [conversationId, setConversationId] = useState(generateConversationId);
  const [conversations, setConversations] = useState<StoredConversation[]>(() => loadConversations());
  const [showSidebar, setShowSidebar] = useState(false);

  // Messages for current conversation
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "assistant",
      content: "Namaste! 🙏 I'm **Sakhi AI**, your personal safety companion. I'm here to watch over you 24/7.\n\nYou can ask me anything — safety tips, your rights, health questions, or just say hi. If you ever feel unsafe, I'll guide you through the right steps immediately. 💛",
      timestamp: Date.now(),
    },
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<(() => void) | null>(null);
  const streamingIdRef = useRef<string | null>(null);

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
    addAssistantMessage(`Safety check-in set for **${minutes} minutes**. I'll alert your guardian if you don't confirm you're safe before time runs out. ⏰`);
  };

  const stopCheckin = () => {
    setCheckinActive(false);
    setCheckinSeconds(0);
    if (checkinTimerRef.current) clearInterval(checkinTimerRef.current);
    addAssistantMessage("Check-in cancelled. You're all set! ✅");
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing, checkinActive, checkinSeconds]);

  // Track scroll position for "scroll to bottom" button
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 120);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  // Save conversation when messages change
  useEffect(() => {
    if (messages.length <= 1) return;
    setConversations((prev) => {
      const existing = prev.findIndex((c) => c.id === conversationId);
      const conv: StoredConversation = {
        id: conversationId,
        messages,
        createdAt: existing >= 0 ? prev[existing].createdAt : Date.now(),
        updatedAt: Date.now(),
        title: getConversationTitle(messages),
      };
      const updated = existing >= 0
        ? prev.map((c, i) => (i === existing ? conv : c))
        : [conv, ...prev];
      saveConversations(updated);
      return updated;
    });
  }, [messages, conversationId]);

  // ── Helper to add messages ──

  const addAssistantMessage = (content: string, suggestions?: { label: string; action: string }[]) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `msg_${Date.now()}`,
        role: "assistant",
        content,
        suggestions,
        timestamp: Date.now(),
      },
    ]);
  };

  // ── Voice input ──

  const startVoiceInput = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
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

  // ── Route actions ──

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
      case "sos":
        triggerSOS();
        navigate("/sos");
        break;
      case "nearby-safe":
      case "location":
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

  // ── Conversation management ──

  const startNewConversation = () => {
    if (abortRef.current) abortRef.current();
    setConversationId(generateConversationId());
    setMessages([
      {
        id: "init",
        role: "assistant",
        content: "Namaste! 🙏 I'm **Sakhi AI**, your personal safety companion. I'm here to watch over you 24/7.\n\nYou can ask me anything — safety tips, your rights, health questions, or just say hi. If you ever feel unsafe, I'll guide you through the right steps immediately. 💛",
        timestamp: Date.now(),
      },
    ]);
    setIsProcessing(false);
    setShowSidebar(false);
  };

  const loadConversation = (conv: StoredConversation) => {
    if (abortRef.current) abortRef.current();
    setConversationId(conv.id);
    setMessages(conv.messages);
    setIsProcessing(false);
    setShowSidebar(false);
  };

  const deleteConversation = (id: string) => {
    setConversations((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      saveConversations(updated);
      return updated;
    });
  };

  // ── Main dispatch (send message) ──

  const dispatch = useCallback((text: string) => {
    if (!text.trim() || isProcessing) return;

    const userMsg: Message = {
      id: `user_${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

    const streamingId = `stream_${Date.now()}`;
    streamingIdRef.current = streamingId;

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

    const conversationHistory: ChatApiMessage[] = [...messages, userMsg]
      .filter((m) => !m.isStreaming && !m.isError && !m.isSystem)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    abortRef.current = streamMessageToApi(
      conversationHistory,
      // onToken
      (token) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === streamingId
              ? { ...msg, content: msg.content + token }
              : msg,
          ),
        );
      },
      // onDone
      () => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === streamingId
              ? {
                  ...msg,
                  isStreaming: false,
                  suggestions: rec.actions.map((a) => ({ label: a.label, action: a.id })),
                  timestamp: Date.now(),
                }
              : msg,
          ),
        );
        streamingIdRef.current = null;
        setIsProcessing(false);
        if (rec.intent === "panic") triggerSOS();
        else if (rec.intent === "recovery") cancelSOS();
      },
      // onError
      (err) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === streamingId
              ? {
                  ...msg,
                  content: "I'm having trouble connecting right now. Please try again in a moment. 🔄",
                  isStreaming: false,
                  isError: true,
                  timestamp: Date.now(),
                }
              : msg,
          ),
        );
        streamingIdRef.current = null;
        setIsProcessing(false);
      },
    );
  }, [isProcessing, messages, triggerSOS, cancelSOS]);

  // ── Retry last failed message ──

  const retryLast = useCallback(() => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      setMessages((prev) => prev.filter((m) => !m.isError));
      dispatch(lastUserMsg.content);
    }
  }, [messages, dispatch]);

  // ── Cleanup on unmount ──

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current();
    };
  }, []);

  const isEmergency = mode === "emergency";

  // ── Render ──

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
            borderBottom: isEmergency ? "1px solid rgba(220,38,38,0.15)" : "1px solid var(--sakhi-border-light)",
            background: isEmergency ? "rgba(10,10,10,0.95)" : "rgba(248,246,244,0.92)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="max-w-[780px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 cursor-pointer md:hidden"
                style={{
                  background: isEmergency ? "rgba(255,255,255,0.06)" : "var(--sakhi-primary-muted)",
                  color: isEmergency ? "#A3A3A3" : "var(--sakhi-primary)",
                }}
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${showSidebar ? "rotate-90" : "-rotate-90"}`} />
              </button>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: isEmergency ? "linear-gradient(135deg, #DC2626, #991B1B)" : "linear-gradient(135deg, #0D9488, #0F766E)",
                }}
              >
                <Sparkle className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <h1 className="text-[15px] font-bold leading-tight" style={{ fontFamily: "var(--font-heading)" }}>
                  Sakhi AI
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isEmergency ? "bg-red-500 animate-pulse" : "bg-[#16A34A]"}`} />
                  <span className="text-[11px] font-medium" style={{ color: isEmergency ? "#FCA5A5" : "var(--sakhi-text-secondary)" }}>
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
                  style={{ background: "var(--sakhi-amber-light)", border: "1px solid rgba(217,119,6,0.2)" }}
                >
                  <Clock className="w-3.5 h-3.5 text-[#D97706] animate-spin" />
                  <span className="text-xs font-bold text-[#D97706]">{formatTime(checkinSeconds)}</span>
                </motion.div>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startNewConversation}
                className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
                style={{
                  background: isEmergency ? "rgba(255,255,255,0.06)" : "var(--sakhi-cream-deep)",
                  color: isEmergency ? "#A3A3A3" : "var(--sakhi-text-secondary)",
                  border: isEmergency ? "1px solid rgba(255,255,255,0.08)" : "1px solid var(--sakhi-border)",
                }}
                title="New chat"
              >
                <Trash2 className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={triggerSOS}
                className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
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
                style={{ background: "var(--sakhi-amber-light)", border: "1px solid rgba(217,119,6,0.15)" }}
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-[#D97706] animate-pulse" />
                  <div>
                    <p className="text-xs font-bold text-[#92400E]">Safety Check-in</p>
                    <p className="text-[11px] font-medium text-[#B45309]">
                      SOS in <span className="font-bold">{formatTime(checkinSeconds)}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={stopCheckin}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all"
                  style={{ background: "white", color: "#92400E", border: "1px solid rgba(217,119,6,0.2)" }}
                >
                  I'm Safe
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Conversation Sidebar ── */}
        <AnimatePresence>
          {showSidebar && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/30 md:hidden"
                onClick={() => setShowSidebar(false)}
              />
              <motion.div
                initial={{ x: -300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -300, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed left-0 top-0 bottom-0 z-50 w-72 overflow-y-auto"
                style={{
                  background: isEmergency ? "#111" : "white",
                  borderRight: isEmergency ? "1px solid rgba(255,255,255,0.08)" : "1px solid var(--sakhi-border-light)",
                  boxShadow: "4px 0 24px rgba(0,0,0,0.1)",
                }}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold" style={{ fontFamily: "var(--font-heading)" }}>Conversations</h3>
                    <button onClick={() => setShowSidebar(false)} className="text-xs opacity-50 cursor-pointer">✕</button>
                  </div>
                  <button
                    onClick={startNewConversation}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold cursor-pointer mb-3 transition-all"
                    style={{
                      background: "var(--sakhi-primary-muted)",
                      color: "var(--sakhi-primary)",
                      border: "1px solid rgba(13,148,136,0.15)",
                    }}
                  >
                    <Sparkle className="w-3.5 h-3.5" /> New Chat
                  </button>
                  <div className="space-y-1.5">
                    {conversations.map((conv) => (
                      <div
                        key={conv.id}
                        className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all text-xs ${
                          conv.id === conversationId ? "font-bold" : "font-medium"
                        }`}
                        style={{
                          background: conv.id === conversationId
                            ? isEmergency ? "rgba(255,255,255,0.06)" : "var(--sakhi-primary-muted)"
                            : "transparent",
                          color: isEmergency ? "#E5E5E5" : "var(--sakhi-text)",
                        }}
                        onClick={() => loadConversation(conv)}
                      >
                        <span className="flex-1 truncate">{conv.title}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                          className="opacity-0 group-hover:opacity-100 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3 opacity-40" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── Chat Messages ── */}
        <div
          id="chat-scroll-container"
          ref={scrollRef}
          onScroll={handleScroll}
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
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} mb-3`}
                >
                  {msg.role === "assistant" ? (
                    <div className="flex gap-2.5 max-w-[85%] md:max-w-[75%] group">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1"
                        style={{
                          background: isEmergency ? "rgba(220,38,38,0.15)" : "var(--sakhi-primary-muted)",
                        }}
                      >
                        <Sparkle className="w-3.5 h-3.5" style={{ color: isEmergency ? "#FCA5A5" : "var(--sakhi-primary)" }} />
                      </div>
                      <div className="flex flex-col">
                        <div
                          className="px-4 py-3 text-[14px] leading-relaxed"
                          style={{
                            background: isEmergency ? "rgba(255,255,255,0.05)" : "white",
                            color: isEmergency ? "#E5E5E5" : "var(--sakhi-text)",
                            border: isEmergency ? "1px solid rgba(255,255,255,0.08)" : "1px solid var(--sakhi-border-light)",
                            borderRadius: "4px 16px 16px 16px",
                            boxShadow: isEmergency ? "none" : "0 1px 3px rgba(0,0,0,0.03)",
                          }}
                        >
                          {msg.isStreaming && msg.content === "" ? (
                            <div className="flex items-center gap-1.5">
                              {[0, 1, 2].map((i) => (
                                <motion.span
                                  key={i}
                                  animate={{ y: [0, -3, 0] }}
                                  transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.12 }}
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ background: isEmergency ? "#FCA5A5" : "var(--sakhi-primary)" }}
                                />
                              ))}
                            </div>
                          ) : (
                            <div className="whitespace-pre-wrap">{renderContent(msg.content)}</div>
                          )}

                          {/* Streaming cursor */}
                          {msg.isStreaming && msg.content !== "" && (
                            <motion.span
                              animate={{ opacity: [1, 0.3, 1] }}
                              transition={{ repeat: Infinity, duration: 0.8 }}
                              className="inline-block w-[2px] h-4 ml-0.5 align-middle"
                              style={{ background: isEmergency ? "#FCA5A5" : "var(--sakhi-primary)" }}
                            />
                          )}
                        </div>

                        {/* Suggested chips */}
                        {msg.suggestions && !msg.isStreaming && msg.suggestions.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2.5">
                            {msg.suggestions.map((btn, i) => (
                              <button
                                key={i}
                                onClick={() => dispatchAction(btn.action)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all hover:scale-105"
                                style={{
                                  background: isEmergency ? "rgba(255,255,255,0.06)" : "var(--sakhi-primary-muted)",
                                  color: isEmergency ? "#A7F3D0" : "var(--sakhi-primary)",
                                  border: isEmergency ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(13,148,136,0.15)",
                                }}
                              >
                                {btn.label}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Error retry + Copy */}
                        <div className="flex items-center gap-2 mt-1 ml-1">
                          {msg.isError && (
                            <button
                              onClick={retryLast}
                              className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold cursor-pointer transition-all"
                              style={{ background: "var(--sakhi-red-light)", color: "var(--sakhi-red)" }}
                            >
                              <RefreshCw className="w-2.5 h-2.5" /> Retry
                            </button>
                          )}
                          {!msg.isStreaming && !msg.isError && (
                            <>
                              <span className="text-[10px] font-medium" style={{ color: isEmergency ? "#737373" : "var(--sakhi-text-muted)" }}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                              <CopyButton text={msg.content} />
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end max-w-[85%] md:max-w-[70%]">
                      <div
                        className="px-4 py-3 text-[14px] leading-relaxed"
                        style={{
                          background: isEmergency ? "rgba(220,38,38,0.15)" : "var(--sakhi-primary)",
                          color: "white",
                          borderRadius: "16px 4px 16px 16px",
                        }}
                      >
                        <span className="whitespace-pre-wrap">{msg.content}</span>
                      </div>
                      <span className="text-[10px] font-medium mt-1 mr-1" style={{ color: isEmergency ? "#737373" : "var(--sakhi-text-muted)" }}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Scroll to bottom button ── */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })}
              className="fixed bottom-32 right-6 z-30 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer shadow-lg"
              style={{
                background: isEmergency ? "#991B1B" : "var(--sakhi-primary)",
                color: "white",
              }}
            >
              <ChevronDown className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* ── Input Area ── */}
        <div
          className="shrink-0"
          style={{
            borderTop: isEmergency ? "1px solid rgba(255,255,255,0.06)" : "1px solid var(--sakhi-border-light)",
            background: isEmergency ? "rgba(10,10,10,0.95)" : "rgba(248,246,244,0.95)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="max-w-[780px] mx-auto px-4 md:px-6 py-3">
            {/* Quick actions (only when idle and few messages) */}
            {!isProcessing && messages.length <= 1 && (
              <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none">
                {QUICK_ACTIONS.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      if (item.action) {
                        dispatchAction(item.action);
                      } else if (item.prompt) {
                        dispatch(item.prompt);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold shrink-0 cursor-pointer transition-all hover:scale-105"
                    style={{ background: item.bg, color: item.color, border: `1px solid ${item.color}20` }}
                  >
                    <item.icon className="w-3.5 h-3.5" />
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2.5">
              {/* Voice button */}
              <button
                onClick={startVoiceInput}
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-all"
                style={{
                  background: isListening ? "var(--sakhi-red-light)" : isEmergency ? "rgba(255,255,255,0.06)" : "var(--sakhi-cream-deep)",
                  color: isListening ? "var(--sakhi-red)" : isEmergency ? "#A3A3A3" : "var(--sakhi-text-secondary)",
                  border: isEmergency ? "1px solid rgba(255,255,255,0.08)" : "1px solid var(--sakhi-border)",
                }}
                title={isListening ? "Listening..." : "Voice input"}
              >
                <Mic className={`w-4 h-4 ${isListening ? "animate-pulse" : ""}`} />
              </button>

              {/* Input field */}
              <div
                className="flex-1 flex items-end gap-2 rounded-2xl px-4 py-2.5 transition-all"
                style={{
                  background: isEmergency ? "rgba(255,255,255,0.06)" : "white",
                  border: isEmergency ? "1px solid rgba(255,255,255,0.1)" : "1px solid var(--sakhi-border)",
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
                  placeholder={isListening ? "Listening..." : "Ask Sakhi AI anything..."}
                  disabled={isProcessing}
                  rows={1}
                  className="flex-1 bg-transparent outline-none text-sm resize-none leading-snug placeholder:opacity-40"
                  style={{ color: isEmergency ? "#E5E5E5" : "var(--sakhi-text)", maxHeight: "120px" }}
                />

                <div className="flex items-center gap-1.5 shrink-0">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => dispatch(input)}
                    disabled={!input.trim() || isProcessing}
                    className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all disabled:opacity-30"
                    style={{
                      background: input.trim() ? isEmergency ? "#991B1B" : "var(--sakhi-primary)" : "transparent",
                      color: input.trim() ? "white" : isEmergency ? "#A3A3A3" : "var(--sakhi-text-muted)",
                    }}
                  >
                    <Send className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-center gap-1 mt-2.5">
              <Lock className="w-3 h-3" style={{ color: isEmergency ? "#525252" : "var(--sakhi-green)" }} />
              <span className="text-[10px] font-medium" style={{ color: isEmergency ? "#525252" : "var(--sakhi-text-muted)" }}>
                End-to-end encrypted · Sakhi AI
              </span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
