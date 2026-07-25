import { motion } from 'framer-motion'
import { Keyboard, Navigation, Type, Search, GitBranch, Settings, Monitor } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useStore } from '@/store'

interface ShortcutEntry {
  keys: string[]
  action: string
  category: string
}

const SHORTCUT_CATEGORIES = [
  { key: 'Navigation', label: 'Navigation', icon: Navigation },
  { key: 'Editor', label: 'Editor', icon: Type },
  { key: 'Search', label: 'Search', icon: Search },
  { key: 'Graph', label: 'Graph', icon: GitBranch },
  { key: 'View', label: 'View', icon: Monitor },
  { key: 'General', label: 'General', icon: Settings },
]

const DEFAULT_SHORTCUTS: ShortcutEntry[] = [
  // Navigation
  { keys: ['Cmd', '1-9'], action: 'Switch to Tab 1-9', category: 'Navigation' },
  { keys: ['Cmd', '\\'], action: 'Toggle Sidebar', category: 'Navigation' },
  { keys: ['Cmd', ','], action: 'Open Settings', category: 'Navigation' },
  { keys: ['Cmd', 'P'], action: 'Quick Switch Entity', category: 'Navigation' },
  { keys: ['Cmd', 'Shift', 'O'], action: 'Outline Panel', category: 'Navigation' },
  { keys: ['Ctrl', 'Tab'], action: 'Next Tab', category: 'Navigation' },
  { keys: ['Ctrl', 'Shift', 'Tab'], action: 'Previous Tab', category: 'Navigation' },

  // Editor
  { keys: ['Cmd', 'B'], action: 'Bold Text', category: 'Editor' },
  { keys: ['Cmd', 'I'], action: 'Italic Text', category: 'Editor' },
  { keys: ['Cmd', 'E'], action: 'Inline Code', category: 'Editor' },
  { keys: ['Cmd', 'U'], action: 'Underline Text', category: 'Editor' },
  { keys: ['Cmd', 'Shift', 'X'], action: 'Strikethrough', category: 'Editor' },
  { keys: ['Cmd', 'S'], action: 'Save', category: 'Editor' },
  { keys: ['Cmd', 'Z'], action: 'Undo', category: 'Editor' },
  { keys: ['Cmd', 'Shift', 'Z'], action: 'Redo', category: 'Editor' },
  { keys: ['Cmd', 'A'], action: 'Select All', category: 'Editor' },
  { keys: ['Tab'], action: 'Indent', category: 'Editor' },
  { keys: ['Shift', 'Tab'], action: 'Outdent', category: 'Editor' },
  { keys: ['Cmd', '['], action: 'Toggle Bullet List', category: 'Editor' },
  { keys: ['Cmd', 'Shift', '['], action: 'Toggle Numbered List', category: 'Editor' },

  // Search
  { keys: ['Cmd', 'K'], action: 'Quick Search', category: 'Search' },
  { keys: ['Cmd', 'F'], action: 'Find in Entity', category: 'Search' },
  { keys: ['Cmd', 'Shift', 'F'], action: 'Search All', category: 'Search' },
  { keys: ['Cmd', 'Shift', 'P'], action: 'Command Palette', category: 'Search' },

  // Graph
  { keys: ['Cmd', 'G'], action: 'Graph View', category: 'Graph' },
  { keys: ['Cmd', 'R'], action: 'Refresh Graph', category: 'Graph' },
  { keys: ['Cmd', 'L'], action: 'Focus Graph Node', category: 'Graph' },
  { keys: ['Cmd', 'Shift', 'L'], action: 'Add to Graph', category: 'Graph' },

  // View
  { keys: ['Cmd', '+'], action: 'Zoom In', category: 'View' },
  { keys: ['Cmd', '-'], action: 'Zoom Out', category: 'View' },
  { keys: ['Cmd', '0'], action: 'Reset Zoom', category: 'View' },
  { keys: ['Cmd', 'Shift', 'F'], action: 'Toggle Fullscreen', category: 'View' },
  { keys: ['Cmd', '\\'], action: 'Toggle Side Panel', category: 'View' },

  // General
  { keys: ['Cmd', 'N'], action: 'New Entity', category: 'General' },
  { keys: ['Cmd', 'Shift', 'N'], action: 'New Workspace', category: 'General' },
  { keys: ['Cmd', 'E'], action: 'Export', category: 'General' },
  { keys: ['Cmd', 'Shift', 'E'], action: 'Export as Markdown', category: 'General' },
  { keys: ['Cmd', 'comma'], action: 'Preferences', category: 'General' },
  { keys: ['Cmd', 'Q'], action: 'Quit App', category: 'General' },
  { keys: ['Cmd', 'H'], action: 'Hide App', category: 'General' },
]

export default function ShortcutsReference() {
  const settings = useStore((s) => s.settings)
  const userShortcuts = settings?.keyboard_shortcuts ?? {}

  const shortcuts = DEFAULT_SHORTCUTS.map((shortcut) => {
    const userBinding = userShortcuts[shortcut.action]
    return {
      ...shortcut,
      keys: userBinding ? userBinding.split('+').map((k: string) => k.trim()) : shortcut.keys,
    }
  })

  const grouped = SHORTCUT_CATEGORIES.map((cat) => ({
    ...cat,
    shortcuts: shortcuts.filter((s) => s.category === cat.key),
  })).filter((group) => group.shortcuts.length > 0)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-8"
    >
      <div className="mb-6 flex items-center gap-2">
        <Keyboard className="h-5 w-5" />
        <h1 className="text-2xl font-bold">Keyboard Shortcuts</h1>
        <Badge variant="secondary" className="ml-2 text-xs">
          {shortcuts.length} shortcuts
        </Badge>
      </div>

      <div className="space-y-8 max-w-3xl">
        {grouped.map((group) => {
          const GroupIcon = group.icon
          return (
            <div key={group.key}>
              <div className="mb-3 flex items-center gap-2">
                <GroupIcon className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </h2>
              </div>
              <div className="grid gap-2">
                {group.shortcuts.map((shortcut) => (
                  <Card key={shortcut.action}>
                    <CardContent className="flex items-center justify-between py-2.5 px-4">
                      <span className="text-sm">{shortcut.action}</span>
                      <div className="flex gap-1">
                        {shortcut.keys.map((key: string) => (
                          <Badge key={key} variant="outline" className="font-mono text-xs">
                            {key}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
