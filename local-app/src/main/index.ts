import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { app, BrowserWindow, ipcMain, globalShortcut } from 'electron'
import type { AppSettings } from '../shared/types'

// Match Vite's env file priority chain (later files override earlier ones):
// 1. .env              (base defaults)
// 2. .env.local        (local overrides, always loaded)
// 3. .env.[mode]       (mode-specific: .env.development or .env.production)
// 4. .env.[mode].local (mode-specific local overrides)
const root = path.join(__dirname, '../..')
const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development'
const envFiles = ['.env', '.env.local', `.env.${mode}`, `.env.${mode}.local`]
for (const file of envFiles) {
  const filePath = path.join(root, file)
  if (fs.existsSync(filePath)) {
    dotenv.config({ path: filePath })
  }
}
import { WindowManager } from './window-manager'
import { ProtocolHandler } from './protocol-handler'
import { AuthService } from './auth-service'
import { LocalServer } from './local-server'
import { setupIpcHandlers, performAutoBackup } from './ipc-handlers'
import { MenuBuilder } from './menu'
import { CrashReporter } from './crash-reporter'
import { PowerMonitorService } from './power-monitor'
import { TrayManager } from './tray'
import { AutoUpdaterService } from './auto-updater'
import { logger } from './logger'
import { readSettings } from './ipc/flask-client'
import { container } from './container'

const isDev = !app.isPackaged

let windowManager: WindowManager
let localServer: LocalServer
let authService: AuthService
let trayManager: TrayManager
let pendingFilePath: string | null = null

function registerGlobalShortcuts(): void {
  for (let i = 1; i <= 9; i++) {
    globalShortcut.register(`CmdOrCtrl+${i}`, () => {
      const mainWindow = windowManager?.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('shortcut:switch-tab', i)
      }
    })
  }

  globalShortcut.register('CmdOrCtrl+\\', () => {
    const mainWindow = windowManager?.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('shortcut:toggle-sidebar')
    }
  })

  globalShortcut.register('CmdOrCtrl+,', () => {
    const mainWindow = windowManager?.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('shortcut:open-settings')
    }
  })
}

function initializeServices(): void {
  logger.info('Main', 'Initializing services...')

  windowManager = new WindowManager()
  authService = new AuthService()
  localServer = new LocalServer()
  trayManager = new TrayManager()

  container.register('windowManager', windowManager)
  container.register('authService', authService)
  container.register('localServer', localServer)
  container.register('trayManager', trayManager)
  container.markInitialized()

  setupIpcHandlers(authService)

  if (!isDev) {
    new AutoUpdaterService()
  }

  new CrashReporter()
  new PowerMonitorService(localServer)

  logger.info('Main', 'All services initialized')
}

async function performGracefulShutdown(): Promise<void> {
  logger.info('Main', 'Graceful shutdown initiated')

  const mainWindow = windowManager?.getMainWindow()
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      await new Promise<void>((resolve) => {
        mainWindow.webContents.send('app:before-quit')
        const timeout = setTimeout(resolve, 2000)
        ipcMain.once('app:quit-ready', () => {
          clearTimeout(timeout)
          resolve()
        })
      })
    } catch {
      // Renderer may already be destroyed
    }
  }

  try {
    await performAutoBackup()
  } catch (error) {
    logger.error('Main', 'Auto-backup failed during shutdown', error)
  }

  if (windowManager) {
    windowManager.destroy()
  }
  globalShortcut.unregisterAll()
  if (localServer) {
    localServer.kill()
  }
  if (authService) {
    authService.destroy()
  }
  if (trayManager) {
    trayManager.destroy()
  }

  await logger.destroy()
}

const gotLock = app.requestSingleInstanceLock()

