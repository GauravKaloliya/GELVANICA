import { useState } from 'react'
import { RotateCcw, Keyboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { formatCombo } from './SettingsField'
import type { AppSettings } from '@shared/types'
import {
  DEFAULT_SHORTCUTS,
  SHORTCUT_CATEGORIES,
  type ShortcutDef,
} from '@/lib/defaultShortcuts'

export type SettingsUpdateFn = (section: string, key: string, value: unknown) => void

function ShortcutRow({
  shortcut,
  currentKeys,
  isCustomized,
  onKeysChange,
  onReset,
}: {
  shortcut: ShortcutDef
  currentKeys: string
  isCustomized: boolean
  onKeysChange: (newCombo: string) => void
  onReset: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [tempKeys, setTempKeys] = useState(currentKeys)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const parts: string[] = []
    if (e.ctrlKey || e.metaKey) parts.push('mod')
    if (e.shiftKey) parts.push('shift')
    if (e.altKey) parts.push('alt')
    const key = e.key.toLowerCase()
    if (!['control', 'meta', 'alt', 'shift'].includes(key)) {
      parts.push(key)
    }
    if (parts.length > 0) {
      const combo = parts.join('+')
      onKeysChange(combo)
      setTempKeys(combo)
      setEditing(false)
    }
  }

  return (
    <div className="group flex items-center gap-4 rounded-md px-3 py-2 hover:bg-muted/50">
      <span className="min-w-0 flex-1 truncate text-sm">{shortcut.action}</span>

      <div className="flex items-center gap-2">
        {editing ? (
          <input
            className="flex h-7 w-40 items-center rounded border border-primary bg-background px-2 text-xs font-mono"
            value={tempKeys}
            onChange={(e) => setTempKeys(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (tempKeys.trim()) onKeysChange(tempKeys)
              setEditing(false)
            }}
            autoFocus
          />
        ) : (
          <button
            onClick={() => {
              setTempKeys(currentKeys)
              setEditing(true)
            }}
            className="flex h-7 min-w-[140px] items-center rounded border bg-muted/50 px-2 text-xs font-mono transition-colors hover:border-primary"
            title="Click to change shortcut"
          >
            {formatCombo(currentKeys)}
          </button>
        )}

        {isCustomized && (
          <button
            onClick={onReset}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-colors hover:bg-muted hover:text-foreground group-hover:opacity-100"
            title="Reset to default"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

export function KeyboardShortcutsTab({
  settings,
  update,
}: {
  settings: AppSettings
  update: SettingsUpdateFn
}) {
  const userShortcuts = settings.keyboard_shortcuts

  const getKeys = (shortcut: ShortcutDef) => {
    return userShortcuts[shortcut.id] || shortcut.defaultKeys
  }

  const isCustomized = (shortcut: ShortcutDef) => {
    return shortcut.id in userShortcuts
  }

  const handleKeysChange = (shortcut: ShortcutDef, newCombo: string) => {
    update('keyboard_shortcuts', '', {
      ...userShortcuts,
      [shortcut.id]: newCombo,
    })
  }

  const handleReset = (shortcut: ShortcutDef) => {
    const next = { ...userShortcuts }
    delete next[shortcut.id]
    update('keyboard_shortcuts', '', next)
  }

  const handleResetAll = () => {
    update('keyboard_shortcuts', '', {})
  }

  const grouped = SHORTCUT_CATEGORIES.map((cat) => ({
    ...cat,
    shortcuts: DEFAULT_SHORTCUTS.filter((s) => s.category === cat.key),
  })).filter((group) => group.shortcuts.length > 0)

  const hasAnyCustomization = DEFAULT_SHORTCUTS.some((s) => s.id in userShortcuts)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Keyboard className="h-4 w-4" /> Keyboard Shortcuts
        </CardTitle>
        <CardDescription>
          Click a shortcut key to rebind it. Customised shortcuts are marked with a reset button.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {DEFAULT_SHORTCUTS.length} shortcuts
          </span>
          {hasAnyCustomization && (
            <Button variant="ghost" size="sm" onClick={handleResetAll}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset All
            </Button>
          )}
        </div>

        <Separator />

        {grouped.map((group) => (
          <div key={group.key}>
            <div className="mb-1.5 flex items-center gap-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group.label}
              </h3>
              <Badge variant="secondary" className="text-[10px] font-normal">
                {group.shortcuts.length}
              </Badge>
            </div>
            <div className="space-y-0.5">
              {group.shortcuts.map((shortcut) => (
                <ShortcutRow
                  key={shortcut.id}
                  shortcut={shortcut}
                  currentKeys={getKeys(shortcut)}
                  isCustomized={isCustomized(shortcut)}
                  onKeysChange={(combo) => handleKeysChange(shortcut, combo)}
                  onReset={() => handleReset(shortcut)}
                />
              ))}
            </div>
            <Separator className="mt-3" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
