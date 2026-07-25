import { useMutation } from '@tanstack/react-query'
import { api } from '@lib/api'
import type { DiffCompareRequest } from '@shared/types'

export function useCompareDiffs() {
  return useMutation({
    mutationFn: (data: DiffCompareRequest) => api.diffs.compare(data),
  })
}
