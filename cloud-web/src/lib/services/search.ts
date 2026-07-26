import { apiClient } from "../apiClient";
import type { SearchResult, SearchMode } from "../types";

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

export const searchService = {
  search: ({ workspaceId, query, mode = "hybrid", limit = 20, filters }: SearchParams) => {
    const params = new URLSearchParams({
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

    return apiClient.get<SearchResponse>(`/workspaces/${workspaceId}/search?${params}`);
  },

  rebuildIndex: (workspaceId: string) =>
    apiClient.post<{ data: { success: boolean } }>(`/workspaces/${workspaceId}/search/rebuild-index`),

  getHistory: (workspaceId: string, limit = 20) =>
    apiClient.get<{ data: Array<{ id: string; query: string; created_at: string }> }>(
      `/workspaces/${workspaceId}/search/history?limit=${limit}`
    ),

  suggest: (workspaceId: string, query: string) =>
    apiClient.get<{ data: string[] }>(
      `/workspaces/${workspaceId}/search/suggest?q=${encodeURIComponent(query)}`
    ),

  highlightText: (text: string, query: string): string => {
    if (!query.trim()) return text;
    const words = query.split(/\s+/).filter(Boolean);
    const pattern = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    return text.replace(new RegExp(`(${pattern})`, "gi"), '<mark class="bg-yellow-500/30 text-yellow-200 rounded px-0.5">$1</mark>');
  },
};
