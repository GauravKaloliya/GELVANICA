"use client";

import { useState, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { searchService, type SearchFilters } from "@/lib/services/search";
import type { SearchResult, SearchMode } from "@/lib/types";

export function useSearch(workspaceId: string) {
  const { tokens } = useAuthStore();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("hybrid");

  const search = useCallback(
    async (searchQuery: string, searchMode?: SearchMode, limit?: number, filters?: SearchFilters) => {
      if (!tokens?.access_token || !searchQuery.trim()) {
        setResults([]);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const res = await searchService.search({
          workspaceId,
          query: searchQuery,
          mode: searchMode || mode,
          limit,
          filters,
        });
        setResults(res.data);
      } catch (e) {
        setError((e as Error).message);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [tokens, workspaceId, mode]
  );

  const clearSearch = useCallback(() => {
    setResults([]);
    setQuery("");
    setError(null);
  }, []);

  return {
    results,
    isLoading,
    error,
    query,
    setQuery,
    mode,
    setMode,
    search,
    clearSearch,
  };
}
