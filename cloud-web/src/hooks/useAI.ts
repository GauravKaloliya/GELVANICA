"use client";

import { useState, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { aiService } from "@/lib/services/ai";
import { API_BASE } from "@/lib/config/constants";

interface AIResponse {
  answer: string;
  sources: Array<{ title: string; content: string }>;
}

interface AISuggestion {
  id: string;
  type: "merge" | "relation" | "tag" | "stale" | "content";
  title: string;
  description: string;
  confidence: number;
  entityIds: string[];
  status: "pending" | "approved" | "dismissed";
}

export function useAI(workspaceId: string) {
  const { tokens } = useAuthStore();
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreamLoading, setIsStreamLoading] = useState(false);
  const [streamingAnswer, setStreamingAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);

  const query = useCallback(
    async (question: string, limit?: number) => {
      if (!tokens?.access_token || !question.trim()) return null;
      setIsLoading(true);
      setError(null);
      try {
        const data = await aiService.query(tokens.access_token, {
          workspaceId,
          question,
          limit,
        });
        setResponse(data);
        return data;
      } catch (e) {
        setError((e as Error).message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [tokens, workspaceId]
  );

  const queryStream = useCallback(
    async (question: string) => {
      if (!tokens?.access_token || !question.trim()) return;
      setIsStreamLoading(true);
      setStreamingAnswer("");
      setError(null);
      try {
        const generator = aiService.queryStream(tokens.access_token, {
          workspaceId,
          question,
        });
        for await (const chunk of generator) {
          setStreamingAnswer((prev) => prev + chunk);
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setIsStreamLoading(false);
      }
    },
    [tokens, workspaceId]
  );

  const approveSuggestion = useCallback((id: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "approved" as const } : s))
    );
  }, []);

  const dismissSuggestion = useCallback((id: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "dismissed" as const } : s))
    );
  }, []);

  const fetchSuggestions = useCallback(async () => {
    if (!tokens?.access_token) return;
    try {
      const res = await fetch(
        `${API_BASE}/workspaces/${workspaceId}/ai/suggestions`,
        { headers: { Authorization: `Bearer ${tokens.access_token}` } }
      );
      if (res.ok) {
        const json = await res.json();
        setSuggestions(json.data || []);
      }
    } catch {
      // suggestions endpoint may not exist yet
    }
  }, [tokens, workspaceId]);

  return {
    response,
    suggestions,
    isLoading,
    isStreamLoading,
    streamingAnswer,
    error,
    query,
    queryStream,
    approveSuggestion,
    dismissSuggestion,
    fetchSuggestions,
  };
}
