import { post } from './client'
import type {
  AIQueryRequest,
  AIQueryResponse,
  AISummaryResponse,
  RelationSuggestionsResponse,
} from '@shared/types'

export const aiApi = {
  query: (data: AIQueryRequest) => post<AIQueryResponse>('/ai/query', data),
  suggestRelations: (data: { entity_id: string; workspace_id: string; limit?: number; confidence_threshold?: number }) =>
    post<RelationSuggestionsResponse>('/ai/suggest-relations', data),
  summarize: (data: { workspace_id: string; entity_id?: string; max_length?: number }) =>
    post<AISummaryResponse>('/ai/summarize', data),
}
