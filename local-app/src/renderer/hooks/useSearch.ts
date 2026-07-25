import { useQuery } from '@tanstack/react-query'
import { api } from '@lib/api'
import type { SearchQuery } from '@shared/types'

const QUERY_KEY = 'search'

export function useSearch(params: SearchQuery) {
  return useQuery({
    queryKey: [QUERY_KEY, 'query', params],
    queryFn: () => api.search.query(params),
    enabled: !!params.q && !!params.workspace_id,
  })
}
