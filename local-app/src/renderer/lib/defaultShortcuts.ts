export interface ShortcutDef {
  id: string
  action: string
  defaultKeys: string
  category: string
}

export const SHORTCUT_CATEGORIES = [
  { key: 'Navigation', label: 'Navigation' },
  { key: 'Editor', label: 'Editor' },
  { key: 'Search', label: 'Search' },
  { key: 'Graph', label: 'Graph' },
  { key: 'View', label: 'View' },
  { key: 'General', label: 'General' },
]

export const DEFAULT_SHORTCUTS: ShortcutDef[] = [
  // Navigation
  { id: 'tab.switch', action: 'Switch to Tab 1-9', defaultKeys: 'mod+1', category: 'Navigation' },
  { id: 'sidebar.toggle', action: 'Toggle Sidebar', defaultKeys: 'mod+\\', category: 'Navigation' },
  { id: 'settings.open', action: 'Open Settings', defaultKeys: 'mod+,', category: 'Navigation' },
  { id: 'entity.quickSwitch', action: 'Quick Switch Entity', defaultKeys: 'mod+p', category: 'Navigation' },
  { id: 'outline.toggle', action: 'Outline Panel', defaultKeys: 'mod+shift+o', category: 'Navigation' },
  { id: 'tab.next', action: 'Next Tab', defaultKeys: 'ctrl+tab', category: 'Navigation' },
  { id: 'tab.prev', action: 'Previous Tab', defaultKeys: 'ctrl+shift+tab', category: 'Navigation' },

  // Editor
  { id: 'editor.bold', action: 'Bold Text', defaultKeys: 'mod+b', category: 'Editor' },
  { id: 'editor.italic', action: 'Italic Text', defaultKeys: 'mod+i', category: 'Editor' },
  { id: 'editor.code', action: 'Inline Code', defaultKeys: 'mod+e', category: 'Editor' },
  { id: 'editor.underline', action: 'Underline Text', defaultKeys: 'mod+u', category: 'Editor' },
  { id: 'editor.strikethrough', action: 'Strikethrough', defaultKeys: 'mod+shift+x', category: 'Editor' },
  { id: 'editor.save', action: 'Save', defaultKeys: 'mod+s', category: 'Editor' },
  { id: 'editor.undo', action: 'Undo', defaultKeys: 'mod+z', category: 'Editor' },
  { id: 'editor.redo', action: 'Redo', defaultKeys: 'mod+shift+z', category: 'Editor' },
  { id: 'editor.selectAll', action: 'Select All', defaultKeys: 'mod+a', category: 'Editor' },
  { id: 'editor.indent', action: 'Indent', defaultKeys: 'tab', category: 'Editor' },
  { id: 'editor.outdent', action: 'Outdent', defaultKeys: 'shift+tab', category: 'Editor' },
  { id: 'editor.bulletList', action: 'Toggle Bullet List', defaultKeys: 'mod+[', category: 'Editor' },
  { id: 'editor.numberedList', action: 'Toggle Numbered List', defaultKeys: 'mod+shift+[', category: 'Editor' },

  // Search
  { id: 'search.quick', action: 'Quick Search', defaultKeys: 'mod+k', category: 'Search' },
  { id: 'search.find', action: 'Find in Entity', defaultKeys: 'mod+f', category: 'Search' },
  { id: 'search.findAll', action: 'Search All', defaultKeys: 'mod+shift+f', category: 'Search' },
  { id: 'commandPalette.open', action: 'Command Palette', defaultKeys: 'mod+shift+p', category: 'Search' },

  // Graph
  { id: 'graph.view', action: 'Graph View', defaultKeys: 'mod+g', category: 'Graph' },
  { id: 'graph.refresh', action: 'Refresh Graph', defaultKeys: 'mod+r', category: 'Graph' },
  { id: 'graph.focusNode', action: 'Focus Graph Node', defaultKeys: 'mod+l', category: 'Graph' },
  { id: 'graph.addNode', action: 'Add to Graph', defaultKeys: 'mod+shift+l', category: 'Graph' },

  // View
  { id: 'view.zoomIn', action: 'Zoom In', defaultKeys: 'mod+=', category: 'View' },
  { id: 'view.zoomOut', action: 'Zoom Out', defaultKeys: 'mod+-', category: 'View' },
  { id: 'view.zoomReset', action: 'Reset Zoom', defaultKeys: 'mod+0', category: 'View' },
  { id: 'view.fullscreen', action: 'Toggle Fullscreen', defaultKeys: 'mod+shift+f', category: 'View' },
  { id: 'view.sidePanel', action: 'Toggle Side Panel', defaultKeys: 'mod+\\', category: 'View' },

  // General
  { id: 'entity.new', action: 'New Entity', defaultKeys: 'mod+n', category: 'General' },
  { id: 'workspace.new', action: 'New Workspace', defaultKeys: 'mod+shift+n', category: 'General' },
  { id: 'entity.export', action: 'Export', defaultKeys: 'mod+e', category: 'General' },
  { id: 'entity.exportMd', action: 'Export as Markdown', defaultKeys: 'mod+shift+e', category: 'General' },
  { id: 'preferences.open', action: 'Preferences', defaultKeys: 'mod+,', category: 'General' },
  { id: 'app.quit', action: 'Quit App', defaultKeys: 'mod+q', category: 'General' },
  { id: 'app.hide', action: 'Hide App', defaultKeys: 'mod+h', category: 'General' },
]
