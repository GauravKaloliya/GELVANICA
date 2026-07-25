import { ValidationError } from '../../shared/errors'
import { UUID_V4_REGEX, MAX_FILENAME_LENGTH } from '../../shared/constants'

export function requireUuid(value: unknown, label = 'ID'): string {
  if (typeof value !== 'string' || !UUID_V4_REGEX.test(value)) {
    throw new ValidationError(label, 'must be a valid UUID v4')
  }
  return value
}

export function requireString(value: unknown, label: string, options?: { minLength?: number; maxLength?: number }): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(label, 'must be a non-empty string')
  }
  if (options?.minLength !== undefined && value.length < options.minLength) {
    throw new ValidationError(label, `must be at least ${options.minLength} characters`)
  }
  if (options?.maxLength !== undefined && value.length > options.maxLength) {
    throw new ValidationError(label, `must be at most ${options.maxLength} characters`)
  }
  return value
}

export function requireNumber(value: unknown, label: string, min?: number, max?: number): number {
  const num = typeof value === 'number' ? value : Number(value)
  if (isNaN(num)) throw new ValidationError(label, 'must be a number')
  if (min !== undefined && num < min) throw new ValidationError(label, `must be >= ${min}`)
  if (max !== undefined && num > max) throw new ValidationError(label, `must be <= ${max}`)
  return num
}

export function sanitizePath(value: string, maxLength = 500): string {
  return value.replace(/\0/g, '').slice(0, maxLength)
}

export function requireWorkspaceId(value: unknown): string {
  return requireUuid(value, 'workspace_id')
}

/** Strip HTML tags and dangerous characters from user input. */
export function sanitizeInput(value: string, maxLength = 10000): string {
  return value
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/javascript:/gi, '') // Strip javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Strip event handlers
    .replace(/\0/g, '') // Strip null bytes
    .trim()
    .slice(0, maxLength)
}

/** Validate filename is safe (no path traversal, reasonable length). */
export function requireSafeFilename(value: unknown, label = 'filename'): string {
  const str = requireString(value, label, { minLength: 1, maxLength: MAX_FILENAME_LENGTH })
  if (str.includes('..') || str.includes('/') || str.includes('\\')) {
    throw new ValidationError(label, 'must not contain path separators')
  }
  return str
}

/** Validate max depth for nested entity creation. */
export function requireMaxDepth(depth: unknown, maxDepth = 10): number {
  const num = requireNumber(depth, 'depth', 0, 100)
  if (num > maxDepth) {
    throw new ValidationError('depth', `must not exceed ${maxDepth} levels`)
  }
  return num
}

/** Known file magic bytes for common types. */
const MAGIC_BYTES: Array<{ mime: string; bytes: number[]; offset: number }> = [
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47], offset: 0 },
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff], offset: 0 },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38], offset: 0 },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF (WebP starts with RIFF)
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46], offset: 0 }, // %PDF
  { mime: 'application/zip', bytes: [0x50, 0x4b, 0x03, 0x04], offset: 0 },
  { mime: 'application/gzip', bytes: [0x1f, 0x8b], offset: 0 },
]

/** Allowed MIME types for upload. */
const ALLOWED_MIME_TYPES = new Set([
  'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf', 'application/zip', 'application/gzip',
  'text/plain', 'text/markdown', 'text/csv', 'text/html',
  'application/json', 'application/xml',
  'video/mp4', 'video/webm', 'video/quicktime',
  'audio/mpeg', 'audio/wav', 'audio/ogg',
])

export function validateFileMagicBytes(buffer: ArrayBuffer, declaredType?: string): string {
  const bytes = new Uint8Array(buffer.slice(0, 16))

  for (const magic of MAGIC_BYTES) {
    const match = magic.bytes.every((b, i) => bytes[magic.offset + i] === b)
    if (match) return magic.mime
  }

  // If no magic bytes match, fall back to declared type or octet-stream
  return declaredType ?? 'application/octet-stream'
}

export function isAllowedFileType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.has(mimeType)
}

export function requireAllowedFileType(mimeType: string): void {
  if (!isAllowedFileType(mimeType)) {
    throw new ValidationError('file', `File type ${mimeType} is not allowed`)
  }
}
