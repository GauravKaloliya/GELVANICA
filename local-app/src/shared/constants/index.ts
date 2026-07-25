// Timeouts
export const FLASK_TIMEOUT_MS = 30_000
export const IPC_RATE_LIMIT_WINDOW_MS = 1_000
export const IPC_RATE_LIMIT_MAX = 100
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes
export const WINDOW_STATE_DEBOUNCE_MS = 500
export const LOG_FLUSH_INTERVAL_MS = 5_000
export const MAX_LOG_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
export const MAX_LOG_FILES = 10
export const HEALTH_CHECK_INTERVAL_MS = 10_000
export const RECONNECT_INTERVAL_MS = 3_000

// Limits
export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024 // 100MB
export const MAX_REQUEST_BODY_BYTES = 10 * 1024 * 1024 // 10MB
export const MAX_CONCURRENT_UPLOADS = 10
export const MAX_ENTITY_DEPTH = 10
export const MAX_WORKSPACE_NAME_LENGTH = 200
export const MAX_ENTITY_TITLE_LENGTH = 500
export const MAX_TAG_NAME_LENGTH = 50
export const MAX_BLOCK_CONTENT_LENGTH = 50_000
export const MAX_COMMENT_LENGTH = 10_000
export const MAX_DESCRIPTION_LENGTH = 2_000
export const MAX_FILENAME_LENGTH = 255
export const MAX_SETTINGS_KEY_LENGTH = 100

// Retry
export const MAX_RETRIES = 3
export const INITIAL_RETRY_DELAY_MS = 500

// Crypto
export const AES_ALGORITHM = 'aes-256-gcm'
export const SALT_LENGTH = 16
export const IV_LENGTH = 12
export const TAG_LENGTH = 16
export const KEY_LENGTH = 32
export const BACKUP_KEY_LENGTH = 32

// Regex
export const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export const AUTH_CODE_REGEX = /^[a-zA-Z0-9_-]{1,500}$/
export const SAFE_PATH_DIRS = ['userData', 'documents', 'downloads', 'temp'] as const

// Protocol
export const PROTOCOL_SCHEME = 'gnovium-auth'
export const AUTH_CALLBACK_PATH = '/callback'

// UI
export const MIN_WINDOW_WIDTH = 800
export const MIN_WINDOW_HEIGHT = 600
export const DEFAULT_WINDOW_WIDTH = 1280
export const DEFAULT_WINDOW_HEIGHT = 800
