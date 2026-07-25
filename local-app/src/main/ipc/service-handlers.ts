// Re-exports for backward compatibility — split into crypto.ts, app-handlers.ts, backup-handlers.ts
export { encryptData, decryptData } from '../crypto'
export { registerAppHandlers } from './app-handlers'
export { performAutoBackup } from './backup-handlers'
