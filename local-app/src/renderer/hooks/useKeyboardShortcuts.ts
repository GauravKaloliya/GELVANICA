import { useEffect, useCallback, useRef } from 'react'
import { useStore } from '../store'

interface ShortcutBinding {
  key: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  alt?: boolean
  action: () => void
  description: string
  scope?: 'global' | 'editor'
}

export function useKeyboardShortcuts(additionalBindings: ShortcutBinding[] = []) {
  const shortcuts = useStore((s) => s.settings.keyboard_shortcuts)
  const toggleSidebar = useStore((s) => s.toggleSidebar)
  const toggleRightSidebar = useStore((s) => s.toggleRightSidebar)
  const toggleCommandPalette = useStore((s) => s.toggleCommandPalette)

  const shortcutsMap = useRef<Record<string, () => void>>({
    toggleSidebar,
    toggleRightSidebar,
    toggleCommandPalette,
  })
  shortcutsMap.current = { toggleSidebar, toggleRightSidebar, toggleCommandPalette }

  const builtInBindings = useRef<ShortcutBinding[]>([
    { key: 'b', ctrl: true, action: toggleSidebar, description: 'Toggle sidebar', scope: 'global' },
    { key: 'j', ctrl: true, action: toggleRightSidebar, description: 'Toggle right sidebar', scope: 'global' },
    { key: 'k', ctrl: true, shift: true, action: toggleCommandPalette, description: 'Open command palette', scope: 'global' },
  ])
  builtInBindings.current = [
    { key: 'b', ctrl: true, action: toggleSidebar, description: 'Toggle sidebar', scope: 'global' },
    { key: 'j', ctrl: true, action: toggleRightSidebar, description: 'Toggle right sidebar', scope: 'global' },
    { key: 'k', ctrl: true, shift: true, action: toggleCommandPalette, description: 'Open command palette', scope: 'global' },
  ]

  const customBindings = useRef<ShortcutBinding[]>(additionalBindings)
  customBindings.current = additionalBindings

  const matchBinding = useCallback((binding: ShortcutBinding, event: KeyboardEvent) => {
    const target = event.target as HTMLElement
    const isInput =
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable

    if (binding.scope === 'editor' && isInput) return false

    const ctrlOrMeta = binding.ctrl
      ? event.ctrlKey || event.metaKey
      : binding.meta
        ? event.metaKey
        : false

    if (!ctrlOrMeta && (binding.ctrl || binding.meta)) return false
    if (binding.shift && !event.shiftKey) return false
    if (binding.alt && !event.altKey) return false
    if (event.key.toLowerCase() !== binding.key.toLowerCase()) return false

    return true
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      for (const binding of builtInBindings.current) {
        if (matchBinding(binding, event)) {
          event.preventDefault()
          event.stopPropagation()
          binding.action()
          return
        }
      }

      for (const binding of customBindings.current) {
        if (matchBinding(binding, event)) {
          event.preventDefault()
          event.stopPropagation()
          binding.action()
          return
        }
      }

      const currentShortcuts = shortcutsMap.current
      for (const [action, combo] of Object.entries(shortcuts)) {
        if (!combo || !currentShortcuts[action]) continue

        const parts = combo.toLowerCase().split('+').map(s => s.trim())
        const key = parts[parts.length - 1]
        const needsMod = parts.includes('mod') || parts.includes('ctrl')
        const needsShift = parts.includes('shift')
        const needsAlt = parts.includes('alt')

        const ctrlOrMeta = needsMod ? (event.ctrlKey || event.metaKey) : false
        if (needsMod && !ctrlOrMeta) continue
        if (!needsMod && (event.ctrlKey || event.metaKey)) continue
        if (needsShift && !event.shiftKey) continue
        if (!needsShift && event.shiftKey) continue
        if (needsAlt && !event.altKey) continue
        if (!needsAlt && event.altKey) continue
        if (event.key.toLowerCase() !== key) continue

        event.preventDefault()
        event.stopPropagation()
        currentShortcuts[action]()
        return
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts, matchBinding])

  const register = useCallback((binding: ShortcutBinding) => {
    customBindings.current.push(binding)
    return () => {
      customBindings.current = customBindings.current.filter((b) => b !== binding)
    }
  }, [])

  return {
    shortcuts,
    register,
    getBindings: useCallback(() => {
      return [...builtInBindings.current, ...customBindings.current].map(({ key, ctrl, meta, shift, alt, description }) => ({
        key: [
          ctrl ? 'Ctrl' : '',
          meta ? 'Cmd' : '',
          shift ? 'Shift' : '',
          alt ? 'Alt' : '',
          key.toUpperCase(),
        ]
          .filter(Boolean)
          .join('+'),
        description,
      }))
    }, []),
    getShortcutLabel: useCallback(
      (action: string): string => {
        const combo = shortcuts[action]
        if (!combo) return ''
        return combo
          .replace('mod', navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')
          .replace('ctrl', navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')
          .replace('shift', 'Shift')
          .replace('alt', navigator.platform.includes('Mac') ? '⌥' : 'Alt')
          .split('+')
          .map((s) => s.trim())
          .join(' + ')
      },
      [shortcuts]
    ),
  }
}
