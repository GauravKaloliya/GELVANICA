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
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/Popover";
import { Calendar } from "@/components/ui/Calendar";
import { SearchBar } from "@/components/search/SearchBar";
import { SearchResults } from "@/components/search/SearchResults";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Search,
  Sparkles,
  Clock,
  CalendarIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

interface HistoryItem {
  query: string;
  searched_at: string;
  result_count: number;
}

interface SuggestItem {
  text: string;
  entity_id: string;
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
        const data = await apiClient.get<{ data: HistoryItem[] }>(`/search/history?workspace_id=${workspaceId}&limit=10`);
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
        apiClient.get<{ data: SuggestItem[] }>(`/search/suggest?workspace_id=${workspaceId}&q=${encodeURIComponent(q)}`)
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
    (result: { entity_id: string }) => {
      window.location.href = `/workspace/${workspaceId}/entity/${result.entity_id}`;
    },
    [workspaceId]
  );

  return (
    <div className="mx-auto max-w-3xl p-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-white">Search</h1>
        <p className="mt-1 text-sm text-zinc-500">Find anything across your workspace</p>
      </div>

      {/* Search Input + Suggestions */}
      <div className="relative mb-6" ref={suggestRef}>
        <SearchBar
          value={query}
          onChange={setQuery}
          onSearch={handleSearch}
          isLoading={isLoading}
          placeholder="Search entities, blocks, content..."
        />

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl">
            {suggestions.map((s) => (
              <button
                key={s.entity_id}
                type="button"
                onClick={() => handleSuggestionClick(s.text)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                <Search className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
                <span className="truncate">{s.text}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search Modes */}
      <div className="mb-6 flex items-center gap-2">
        <span className="text-xs text-zinc-600">Mode:</span>
        <SearchModeToggle mode={mode} onChange={(m) => { setMode(m); if (query) search(query, m, undefined, activeFilters()); }} />
        <div className="ml-auto flex items-center gap-2">
          <SearchFiltersPanel
            filters={filters}
            onChange={setFilters}
          />
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white">
                <CalendarIcon className="h-3.5 w-3.5" />
                Date
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-0">
              <div className="p-3">
                <p className="mb-2 text-xs font-medium text-zinc-400">From</p>
                <Calendar
                  selected={filters.dateFrom ? new Date(filters.dateFrom) : undefined}
                  onSelect={(date) => setFilters((f) => ({
                    ...f,
                    dateFrom: date ? date.toISOString().split("T")[0] : "",
                  }))}
                />
                <p className="mb-2 mt-3 text-xs font-medium text-zinc-400">To</p>
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

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3 py-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 space-y-2">
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
      )}

      {/* Results */}
      {!isLoading && results.length > 0 && (
        <SearchResults
          results={results}
          query={query}
          onSelectResult={handleSelectResult}
        />
      )}

      {/* Empty State */}
      {!isLoading && query && results.length === 0 && (
        <EmptyState
          icon={Search}
          title={`No results for "${query}"`}
          description="Try adjusting your search terms or filters"
        />
      )}

      {/* Recent Search History */}
      {!isLoading && !query && !loadingHistory && recentHistory.length > 0 && (
        <div>
          <p className="mb-3 flex items-center gap-1.5 text-xs text-zinc-600">
            <Clock className="h-3 w-3" /> Recent searches
          </p>
          <div className="space-y-1.5">
            {recentHistory.map((item) => (
              <button
                key={`${item.query}-${item.searched_at}`}
                onClick={() => {
                  setQuery(item.query);
                  search(item.query, mode, undefined, activeFilters());
                }}
                className="flex w-full items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-left transition-colors hover:border-zinc-700"
              >
                <span className="text-xs text-zinc-400">{item.query}</span>
                <span className="text-[10px] text-zinc-600">
                  {item.result_count} result{item.result_count !== 1 ? "s" : ""}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Initial State */}
      {!isLoading && !query && recentHistory.length === 0 && (
        <div className="py-12 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-zinc-700" />
          <p className="mt-3 text-sm text-zinc-500">Start typing to search</p>
          <div className="mt-4 flex justify-center gap-4 text-xs text-zinc-600">
            <span>
              <kbd className="rounded border border-zinc-700 px-1.5 py-0.5">⌘K</kbd> Quick search
            </span>
            <span>
              <kbd className="rounded border border-zinc-700 px-1.5 py-0.5">Esc</kbd> Clear
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
