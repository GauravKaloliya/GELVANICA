import { Outlet } from 'react-router-dom'
import { TopBar } from '@/components/layout/TopBar'
import { Sidebar } from '@/components/layout/Sidebar'
import { RightSidebar } from '@/components/layout/RightSidebar'
import CommandPalette from '@/components/common/CommandPalette'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

export function WorkspaceLayoutShell() {
  useKeyboardShortcuts()

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Command palette — global overlay */}
      <CommandPalette />

      {/* Top bar — fixed height */}
      <TopBar />

      {/* Main area — sidebar + content + right sidebar */}
      <div className="flex min-h-0 flex-1">
        {/* Left sidebar */}
        <Sidebar />

        {/* Content area */}
        <main role="main" id="main-content" className="flex-1 overflow-auto bg-background">
          <Outlet />
        </main>

        {/* Right sidebar — animated */}
        <RightSidebar />
      </div>
    </div>
  )
}
