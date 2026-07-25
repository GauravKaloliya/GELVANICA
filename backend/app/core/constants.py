# Allowed file extensions
ALLOWED_EXTENSIONS = frozenset({
    "txt", "md", "pdf", "png", "jpg", "jpeg", "gif", "svg", "csv", "json", "xlsx", "docx",
    "webp", "bmp", "tiff", "tif", "ico", "doc", "xls", "ppt", "pptx",
    "xml", "yaml", "yml", "toml", "ini", "cfg",
    "mp4", "mov", "avi", "webm", "mkv",
    "mp3", "wav", "ogg", "flac", "aac", "m4a",
    "zip", "tar", "gz", "7z", "rar",
})

ALLOWED_MIMETYPES = {
    "text/plain", "text/markdown", "text/csv", "text/xml", "text/yaml",
    "application/pdf", "application/json",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-excel", "application/vnd.ms-word", "application/vnd.ms-powerpoint",
    "application/zip", "application/x-tar", "application/gzip", "application/x-7z-compressed", "application/x-rar-compressed",
    "image/png", "image/jpeg", "image/gif", "image/svg+xml", "image/webp", "image/bmp", "image/tiff", "image/x-icon",
    "video/mp4", "video/quicktime", "video/x-msvideo", "video/webm", "video/x-matroska",
    "audio/mpeg", "audio/wav", "audio/ogg", "audio/flac", "audio/aac", "audio/mp4", "audio/x-m4a",
}
# Pagination
DEFAULT_PAGE_SIZE = 30
MAX_PAGE_SIZE = 100

# Block positions
BLOCK_POSITION_STEP = 1000

# Storage
DEFAULT_STORAGE_QUOTA = 1024 * 1024 * 1024  # 1GB
DEFAULT_MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
IMAGE_PROCESSING_THRESHOLD = 10 * 1024 * 1024  # 10MB
LARGE_FILE_THRESHOLD = 50 * 1024 * 1024  # 50MB
MAX_REQUEST_BYTES = 10 * 1024 * 1024  # 10MB
TEXT_EXTRACTION_MAX_LENGTH = 100000

# Rate limiting (formatted for @limiter.limit())
RATE_LIMIT_STRICT = "30/minute"
RATE_LIMIT_STANDARD = "120/minute"
RATE_LIMIT_LENIENT = "300/minute"
RATE_LIMIT_DESTRUCTIVE = "10/minute"
# Covers: /auth/register, /auth/login, /auth/google, /auth/authorize
RATE_LIMIT_AUTH_WRITE = "5/minute"
RATE_LIMIT_FILE_UPLOAD = "10/minute"
RATE_LIMIT_PASSWORD_RESET = "3/minute"
RATE_LIMIT_FILE_DOWNLOAD = "60/minute"

# Backup
BACKUP_MAX_RETRIES = 3
EXPORT_SERIALIZATION_MAX_DEPTH = 10

# Graph
GRAPH_MAX_ITERATIONS = 10000
GRAPH_DEFAULT_DEPTH = 2

# Processing
PROCESSING_PIPELINE_MAX_JOBS = 50
QUARANTINE_DEFAULT_EXPIRATION_DAYS = 30

# Monitoring
METRICS_MAX_DURATION_SAMPLES = 10000
