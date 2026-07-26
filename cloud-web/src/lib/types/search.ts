export type SearchResultEntity = {
  type: 'entity'; id: string; name: string; summary: string; score: number;
};

export type SearchResultBlock = {
  type: 'block'; id: string; entity_id: string; entity_name: string;
  content_preview: string; score: number;
};

export type SearchResult = SearchResultEntity | SearchResultBlock;

export type SearchMode = "keyword" | "full_text" | "hybrid" | "semantic";

export interface SearchDocument {
  id: string;
  workspace_id: string;
  entity_id: string;
  block_id: string | null;
  title: string | null;
  content: string | null;
  content_hash: string;
  search_vector: unknown;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}
