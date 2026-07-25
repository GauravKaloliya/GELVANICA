"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { cn, formatRelativeTime } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

interface ReviewWorkflowProps {
  workspaceId: string;
}

interface HistoricalScore {
  score: number;
  created_at: string;
}

export default function ReviewWorkflow({ workspaceId }: ReviewWorkflowProps) {
  const [history, setHistory] = useState<HistoricalScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const json = await apiClient.get<{ data: HistoricalScore[] }>(
          `/governance/${workspaceId}/history`
        );
        setHistory(json.data || []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton width={120} height={16} />
          <Skeleton width={80} height={14} />
        </div>
        <div className="flex items-end gap-1 h-16">
          {[45, 72, 38, 85, 55, 63, 42, 78, 50, 68].map((h, i) => (
            <Skeleton key={i} variant="rectangular" className="flex-1 rounded-t" height={`${h}%`} />
          ))}
        </div>
        <div className="flex items-center gap-4">
          <Skeleton width={50} height={10} />
          <Skeleton width={50} height={10} />
          <Skeleton width={50} height={10} />
        </div>
      </div>
    );
  }

  if (history.length < 2) {
    return (
      <div className="py-6 text-center">
        <Shield className="mx-auto h-6 w-6 text-zinc-600" />
        <p className="mt-2 text-xs text-zinc-500">Run at least 2 audits to see score trends</p>
      </div>
    );
  }

  const latest = history[history.length - 1];
  const previous = history[history.length - 2];
  const diff = latest.score - previous.score;
  const TrendIcon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
  const trendColor = diff > 0 ? "text-green-400" : diff < 0 ? "text-red-400" : "text-zinc-400";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Score Trend</h3>
        <div className={cn("flex items-center gap-1 text-xs font-medium", trendColor)}>
          <TrendIcon className="h-3.5 w-3.5" />
          {diff > 0 ? "+" : ""}{diff} points
        </div>
      </div>

      {/* Mini sparkline visualization */}
      <div className="flex items-end gap-1 h-16">
        {history.slice(-20).map((h, i) => {
          const height = (h.score / 100) * 100;
          const isLatest = i === history.slice(-20).length - 1;
          return (
            <div
              key={i}
              className={cn(
                "flex-1 rounded-t transition-colors",
                isLatest
                  ? h.score >= 90
                    ? "bg-green-400"
                    : h.score >= 70
                    ? "bg-amber-400"
                    : "bg-red-400"
                  : "bg-zinc-700"
              )}
              style={{ height: `${Math.max(height, 8)}%` }}
              title={`${h.score} — ${formatRelativeTime(h.created_at)}`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-zinc-500">
        <span className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-sm bg-green-400" /> 90+
        </span>
        <span className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-sm bg-amber-400" /> 70-89
        </span>
        <span className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-sm bg-red-400" /> &lt;70
        </span>
      </div>
    </div>
  );
}
