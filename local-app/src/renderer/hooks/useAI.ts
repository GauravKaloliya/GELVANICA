import { useMutation } from '@tanstack/react-query'
import { api } from '@lib/api'
import { useStore } from '../store'

export function useAI() {
  const aiSettings = useStore((s) => s.settings.ai)
  const isAutoSuggest = aiSettings.auto_suggest
  const confidenceThreshold = aiSettings.confidence_threshold

  const queryMutation = useMutation({
    mutationFn: (data: { workspace_id: string; question: string; limit?: number }) =>
      api.ai.query(data),
  })

  const suggestRelationsMutation = useMutation({
    mutationFn: (data: { entity_id: string; workspace_id: string; limit?: number }) =>
      api.ai.suggestRelations(data),
  })

  const summarizeMutation = useMutation({
    mutationFn: (data: { workspace_id: string; entity_id?: string; max_length?: number }) =>
      api.ai.summarize(data),
  })

  return {
    isAutoSuggest,
    confidenceThreshold,
    query: queryMutation.mutate,
    queryResult: queryMutation.data,
    isQuerying: queryMutation.isPending,
    queryError: queryMutation.error,

    suggestRelations: suggestRelationsMutation.mutate,
    suggestionsResult: suggestRelationsMutation.data,
    isSuggesting: suggestRelationsMutation.isPending,
    suggestionsError: suggestRelationsMutation.error,

    summarize: summarizeMutation.mutate,
    summaryResult: summarizeMutation.data,
    isSummarizing: summarizeMutation.isPending,
    summaryError: summarizeMutation.error,
  }
}
