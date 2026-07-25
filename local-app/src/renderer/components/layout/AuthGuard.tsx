import { Navigate, useLocation } from 'react-router-dom'
import { useStore } from '@/store'
import { ROUTES } from '@/router'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useStore((s) => s.isAuthenticated)
  const isLoading = useStore((s) => s.isLoading)
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.WORKSPACES} state={{ from: location }} replace />
  }

  return <>{children}</>
}
