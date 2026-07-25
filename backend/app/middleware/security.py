from urllib.parse import urlparse

from flask import request

from app.core.constants import MAX_REQUEST_BYTES
from app.core.errors import ApiError, ForbiddenError
from app.core.security_logger import security_logger


JSON_METHODS = {"POST", "PUT", "PATCH"}
PUBLIC_PREFIXES = ("/health",)


def install_security_middleware(app):
    @app.before_request
    def enforce_request_security():
        if request.method == "OPTIONS":
            return
        if not _host_allowed(app):
            security_logger.log_suspicious_request(request.path, "host_not_allowed", request.remote_addr or "unknown")
            raise ForbiddenError("Host is not allowed")
        if not _origin_allowed(app):
            security_logger.log_suspicious_request(request.path, "origin_not_allowed", request.remote_addr or "unknown")
            raise ForbiddenError("Origin is not allowed")
        if request.content_length and request.content_length > MAX_REQUEST_BYTES:
            security_logger.log_suspicious_request(request.path, "payload_too_large", request.remote_addr or "unknown")
            raise ApiError(
                f"Request body exceeds {MAX_REQUEST_BYTES} byte limit",
                413,
                "payload_too_large",
            )
        if request.method in JSON_METHODS:
            _enforce_content_type()
            _reject_null_bytes()

    @app.after_request
    def set_security_headers(response):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
        response.headers.setdefault("Cross-Origin-Resource-Policy", "same-site")
        response.headers.setdefault("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
        response.headers.setdefault("X-XSS-Protection", "1; mode=block")
        if request.is_secure:
            response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        return response


def _host_allowed(app):
    allowed_hosts = app.config.get("ALLOWED_HOSTS") or []
    host = request.host
    if not host:
        return False
    if host.startswith("["):
        host = host.split("]")[0].lstrip("[").strip()
    else:
        host = host.split(":", 1)[0]
    if not host:
        return False
    return _matches_pattern(host, allowed_hosts)


def _origin_allowed(app):
    origin = request.headers.get("Origin")
    if not origin:
        return True
    allowed = app.config.get("TRUSTED_ORIGINS") or []
    parsed_origin = urlparse(origin.rstrip("/"))
    if not parsed_origin.scheme or not parsed_origin.netloc:
        return False
    if parsed_origin.scheme not in ("http", "https"):
        return False
    origin_host = parsed_origin.hostname
    if not origin_host:
        return False
    for item in allowed:
        parsed_allowed = urlparse(item.rstrip("/"))
        allowed_scheme = parsed_allowed.scheme
        allowed_host = parsed_allowed.hostname
        if not allowed_host:
            continue
        if allowed_scheme and allowed_scheme != parsed_origin.scheme:
            continue
        if _matches_pattern(origin_host, [allowed_host]):
            return True
    return False


def _matches_pattern(value, patterns):
    value = value.lower()
    for pattern in patterns:
        pattern = pattern.lower()
        if pattern == value:
            return True
        if pattern.startswith("*.") and value.endswith(pattern[1:]):
            return True
    return False


def _enforce_content_type():
    if request.path.startswith(PUBLIC_PREFIXES):
        return
    if not request.content_length:
        return
    if request.mimetype in {"application/json", "multipart/form-data"}:
        return
    security_logger.log_suspicious_request(request.path, "unsupported_content_type", request.remote_addr or "unknown")
    raise ApiError("Unsupported content type", 415, "unsupported_media_type")


def _reject_null_bytes():
    if not request.is_json:
        return
    raw = request.get_data(cache=True)
    if b"\x00" in raw:
        security_logger.log_suspicious_request(request.path, "null_bytes_detected", request.remote_addr or "unknown")
        raise ApiError("Request body contains invalid characters", 400, "invalid_request_body")
