import os
from datetime import timedelta
from pathlib import Path
from urllib.parse import urlparse, urlunparse

from dotenv import load_dotenv

from app.core.constants import DEFAULT_STORAGE_QUOTA, DEFAULT_MAX_FILE_SIZE, QUARANTINE_DEFAULT_EXPIRATION_DAYS
from app.core.logging import logger as log

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")

GNOVIUM_MODE = os.getenv("GNOVIUM_MODE", "local").strip().lower()

if GNOVIUM_MODE == "cloud":
    load_dotenv(BASE_DIR / ".env.cloud", override=False)
else:
    load_dotenv(BASE_DIR / ".env.local", override=False)


def is_production():
    return GNOVIUM_MODE == "cloud" or os.getenv("VERCEL") == "1"


def required_env(name):
    value = os.getenv(name)
    if value is None or value == "":
        raise RuntimeError(f"{name} is required")
    return value


def env_bool(name, default=False):
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_list(name, default=""):
    value = os.getenv(name, default)
    if not value:
        return []
    value = value.strip().strip('"').strip("'")
    return [item.strip().strip('"').strip("'") for item in value.split(",") if item.strip()]


def database_url():
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        if GNOVIUM_MODE == "cloud":
            raise RuntimeError("DATABASE_URL is required in cloud mode")
        db_dir = BASE_DIR / "data"
        db_dir.mkdir(parents=True, exist_ok=True)
        sqlite_path = db_dir / "local.db"
        return f"sqlite:///{sqlite_path}"
    parsed = urlparse(url)
    if parsed.scheme == "postgres":
        new_parsed = parsed._replace(scheme="postgresql")
        log.debug("Rewriting database URL: %s -> %s", url, urlunparse(new_parsed))
        parsed = new_parsed
    if "neon.tech" in (parsed.hostname or ""):
        new_parsed = parsed._replace(scheme="postgresql+psycopg")
        if "sslmode" not in (new_parsed.query or ""):
            sep = "&" if new_parsed.query else "?"
            new_parsed = new_parsed._replace(query=f"{new_parsed.query}{sep}sslmode=require")
        log.debug("Rewriting database URL: %s -> %s", url, urlunparse(new_parsed))
        parsed = new_parsed
    url = urlunparse(parsed)
    return url


def is_sqlite():
    url = os.environ.get("DATABASE_URL", "")
    return not url or url.startswith("sqlite")


def redis_url():
    url = os.getenv("REDIS_URL", "")
    if not url:
        return ""
    if "upstash.io" in url and url.startswith("redis://"):
        return url.replace("redis://", "rediss://", 1)
    return url


