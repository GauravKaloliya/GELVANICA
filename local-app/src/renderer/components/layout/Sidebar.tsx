import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useIsMobile } from '@/hooks/useMediaQuery'
import {
  LayoutDashboard,
  Search,
  Bot,
  Activity,
  Bell,
  FolderOpen,
  Shield,
  Settings,
  HardDrive,
  RefreshCw,
  Keyboard,
  Info,
  PanelLeftClose,
  PanelLeftOpen,
  Globe,
  Zap,
  GitBranch,
  Clock,
  Camera,
  Plus,
  Tags,
  ChevronsUpDown,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/store'
import { ROUTES } from '@/router'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { useWorkspaceStats, useWorkspaces } from '@/hooks/useWorkspace'
import { EntityCreateModal } from '@/components/modals/EntityCreateModal'
import { EntityTree } from '@/components/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface NavItem {
  label: string
  path: string
  icon: React.ComponentType<{ className?: string }>
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: '',
    items: [
      { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: LayoutDashboard },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { label: 'Graph View', path: ROUTES.GRAPH, icon: Globe },
      { label: 'Search', path: ROUTES.SEARCH, icon: Search },
      { label: 'AI Assistant', path: ROUTES.AI, icon: Bot },
    ],
  },
  {
    label: 'Versioning',
    items: [
      { label: 'Branches', path: ROUTES.BRANCHES, icon: GitBranch },
      { label: 'Version History', path: ROUTES.VERSIONS, icon: Clock },
      { label: 'Snapshots', path: ROUTES.SNAPSHOTS, icon: Camera },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Activity', path: ROUTES.ACTIVITY, icon: Activity },
      { label: 'Notifications', path: ROUTES.NOTIFICATIONS, icon: Bell },
      { label: 'Files', path: ROUTES.FILES, icon: FolderOpen },
      { label: 'Tags', path: ROUTES.TAGS, icon: Tags },
      { label: 'Governance', path: ROUTES.GOVERNANCE, icon: Shield },
      { label: 'Backup & Restore', path: ROUTES.BACKUP, icon: HardDrive },
      { label: 'Sync Status', path: ROUTES.SYNC, icon: RefreshCw },
    ],
  },
  {
    label: '',
    items: [
      { label: 'Workspace Settings', path: ROUTES.WORKSPACE_SETTINGS, icon: Settings },
      { label: 'Settings', path: ROUTES.SETTINGS, icon: Settings },
      { label: 'Shortcuts', path: ROUTES.SHORTCUTS, icon: Keyboard },
      { label: 'About', path: ROUTES.ABOUT, icon: Info },
    ],
  },
]

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { sidebarOpen, toggleSidebar, activeWorkspaceId } = useStore()
  const workspaces = useStore((s) => s.workspaces)
  const setActiveWorkspace = useStore((s) => s.setActiveWorkspace)
  const { canAdmin } = usePermissions()
  const { user } = useAuth()
  const [showCreateEntity, setShowCreateEntity] = useState(false)
  const { data: stats } = useWorkspaceStats(activeWorkspaceId ?? undefined)
  const isMobile = useIsMobile()
  useWorkspaces()

  useEffect(() => {
    if (isMobile && sidebarOpen) {
      toggleSidebar()
    }
  }, [isMobile, sidebarOpen, toggleSidebar])

  const isActive = (path: string) => {
    if (path === ROUTES.DASHBOARD) return location.pathname === path
    return location.pathname.startsWith(path)
  }

  const filteredGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) =>
        canAdmin ||
        (item.path !== ROUTES.SETTINGS &&
          item.path !== ROUTES.WORKSPACE_SETTINGS &&
          item.path !== ROUTES.GOVERNANCE)
    ),
  }))

  return (
    <>
    <aside
      className={cn(
        'sidebar h-full flex flex-col',
        'border-r border-sidebar-border bg-sidebar-background',
        'transition-all duration-200 ease-in-out',
        !sidebarOpen && 'collapsed'
      )}
    >
      {/* Header */}
      <div className="flex h-10 items-center justify-between border-b border-sidebar-border px-3">
        {sidebarOpen && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 overflow-hidden rounded-md px-1.5 py-1 hover:bg-sidebar-accent transition-colors flex-1 min-w-0" aria-label="Switch workspace">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="truncate text-sm font-semibold text-sidebar-foreground">
                  {workspaces.find((w) => w.id === activeWorkspaceId)?.name ?? 'GNOVIUM'}
                </span>
                <ChevronsUpDown className="h-3 w-3 shrink-0 text-sidebar-foreground/40" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {workspaces.map((ws) => (
                <DropdownMenuItem
                  key={ws.id}
                  onClick={() => {
                    setActiveWorkspace(ws.id)
                    navigate(ROUTES.DASHBOARD)
                  }}
                  className="flex items-center gap-2"
                >
                  <Check className={cn('h-3.5 w-3.5', ws.id === activeWorkspaceId ? 'opacity-100' : 'opacity-0')} />
                  <span className="truncate">{ws.name}</span>
                </DropdownMenuItem>
              ))}
              {workspaces.length > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={() => navigate(ROUTES.WORKSPACES)}
                className="flex items-center gap-2"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create / Switch Workspace</span>
              </DropdownMenuItem>
              {activeWorkspaceId && (
                <DropdownMenuItem
                  onClick={() => navigate(ROUTES.WORKSPACE_SETTINGS)}
                  className="flex items-center gap-2"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>Workspace Settings</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
          <button
            onClick={toggleSidebar}
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
              'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground',
              'transition-colors duration-150',
              !sidebarOpen && 'mx-auto'
            )}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-expanded={sidebarOpen}
          >
          {sidebarOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </button>
      </div>

      {sidebarOpen && stats && (
        <div className="flex items-center gap-3 border-b border-sidebar-border px-3 py-1.5 text-[10px] text-sidebar-foreground/50">
          <span>{stats.entity_count ?? 0} entities</span>
          <span>{stats.block_count ?? 0} blocks</span>
          <span>{stats.relation_count ?? 0} relations</span>
        </div>
      )}

      {/* Quick Search */}
      {sidebarOpen && (
        <div className="px-3 py-2">
          <button
            onClick={() => navigate(ROUTES.SEARCH)}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5',
              'text-sm text-sidebar-foreground/50',
              'bg-sidebar-accent/50 hover:bg-sidebar-accent hover:text-sidebar-foreground',
              'border border-transparent hover:border-sidebar-border',
              'transition-all duration-150'
            )}
            aria-label="Quick search"
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span>Quick search...</span>
            <kbd className="ml-auto rounded border border-sidebar-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </button>
        </div>
      )}

      {/* New Entity */}
      {sidebarOpen && (
        <div className="px-3 pb-2">
          <button
            onClick={() => setShowCreateEntity(true)}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5',
              'text-sm font-medium text-sidebar-foreground/70',
              'bg-primary/10 hover:bg-primary/20 hover:text-sidebar-foreground',
              'border border-transparent hover:border-primary/20',
              'transition-all duration-150'
            )}
            aria-label="Create new entity"
          >
            <Plus className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span>New Entity</span>
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-1">
        {filteredGroups.map((group, gi) => (
          <div key={gi} className={cn(gi > 0 && 'mt-3')}>
            {group.label && sidebarOpen && (
              <div className="mb-1 px-3 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/40">
                {group.label}
              </div>
            )}
            {group.label && !sidebarOpen && gi > 0 && (
              <div className="my-2 mx-auto h-px w-5 bg-sidebar-border" />
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const active = isActive(item.path)
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={cn(
                      'sidebar-item w-full',
                      active && 'active'
                    )}
                    title={!sidebarOpen ? item.label : undefined}
                    aria-label={item.label}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0',
                        active
                          ? 'text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground/60'
                      )}
                    />
                    {sidebarOpen && (
                      <span className="truncate">{item.label}</span>
                    )}
                    {sidebarOpen && active && (
                      <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Entity Tree */}
      <EntityTree />

      {/* Footer — User Profile */}
      <div className="border-t border-sidebar-border p-2">
        {sidebarOpen ? (
          <button
            onClick={() => navigate(ROUTES.SETTINGS)}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-md px-3 py-2',
              'text-sm text-sidebar-foreground/70',
              'hover:bg-sidebar-accent hover:text-sidebar-foreground',
              'transition-colors duration-150'
            )}
            aria-label="User profile settings"
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 overflow-hidden">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-medium text-primary">
                  {(user?.name ?? 'U').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <span className="truncate">{user?.name ?? 'Guest'}</span>
          </button>
        ) : (
          <div className="flex justify-center">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 overflow-hidden">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-medium text-primary">
                  {(user?.name ?? 'U').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
    <EntityCreateModal open={showCreateEntity} onClose={() => setShowCreateEntity(false)} />
    </>
  )
}
