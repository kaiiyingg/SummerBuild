import { useState, useRef, useEffect } from "react";
import { Mic, Send, Pill } from "lucide-react";

const C = {
  teal:        "#45C5BC",
  tealLight:   "#F0FDFA",
  bg:          "#F8FAFC",
  muted:       "#F1F5F9",
  textPrimary: "#1E293B",
  textSecond:  "#64748B",
  textDisabled:"#94A3B8",
  border:      "#E2E8F0",
};

type Message = { id: number; role: "bot" | "user"; text: string; time: string };

const initialMessages: Message[] = [
  { id: 1, role: "bot",  text: "Hello Mdm. Tan! I'm Pilly, your pharmacy assistant. How can I help you today?", time: "2:34 PM" },
  { id: 2, role: "user", text: "When will my Atorvastatin be ready?", time: "2:35 PM" },
  { id: 3, role: "bot",  text: "Your Atorvastatin 20mg is currently being restocked. Our pharmacy team is working on it and it should be ready in about 15–20 minutes. You'll receive a notification as soon as it's available.", time: "2:35 PM" },
];

const faqChips = ["What's my queue?", "How to take my meds?", "Can I reschedule?", "Side effects?", "Opening hours?"];

const botReplies: Record<string, string> = {
  "What's my queue?":     "Your current registration queue number is B047. The counter is now serving B041. Your estimated wait is 12–15 minutes.",
  "How to take my meds?": "For Metformin 500mg: take 1 tablet twice daily with meals. For Lisinopril 10mg: take 1 tablet once daily in the morning. For Aspirin 100mg: take 1 tablet after breakfast.",
  "Can I reschedule?":    "Yes, you can reschedule your collection. Tap the 'Reschedule Collection' button on the Queue screen and select your preferred time slot.",
  "Side effects?":        "Common side effects: Metformin may cause mild nausea initially. Lisinopril may cause a dry cough in some patients. Consult your doctor if you experience any concerns.",
  "Opening hours?":       "Level 1, Pharmacy A is open Mon–Fri 8:00 AM – 6:00 PM, Sat 8:00 AM – 1:00 PM. Closed on Sundays and public holidays.",
};

export function AskPillyScreen({ language }: { language: string }) {
  const [messages,  setMessages]  = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const now   = new Date().toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" });
    const reply = botReplies[text] ?? "Thank you for your question. A pharmacy team member will follow up with you shortly. Please remain in the waiting area.";
    setMessages((m) => [...m, { id: m.length + 1, role: "user", text, time: now }]);
    setInputText("");
    setTimeout(() => setMessages((m) => [...m, { id: m.length + 1, role: "bot", text: reply, time: now }]), 700);
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full">

      {/* Header */}
      <div className="px-4 pt-5 pb-3 shrink-0">
        <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "22px", fontWeight: 700, color: C.textPrimary }}>Ask Pilly</h1>
        <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "14px", color: C.textSecond }}>Powered by Reka AI · Responding in {language}</p>
      </div>

      {/* FAQ chips */}
      <div className="px-4 pb-3 shrink-0">
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {faqChips.map((chip) => (
            <button key={chip} onClick={() => sendMessage(chip)}
              className="shrink-0 px-4 py-2 rounded-full hover:opacity-80 transition-opacity"
              style={{ background: C.tealLight, color: C.teal, fontFamily: "'Open Sans', sans-serif", fontSize: "14px", fontWeight: 600, whiteSpace: "nowrap", border: `1px solid ${C.teal}25` }}>
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 space-y-4 pb-4">
        {messages.map((msg, idx) => {
          const showTime = !messages[idx - 1] || messages[idx - 1].time !== msg.time;
          return (
            <div key={msg.id}>
              {showTime && (
                <p className="text-center mb-2" style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "13px", color: C.textDisabled }}>{msg.time}</p>
              )}
              <div className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "bot" && (
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-1" style={{ background: C.teal }}>
                    <Pill size={17} color="white" />
                  </div>
                )}
                <div className="max-w-[78%] px-4 py-3" style={{
                  background: msg.role === "bot" ? "white" : C.teal,
                  color: msg.role === "bot" ? C.textPrimary : "white",
                  borderRadius: msg.role === "bot" ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
                  boxShadow: msg.role === "bot" ? "0 1px 6px rgba(0,0,0,0.07)" : "none",
                  fontFamily: "'Open Sans', sans-serif",
                  fontSize: "15px",
                  lineHeight: "1.6",
                  border: msg.role === "bot" ? `1px solid ${C.border}` : "none",
                }}>
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="shrink-0 px-4 py-3 bg-white" style={{ borderTop: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-3">
          <button aria-label="Voice input"><Mic size={22} color={C.textSecond} /></button>
          <div className="flex-1 flex items-center px-4 py-2.5 rounded-3xl" style={{ background: C.muted }}>
            <input
              type="text" value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage(inputText)}
              placeholder="Ask about your medication..."
              className="flex-1 bg-transparent outline-none"
              style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "15px", color: C.textPrimary }}
            />
          </div>
          <button onClick={() => sendMessage(inputText)}
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity"
            style={{ background: C.teal }} aria-label="Send">
            <Send size={18} color="white" />
          </button>
        </div>
      </div>
    </div>
  );
}