if (!gotLock) {
  app.quit()
} else {
  ProtocolHandler.register()

  app.on('render-process-gone', (_event, webContents, details) => {
    logger.error('Main', 'Renderer process gone', { reason: details.reason, exitCode: details.exitCode })
    const window = BrowserWindow.fromWebContents(webContents)
    if (window && !window.isDestroyed()) {
      window.webContents.send('renderer:error', { reason: details.reason })
    }
  })

  app.on('child-process-gone', (_event, details) => {
    logger.error('Main', 'Child process gone', {
      type: details.type,
      reason: details.reason,
      exitCode: details.exitCode,
    })
  })

  app.on('second-instance', (_event, argv) => {
    if (windowManager) {
      try {
        const window = windowManager.getMainWindow()
        if (window) {
          if (window.isMinimized()) window.restore()
          window.focus()
        }
      } catch {
        // Window not created yet
      }
    }
    
    // Handle deep link on Windows/Linux
    if (process.platform !== 'darwin') {
      const protocolArg = argv.find((arg) => arg.startsWith('gnovium-auth://'))
      if (protocolArg) {
        ProtocolHandler.handleUrl(protocolArg)
      }
    }
  })

  app.on('open-file', (_event, filePath) => {
    if (windowManager) {
      try {
        const mainWindow = windowManager.getMainWindow()
        if (mainWindow && !mainWindow.isDestroyed()) {
          ProtocolHandler.handleFileOpen(filePath)
        } else {
          pendingFilePath = filePath
        }
      } catch {
        pendingFilePath = filePath
      }
    } else {
      pendingFilePath = filePath
    }
  })

  // Global error handlers
  process.on('uncaughtException', (error) => {
    logger.error('Main', 'Uncaught exception', { message: error.message, stack: error.stack })
  })

  process.on('unhandledRejection', (reason) => {
    logger.error('Main', 'Unhandled promise rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
    })
  })

  app.whenReady().then(async () => {
    await logger.init()
    logger.info('Main', `App starting (dev: ${isDev})`)

    app.on('browser-window-created', (_, window) => {
      if (isDev) {
        try {
          const isMainWindow = window === windowManager?.getMainWindow()
          if (isMainWindow) {
            window.webContents.openDevTools({ mode: 'detach' })
          }
        } catch {
          // getMainWindow() throws during BrowserWindow construction
          // (before this.window is assigned). Safe to ignore.
        }
      }
    })

    initializeServices()
    await windowManager.init()

    try {
      // Step 2: Load settings
      const settings = await readSettings()
      if (settings.advanced?.log_level) {
        logger.setLevel(settings.advanced.log_level)
      }
      logger.info('Main', 'Settings loaded')

      // Step 3: Start Flask backend (with retry)
      let serverStarted = false
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await localServer.start()
          serverStarted = true
          break
        } catch (err) {
          logger.warn('Main', `Server start attempt ${attempt}/3 failed`, err)
          if (attempt < 3) {
            await new Promise((r) => setTimeout(r, 2000 * attempt))
          }
        }
      }
      if (!serverStarted) {
        throw new Error('Flask server failed to start after 3 attempts')
      }
      logger.info('Main', 'Local Flask server started')

      // Step 5: AI model warmup (stub — no local runtime yet)
      if (settings.ai?.model_path) {
        logger.info('Main', `AI model configured: ${settings.ai.model_path} — warmup deferred to runtime`)
      }

      // Step 6: SQLite init — delegated to Flask, verify health
      logger.info('Main', 'SQLite managed by Flask backend')

      // Step 7: Restore window (before token load so user sees UI immediately)
      windowManager.restoreOrCreateWindow()

      // Step 8: Load tokens, validate, refresh
      const loaded = await authService.loadFromStorage()
      if (loaded) {
        logger.info('Main', 'Auth tokens loaded from encrypted storage')
        const refreshed = await authService.refreshTokens()
        if (!refreshed) {
          logger.info('Main', 'Token refresh failed — user will need to re-authenticate')
        }
      } else {
        logger.info('Main', 'No stored auth tokens — user will authenticate via webview')
      }

      // Step 9: Restore last workspace
      const mainWindow = windowManager.getMainWindow()
      if (!mainWindow) {
        throw new Error('Window not available after restoreOrCreateWindow')
      }

      const lastWorkspaceId = settings.general?.startup_behavior === 'last_workspace'
        ? (settings as Partial<AppSettings> & { last_workspace_id?: string }).last_workspace_id
        : undefined
      if (lastWorkspaceId) {
        mainWindow.webContents.send('workspace:restore-last', lastWorkspaceId)
      }

      const pendingCode = ProtocolHandler.flushPendingCode()
      if (pendingCode) {
        mainWindow.webContents.send('auth:code-received', { code: pendingCode })
      }

      if (pendingFilePath) {
        ProtocolHandler.handleFileOpen(pendingFilePath)
        pendingFilePath = null
      }

      registerGlobalShortcuts()

      new MenuBuilder(mainWindow).buildMenu()
      trayManager.create()
    } catch (error) {
      logger.error('Main', 'Failed to start local server', error)

      try {
        const mainWindow = windowManager.restoreOrCreateWindow()
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('server:start-failed', {
            message: error instanceof Error ? error.message : 'Unknown startup error',
          })
        }
      } catch (recoveryError) {
        logger.error('Main', 'Failed to recover window after startup error', recoveryError)
      }
    }
  })

let isQuitting = false

app.on('will-quit', (event) => {
  if (isQuitting) return
  event.preventDefault()
  isQuitting = true
  performGracefulShutdown()
    .catch((error) => logger.error('Main', 'Graceful shutdown error', error))
    .finally(() => { app.quit() })
})

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('activate', () => {
    if (windowManager) {
      windowManager.restoreOrCreateWindow()
    }
  })
}