class Config:
    # NOTE: GNOVIUM_MODE is overridden by subclasses (LocalConfig/CloudConfig) with hardcoded values.
    # The base class default is only used when no subclass is loaded.
    GNOVIUM_MODE = os.getenv("GNOVIUM_MODE", "local")
    VERCEL_DEPLOYMENT = os.getenv("VERCEL", "0") == "1"
    SECRET_KEY = os.getenv("SECRET_KEY", "")
    REDIS_URL = redis_url()
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "")
    try:
        JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=int(os.getenv("JWT_ACCESS_MINUTES", "30")))
    except (ValueError, TypeError):
        JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=30)
    try:
        JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=int(os.getenv("JWT_REFRESH_DAYS", "30")))
    except (ValueError, TypeError):
        JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    SQLALCHEMY_DATABASE_URI = database_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = env_list("CORS_ORIGINS", "http://localhost:3000")
    TRUSTED_ORIGINS = list(CORS_ORIGINS)
    ALLOWED_HOSTS = env_list("ALLOWED_HOSTS", "127.0.0.1,localhost")
    ALLOWED_CLOUD_HOSTS = env_list("ALLOWED_CLOUD_HOSTS", "")

    try:
        MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", "104857600"))
    except (ValueError, TypeError):
        MAX_CONTENT_LENGTH = DEFAULT_MAX_FILE_SIZE
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
    AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
    AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    S3_BUCKET = os.getenv("S3_BUCKET", "")

    # Auth
    try:
        AUTH_CODE_EXPIRY_MINUTES = int(os.getenv("AUTH_CODE_EXPIRY_MINUTES", "5"))
    except (ValueError, TypeError):
        AUTH_CODE_EXPIRY_MINUTES = 5
    CLOUD_API_URL = os.getenv("CLOUD_API_URL", "")
    WEB_APP_URL = os.getenv("WEB_APP_URL", "https://app.gnovium.com")
    LOCAL_AUTH_ENABLED = env_bool("LOCAL_AUTH_ENABLED", False)

    # Storage limits
    try:
        LOCAL_STORAGE_QUOTA = int(os.getenv("LOCAL_STORAGE_QUOTA", str(DEFAULT_STORAGE_QUOTA)))
    except (ValueError, TypeError):
        LOCAL_STORAGE_QUOTA = DEFAULT_STORAGE_QUOTA
    try:
        MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", str(DEFAULT_MAX_FILE_SIZE)))
    except (ValueError, TypeError):
        MAX_FILE_SIZE = DEFAULT_MAX_FILE_SIZE
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "uploads")

    # ZIP encryption / HMAC signing
    ZIP_ENCRYPTION_KEY = os.getenv("ZIP_ENCRYPTION_KEY", "")
    ZIP_HMAC_KEY = os.getenv("ZIP_HMAC_KEY", "")

    # Processing
    CLAMAV_ENABLED = env_bool("CLAMAV_ENABLED", False)
    IMAGE_PROCESSING_ENABLED = env_bool("IMAGE_PROCESSING_ENABLED", True)
    DOCUMENT_EXTRACTION_ENABLED = env_bool("DOCUMENT_EXTRACTION_ENABLED", True)
    INLINE_FILE_PROCESSING = env_bool("INLINE_FILE_PROCESSING", True)

    # Cleanup
    ORPHAN_CLEANUP_ENABLED = env_bool("ORPHAN_CLEANUP_ENABLED", True)
    try:
        TEMP_EXPIRATION_DAYS = int(os.getenv("TEMP_EXPIRATION_DAYS", "7"))
    except (ValueError, TypeError):
        TEMP_EXPIRATION_DAYS = 7
    try:
        QUARANTINE_EXPIRATION_DAYS = int(os.getenv("QUARANTINE_EXPIRATION_DAYS", str(QUARANTINE_DEFAULT_EXPIRATION_DAYS)))
    except (ValueError, TypeError):
        QUARANTINE_EXPIRATION_DAYS = QUARANTINE_DEFAULT_EXPIRATION_DAYS
    try:
        BACKUP_RETENTION_DAYS = int(os.getenv("BACKUP_RETENTION_DAYS", "30"))
    except (ValueError, TypeError):
        BACKUP_RETENTION_DAYS = 30

    # Database pool
    DB_POOL_SIZE = int(os.getenv("DB_POOL_SIZE", "5"))
    DB_MAX_OVERFLOW = int(os.getenv("DB_MAX_OVERFLOW", "10"))
    DB_POOL_TIMEOUT = int(os.getenv("DB_POOL_TIMEOUT", "30"))
    DB_POOL_RECYCLE = int(os.getenv("DB_POOL_RECYCLE", "280"))
    AUTO_CREATE_TABLES = False
    REQUIRE_REDIS = False

    # Rate limiting
    RATELIMIT_DEFAULT = "1200 per minute"
    RATELIMIT_STORAGE_URI = ""

    # Caching defaults (overridden by subclasses)
    CACHE_TYPE = "SimpleCache"
    CACHE_DEFAULT_TIMEOUT = int(os.getenv("CACHE_DEFAULT_TIMEOUT", "300"))
    CACHE_REDIS_URL = ""
    CACHE_KEY_PREFIX = os.getenv("CACHE_KEY_PREFIX", "gnovium:")


class LocalConfig(Config):
    GNOVIUM_MODE = "local"
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///local.db")
    SQLALCHEMY_ENGINE_OPTIONS = {
        "connect_args": {"check_same_thread": False},
        "pool_pre_ping": True,
    }
    CORS_ORIGINS = env_list("CORS_ORIGINS", "http://localhost:3000")
    ALLOWED_HOSTS = env_list("ALLOWED_HOSTS", "localhost,127.0.0.1")
    RATELIMIT_DEFAULT = os.getenv("RATELIMIT_DEFAULT", "1200 per minute")
    RATELIMIT_STORAGE_URI = os.getenv("REDIS_URL") or "memory://"
    AUTO_CREATE_TABLES = env_bool("AUTO_CREATE_TABLES", False)
    REQUIRE_REDIS = env_bool("REQUIRE_REDIS", False)
    LOCAL_AUTH_ENABLED = env_bool("LOCAL_AUTH_ENABLED", True)
    WEB_APP_URL = os.getenv("WEB_APP_URL", "http://localhost:3000")
    SECRET_KEY = os.getenv("SECRET_KEY", "gnovium-local-dev-secret-key-change-in-production!!")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "gnovium-local-dev-key-change-in-production!!")
    PREFERRED_URL_SCHEME = "http"
    SESSION_COOKIE_SECURE = False
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    CACHE_TYPE = os.getenv("CACHE_TYPE", "SimpleCache")


