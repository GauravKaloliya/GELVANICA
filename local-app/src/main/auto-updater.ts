import { autoUpdater } from 'electron-updater'
import { dialog, BrowserWindow } from 'electron'
import { logger } from './logger'

export class AutoUpdaterService {
  private updateDownloaded = false

  constructor() {
    this.init()
  }

  private init(): void {
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.allowDowngrade = false

    autoUpdater.on('checking-for-update', () => {
      logger.info('AutoUpdater', 'Checking for update')
      this.broadcast('update:checking', {})
    })

    autoUpdater.on('update-available', (info) => {
      logger.info('AutoUpdater', 'Update available', { version: info.version })
      this.broadcast('update:available', {
        version: info.version,
        releaseDate: info.releaseDate,
      })
    })

    autoUpdater.on('update-not-available', () => {
      logger.info('AutoUpdater', 'No updates available')
      this.broadcast('update:not-available', {})
    })

    autoUpdater.on('download-progress', (progress) => {
      this.broadcast('update:progress', {
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total,
      })
    })

    autoUpdater.on('update-downloaded', (info) => {
      logger.info('AutoUpdater', 'Update downloaded', { version: info.version })
      this.updateDownloaded = true
      this.broadcast('update:downloaded', {
        version: info.version,
      })
      this.promptInstall(info)
    })

    autoUpdater.on('error', (error) => {
      logger.error('AutoUpdater', 'Error', error.message)
      this.broadcast('update:error', { message: error.message })
    })

    this.checkForUpdates()
  }

  async checkForUpdates(): Promise<void> {
    try {
      await autoUpdater.checkForUpdates()
    } catch (error) {
      logger.error('AutoUpdater', 'Failed to check for updates', error)
    }
  }

  quitAndInstall(): void {
    if (this.updateDownloaded) {
      autoUpdater.quitAndInstall(false, true)
    }
  }

  private async promptInstall(info: { version: string }): Promise<void> {
    const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    if (!window || window.isDestroyed()) return

    const result = await dialog.showMessageBox(window, {
      type: 'info',
      title: 'Update Available',
      message: `A new version of GNOVIUM (${info.version}) is available.`,
      detail: 'Would you like to install it now? The app will restart.',
      buttons: ['Install Now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    })

    if (result.response === 0) {
      this.quitAndInstall()
    }
  }

  private broadcast(channel: string, data: unknown): void {
    BrowserWindow.getAllWindows().forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send(channel, data)
      }
    })
  }
}
