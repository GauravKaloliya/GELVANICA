"use client";

import { useState } from "react";
import { Loader2, Bot, Link2, X } from "lucide-react";
import { apiClient } from "@/lib/apiClient";

interface AIQuickActionsProps {
  token: string;
  workspaceId: string;
  entityId: string;
}

export default function AIQuickActions({ workspaceId, entityId }: AIQuickActionsProps) {
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSuggestedRelations, setAiSuggestedRelations] = useState<unknown[] | null>(null);
  const [aiRelationsLoading, setAiRelationsLoading] = useState(false);

  const handleSummarize = async () => {
    setAiSummaryLoading(true);
    setAiSummary(null);
    try {
      const json = await apiClient.post<{ data?: { summary?: string } | string }>("/ai/summarize", {
        workspace_id: workspaceId, entity_id: entityId,
      });
      const data = json.data;
      setAiSummary(
        typeof data === "object" && data !== null ? (data.summary || JSON.stringify(data)) : (data || "No summary available.")
      );
    } catch {
      setAiSummary("Failed to generate summary.");
    } finally {
      setAiSummaryLoading(false);
    }
  };

  const handleSuggestRelations = async () => {
    setAiRelationsLoading(true);
    setAiSuggestedRelations(null);
    try {
      const json = await apiClient.post<{ data?: { suggestions?: unknown[] } | unknown[] }>("/ai/suggest-relations", {
        workspace_id: workspaceId, entity_id: entityId,
      });
      const data = json.data;
      setAiSuggestedRelations(
        typeof data === "object" && data !== null && !Array.isArray(data)
          ? ((data as { suggestions?: unknown[] }).suggestions || null)
          : (Array.isArray(data) ? data : null)
      );
    } catch {
      setAiSuggestedRelations([]);
    } finally {
      setAiRelationsLoading(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={handleSummarize}
          disabled={aiSummaryLoading}
          className="flex items-center gap-1.5 rounded-md border border-purple-700 bg-purple-900/30 px-3 py-1.5 text-xs text-purple-300 hover:bg-purple-800/40 hover:text-purple-200 disabled:opacity-50"
        >
          {aiSummaryLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
          Summarize
        </button>
        <button
          onClick={handleSuggestRelations}
          disabled={aiRelationsLoading}
          className="flex items-center gap-1.5 rounded-md border border-purple-700 bg-purple-900/30 px-3 py-1.5 text-xs text-purple-300 hover:bg-purple-800/40 hover:text-purple-200 disabled:opacity-50"
        >
          {aiRelationsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
          Suggest Relations
        </button>
      </div>

      {aiSummary && (
        <div className="rounded-md border border-purple-800 bg-purple-950/30 p-3 text-sm text-purple-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-purple-400">AI Summary</span>
            <button onClick={() => setAiSummary(null)} className="text-zinc-500 hover:text-white">
              <X className="h-3 w-3" />
            </button>
          </div>
          <p className="text-xs text-zinc-300 whitespace-pre-wrap">{aiSummary}</p>
        </div>
      )}

      {aiSuggestedRelations && (
        <div className="rounded-md border border-purple-800 bg-purple-950/30 p-3 text-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-purple-400">Suggested Relations</span>
            <button onClick={() => setAiSuggestedRelations(null)} className="text-zinc-500 hover:text-white">
              <X className="h-3 w-3" />
            </button>
          </div>
          {Array.isArray(aiSuggestedRelations) && aiSuggestedRelations.length > 0 ? (
            <div className="space-y-1.5">
              {aiSuggestedRelations.map((suggestion, idx) => (
                <div key={idx} className="rounded-md bg-zinc-800/50 px-2 py-1.5 text-xs text-zinc-300">
                  {typeof suggestion === "object" && suggestion !== null ? (
                    <span>{JSON.stringify(suggestion)}</span>
                  ) : (
                    <span>{String(suggestion)}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">No suggestions found.</p>
          )}
        </div>
      )}
    </>
  );
}
