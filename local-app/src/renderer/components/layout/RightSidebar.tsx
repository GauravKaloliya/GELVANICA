import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings2,
  Link2,
  MessageSquare,
  Brain,
  Clock,
  PanelRightClose,
  Map,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { PropertiesPanel } from '@/components/panels/PropertiesPanel'
import { BacklinksPanel } from '@/components/panels/BacklinksPanel'
import { CommentsPanel } from '@/components/panels/CommentsPanel'
import { AIPanel } from '@/components/panels/AIPanel'
import { HistoryPanel } from '@/components/panels/HistoryPanel'
import { GraphMiniMapPanel } from '@/components/panels/GraphMiniMapPanel'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'
import type { RightSidebarTab } from '@/store/slices/uiSlice'

const PANEL_TABS: {
  id: RightSidebarTab
  icon: React.ComponentType<{ className?: string }>
  label: string
}[] = [
  { id: 'properties', icon: Settings2, label: 'Properties' },
  { id: 'backlinks', icon: Link2, label: 'Backlinks' },
  { id: 'comments', icon: MessageSquare, label: 'Comments' },
  { id: 'ai', icon: Brain, label: 'AI' },
  { id: 'graph', icon: Clock, label: 'History' },
  { id: 'minimap', icon: Map, label: 'Graph' },
]

const SIDEBAR_WIDTH = 320
const MOBILE_SIDEBAR_WIDTH = '100vw'

interface RightSidebarProps {
  entityId?: string | null
  className?: string
}

export function RightSidebar({ entityId, className }: RightSidebarProps) {
  const rightSidebarOpen = useStore((s) => s.rightSidebarOpen)
  const rightSidebarTab = useStore((s) => s.rightSidebarTab)
  const toggleRightSidebar = useStore((s) => s.toggleRightSidebar)
  const setRightSidebarTab = useStore((s) => s.setRightSidebarTab)
  const isMobile = useIsMobile()

  return (
    <>
      {/* Toggle button — rendered outside the sidebar for positioning */}
      <AnimatePresence>
        {!rightSidebarOpen && entityId && (
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            className="absolute right-2 top-2 z-30"
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-md border bg-background/95 shadow-sm backdrop-blur-sm"
                    onClick={toggleRightSidebar}
                  >
                    <PanelRightClose className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Open panel</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar panel */}
      <motion.div
        initial={false}
        animate={{
          width: rightSidebarOpen ? (isMobile ? MOBILE_SIDEBAR_WIDTH : SIDEBAR_WIDTH) : 0,
          opacity: rightSidebarOpen ? 1 : 0,
        }}
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        className={cn(
          'shrink-0 overflow-hidden border-l bg-background',
          className
        )}
      >
        <div
          className="flex h-full flex-col"
          style={{ width: SIDEBAR_WIDTH }}
        >
          {/* Header with close */}
          <div className="flex items-center justify-between border-b px-2 py-1.5">
            <div className="flex items-center gap-1 pl-1">
              {PANEL_TABS.map((tab) => {
                const Icon = tab.icon
                const isActive = rightSidebarTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setRightSidebarTab(tab.id)}
                    className={cn(
                      'relative flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                    title={tab.label}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden xl:inline">{tab.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="right-sidebar-tab-indicator"
                        className="absolute inset-x-0 -bottom-[7px] h-0.5 bg-primary rounded-full"
                        transition={{ duration: 0.2 }}
                      />
                    )}
                  </button>
                )
              })}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={toggleRightSidebar}
              title="Close panel"
              aria-label="Close right sidebar"
            >
              <PanelRightClose className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={rightSidebarTab}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="h-full"
              >
                {rightSidebarTab === 'properties' && entityId && (
                  <PropertiesPanel entityId={entityId} />
                )}
                {rightSidebarTab === 'backlinks' && entityId && (
                  <BacklinksPanel entityId={entityId} />
                )}
                {rightSidebarTab === 'comments' && entityId && (
                  <CommentsPanel entityId={entityId} />
                )}
                {rightSidebarTab === 'ai' && entityId && (
                  <AIPanel entityId={entityId} />
                )}
                {rightSidebarTab === 'graph' && entityId && (
                  <HistoryPanel entityId={entityId} />
                )}
                {rightSidebarTab === 'minimap' && (
                  <GraphMiniMapPanel />
                )}
                {!entityId && rightSidebarTab !== 'minimap' && (
                  <div className="flex h-full items-center justify-center p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Select an entity to view its details.
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </>
  )
}
