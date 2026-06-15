import { useState } from "react";
import { motion } from "framer-motion";

function Assistant() {
  const [messages, setMessages] = useState([
    { sender: "ai", text: "Hi! How can I help you today?" }
  ]);
  const [input, setInput] = useState("");

  function sendMessage() {
    if (!input.trim()) return;

    setMessages([
      ...messages,
      { sender: "user", text: input },
      { sender: "ai", text: "Thanks! A hospital staff member or AI assistant can guide you shortly." }
    ]);

    setInput("");
  }

  return (
    <main className="page">
      <h1>AI Hospital Assistant</h1>

      <div className="chatbox">
        {messages.map((msg, index) => (
          <motion.div
            key={index}
            className={msg.sender === "user" ? "msg user" : "msg ai"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {msg.text}
          </motion.div>
        ))}
      </div>

      <div className="chat-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about queue, departments, visiting hours..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </main>
  );
}

export default Assistant;