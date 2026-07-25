import { useEffect, type ReactNode } from 'react'
import { type UseMutationResult } from '@tanstack/react-query'
import { toast } from '@/components/common/Toast'

interface MutationToastProps<TData, TError, TVariables> {
  mutation: UseMutationResult<TData, TError, TVariables>
  messages: {
    loading?: string
    success?: string | ((data: TData) => string)
    error?: string | ((error: TError) => string)
  }
  children?: ReactNode
}

export function MutationToast<TData, TError, TVariables>({
  mutation,
  messages,
  children,
}: MutationToastProps<TData, TError, TVariables>) {
  useEffect(() => {
    if (mutation.isPending && messages.loading) {
      toast.info(messages.loading)
    }
  }, [mutation.isPending, messages.loading])

  useEffect(() => {
    if (mutation.isSuccess && messages.success) {
      const msg = typeof messages.success === 'function'
        ? messages.success(mutation.data)
        : messages.success
      toast.success(msg)
    }
  }, [mutation.isSuccess, mutation.data, messages])

  useEffect(() => {
    if (mutation.isError && messages.error) {
      const msg = typeof messages.error === 'function'
        ? messages.error(mutation.error)
        : messages.error
      toast.error(msg)
    }
  }, [mutation.isError, mutation.error, messages])

  return <>{children}</>
}


