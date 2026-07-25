import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Minus,
  Square,
  X,
  Maximize2,
  Search,
  Bot,
  Bell,
  GitBranch,
  ChevronDown,
  LogOut,
  Settings,
  Command,
} from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useStore } from '@/store'
import { useBranches } from '@/hooks/useBranches'
import { useNotifications } from '@/hooks/useNotifications'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useAuth } from '@/hooks/useAuth'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import logoImg from '../../../../resources/icon.png'
import { ROUTES } from '@/router'

export function TopBar() {
  const navigate = useNavigate()
  const activeWorkspaceId = useStore((s) => s.activeWorkspaceId)
  const { user, logout } = useAuth()
  const { isOnline } = useOnlineStatus()
  const [isMaximized, setIsMaximized] = useState(false)
  const isMobile = useMediaQuery('(max-width: 640px)')

  const { data: branchesData } = useBranches(activeWorkspaceId ?? undefined)
  const { data: notifications } = useNotifications(activeWorkspaceId ?? undefined)
  const branches = ((branchesData as { data?: Array<{ id: string; name: string; is_default: boolean }> })?.data ?? []) as Array<{
    id: string
    name: string
    is_default: boolean
  }>
  const activeBranch = branches.find((b) => b.is_default) ?? branches[0]
  const unreadCount = Array.isArray(notifications)
    ? notifications.filter((n: { is_read?: boolean }) => !n.is_read).length
    : 0

  const handleMinimize = () => window.gnovium?.window.minimize()
  const handleMaximize = () => {
    window.gnovium?.window.maximize()
    setIsMaximized(!isMaximized)
  }
  const handleClose = () => window.gnovium?.window.close()

  return (
    <div
      className={cn(
        'flex h-10 items-center justify-between border-b bg-background px-2',
        'select-none shrink-0'
      )}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Left: App logo + workspace */}
      <div className="flex items-center gap-2 pl-2">
        <img src={logoImg} alt="Gnovium" className="h-6 w-6 object-contain" />
        <span className="text-sm font-semibold text-foreground tracking-tight">GNOVIUM</span>

        {/* Online/offline indicator */}
        <span
          className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-destructive'}`}
          title={isOnline ? 'Online' : 'Offline'}
        />

        {/* Branch indicator */}
        {activeBranch && (
          <>
            <Separator orientation="vertical" className="mx-1 h-4" />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigate(ROUTES.BRANCHES)}
                    className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                  >
                    <GitBranch className="h-3 w-3" />
                    <span className="max-w-[100px] truncate font-medium">
                      {activeBranch.name}
                    </span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Active branch: {activeBranch.name}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        )}
      </div>

      {/* Center: Search */}
      {!isMobile && (
        <div
          className="flex flex-1 justify-center px-4"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            onClick={() => navigate(ROUTES.SEARCH)}
            className={cn(
              'flex items-center gap-2 rounded-lg border border-transparent bg-muted/50 px-3 py-1.5',
              'text-xs text-muted-foreground transition-all duration-150',
              'hover:border-border hover:bg-muted hover:text-foreground',
              'focus:border-primary focus:outline-none',
              'max-w-[280px] w-full'
            )}
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="flex items-center gap-0.5 rounded border border-border bg-background px-1 py-0.5 text-[10px] font-medium">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </button>
        </div>
      )}

      {/* Right: Actions + User */}
      <div
        className="flex items-center gap-0.5"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* AI toggle */}
        {!isMobile && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => navigate(ROUTES.AI)}
                  aria-label="AI Assistant"
                >
                  <Bot className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>AI Assistant</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Notifications */}
        {!isMobile && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-7 w-7"
                  onClick={() => navigate(ROUTES.NOTIFICATIONS)}
                  aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-medium text-destructive-foreground">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Notifications</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <Separator orientation="vertical" className="mx-1 h-4" />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors hover:bg-muted" aria-label="User menu">
              <Avatar className="h-7 w-7">
                <AvatarImage src={user?.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs">
                  {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium truncate">{user?.name ?? 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email ?? ''}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(ROUTES.SETTINGS)}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { logout(); navigate(ROUTES.WORKSPACES) }}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="mx-1 h-4" />

        {/* Window controls */}
        <div className="flex items-center">
          <button
            onClick={handleMinimize}
            className="flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label="Minimize window"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleMaximize}
            className="flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
          >
            {isMaximized ? (
              <Square className="h-3 w-3" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            onClick={handleClose}
            className="flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
            aria-label="Close window"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
