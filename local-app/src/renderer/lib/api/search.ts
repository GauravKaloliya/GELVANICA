import { get } from './client'
import type {
  SearchQuery,
  SearchResult,
  SearchSuggestItem,
  SearchHistoryItem,
} from '@shared/types'

export const searchApi = {
  query: (params: SearchQuery) =>
    get<SearchResult[]>('/search/', { params }),
  suggest: (params: { workspace_id: string; q: string; limit?: number }) =>
    get<SearchSuggestItem[]>('/search/suggest', { params }),
  history: (params: { workspace_id: string; limit?: number }) =>
    get<SearchHistoryItem[]>('/search/history', { params }),
}
