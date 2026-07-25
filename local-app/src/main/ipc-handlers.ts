import { AuthService } from './auth-service'
import { setupMiddleware } from './ipc/handler-wrapper'
import { createDefaultMiddleware } from './ipc/middleware'
import { registerAuthHandlers } from './ipc/auth-handlers'
import { registerWindowHandlers } from './ipc/window-handlers'
import { registerFilesystemHandlers } from './ipc/filesystem-handlers'
import { registerClipboardHandlers } from './ipc/clipboard-handlers'
import { registerNotificationHandlers } from './ipc/notification-handlers'
import { registerSettingsHandlers } from './ipc/settings-handlers'
import { registerWorkspaceHandlers } from './ipc/workspace-handlers'
import { registerEntityHandlers } from './ipc/entity-handlers'
import { registerDataHandlers } from './ipc/data-handlers'
import { registerAppHandlers } from './ipc/app-handlers'
import { registerBackupHandlers, performAutoBackup } from './ipc/backup-handlers'
import { registerGraphHandlers } from './ipc/graph-handlers'
import { registerSearchHandlers } from './ipc/search-handlers'
import { registerAiHandlers } from './ipc/ai-handlers'
import { registerVersionHandlers } from './ipc/version-handlers'
import { registerGovernanceHandlers } from './ipc/governance-handlers'
import { registerActivityHandlers } from './ipc/activity-handlers'
import { registerDashboardHandlers } from './ipc/dashboard-handlers'
import { registerSyncHandlers } from './ipc/sync-handlers'

export function setupIpcHandlers(
  authService: AuthService,
): void {
  setupMiddleware(createDefaultMiddleware(() => authService.getTokens()))
  registerAuthHandlers(authService)
  registerWindowHandlers()
  registerFilesystemHandlers()
  registerClipboardHandlers()
  registerNotificationHandlers(authService)
  registerSettingsHandlers()
  registerWorkspaceHandlers(authService)
  registerEntityHandlers(authService)
  registerDataHandlers(authService)
  registerAppHandlers()
  registerBackupHandlers(authService)
  registerGraphHandlers(authService)
  registerSearchHandlers(authService)
  registerAiHandlers(authService)
  registerVersionHandlers(authService)
  registerGovernanceHandlers(authService)
  registerActivityHandlers(authService)
  registerDashboardHandlers(authService)
  registerSyncHandlers(authService)
}

export { performAutoBackup }
