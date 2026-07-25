import { useEffect } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { routes } from './router'
import { useStore } from '@/store'
import { useIpc } from '@/hooks/useIpc'
import {
  startNotificationWorker,
  stopNotificationWorker,
  startSyncWorker,
  stopSyncWorker,
  startBackupWorker,
  stopBackupWorker,
  startEmbeddingWorker,
  stopEmbeddingWorker,
  startGraphWorker,
  stopGraphWorker,
  startCleanupWorker,
  stopCleanupWorker,
} from '@/workers'

const router = createBrowserRouter(routes)

export function App(): React.JSX.Element {
  const isAuthenticated = useStore((s) => s.isAuthenticated)
  const activeWorkspaceId = useStore((s) => s.activeWorkspaceId)
  useIpc()
  useEffect(() => {
    if (!isAuthenticated || !activeWorkspaceId) return

    startNotificationWorker({ workspaceId: activeWorkspaceId })
    startSyncWorker({ workspaceId: activeWorkspaceId })
    startBackupWorker({ workspaceId: activeWorkspaceId })
    startEmbeddingWorker({ workspaceId: activeWorkspaceId })
    startGraphWorker({ workspaceId: activeWorkspaceId })
    startCleanupWorker({ workspaceId: activeWorkspaceId })

    return () => {
      stopNotificationWorker()
      stopSyncWorker()
      stopBackupWorker()
      stopEmbeddingWorker()
      stopGraphWorker()
      stopCleanupWorker()
    }
  }, [isAuthenticated, activeWorkspaceId])

  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[9999] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">
        Skip to main content
      </a>
      <RouterProvider router={router} />
    </>
  )
}
