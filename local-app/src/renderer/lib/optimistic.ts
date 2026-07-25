import type { QueryClient } from '@tanstack/react-query'

export function createOptimisticMutation<TData, TVariables>(opts: {
  queryClient: QueryClient
  queryKey: unknown[]
  mutationFn: (v: TVariables) => Promise<TData>
  optimisticUpdate: (old: unknown, v: TVariables) => unknown
}) {
  return {
    mutationFn: opts.mutationFn,
    onMutate: async (variables: TVariables) => {
      await opts.queryClient.cancelQueries({ queryKey: opts.queryKey })
      const previousData = opts.queryClient.getQueryData(opts.queryKey)
      opts.queryClient.setQueryData(opts.queryKey, (old: unknown) => opts.optimisticUpdate(old, variables))
      return { previousData }
    },
    onError: (_err: unknown, _vars: TVariables, context: { previousData: unknown } | undefined) => {
      if (context?.previousData) opts.queryClient.setQueryData(opts.queryKey, context.previousData)
    },
    onSettled: () => { void opts.queryClient.invalidateQueries({ queryKey: opts.queryKey }) },
  }
}
