"use client";

import { useState, useEffect } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { useAI } from "@/hooks/useAI";
import { apiClient } from "@/lib/apiClient";
import { AIApprovalModal } from "@/components/modals";
import { Switch } from "@/components/ui/Switch";
import { Slider } from "@/components/ui/Slider";
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
        const json = await apiClient.get<AIConfig>(`/workspaces/${workspaceId}/settings/ai`);
        if (json) setConfig(json);
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
      await apiClient.put(`/workspaces/${workspaceId}/settings/ai`, config);
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

      <div className="rounded-xl border-border bg-card neo-depth-zinc p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Settings className="h-5 w-5 text-muted" />
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
            <label htmlFor="ai-model" className="block text-sm font-medium text-muted mb-1.5">Model</label>
            <div className="rounded-lg border-border bg-surface px-3 py-2 text-sm text-foreground">
              Qwen2.5-3B-Instruct
            </div>
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
            <label htmlFor="ai-max-tokens" className="block text-sm font-medium text-muted mb-1.5">Max Tokens</label>
            <input
              id="ai-max-tokens"
              type="number"
              value={config.max_tokens}
              onChange={(e) => setConfig((c) => ({ ...c, max_tokens: Number(e.target.value) }))}
              min={256}
              max={8192}
              step={256}
              className="w-full rounded-lg border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
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
              saved ? "bg-green-600 text-white" : "bg-card text-foreground hover:bg-surface"
            )}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
            {saved ? "Saved!" : "Save Config"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border-border bg-card neo-depth-zinc p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Sparkles className="h-5 w-5 text-accent" />
          Test AI Query
        </h2>
        <p className="mt-1 text-sm text-muted">Ask questions about your knowledge base</p>
        <div className="mt-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleQuery()}
              placeholder="Ask something..."
              className="flex-1 rounded-lg border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />
            <button
              onClick={handleQuery}
              disabled={aiLoading || isStreamLoading || !queryInput.trim()}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-foreground hover:brightness-110 disabled:opacity-50"
            >
              {aiLoading || isStreamLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Ask
            </button>
          </div>
          {isStreamLoading && streamingAnswer && (
            <div className="mt-4 rounded-lg border border-accent/20 bg-accent/5 p-4">
              <div className="flex items-start gap-2">
                <Brain className="h-4 w-4 shrink-0 text-accent mt-0.5" />
                <div className="text-sm text-foreground whitespace-pre-wrap">{streamingAnswer}</div>
              </div>
            </div>
          )}
          {response && !isStreamLoading && (
            <div className="mt-4 rounded-lg border-border bg-surface p-4">
              <div className="flex items-start gap-2">
                <Brain className="h-4 w-4 shrink-0 text-accent mt-0.5" />
                <p className="text-sm text-foreground whitespace-pre-wrap">{response.answer}</p>
              </div>
              {response.sources.length > 0 && (
                <div className="mt-3">
                  <p className="mb-2 text-xs text-muted">Sources:</p>
                  {response.sources.map((source, i) => (
                    <div key={i} className="rounded border-border px-3 py-2 text-xs">
                      <p className="font-medium text-foreground">{source.title}</p>
                      <p className="text-muted line-clamp-1">{source.content}</p>
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

      <div className="rounded-xl border-border bg-card neo-depth-zinc p-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Lightbulb className="h-5 w-5 text-amber-400" />
            AI Suggestions
          </h2>
          <button
            onClick={() => setShowSuggestions(true)}
            className="rounded-lg bg-surface px-3 py-1.5 text-xs text-foreground hover:bg-surface-2"
          >
            View All ({suggestions.length})
          </button>
        </div>
        <p className="mt-1 text-sm text-muted">Review AI-generated improvements</p>
        {suggestions.filter((s) => s.status === "pending").length === 0 ? (
          <div className="mt-4 py-8 text-center">
            <Lightbulb className="mx-auto h-6 w-6 text-muted" />
            <p className="mt-2 text-xs text-muted">No pending suggestions</p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {suggestions.filter((s) => s.status === "pending").slice(0, 3).map((suggestion) => (
              <div key={suggestion.id} className="flex items-center justify-between rounded-lg border-border p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{suggestion.title}</p>
                  <p className="text-xs text-muted">{suggestion.description}</p>
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
