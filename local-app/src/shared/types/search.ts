export interface SearchSuggestItem {
  text: string
  entity_id: string
  type: 'entity' | 'block' | 'tag'
  score: number
}

export interface SearchHistoryItem {
  query: string
  searched_at: string
  result_count: number
}

export interface AISummaryResponse {
  summary: string
  entity_id?: string
  word_count: number
}

export type SearchMode = 'keyword' | 'full_text' | 'hybrid' | 'semantic'

export interface SearchQuery {
  workspace_id: string
  q: string
  mode?: SearchMode
  limit?: number
  offset?: number
  entity_type_id?: string
  relation_type?: string
  tag_ids?: string[]
  date_from?: string
  date_to?: string
}

export interface SearchResult {
  id: string
  entity_id: string
  block_id: string | null
  title: string
  content: string
  match_type: 'block' | 'page'
  score: number
  snippet?: string
  tags?: Array<{ id: string; name: string; color?: string }>
}

export interface AIQueryRequest {
  workspace_id: string
  question: string
  limit?: number
}

export interface AIQueryResponse {
  answer: string
  sources: Array<{
    title: string
    content: string
  }>
}

export interface RelationSuggestion {
  entity_id: string
  title: string
  icon?: string
  score: number
  reasons: string[]
}

export interface RelationSuggestionsResponse {
  entity_id: string
  suggestions: RelationSuggestion[]
  total_candidates: number
}
