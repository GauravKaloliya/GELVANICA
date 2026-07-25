import { app, safeStorage } from 'electron'
import { readFile, writeFile, access } from 'fs/promises'
import { join } from 'path'
import { logger } from '../logger'

interface BackupKeys {
  key: string
  createdAt: string
  rotatedAt?: string
}

const KEYS_FILE = 'backup-keys.json'

function getKeysPath(): string {
  return join(app.getPath('userData'), KEYS_FILE)
}

export async function getCurrentBackupKey(): Promise<string> {
  try {
    const encrypted = await readFile(getKeysPath())
    const decrypted = safeStorage.decryptString(encrypted)
    const data = JSON.parse(decrypted) as BackupKeys
    return data.key
  } catch {
    // Generate new key
    const key = generateKey()
    await saveBackupKey(key)
    return key
  }
}

export async function rotateBackupKey(): Promise<string> {
  const oldKeyPath = getKeysPath() + '.old'

  // Backup current key
  try {
    const current = await readFile(getKeysPath())
    await writeFile(oldKeyPath, current)
  } catch {
    // No existing key
  }

  const newKey = generateKey()
  await saveBackupKey(newKey)
  return newKey
}

function generateKey(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

async function saveBackupKey(key: string): Promise<void> {
  if (!safeStorage.isEncryptionAvailable()) {
    logger.error('SecretRotation', 'Encryption not available')
    return
  }
  const data: BackupKeys = { key, createdAt: new Date().toISOString() }
  const encrypted = safeStorage.encryptString(JSON.stringify(data))
  await writeFile(getKeysPath(), encrypted)
}

export async function hasOldBackupKey(): Promise<boolean> {
  try {
    await access(getKeysPath() + '.old')
    return true
  } catch {
    return false
  }
}
