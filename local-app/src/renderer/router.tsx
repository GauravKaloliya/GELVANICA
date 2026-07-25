import { type RouteObject } from 'react-router-dom'
import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { AuthGuard } from '@/components/layout/AuthGuard'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export const ROUTES = {
  SPLASH: '/',
  WORKSPACES: '/workspaces',
  DASHBOARD: '/dashboard',
  ENTITY: '/entity/:id',
  GRAPH: '/graph',
  SEARCH: '/search',
  AI: '/ai',
  BRANCHES: '/branches',
  VERSIONS: '/versions',
  DIFF: '/diff/:id',
  SNAPSHOTS: '/snapshots',
  ACTIVITY: '/activity',
  NOTIFICATIONS: '/notifications',
  FILES: '/files',
  GOVERNANCE: '/governance',
  SETTINGS: '/settings',
  WORKSPACE_SETTINGS: '/workspace-settings',
  BACKUP: '/backup',
  SYNC: '/sync',
  TAGS: '/tags',
  SHORTCUTS: '/shortcuts',
  ABOUT: '/about',
  DIAGNOSTICS: '/diagnostics',
  PERFORMANCE: '/performance',
  PRIVACY: '/privacy',
  MONITORING: '/monitoring',
} as const

function lazyLoad(
  factory: () => Promise<{ default: ComponentType }>
): { lazy: ComponentType; loader: () => Promise<{ default: ComponentType }> } {
  const component = lazy(factory)
  return { lazy: component, loader: factory }
}

const splash = lazyLoad(() => import('@pages/SplashScreen'))
const workspacePicker = lazyLoad(() => import('@pages/WorkspacePicker'))
const workspaceLayout = lazyLoad(() => import('@pages/workspace/WorkspaceLayout'))
const dashboard = lazyLoad(() => import('@pages/workspace/Dashboard'))
const entityPage = lazyLoad(() => import('@pages/workspace/EntityPage'))
const graphView = lazyLoad(() => import('@pages/GraphView'))
const searchPage = lazyLoad(() => import('@pages/SearchPage'))
const aiAssistant = lazyLoad(() => import('@pages/AIAssistant'))
const branchesPage = lazyLoad(() => import('@pages/BranchesPage'))
const versionHistory = lazyLoad(() => import('@pages/VersionHistory'))
const diffViewer = lazyLoad(() => import('@pages/DiffViewer'))
const snapshotsPage = lazyLoad(() => import('@pages/SnapshotsPage'))
const activityLog = lazyLoad(() => import('@pages/ActivityLog'))
const notificationsCenter = lazyLoad(
  () => import('@pages/NotificationsCenter')
)
const fileManager = lazyLoad(() => import('@pages/FileManager'))
const governancePage = lazyLoad(() => import('@pages/GovernancePage'))
const settings = lazyLoad(() => import('@pages/Settings'))
const workspaceSettings = lazyLoad(() => import('@pages/WorkspaceSettings'))
const backupRestore = lazyLoad(() => import('@pages/BackupRestore'))
const syncStatus = lazyLoad(() => import('@pages/SyncStatus'))
const shortcutsReference = lazyLoad(() => import('@pages/ShortcutsReference'))
const aboutDiagnostics = lazyLoad(() => import('@pages/AboutDiagnostics'))
const tagsPage = lazyLoad(() => import('@pages/TagsPage'))
const errorRecovery = lazyLoad(() => import('@pages/ErrorRecovery'))
const diagnosticsPage = lazyLoad(() => import('@pages/DiagnosticsPage').then((m) => ({ default: m.DiagnosticsPage })))
const performancePage = lazyLoad(() => import('@pages/PerformancePage'))
const privacyPage = lazyLoad(() => import('@pages/PrivacyPage'))
const monitoringPage = lazyLoad(() => import('@pages/MonitoringPage'))

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    void import('@pages/workspace/Dashboard')
    void import('@pages/workspace/EntityPage')
  }, { once: true })
}

function Page({ module }: { module: ReturnType<typeof lazyLoad> }): ReactNode {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="flex h-full w-full items-center justify-center bg-background">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        }
      >
        <module.lazy />
      </Suspense>
    </ErrorBoundary>
  )
}

export const routes: RouteObject[] = [
  { path: ROUTES.SPLASH, element: <Page module={splash} /> },
  { path: ROUTES.WORKSPACES, element: <Page module={workspacePicker} /> },
  {
    path: '/',
    element: (
      <AuthGuard>
        <Page module={workspaceLayout} />
      </AuthGuard>
    ),
    children: [
      { path: ROUTES.DASHBOARD, element: <Page module={dashboard} /> },
      { path: ROUTES.ENTITY, element: <Page module={entityPage} /> },
      { path: ROUTES.GRAPH, element: <Page module={graphView} /> },
      { path: ROUTES.SEARCH, element: <Page module={searchPage} /> },
      { path: ROUTES.AI, element: <Page module={aiAssistant} /> },
      { path: ROUTES.BRANCHES, element: <Page module={branchesPage} /> },
      { path: ROUTES.VERSIONS, element: <Page module={versionHistory} /> },
      { path: ROUTES.DIFF, element: <Page module={diffViewer} /> },
      { path: ROUTES.SNAPSHOTS, element: <Page module={snapshotsPage} /> },
      { path: ROUTES.ACTIVITY, element: <Page module={activityLog} /> },
      {
        path: ROUTES.NOTIFICATIONS,
        element: <Page module={notificationsCenter} />,
      },
      { path: ROUTES.FILES, element: <Page module={fileManager} /> },
      { path: ROUTES.TAGS, element: <Page module={tagsPage} /> },
      { path: ROUTES.GOVERNANCE, element: <Page module={governancePage} /> },
      { path: ROUTES.SETTINGS, element: <Page module={settings} /> },
      { path: ROUTES.WORKSPACE_SETTINGS, element: <Page module={workspaceSettings} /> },
      { path: ROUTES.BACKUP, element: <Page module={backupRestore} /> },
      { path: ROUTES.SYNC, element: <Page module={syncStatus} /> },
      { path: ROUTES.SHORTCUTS, element: <Page module={shortcutsReference} /> },
      { path: ROUTES.ABOUT, element: <Page module={aboutDiagnostics} /> },
      { path: ROUTES.DIAGNOSTICS, element: <Page module={diagnosticsPage} /> },
      { path: ROUTES.PERFORMANCE, element: <Page module={performancePage} /> },
      { path: ROUTES.PRIVACY, element: <Page module={privacyPage} /> },
      { path: ROUTES.MONITORING, element: <Page module={monitoringPage} /> },
    ],
  },
  { path: '*', element: <Page module={errorRecovery} /> },
]
