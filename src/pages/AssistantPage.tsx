import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Bot, Mic, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import BottomNav from "@/components/BottomNav";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const suggestions = [
  "I feel unsafe walking home",
  "How to report cyber harassment?",
  "Safety tips for late night travel",
  "Help me create an emergency plan",
];

const AssistantPage = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hi! I'm Sakhi, your safety companion. 💛 How can I help you today? I can provide safety advice, help with reporting, or just talk.",
    },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const generateResponse = (text: string) => {
    const lowerInput = text.toLowerCase();
    
    // Emergency / Danger
    if (/(help|danger|sos|urgent|attack|scared|unsafe)/i.test(lowerInput)) {
      const emergencyResponses = [
        "Your safety is the priority! Please find a safe space immediately. Do you want me to activate the emergency SOS now?",
        "I'm here with you. Please share your live location with a trusted contact immediately and move to a well-lit, populated area. Tap the SOS button if you feel in immediate danger.",
        "Stay calm but act quickly. Call your local emergency number or use the SOS button on this app to alert your contacts. Try to get to a public place."
      ];
      return emergencyResponses[Math.floor(Math.random() * emergencyResponses.length)];
    }

    // Stalking / Followed
    if (/(follow|following|trailing|behind me|staring)/i.test(lowerInput)) {
      const followResponses = [
        "If you think someone is following you, do not go home. Walk toward a crowded place, a cafe, or a police station. Consider calling a friend to stay on the line with you.",
        "That sounds scary. Try changing your pace or crossing the street to see if they mimic you. Head to a well-lit, busy area and do not hesitate to ask for help from security or staff nearby.",
        "Please stay alert. Keep your phone accessible, share your location, and avoid isolated streets. If they continue following you, activate the SOS feature."
      ];
      return followResponses[Math.floor(Math.random() * followResponses.length)];
    }

    // Cyber / Online Harassment
    if (/(online|cyber|message|text|hack|fake|social media|instagram|whatsapp|harassment)/i.test(lowerInput)) {
      const cyberResponses = [
        "For online harassment, the first step is to block and report the user on the platform. Do not delete the messages yet—take screenshots as evidence.",
        "Cyber safety is important. Do not engage with the person. Document the conversation, block the account, and consider reporting it to cybercrime authorities if it escalates.",
        "Keep your personal information private. You can use the Sakhi app to anonymously report cyber bullying. Would you like me to guide you to the reporting section?"
      ];
      return cyberResponses[Math.floor(Math.random() * cyberResponses.length)];
    }

    // Default Fallback
    const defaultResponses = [
      "I'm here to listen. Can you tell me a bit more about what's going on so I can give you the best advice?",
      "Thank you for sharing that with me. Your safety and well-being matters. How can I best support you right now?",
      "I understand. Whether you need safety tips, want to file a report, or just need someone to talk to, I'm here."
    ];
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  };

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    setTimeout(() => {
      const reply: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: generateResponse(text),
      };
      setMessages((prev) => [...prev, reply]);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Sakhi AI</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> AI-powered safety assistant
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "glass rounded-bl-md"
              }`}
            >
              {msg.content}
            </div>
          </motion.div>
        ))}

        {/* Suggestions (show only at start) */}
        {messages.length <= 1 && (
          <div className="space-y-2 pt-2">
            <p className="text-xs text-muted-foreground">Suggested</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-xs px-3 py-2 rounded-full glass hover:border-primary/40 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-5 py-3 border-t border-border bg-background">
        <div className="flex gap-2 items-center">
          <button className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <Mic className="w-5 h-5" />
          </button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            placeholder="Type a message..."
            className="flex-1 rounded-full"
          />
          <button
            onClick={() => sendMessage(input)}
            className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default AssistantPage;
