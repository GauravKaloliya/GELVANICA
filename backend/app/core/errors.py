from typing import Optional

# ── Error code constants ──────────────────────────────────────────────
BAD_REQUEST = "bad_request"
VALIDATION_ERROR = "validation_error"
INVALID_EMAIL = "invalid_email"
INVALID_FILE_TYPE = "invalid_file_type"
PAYLOAD_TOO_LARGE = "payload_too_large"
INVALID_REQUEST_BODY = "invalid_request_body"
CODE_ALREADY_USED = "code_already_used"
CODE_EXPIRED = "code_expired"
INVALID_ARCHIVE = "invalid_archive"
ORIGIN_MISMATCH = "origin_mismatch"
DECRYPTION_FAILED = "decryption_failed"
QUOTA_EXCEEDED = "quota_exceeded"
UPLOAD_ERROR = "upload_error"

UNAUTHORIZED = "unauthorized"
TOKEN_EXPIRED = "token_expired"
INVALID_TOKEN = "invalid_token"
TOKEN_REVOKED = "token_revoked"
WRONG_TOKEN = "wrong_token"
CSRF_ERROR = "csrf_error"
INVALID_CREDENTIALS = "invalid_credentials"
ACCOUNT_LOCKED = "account_locked"

FORBIDDEN = "forbidden"
NOT_FOUND = "not_found"
CONFLICT = "conflict"
UNSUPPORTED_MEDIA_TYPE = "unsupported_media_type"
RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
INTERNAL_ERROR = "internal_error"
NOT_IMPLEMENTED = "not_implemented"
BAD_GATEWAY = "bad_gateway"
SERVICE_DEGRADED = "service_degraded"


class ApiError(Exception):
    def __init__(
        self,
        message: str,
        status_code: int = 400,
        code: str = "bad_request",
        details: Optional[dict] = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code
        self.details = details


class NotFoundError(ApiError):
    def __init__(self, message: str = "Resource not found", details: Optional[dict] = None):
        super().__init__(message, 404, "not_found", details)


class ForbiddenError(ApiError):
    def __init__(self, message: str = "Forbidden", details: Optional[dict] = None):
        super().__init__(message, 403, "forbidden", details)


class ConflictError(ApiError):
    def __init__(self, message: str = "Conflict", details: Optional[dict] = None):
        super().__init__(message, 409, "conflict", details)


class UnauthorizedError(ApiError):
    def __init__(self, message: str = "Authentication required", details: Optional[dict] = None):
        super().__init__(message, 401, "unauthorized", details)


class ValidationError(ApiError):
    def __init__(self, message: str = "Validation failed", details: Optional[dict] = None):
        super().__init__(message, 422, "validation_error", details)


class RateLimitError(ApiError):
    def __init__(self, message: str = "Rate limit exceeded", details: Optional[dict] = None):
        super().__init__(message, 429, "rate_limit_exceeded", details)


class UnsupportedMediaTypeError(ApiError):
    def __init__(self, message: str = "Unsupported media type", details: Optional[dict] = None):
        super().__init__(message, 415, "unsupported_media_type", details)


class NotImplementedError(ApiError):
    def __init__(self, message: str = "Not implemented", details: Optional[dict] = None):
        super().__init__(message, 501, "not_implemented", details)


class BadGatewayError(ApiError):
    def __init__(self, message: str = "Bad gateway", details: Optional[dict] = None):
        super().__init__(message, 502, "bad_gateway", details)


class PayloadTooLargeError(ApiError):
    def __init__(self, message: str = "Request body exceeds limit", details: Optional[dict] = None):
        super().__init__(message, 413, "payload_too_large", details)


class InternalError(ApiError):
    def __init__(self, message: str = "Internal server error", details: Optional[dict] = None):
        super().__init__(message, 500, "internal_error", details)


class ServiceDegradedError(ApiError):
    def __init__(self, message: str = "Service degraded", details: Optional[dict] = None):
        super().__init__(message, 503, "service_degraded", details)


class AccountLockedError(ApiError):
    def __init__(self, message: str = "Account locked due to too many failed attempts", details: Optional[dict] = None):
        super().__init__(message, 401, "account_locked", details)


class WrongTokenError(ApiError):
    def __init__(self, message: str = "Wrong token type", details: Optional[dict] = None):
        super().__init__(message, 401, "wrong_token", details)
