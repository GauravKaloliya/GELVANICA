"use client";

import { createContext, useContext, useCallback, useState, useRef, type ReactNode } from "react";
import { useAuthStore } from "@/stores/authStore";
import { API_BASE } from "@/lib/config/constants";

interface AIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

interface AIContextValue {
  messages: AIMessage[];
  isGenerating: boolean;
  streamingContent: string;
  sendMessage: (content: string, entityId?: string, workspaceId?: string) => Promise<void>;
  clearMessages: () => void;
  abortGeneration: () => void;
}

const AIContext = createContext<AIContextValue | null>(null);

export function AIProvider({ children }: { children: ReactNode }) {
  const { tokens } = useAuthStore();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const abortGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const sendMessage = useCallback(
    async (content: string, entityId?: string, workspaceId?: string) => {
      if (!tokens?.access_token) return;
      const userMsg: AIMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsGenerating(true);
      setStreamingContent("");

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const res = await fetch(`${API_BASE}/ai/query`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tokens.access_token}`,
          },
          body: JSON.stringify({
            query: content,
            entity_id: entityId,
            workspace_id: workspaceId,
            stream: true,
          }),
          signal: controller.signal,
        });

        if (res.ok && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let fullContent = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.content) {
                    fullContent += data.content;
                    setStreamingContent(fullContent);
                  }
                } catch {
                  // skip malformed chunks
                }
              }
            }
          }

          const assistantMsg: AIMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: fullContent,
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
        } else {
          const errorMsg: AIMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "No response from AI.",
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, errorMsg]);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          const errorMsg: AIMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "An error occurred. Please try again.",
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, errorMsg]);
        }
      } finally {
        setIsGenerating(false);
        setStreamingContent("");
      }
    },
    [tokens]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setStreamingContent("");
  }, []);

  return (
    <AIContext.Provider value={{ messages, isGenerating, streamingContent, sendMessage, clearMessages, abortGeneration }}>
      {children}
    </AIContext.Provider>
  );
}

export function useAIContext() {
  const ctx = useContext(AIContext);
  if (!ctx) throw new Error("useAIContext must be used within AIProvider");
  return ctx;
}
