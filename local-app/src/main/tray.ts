import { Tray, Menu, nativeImage, app, BrowserWindow } from 'electron'
import { join } from 'path'
import { logger } from './logger'

const TRAY_ICON_PATH = 'resources/tray-icon.png'

export class TrayManager {
  private tray: Tray | null = null

  create(): void {
    if (this.tray) return

    let trayIcon: import('electron').NativeImage
    const iconPath = join(__dirname, '../../', TRAY_ICON_PATH)

    try {
      trayIcon = nativeImage.createFromPath(iconPath)
      if (trayIcon.isEmpty()) {
        trayIcon = nativeImage.createEmpty()
      }
    } catch {
      trayIcon = nativeImage.createEmpty()
    }

    this.tray = new Tray(trayIcon)
    this.tray.setToolTip('GNOVIUM')

    this.tray.on('click', () => {
      this.showMainWindow()
    })

    this.updateContextMenu()
    logger.info('Tray', 'System tray created')
  }

  updateContextMenu(): void {
    if (!this.tray) return

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open GNOVIUM',
        click: () => this.showMainWindow(),
      },
      { type: 'separator' },
      {
        label: 'Sync Now',
        click: () => this.sendToFocused('sync:trigger'),
      },
      { type: 'separator' },
      {
        label: 'New Entity',
        click: () => this.sendToFocused('editor:new-entity'),
      },
      {
        label: 'Search',
        click: () => this.sendToFocused('search:open'),
      },
      { type: 'separator' },
      {
        label: 'Settings',
        click: () => this.sendToFocused('navigate:settings'),
      },
      { type: 'separator' },
      {
        label: 'Quit GNOVIUM',
        click: () => {
          app.quit()
        },
      },
    ])

    this.tray.setContextMenu(contextMenu)
  }

  destroy(): void {
    if (this.tray) {
      this.tray.destroy()
      this.tray = null
    }
  }

  private showMainWindow(): void {
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      const window = windows[0]!
      if (!window.isDestroyed()) {
        window.show()
        window.focus()
      }
    }
  }

  private sendToFocused(channel: string): void {
    const window = BrowserWindow.getFocusedWindow()
    if (window && !window.isDestroyed()) {
      window.webContents.send(channel)
    } else {
      const windows = BrowserWindow.getAllWindows()
      if (windows.length > 0) {
        const main = windows[0]!
        if (!main.isDestroyed()) {
          main.webContents.send(channel)
        }
      }
    }
  }
}
