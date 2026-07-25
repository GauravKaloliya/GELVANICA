"use client";

import { useState, useEffect } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { useAI } from "@/hooks/useAI";
import { apiClient } from "@/lib/apiClient";
import { AIApprovalModal } from "@/components/modals";
import { Switch } from "@/components/ui/Switch";
import { Slider } from "@/components/ui/Slider";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import {
  Brain,
  Sparkles,
  Send,
  Loader2,
  Check,
  X,
  Lightbulb,
  AlertCircle,
  Settings,
  Zap,
} from "lucide-react";

interface AISettingsProps {
  workspaceId: string;
}

interface AIConfig {
  enabled: boolean;
  model: string;
  temperature: number;
  max_tokens: number;
  auto_suggest: boolean;
}

const AVAILABLE_MODELS = [
  { label: "GPT-4", value: "gpt-4" },
  { label: "GPT-4 Turbo", value: "gpt-4-turbo" },
  { label: "GPT-4o", value: "gpt-4o" },
  { label: "GPT-4o Mini", value: "gpt-4o-mini" },
  { label: "Claude 3 Opus", value: "claude-3-opus" },
  { label: "Claude 3 Sonnet", value: "claude-3-sonnet" },
  { label: "Claude 3 Haiku", value: "claude-3-haiku" },
  { label: "Claude 3.5 Sonnet", value: "claude-3.5-sonnet" },
];