class CloudConfig(Config):
    GNOVIUM_MODE = "cloud"
    _pool_size_raw = os.getenv("DB_POOL_SIZE", "5")
    _max_overflow_raw = os.getenv("DB_MAX_OVERFLOW", "10")
    _pool_timeout_raw = os.getenv("DB_POOL_TIMEOUT", "30")
    _pool_recycle_raw = os.getenv("DB_POOL_RECYCLE", "280")
    try:
        _pool_size = int(_pool_size_raw)
    except (ValueError, TypeError):
        _pool_size = 5
    try:
        _max_overflow = int(_max_overflow_raw)
    except (ValueError, TypeError):
        _max_overflow = 10
    try:
        _pool_timeout = int(_pool_timeout_raw)
    except (ValueError, TypeError):
        _pool_timeout = 30
    try:
        _pool_recycle = int(_pool_recycle_raw)
    except (ValueError, TypeError):
        _pool_recycle = 280
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_size": _pool_size,
        "max_overflow": _max_overflow,
        "pool_timeout": _pool_timeout,
        "pool_recycle": _pool_recycle,
    }
    CORS_ORIGINS = env_list("CORS_ORIGINS", "https://gnovium.com,https://www.gnovium.com,https://app.gnovium.com,https://api.gnovium.com")
    ALLOWED_HOSTS = env_list("ALLOWED_HOSTS", "gnovium.com,www.gnovium.com,app.gnovium.com,api.gnovium.com")
    RATELIMIT_DEFAULT = os.getenv("RATELIMIT_DEFAULT", "600 per minute")
    RATELIMIT_STORAGE_URI = redis_url()
    AUTO_CREATE_TABLES = env_bool("AUTO_CREATE_TABLES", False)
    REQUIRE_REDIS = env_bool("REQUIRE_REDIS", False)
    PREFERRED_URL_SCHEME = "https"
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    CACHE_TYPE = os.getenv("CACHE_TYPE", "RedisCache")
    CACHE_REDIS_URL = redis_url()


class TestingConfig(LocalConfig):
    TESTING = True
    REDIS_URL = ""
    GNOVIUM_MODE = os.getenv("GNOVIUM_MODE", "local").strip().lower()
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "test-only-not-for-production-32-bytes!!!!")
    SECRET_KEY = os.getenv("SECRET_KEY", "test-only-not-for-production-32-bytes!!!!")
    AUTO_CREATE_TABLES = False
    REQUIRE_REDIS = False
    CACHE_TYPE = "NullCache"
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite://")
    RATELIMIT_ENABLED = False
    RATELIMIT_STORAGE_URI = "memory://"
    ZIP_ENCRYPTION_KEY = os.getenv("ZIP_ENCRYPTION_KEY", "test-zip-encryption-key-32-bytes!!!!!!")
    ZIP_HMAC_KEY = os.getenv("ZIP_HMAC_KEY", "test-zip-hmac-key-for-testing-purposes!!!!!")


class CloudTestingConfig(CloudConfig):
    TESTING = True
    DEBUG = True
    GNOVIUM_MODE = "cloud"
    ZIP_ENCRYPTION_KEY = "cloud-test-zip-encrypt-key-32-bytes!!!!!!!"
    ZIP_HMAC_KEY = "cloud-test-zip-hmac-key-for-testing-purposes!!!!"


def get_config():
    # Dual-trigger: GNOVIUM_MODE=cloud (explicit) OR VERCEL=1 (Vercel deployment auto-sets this).
    # Either condition selects the CloudConfig (PostgreSQL/S3/Redis).
    # Default (no trigger) returns LocalConfig (SQLite/local filesystem).
    mode = os.getenv("GNOVIUM_MODE", "").strip().lower()
    if mode == "cloud" or os.getenv("VERCEL") == "1":
        return CloudConfig
    return LocalConfig


def validate_config():
    cloud = is_production()
    errors = []

    if cloud:
        if not os.getenv("SECRET_KEY", ""):
            errors.append("SECRET_KEY is required and must not be empty in cloud mode — set SECRET_KEY and JWT_SECRET_KEY environment variables before deploying to production")
        if not os.getenv("JWT_SECRET_KEY", ""):
            errors.append("JWT_SECRET_KEY is required and must not be empty in cloud mode — set SECRET_KEY and JWT_SECRET_KEY environment variables before deploying to production")
        if not os.getenv("DATABASE_URL"):
            errors.append("DATABASE_URL is required in cloud mode")
        if env_bool("REQUIRE_REDIS", False) and not os.getenv("REDIS_URL"):
            errors.append("REDIS_URL is required in cloud mode when REQUIRE_REDIS=true")

    if cloud:
        if not os.getenv("GOOGLE_CLIENT_ID"):
            log.warning("GOOGLE_CLIENT_ID is not set — Google OAuth will be unavailable")
        if not os.getenv("S3_BUCKET"):
            log.warning("S3_BUCKET is not set — S3 storage will be unavailable")
        if not os.getenv("ZIP_ENCRYPTION_KEY", ""):
            log.warning("ZIP_ENCRYPTION_KEY is not set — ZIP encryption/decryption will fail")
        if not os.getenv("ZIP_HMAC_KEY", ""):
            log.warning("ZIP_HMAC_KEY is not set — ZIP HMAC signing/verification will fail")

    if errors:
        raise RuntimeError("Configuration errors: " + "; ".join(errors))
