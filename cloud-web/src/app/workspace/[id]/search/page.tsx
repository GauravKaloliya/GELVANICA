"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useSearch } from "@/hooks/useSearch";
import { useAuthStore } from "@/stores/authStore";
import { apiClient } from "@/lib/apiClient";
import { useDebounce } from "@/hooks/useDebounce";
import SearchFiltersPanel from "@/components/search/SearchFilters";
import SearchModeToggle from "@/components/search/SearchModeToggle";
import type { SearchFilters } from "@/components/search/SearchFilters";
import type { SearchResult } from "@/lib/types/search";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/Popover";
import { Calendar } from "@/components/ui/Calendar";
import { SearchBar } from "@/components/search/SearchBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import {
  Search,
  Sparkles,
  Clock,
  CalendarIcon,
  FileText,
  Layers,
  X,
  ChevronRight,
  SlidersHorizontal,
  History,
  TrendingUp,
  Tag,
  User,
  FileType,
  Loader2,
} from "lucide-react";

interface HistoryItem {
  query: string;
  searched_at: string;
  result_count: number;
}

interface SuggestItem {
  text: string;
  entity_id: string;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  entity: Layers,
  block: FileText,
};

const TYPE_COLORS: Record<string, string> = {
  entity: "bg-blue-500/10 text-blue-400",
  block: "bg-green-500/10 text-green-400",
};

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