export function AISettings({ workspaceId }: AISettingsProps) {
  const { canUseAI } = usePermissions();
  const { suggestions, fetchSuggestions, approveSuggestion, dismissSuggestion } = useAI(workspaceId);

  const [config, setConfig] = useState<AIConfig>({
    enabled: true,
    model: "gpt-4o",
    temperature: 0.7,
    max_tokens: 2048,
    auto_suggest: true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [queryInput, setQueryInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { queryStream, streamingAnswer, isStreamLoading, response, isLoading: aiLoading, error: aiError } = useAI(workspaceId);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const json = await apiClient.get<{ data?: AIConfig }>(`/ai/config?workspace_id=${workspaceId}`);
        if (json.data) setConfig(json.data);
      } catch { /* config may not exist yet */ }
    };
    fetchConfig();
  }, [workspaceId]);

  useEffect(() => {
    if (canUseAI) fetchSuggestions();
  }, [canUseAI, fetchSuggestions]);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await apiClient.post("/ai/config", { workspace_id: workspaceId, ...config });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* handle error */ } finally {
      setSaving(false);
    }
  };

  const handleQuery = async () => {
    if (!queryInput.trim()) return;
    await queryStream(queryInput);
    setQueryInput("");
  };

  return (
    <div className="space-y-6">
      {!canUseAI && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-400">
          <AlertCircle className="h-4 w-4" />
          You need Editor role or higher to use AI features
        </div>
      )}

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Settings className="h-5 w-5 text-zinc-400" />
          Model Settings
        </h2>
        <div className="mt-6 space-y-5">
          <Switch
            label="Enable AI Features"
            description="Allow AI-powered search, suggestions, and queries"
            checked={config.enabled}
            onCheckedChange={(checked) => setConfig((c) => ({ ...c, enabled: checked }))}
          />
          <div>
            <label htmlFor="ai-model" className="block text-sm font-medium text-zinc-400 mb-1.5">Model</label>
            <Select value={config.model} onValueChange={(value) => setConfig((c) => ({ ...c, model: value }))}>
              <SelectTrigger id="ai-model">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Slider
            label="Temperature"
            showValue
            formatValue={(v) => String(v)}
            min={0}
            max={1}
            step={0.1}
            value={[config.temperature]}
            onValueChange={(value) => setConfig((c) => ({ ...c, temperature: value[0] }))}
          />
          <div>
            <label htmlFor="ai-max-tokens" className="block text-sm font-medium text-zinc-400 mb-1.5">Max Tokens</label>
            <input
              id="ai-max-tokens"
              type="number"
              value={config.max_tokens}
              onChange={(e) => setConfig((c) => ({ ...c, max_tokens: Number(e.target.value) }))}
              min={256}
              max={8192}
              step={256}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white focus:border-zinc-500 focus:outline-none"
            />
          </div>
          <Switch
            label="Auto Suggestions"
            description="Automatically suggest improvements and relations"
            checked={config.auto_suggest}
            onCheckedChange={(checked) => setConfig((c) => ({ ...c, auto_suggest: checked }))}
          />
        </div>
        <div className="mt-6">
          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50",
              saved ? "bg-green-600 text-white" : "bg-white text-black hover:bg-zinc-200"
            )}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
            {saved ? "Saved!" : "Save Config"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Sparkles className="h-5 w-5 text-indigo-400" />
          Test AI Query
        </h2>
        <p className="mt-1 text-sm text-zinc-500">Ask questions about your knowledge base</p>
        <div className="mt-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleQuery()}
              placeholder="Ask something..."
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
            />
            <button
              onClick={handleQuery}
              disabled={aiLoading || isStreamLoading || !queryInput.trim()}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {aiLoading || isStreamLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Ask
            </button>
          </div>
          {isStreamLoading && streamingAnswer && (
            <div className="mt-4 rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4">
              <div className="flex items-start gap-2">
                <Brain className="h-4 w-4 shrink-0 text-indigo-400 mt-0.5" />
                <div className="text-sm text-zinc-300 whitespace-pre-wrap">{streamingAnswer}</div>
              </div>
            </div>
          )}
          {response && !isStreamLoading && (
            <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-800/30 p-4">
              <div className="flex items-start gap-2">
                <Brain className="h-4 w-4 shrink-0 text-indigo-400 mt-0.5" />
                <p className="text-sm text-zinc-300 whitespace-pre-wrap">{response.answer}</p>
              </div>
              {response.sources.length > 0 && (
                <div className="mt-3">
                  <p className="mb-2 text-xs text-zinc-500">Sources:</p>
                  {response.sources.map((source, i) => (
                    <div key={i} className="rounded border border-zinc-800 px-3 py-2 text-xs">
                      <p className="font-medium text-white">{source.title}</p>
                      <p className="text-zinc-500 line-clamp-1">{source.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {aiError && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4" />
              {aiError}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Lightbulb className="h-5 w-5 text-amber-400" />
            AI Suggestions
          </h2>
          <button
            onClick={() => setShowSuggestions(true)}
            className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
          >
            View All ({suggestions.length})
          </button>
        </div>
        <p className="mt-1 text-sm text-zinc-500">Review AI-generated improvements</p>
        {suggestions.filter((s) => s.status === "pending").length === 0 ? (
          <div className="mt-4 py-8 text-center">
            <Lightbulb className="mx-auto h-6 w-6 text-zinc-600" />
            <p className="mt-2 text-xs text-zinc-500">No pending suggestions</p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {suggestions.filter((s) => s.status === "pending").slice(0, 3).map((suggestion) => (
              <div key={suggestion.id} className="flex items-center justify-between rounded-lg border border-zinc-800 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white">{suggestion.title}</p>
                  <p className="text-xs text-zinc-500">{suggestion.description}</p>
                </div>
                <div className="flex gap-1 shrink-0 ml-3">
                  <button onClick={() => approveSuggestion(suggestion.id)} className="rounded p-1 text-green-400 hover:bg-green-500/10" aria-label="Approve suggestion">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => dismissSuggestion(suggestion.id)} className="rounded p-1 text-red-400 hover:bg-red-500/10" aria-label="Dismiss suggestion">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AIApprovalModal
        open={showSuggestions}
        onClose={() => setShowSuggestions(false)}
        suggestions={suggestions}
        onApprove={approveSuggestion}
        onDismiss={dismissSuggestion}
      />
    </div>
  );
}
