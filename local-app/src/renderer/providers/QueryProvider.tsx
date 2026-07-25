import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query'
import { type ReactNode, useState } from 'react'
import { rendererLogger } from '@lib/logger'

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: 2,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
      mutations: {
        retry: 1,
      },
    },
    mutationCache: new MutationCache({
      onError: (error) => {
        rendererLogger.error('Mutation error:', error instanceof Error ? error.message : String(error))
      },
    }),
  })
}

function defaultErrorHandler(error: Error): void {
  const message = error.message || 'An unknown error occurred'
  rendererLogger.error('Query', message)

  if (window.gnovium) {
    window.gnovium.notifications.show('Request Failed', message)
  }
}

export interface QueryProviderProps {
  children: ReactNode
}

export function QueryProvider({ children }: QueryProviderProps): ReactNode {
  const [client] = useState(() => {
    const qc = createQueryClient()
    qc.getQueryCache().config.onError = (error, _query) => {
      defaultErrorHandler(error as Error)
    }
    return qc
  })

  return (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}
