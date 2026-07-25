"use client";

import { useState, useRef, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import { Bot, Send, Loader2, Sparkles, Copy, Check } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIPanelProps {
  entityId: string;
  entityTitle: string;
}

export default function AIPanel({ entityId, entityTitle }: AIPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async (question?: string) => {
    const q = (question || input).trim();
    if (!q || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setLoading(true);

    try {
      const json = await apiClient.post<{ data?: { answer?: string } }>("/ai/query", {
        workspace_id: entityId.split("-")[0],
        question: q,
        limit: 5,
      });
      const answer = json.data?.answer || "No answer generated.";
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Network error. Please check your connection." },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const copyMessage = (content: string, idx: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const suggestions = [
    "Summarize this entity",
    "What are the key concepts?",
    "Suggest related topics",
    "Find inconsistencies",
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="rounded-full bg-zinc-800 p-3">
              <Sparkles className="h-5 w-5 text-violet-400" />
            </div>
            <p className="mt-3 text-xs font-medium text-zinc-300">AI Assistant</p>
            <p className="mt-1 text-[11px] text-zinc-500">
              Ask questions about &ldquo;{entityTitle}&rdquo;
            </p>
            <div className="mt-4 space-y-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="block w-full rounded-md border border-zinc-800 px-3 py-1.5 text-[11px] text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={cn("group flex gap-2", msg.role === "user" && "justify-end")}>
              {msg.role === "assistant" && (
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/10">
                  <Bot className="h-3 w-3 text-violet-400" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-xs",
                  msg.role === "user"
                    ? "bg-zinc-800 text-zinc-200"
                    : "bg-zinc-900 text-zinc-300"
                )}
              >
                <pre className="whitespace-pre-wrap break-words font-sans">{msg.content}</pre>
                {msg.role === "assistant" && (
                  <button
                    onClick={() => copyMessage(msg.content, i)}
                    className="mt-1.5 hidden text-zinc-600 hover:text-zinc-400 group-hover:block"
                  >
                    {copiedIdx === i ? (
                      <Check className="h-3 w-3 text-green-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex gap-2">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/10">
              <Bot className="h-3 w-3 text-violet-400" />
            </div>
            <div className="rounded-lg bg-zinc-900 px-3 py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this entity..."
            rows={1}
            className="flex-1 resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="rounded-lg bg-white p-2 text-black hover:bg-zinc-200 disabled:opacity-30"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