function ResultCard({ result, query, onSelect }: { result: SearchResult; query: string; onSelect: (r: SearchResult) => void }) {
  const Icon = TYPE_ICONS[result.type] || FileText;
  return (
    <button
      type="button"
      onClick={() => onSelect(result)}
      className="group relative w-full rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-border hover:bg-surface/50 hover:shadow-sm"
    >
      <div className="flex items-start gap-4">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", result.type === "entity" ? "bg-blue-500/10" : "bg-green-500/10")}>
          <Icon className={cn("h-4 w-4", result.type === "entity" ? "text-blue-400" : "text-green-400")} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3
              className="truncate text-sm font-semibold text-foreground"
              dangerouslySetInnerHTML={{
                __html: highlightMatch(result.type === "entity" ? result.name : result.entity_name, query),
              }}
            />
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          {(result.type === "entity" ? result.summary : result.content_preview) && (
            <p
              className="mt-1.5 line-clamp-2 text-xs text-muted leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: highlightMatch(
                  (result.type === "entity" ? result.summary : result.content_preview).slice(0, 200),
                  query
                ),
              }}
            />
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium", TYPE_COLORS[result.type] || "bg-surface text-muted")}>
              {result.type === "entity" ? <Layers className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
              {result.type}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-medium text-amber-400">
              <TrendingUp className="h-3 w-3" />
              {(result.score * 100).toFixed(0)}%
            </span>
            {result.entity_type && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-medium text-purple-400">
                <FileType className="h-3 w-3" />
                {result.entity_type}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

export default function SearchPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const inputRef = useRef<HTMLInputElement>(null);
  const { tokens } = useAuthStore();
  const { results, isLoading, query, setQuery, mode, setMode, search } =
    useSearch(workspaceId);
  const [filters, setFilters] = useState<SearchFilters>({ entityType: "", tagIds: [], dateFrom: "", dateTo: "", matchType: "all", authorId: "", relationType: "", fileAttachment: false });
  const [recentHistory, setRecentHistory] = useState<HistoryItem[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const suggestRef = useRef<HTMLDivElement | null>(null);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    async function fetchHistory() {
      if (!tokens?.access_token) return;
      setLoadingHistory(true);
      try {
        const data = await apiClient.get<{ data: HistoryItem[] }>(`/workspaces/${workspaceId}/search/history?limit=10`);
        setRecentHistory(data.data || []);
      } catch {
        // ignore
      } finally {
        setLoadingHistory(false);
      }
    }
    fetchHistory();
  }, [tokens, workspaceId]);

  const fetchSuggestions = useCallback(
    (q: string) => {
      if (!tokens?.access_token || q.trim().length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }
        apiClient.get<{ data: SuggestItem[] }>(`/workspaces/${workspaceId}/search/suggest?q=${encodeURIComponent(q)}`)
        .then((res) => {
          const items = res.data || [];
          setSuggestions(items);
          setShowSuggestions(items.length > 0);
        })
        .catch(() => setSuggestions([]));
    },
    [tokens, workspaceId]
  );

  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      fetchSuggestions(debouncedQuery);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [debouncedQuery, fetchSuggestions]);

  const activeFilters = useCallback(() => ({
    entityType: filters.entityType || undefined,
    tagIds: filters.tagIds.length > 0 ? filters.tagIds : undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    matchType: filters.matchType !== "all" ? filters.matchType : undefined,
    authorId: filters.authorId || undefined,
    relationType: filters.relationType || undefined,
    fileAttachment: filters.fileAttachment || undefined,
  }), [filters]);

  const handleSearch = useCallback(() => {
    if (!query.trim()) return;
    search(query, mode, undefined, activeFilters());
    setShowSuggestions(false);
    setSuggestions([]);
  }, [query, mode, search, activeFilters]);

  const handleSuggestionClick = useCallback(
    (text: string) => {
      setQuery(text);
      setShowSuggestions(false);
      search(text, mode, undefined, activeFilters());
    },
    [setQuery, search, mode, activeFilters]
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectResult = useCallback(
    (result: SearchResult) => {
      window.location.href = `/workspace/${workspaceId}/entity/${result.id}`;
    },
    [workspaceId]
  );

  const activeFilterCount = [filters.entityType, filters.authorId, filters.relationType, ...(filters.tagIds || [])].filter(Boolean).length
    + (filters.dateFrom || filters.dateTo ? 1 : 0)
    + (filters.fileAttachment ? 1 : 0);

  const hasDateFilter = filters.dateFrom || filters.dateTo;
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="p-6 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground display-heading">Search</h1>
        <p className="mt-1 text-step-3 text-muted">Find anything across your workspace</p>
      </div>

      {/* Search Input + Suggestions */}
      <div className="relative" ref={suggestRef}>
        <div className="mx-auto max-w-2xl">
          <SearchBar
            value={query}
            onChange={setQuery}
            onSearch={handleSearch}
            isLoading={isLoading}
            placeholder="Search entities, blocks, content..."
          />
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute left-1/2 top-full z-50 mt-2 w-full max-w-2xl -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
            <div className="border-b border-border px-4 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Suggestions</p>
            </div>
            {suggestions.map((s) => (
              <button
                key={s.entity_id}
                type="button"
                onClick={() => handleSuggestionClick(s.text)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-surface"
              >
                <Search className="h-3.5 w-3.5 shrink-0 text-muted" />
                <span className="truncate">{s.text}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Toolbar */}
      {query && (
        <div className="flex flex-wrap items-center gap-3">
          <SearchModeToggle mode={mode} onChange={(m) => { setMode(m); if (query) search(query, m, undefined, activeFilters()); }} workspaceId={workspaceId} />
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                showFilters || hasActiveFilters
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted hover:border-border hover:text-foreground"
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
              {hasActiveFilters && (
                <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-black">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <Popover>
              <PopoverTrigger asChild>
                <button className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                  hasDateFilter
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-muted hover:border-border hover:text-foreground"
                )}>
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {hasDateFilter ? `${filters.dateFrom || "..."} – ${filters.dateTo || "..."}` : "Date range"}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-0">
                <div className="p-4">
                  <p className="mb-2 text-xs font-medium text-muted">From</p>
                  <Calendar
                    selected={filters.dateFrom ? new Date(filters.dateFrom) : undefined}
                    onSelect={(date) => setFilters((f) => ({
                      ...f,
                      dateFrom: date ? date.toISOString().split("T")[0] : "",
                    }))}
                  />
                  <p className="mb-2 mt-4 text-xs font-medium text-muted">To</p>
                  <Calendar
                    selected={filters.dateTo ? new Date(filters.dateTo) : undefined}
                    onSelect={(date) => setFilters((f) => ({
                      ...f,
                      dateTo: date ? date.toISOString().split("T")[0] : "",
                    }))}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="-mt-4 flex flex-wrap items-center gap-2">
          {filters.entityType && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1 text-[11px] font-medium text-accent">
              <FileType className="h-3 w-3" />
              {filters.entityType}
              <button onClick={() => setFilters((f) => ({ ...f, entityType: "" }))} className="ml-0.5 rounded-full p-0.5 hover:bg-accent/20">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filters.authorId && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1 text-[11px] font-medium text-accent">
              <User className="h-3 w-3" />
              Author: {filters.authorId}
              <button onClick={() => setFilters((f) => ({ ...f, authorId: "" }))} className="ml-0.5 rounded-full p-0.5 hover:bg-accent/20">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {hasDateFilter && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1 text-[11px] font-medium text-accent">
              <CalendarIcon className="h-3 w-3" />
              {filters.dateFrom || "..."} – {filters.dateTo || "..."}
              <button onClick={() => setFilters((f) => ({ ...f, dateFrom: "", dateTo: "" }))} className="ml-0.5 rounded-full p-0.5 hover:bg-accent/20">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filters.tagIds.map((tagId) => (
            <span key={tagId} className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1 text-[11px] font-medium text-accent">
              <Tag className="h-3 w-3" />
              {tagId}
              <button onClick={() => setFilters((f) => ({ ...f, tagIds: f.tagIds.filter((t) => t !== tagId) }))} className="ml-0.5 rounded-full p-0.5 hover:bg-accent/20">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Filters panel */}
      {showFilters && (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground display-heading">Advanced Filters</h2>
            <button
              onClick={() => setShowFilters(false)}
              className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <SearchFiltersPanel
            filters={filters}
            onChange={setFilters}
            workspaceId={workspaceId}
          />
        </div>
      )}

      {/* Results area */}
      {isLoading && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Searching...
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton variant="circular" width={36} height={36} className="rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <Skeleton lines={2} />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted">
              <span className="font-semibold text-foreground">{results.length}</span> result{results.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="space-y-3">
            {results.map((result) => (
              <ResultCard key={result.id} result={result} query={query} onSelect={handleSelectResult} />
            ))}
          </div>
        </div>
      )}

      {/* No results */}
      {!isLoading && query && results.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
          <Search className="h-10 w-10 text-muted" />
          <p className="mt-4 text-base font-medium text-foreground">No results for &ldquo;{query}&rdquo;</p>
          <p className="mt-1 text-sm text-muted">Try adjusting your search terms or filters</p>
        </div>
      )}

      {/* Recent history */}
      {!isLoading && !query && !loadingHistory && recentHistory.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <History className="h-4 w-4 text-muted" />
            <h2 className="text-sm font-semibold text-foreground display-heading">Recent searches</h2>
          </div>
          <div className="space-y-1">
            {recentHistory.map((item) => (
              <button
                key={`${item.query}-${item.searched_at}`}
                onClick={() => {
                  setQuery(item.query);
                  search(item.query, mode, undefined, activeFilters());
                }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-surface"
              >
                <div className="flex items-center gap-3">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-muted" />
                  <span className="text-sm text-foreground">{item.query}</span>
                </div>
                <span className="text-[11px] text-muted">
                  {item.result_count} result{item.result_count !== 1 ? "s" : ""}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Initial state */}
      {!isLoading && !query && recentHistory.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5">
            <Sparkles className="h-8 w-8 text-accent" />
          </div>
          <p className="mt-5 text-base font-medium text-foreground">Search your workspace</p>
          <p className="mt-1 text-sm text-muted">Find entities, blocks, and content instantly</p>
          <div className="mt-6 flex items-center gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <kbd className="rounded-md border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-foreground">⌘K</kbd>
              Quick search
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="rounded-md border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-foreground">Esc</kbd>
              Clear
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="rounded-md border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-foreground">Enter</kbd>
              Search
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
