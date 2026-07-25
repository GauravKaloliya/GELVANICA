import { BrowserWindow, screen, app } from 'electron'
import { join } from 'path'
import { readFile, writeFile } from 'fs/promises'
import { logger } from './logger'
import { env } from '@main/env'

const isDev = !app.isPackaged

interface WindowState {
  x: number | null
  y: number | null
  width: number
  height: number
  is_maximized: boolean
  is_fullscreen: boolean
}

const DEFAULT_STATE: WindowState = {
  x: null,
  y: null,
  width: 1280,
  height: 800,
  is_maximized: false,
  is_fullscreen: false,
}

const MIN_WIDTH = 800
const MIN_HEIGHT = 600

function getStatePath(): string {
  return join(app.getPath('userData'), 'window-state.json')
}

async function loadWindowState(): Promise<WindowState> {
  const statePath = getStatePath()
  try {
    const data = await readFile(statePath, 'utf-8')
    const parsed = JSON.parse(data) as Partial<WindowState>
    return { ...DEFAULT_STATE, ...parsed }
  } catch {
    return { ...DEFAULT_STATE }
  }
}

let pendingSave: ReturnType<typeof setTimeout> | null = null

async function saveWindowState(state: WindowState): Promise<void> {
  if (pendingSave) return
  pendingSave = setTimeout(() => {
    pendingSave = null
    const statePath = getStatePath()
    writeFile(statePath, JSON.stringify(state, null, 2), 'utf-8').catch((error) => {
      logger.error('WindowManager', 'Failed to save window state', error)
    })
  }, 500)
}

export class WindowManager {
  private window: BrowserWindow | null = null
  private state: WindowState = { ...DEFAULT_STATE }

  async init(): Promise<void> {
    this.state = await loadWindowState()
  }

  getMainWindow(): BrowserWindow | null {
    return this.window
  }

  restoreOrCreateWindow(): BrowserWindow {
    if (this.window && !this.window.isDestroyed()) {
      this.window.show()
      this.window.focus()
      return this.window
    }

    const { width, height, x, y, is_maximized, is_fullscreen } = this.state

    const display = screen.getDisplayMatching({
      x: x ?? 0,
      y: y ?? 0,
      width: width,
      height: height,
    })
    const { bounds } = display

    const windowX = x !== null ? Math.min(x, bounds.x + bounds.width - MIN_WIDTH) : undefined
    const windowY = y !== null ? Math.min(y, bounds.y + bounds.height - MIN_HEIGHT) : undefined

    this.window = new BrowserWindow({
      x: windowX,
      y: windowY,
      width: Math.max(width, MIN_WIDTH),
      height: Math.max(height, MIN_HEIGHT),
      minWidth: MIN_WIDTH,
      minHeight: MIN_HEIGHT,
      show: false,
      title: 'GNOVIUM',
      icon: join(__dirname, '../../resources/icon.png'),
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        spellcheck: true,
        devTools: isDev,
        webviewTag: false,
        webSecurity: true,
        allowRunningInsecureContent: false,
        experimentalFeatures: false,
      },
    })

    if (is_maximized) {
      this.window.maximize()
    }

    if (is_fullscreen) {
      this.window.setFullScreen(true)
    }

    this.window.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      let csp: string

      if (isDev) {
        const cloudWebOrigin = `http://localhost:${env.CLOUD_WEB_PORT}`
        const rendererOrigin = `http://localhost:${env.DEV_PORT}`
        csp = [
          `default-src 'self' ${rendererOrigin} ${cloudWebOrigin} http://127.0.0.1:* http://localhost:* ws://localhost:*`,
          `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${rendererOrigin} ${cloudWebOrigin} http://localhost:*`,
          `style-src 'self' 'unsafe-inline' ${rendererOrigin} ${cloudWebOrigin}`,
          `img-src 'self' blob: data: ${rendererOrigin} ${cloudWebOrigin} http://localhost:*`,
          `font-src 'self' data: ${rendererOrigin} ${cloudWebOrigin}`,
          `connect-src 'self' http://127.0.0.1:* http://localhost:* ws://localhost:* ${rendererOrigin} ${cloudWebOrigin}`,
          `worker-src 'self' blob: ${rendererOrigin} ${cloudWebOrigin}`,
          `media-src 'self' blob:`,
          `frame-src 'none'`,
          `base-uri 'self'`,
          `form-action 'self'`,
        ].join('; ')
      } else {
        csp = [
          "default-src 'self'",
          "script-src 'self'",
          "style-src 'self' 'unsafe-inline'",
          "style-src-attr 'unsafe-inline'",
          "img-src 'self' blob:",
          "font-src 'self' data:",
          `connect-src 'self' http://${env.FLASK_HOST}:${env.FLASK_PORT} http://127.0.0.1:${env.FLASK_PORT} ws://localhost:${env.FLASK_PORT}`,
          "worker-src 'self' blob:",
          "media-src 'self' blob:",
          "frame-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "navigate-to 'self'",
          "prefetch-src 'self'",
          "script-src-elem 'self'",
        ].join('; ')
      }

      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [csp],
        },
      })
    })

    // Deny all permission requests (camera, microphone, geolocation, etc.)
    this.window.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => {
      callback(false)
    })

    this.window.webContents.session.setPermissionCheckHandler(() => {
      return false
    })

    // Disable webview tag
    this.window.webContents.on('dom-ready', () => {
      this.window?.webContents.executeJavaScript('delete window.__webview__').catch(() => {})
    })

    this.window.on('ready-to-show', () => {
      this.window?.show()
    })

    this.window.on('resize', () => {
      this.persistBounds()
    })

    this.window.on('move', () => {
      this.persistBounds()
    })

    this.window.on('maximize', () => {
      this.state.is_maximized = true
      this.persistBounds()
    })

    this.window.on('unmaximize', () => {
      this.state.is_maximized = false
      this.persistBounds()
    })

    this.window.on('enter-full-screen', () => {
      this.state.is_fullscreen = true
    })

    this.window.on('leave-full-screen', () => {
      this.state.is_fullscreen = false
    })

    this.window.on('close', (event) => {
      if (!this.window || this.window.isDestroyed()) return
      
      event.preventDefault()
      this.persistBounds()
      
      // Ask renderer to save before closing
      this.window.webContents.send('app:before-quit')
      
      // Set a timeout to force-destroy if renderer doesn't respond
      const forceQuitTimeout = setTimeout(() => {
        this.window?.destroy()
        this.window = null
      }, 2000)
      
      // Listen for renderer's quit-ready signal
      const quitHandler = (): void => {
        clearTimeout(forceQuitTimeout)
        this.window?.destroy()
        this.window = null
      }
      
      this.window.webContents.once('ipc-message', (_event, channel) => {
        if (channel === 'app:quit-ready') quitHandler()
      })
    })

    if (isDev) {
      this.window.loadURL(`http://localhost:${env.DEV_PORT}`)
    } else {
      this.window.loadFile(join(__dirname, '../renderer/index.html'))
    }

    return this.window
  }

  private persistBounds(): void {
    if (!this.window || this.window.isDestroyed()) return

    if (this.window.isMaximized()) {
      this.state.is_maximized = true
    } else {
      this.state.is_maximized = false
      const bounds = this.window.getBounds()
      this.state.x = bounds.x
      this.state.y = bounds.y
      this.state.width = bounds.width
      this.state.height = bounds.height
    }

    this.state.is_fullscreen = this.window.isFullScreen()
    void saveWindowState(this.state)
  }

  destroy(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.persistBounds()
      this.window.destroy()
      this.window = null
    }
  }
}
