import type { ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useSession } from '@/hooks/useSession'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

export function AppProviders({ children }: { children: ReactNode }) {
  useAuth()
  useSession()
  useKeyboardShortcuts()

  return <>{children}</>
}
