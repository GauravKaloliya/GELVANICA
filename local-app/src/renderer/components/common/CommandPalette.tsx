import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command } from 'cmdk'
import {
  LayoutDashboard,
  Globe,
  Search,
  Brain,
  GitBranch,
  Clock,
  Camera,
  Activity,
  Bell,
  FolderOpen,
  Tags,
  Shield,
  HardDrive,
  RefreshCw,
  Settings,
  Keyboard,
  Info,
  FileText,
  PanelLeftClose,
  PanelRightClose,
  Sun,
  Moon,
} from 'lucide-react'
import { ROUTES } from '@/router'
import { useStore } from '@/store'
import { useTheme } from '@/providers/ThemeProvider'
import { cn } from '@/lib/utils'

export default function CommandPalette() {
  const navigate = useNavigate()
  const open = useStore((s) => s.commandPaletteOpen)
  const toggle = useStore((s) => s.toggleCommandPalette)
  const toggleSidebar = useStore((s) => s.toggleSidebar)
  const toggleRightSidebar = useStore((s) => s.toggleRightSidebar)
  const { theme, setTheme } = useTheme()

  const run = useCallback(
    (action: () => void) => {
      action()
      toggle()
    },
    [toggle]
  )

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        toggle()
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [toggle])

  return (
    <Command.Dialog
      open={open}
      onOpenChange={toggle}
      label="Command palette"
      className={cn(
        'fixed inset-0 z-50 flex items-start justify-center pt-[15vh]',
        'bg-black/50'
      )}
    >
      <div
        className={cn(
          'w-full max-w-lg overflow-hidden rounded-xl border',
          'border-border bg-popover text-popover-foreground shadow-2xl'
        )}
      >
        <Command.Input
          placeholder="Type a command or search..."
          className={cn(
            'flex h-12 w-full items-center gap-2 border-b border-border',
            'bg-transparent px-4 text-sm outline-none',
            'placeholder:text-muted-foreground'
          )}
        />

        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
            No results found.
          </Command.Empty>

          <Command.Group heading="Navigation">
            <Command.Item
              onSelect={() => run(() => navigate(ROUTES.DASHBOARD))}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </Command.Item>
            <Command.Item
              onSelect={() => run(() => navigate(ROUTES.GRAPH))}
            >
              <Globe className="h-4 w-4" />
              <span>Graph View</span>
            </Command.Item>
            <Command.Item
              onSelect={() => run(() => navigate(ROUTES.SEARCH))}
            >
              <Search className="h-4 w-4" />
              <span>Search</span>
            </Command.Item>
            <Command.Item
              onSelect={() => run(() => navigate(ROUTES.AI))}
            >
              <Brain className="h-4 w-4" />
              <span>AI Assistant</span>
            </Command.Item>
            <Command.Item
              onSelect={() => run(() => navigate(ROUTES.BRANCHES))}
            >
              <GitBranch className="h-4 w-4" />
              <span>Branches</span>
            </Command.Item>
            <Command.Item
              onSelect={() => run(() => navigate(ROUTES.VERSIONS))}
            >
              <Clock className="h-4 w-4" />
              <span>Version History</span>
            </Command.Item>
            <Command.Item
              onSelect={() => run(() => navigate(ROUTES.SNAPSHOTS))}
            >
              <Camera className="h-4 w-4" />
              <span>Snapshots</span>
            </Command.Item>
            <Command.Item
              onSelect={() => run(() => navigate(ROUTES.ACTIVITY))}
            >
              <Activity className="h-4 w-4" />
              <span>Activity Log</span>
            </Command.Item>
            <Command.Item
              onSelect={() => run(() => navigate(ROUTES.NOTIFICATIONS))}
            >
              <Bell className="h-4 w-4" />
              <span>Notifications</span>
            </Command.Item>
            <Command.Item
              onSelect={() => run(() => navigate(ROUTES.FILES))}
            >
              <FolderOpen className="h-4 w-4" />
              <span>File Manager</span>
            </Command.Item>
            <Command.Item
              onSelect={() => run(() => navigate(ROUTES.TAGS))}
            >
              <Tags className="h-4 w-4" />
              <span>Tags</span>
            </Command.Item>
            <Command.Item
              onSelect={() => run(() => navigate(ROUTES.GOVERNANCE))}
            >
              <Shield className="h-4 w-4" />
              <span>Governance</span>
            </Command.Item>
            <Command.Item
              onSelect={() => run(() => navigate(ROUTES.BACKUP))}
            >
              <HardDrive className="h-4 w-4" />
              <span>Backup &amp; Restore</span>
            </Command.Item>
            <Command.Item
              onSelect={() => run(() => navigate(ROUTES.SYNC))}
            >
              <RefreshCw className="h-4 w-4" />
              <span>Sync Status</span>
            </Command.Item>
            <Command.Item
              onSelect={() => run(() => navigate(ROUTES.SETTINGS))}
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Command.Item>
            <Command.Item
              onSelect={() => run(() => navigate(ROUTES.WORKSPACE_SETTINGS))}
            >
              <Settings className="h-4 w-4" />
              <span>Workspace Settings</span>
            </Command.Item>
            <Command.Item
              onSelect={() => run(() => navigate(ROUTES.SHORTCUTS))}
            >
              <Keyboard className="h-4 w-4" />
              <span>Keyboard Shortcuts</span>
            </Command.Item>
            <Command.Item
              onSelect={() => run(() => navigate(ROUTES.ABOUT))}
            >
              <Info className="h-4 w-4" />
              <span>About</span>
            </Command.Item>
          </Command.Group>

          <Command.Group heading="Entities">
            <Command.Item
              onSelect={() =>
                run(() => {
                  window.dispatchEvent(
                    new CustomEvent('entity:create')
                  )
                })
              }
            >
              <FileText className="h-4 w-4" />
              <span>Create New Entity</span>
            </Command.Item>
          </Command.Group>

          <Command.Group heading="Actions">
            <Command.Item
              onSelect={() => run(toggleSidebar)}
            >
              <PanelLeftClose className="h-4 w-4" />
              <span>Toggle Sidebar</span>
            </Command.Item>
            <Command.Item
              onSelect={() => run(toggleRightSidebar)}
            >
              <PanelRightClose className="h-4 w-4" />
              <span>Toggle Right Panel</span>
            </Command.Item>
            <Command.Item
              onSelect={() =>
                run(() =>
                  setTheme(theme === 'dark' ? 'light' : 'dark')
                )
              }
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
              <span>Toggle Theme</span>
            </Command.Item>
          </Command.Group>
        </Command.List>

        <div
          className={cn(
            'flex items-center gap-4 border-t border-border px-4 py-2',
            'text-[11px] text-muted-foreground'
          )}
        >
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-muted px-1 font-mono">↑↓</kbd>
            <span>navigate</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-muted px-1 font-mono">↵</kbd>
            <span>open</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-muted px-1 font-mono">esc</kbd>
            <span>close</span>
          </span>
        </div>
      </div>
    </Command.Dialog>
  )
}
