"use client";

import { useState, useRef, useEffect } from "react";
import type { SegmentStory } from "@/lib/types";
import { ChatMessage } from "./ChatMessage";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  story: SegmentStory;
  date: string;
}

export function ChatPanel({ story, date }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const suggestedQuestions = [
    "What should I do about this?",
    "How does this affect Sourcy?",
    "What's the Devil's Advocate take?",
    "Go deeper on the tech implications",
  ];

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          storyId: story.id,
          date,
        }),
      });

      if (!res.ok) throw new Error("Chat failed");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let assistantText = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        assistantText += chunk;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: assistantText };
          return updated;
        });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-[var(--border)] flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)]">
        <h3 className="font-bold text-sm">Ask Your Board of Advisors</h3>
        <p className="text-xs text-[var(--text-muted)]">
          Challenge Protocol active — they&apos;ll push back before helping
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-[var(--text-muted)] mb-3">Try asking:</p>
            {suggestedQuestions.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="block w-full text-left text-xs p-2.5 rounded-lg border border-[var(--border)] hover:border-[var(--brand)] hover:bg-[#2ABFAB08] transition-colors cursor-pointer bg-white"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <span className="animate-pulse">Advisors are thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[var(--border)]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this story..."
            className="flex-1 text-sm px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:border-[var(--brand)]"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-[var(--brand)] text-white text-sm px-4 py-2 rounded-lg font-medium hover:bg-[var(--brand-dark)] disabled:opacity-50 border-0 cursor-pointer"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
