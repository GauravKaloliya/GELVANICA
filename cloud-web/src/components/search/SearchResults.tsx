"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import { Search, FileText, Layers, ArrowRight } from "lucide-react";
import type { SearchResult } from "@/lib/types/search";

interface SearchResultsProps {
  results: SearchResult[];
  isLoading?: boolean;
  query: string;
  onSelectResult?: (result: SearchResult) => void;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function highlightMatch(text: string, q: string) {
  const safe = escapeHtml(text);
  if (!q.trim()) return safe;
  const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return safe.replace(
    regex,
    '<mark class="bg-yellow-500/30 text-yellow-300 rounded px-0.5">$1</mark>'
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 py-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 space-y-2"
        >
          <div className="flex items-center gap-2">
            <Skeleton variant="circular" width={16} height={16} />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton lines={2} />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SearchResults({
  results,
  isLoading = false,
  query,
  onSelectResult,
}: SearchResultsProps) {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (results.length === 0) {
    return (
      <div className="py-12 text-center">
        <Search className="mx-auto h-10 w-10 text-zinc-600" />
        <p className="mt-3 text-sm text-zinc-400">
          No results for &quot;{query}&quot;
        </p>
        <p className="mt-1 text-xs text-zinc-600">
          Try a different query or search mode
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="mb-3 text-xs text-zinc-500">
        {results.length} result{results.length !== 1 ? "s" : ""}
      </p>
      {results.map((result) => (
        <button
          key={result.id}
          type="button"
          onClick={() => onSelectResult?.(result)}
          className="group block w-full rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-left transition-colors hover:border-zinc-700"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {result.match_type === "page" ? (
                  <Layers className="h-4 w-4 shrink-0 text-zinc-500" />
                ) : (
                  <FileText className="h-4 w-4 shrink-0 text-zinc-500" />
                )}
                <h3
                  className="truncate text-sm font-medium text-white"
                  dangerouslySetInnerHTML={{
                    __html: highlightMatch(result.title, query),
                  }}
                />
              </div>
              {result.content && (
                <p
                  className="mt-1 line-clamp-2 text-xs text-zinc-400"
                  dangerouslySetInnerHTML={{
                    __html: highlightMatch(
                      result.content.slice(0, 200),
                      query
                    ),
                  }}
                />
              )}
              <div className="mt-2 flex items-center gap-3">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium",
                    result.match_type === "page"
                      ? "bg-blue-500/10 text-blue-400"
                      : "bg-green-500/10 text-green-400"
                  )}
                >
                  {result.match_type}
                </span>
                <span className="text-[10px] text-zinc-600">
                  Score: {(result.score * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-zinc-600 group-hover:text-white" />
          </div>
        </button>
      ))}
    </div>
  );
}
