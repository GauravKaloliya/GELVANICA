import { app, BrowserWindow } from 'electron'
import { readFile } from 'fs/promises'
import { logger } from './logger'

const PROTOCOL_SCHEME = 'gnovium-auth'
const VALID_CALLBACK_PATHS = ['/callback', '/auth-callback']

export class ProtocolHandler {
  private static pendingCode: string | null = null

  static register(): void {
    if (process.defaultApp) {
      if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient(PROTOCOL_SCHEME, process.execPath, [
          process.argv[1]!,
        ])
      }
    } else {
      app.setAsDefaultProtocolClient(PROTOCOL_SCHEME)
    }

    if (process.platform === 'darwin') {
      app.on('open-url', (event, url) => {
        event.preventDefault()
        this.handleUrl(url)
      })
    }
  }

  static handleUrl(url: string): void {
    if (!this.isAuthUrl(url)) {
      logger.warn('ProtocolHandler', 'Invalid URL rejected:', url)
      return
    }

    try {
      const parsed = new URL(url)

      if (!VALID_CALLBACK_PATHS.includes(parsed.pathname)) {
        logger.warn('ProtocolHandler', 'Unknown callback path:', parsed.pathname)
        return
      }

      // Cloud web redirects with ?token=, older flows may use ?code=
      const code = parsed.searchParams.get('token') || parsed.searchParams.get('code')

      // Validate code format (alphanumeric + hyphens + underscores only)
      const CODE_REGEX = /^[a-zA-Z0-9_-]{1,500}$/
      if (code && !CODE_REGEX.test(code)) {
        logger.error('ProtocolHandler', 'Invalid code format rejected')
        return
      }

      const state = parsed.searchParams.get('state')
      if (!state) {
        logger.warn('ProtocolHandler', 'Missing state parameter (CSRF protection)')
        // Still allow — but log warning
      }

      if (!code) {
        logger.error('ProtocolHandler', 'Missing code/token in callback URL')
        return
      }

      const windows = BrowserWindow.getAllWindows()
      if (windows.length > 0) {
        const mainWindow = windows[0]!
        if (mainWindow.isDestroyed()) {
          this.pendingCode = code
          return
        }
        mainWindow.webContents.send('auth:code-received', { code })
        mainWindow.show()
        mainWindow.focus()
      } else {
        this.pendingCode = code
      }
    } catch (error) {
      logger.error('ProtocolHandler', 'Failed to parse callback URL:', error)
    }
  }

  static isAuthUrl(url: string): boolean {
    return url.startsWith(`${PROTOCOL_SCHEME}://`)
  }

  static flushPendingCode(): string | null {
    const code = this.pendingCode
    this.pendingCode = null
    return code
  }

  static async handleFileOpen(filePath: string): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8')
      const data = JSON.parse(content)

      if (data && typeof data === 'object' && (data.workspaces || data.entities || data.workspace_id)) {
        const windows = BrowserWindow.getAllWindows()
        if (windows.length > 0) {
          const mainWindow = windows[0]!
          if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send('file:import-requested', { filePath, data })
            mainWindow.show()
            mainWindow.focus()
          }
        }
      } else {
        logger.warn('ProtocolHandler', 'File does not contain valid workspace data:', filePath)
      }
    } catch (error) {
      logger.error('ProtocolHandler', 'Failed to open file:', error)
    }
  }
}
