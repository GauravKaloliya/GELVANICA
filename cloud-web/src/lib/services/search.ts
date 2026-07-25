import { API_BASE } from "@/lib/config/constants";
import type { SearchResult, SearchMode } from "@/lib/types";

export interface SearchFilters {
  entityType?: string;
  tagIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  matchType?: string;
  authorId?: string;
  relationType?: string;
  fileAttachment?: boolean;
}

interface SearchParams {
  workspaceId: string;
  query: string;
  mode?: SearchMode;
  limit?: number;
  filters?: SearchFilters;
}

interface SearchResponse {
  data: SearchResult[];
}

async function searchApi<T>(endpoint: string, token: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: "Search failed" } }));
    throw new Error(error.error?.message || `HTTP ${res.status}`);
  }

  return res.json();
}

export const searchService = {
  search: async (
    token: string,
    { workspaceId, query, mode = "hybrid", limit = 20, filters }: SearchParams
  ): Promise<SearchResult[]> => {
    const params = new URLSearchParams({
      workspace_id: workspaceId,
      q: query,
      mode,
      limit: String(limit),
    });

    if (filters?.entityType) params.set("entity_type", filters.entityType);
    if (filters?.tagIds && filters.tagIds.length > 0) params.set("tag_ids", filters.tagIds.join(","));
    if (filters?.dateFrom) params.set("date_from", filters.dateFrom);
    if (filters?.dateTo) params.set("date_to", filters.dateTo);
    if (filters?.matchType && filters.matchType !== "all") params.set("match_type", filters.matchType);
    if (filters?.authorId) params.set("author_id", filters.authorId);
    if (filters?.relationType) params.set("relation_type", filters.relationType);
    if (filters?.fileAttachment !== undefined) params.set("file_attachment", String(filters.fileAttachment));

    const res = await searchApi<SearchResponse>(`/search/?${params}`, token);
    return res.data;
  },

  highlightText: (text: string, query: string): string => {
    if (!query.trim()) return text;
    const words = query.split(/\s+/).filter(Boolean);
    const pattern = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    return text.replace(new RegExp(`(${pattern})`, "gi"), '<mark class="bg-yellow-500/30 text-yellow-200 rounded px-0.5">$1</mark>');
  },

  getHistory: async (token: string, workspaceId: string, limit = 20) => {
    const res = await searchApi<{ data: Array<{ id: string; query: string; created_at: string }> }>(
      `/search/history?workspace_id=${workspaceId}&limit=${limit}`,
      token
    );
    return res.data;
  },

  suggest: async (token: string, workspaceId: string, query: string) => {
    const res = await searchApi<{ data: string[] }>(
      `/search/suggest?workspace_id=${workspaceId}&q=${encodeURIComponent(query)}`,
      token
    );
    return res.data;
  },
};
