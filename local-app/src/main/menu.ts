import { Menu, MenuItemConstructorOptions, BrowserWindow, app, shell } from 'electron'
import { env } from '@main/env'

const isMac = process.platform === 'darwin'

export class MenuBuilder {
  private window: BrowserWindow

  constructor(window: BrowserWindow) {
    this.window = window
  }

  buildMenu(): void {
    const template = this.buildTemplate()
    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
  }

  private buildTemplate(): MenuItemConstructorOptions[] {
    if (isMac) {
      return [
        this.buildAppMenu(),
        this.buildFileMenu(),
        this.buildEditMenu(),
        this.buildViewMenu(),
        this.buildWindowMenu(),
        this.buildHelpMenu(),
      ]
    }

    return [
      this.buildFileMenu(),
      this.buildEditMenu(),
      this.buildViewMenu(),
      this.buildWindowMenu(),
      this.buildHelpMenu(),
    ]
  }

  private buildAppMenu(): MenuItemConstructorOptions {
    return {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Settings',
          accelerator: 'Cmd+,',
          click: () => this.sendToRenderer('navigate:settings'),
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    }
  }

  private buildFileMenu(): MenuItemConstructorOptions {
    return {
      label: 'File',
      submenu: [
        {
          label: 'New Entity',
          accelerator: 'CmdOrCtrl+N',
          click: () => this.sendToRenderer('editor:new-entity'),
        },
        {
          label: 'New Workspace',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => this.sendToRenderer('workspace:create'),
        },
        { type: 'separator' },
        {
          label: 'Open File...',
          accelerator: 'CmdOrCtrl+O',
          click: () => this.sendToRenderer('dialog:open-file'),
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => this.sendToRenderer('editor:save'),
        },
        {
          label: 'Export Workspace...',
          accelerator: 'CmdOrCtrl+Shift+E',
          click: () => this.sendToRenderer('backup:export-dialog'),
        },
        {
          label: 'Import Workspace...',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => this.sendToRenderer('backup:import-dialog'),
        },
        { type: 'separator' },
        ...(isMac
          ? [{ role: 'close' as const }]
          : [{ role: 'quit' as const }]),
      ],
    }
  }

  private buildEditMenu(): MenuItemConstructorOptions {
    return {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Find...',
          accelerator: 'CmdOrCtrl+F',
          click: () => this.sendToRenderer('search:open'),
        },
        {
          label: 'Find and Replace...',
          accelerator: 'CmdOrCtrl+H',
          click: () => this.sendToRenderer('search:open-replace'),
        },
      ],
    }
  }

  private buildViewMenu(): MenuItemConstructorOptions {
    return {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Sidebar',
          accelerator: 'CmdOrCtrl+\\',
          click: () => this.sendToRenderer('view:toggle-sidebar'),
        },
        {
          label: 'Graph View',
          accelerator: 'CmdOrCtrl+G',
          click: () => this.sendToRenderer('navigate:graph'),
        },
        { type: 'separator' },
        {
          label: 'AI Assistant',
          accelerator: 'CmdOrCtrl+Shift+A',
          click: () => this.sendToRenderer('view:toggle-ai'),
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        ...(env.IS_DEV ? [{ role: 'toggleDevTools' as const }] : []),
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    }
  }

  private buildWindowMenu(): MenuItemConstructorOptions {
    const submenu: MenuItemConstructorOptions[] = isMac
      ? [
          { role: 'minimize' },
          { role: 'zoom' },
          { type: 'separator' },
          { role: 'front' },
        ]
      : [
          { role: 'minimize' },
          { role: 'close' },
        ]

    return {
      label: 'Window',
      submenu,
    }
  }

  private buildHelpMenu(): MenuItemConstructorOptions {
    return {
      label: 'Help',
      submenu: [
        {
          label: 'Keyboard Shortcuts',
          accelerator: 'CmdOrCtrl+/',
          click: () => this.sendToRenderer('navigate:shortcuts'),
        },
        {
          label: 'Report Issue',
          click: () => {
            shell.openExternal(env.ISSUES_URL)
          },
        },
        { type: 'separator' },
        {
          label: 'About GNOVIUM',
          click: () => this.sendToRenderer('navigate:about'),
        },
      ],
    }
  }

  private sendToRenderer(channel: string): void {
    if (!this.window.isDestroyed()) {
      this.window.webContents.send(channel)
    }
  }
}
