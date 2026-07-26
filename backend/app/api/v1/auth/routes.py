import os
import re
from functools import wraps
from urllib.parse import urlparse

import requests as http_requests
from flask import Blueprint, Response, current_app, redirect, request, send_from_directory
from flask_jwt_extended import verify_jwt_in_request
from flask_jwt_extended.exceptions import (
    CSRFError,
    InvalidHeaderError,
    JWTDecodeError,
    NoAuthorizationError,
    RevokedTokenError,
    WrongTokenError,
)

from app.api.v1.helpers import cloud_only, item_response, raw_response, request_json
from app.repositories import UserRepository
from app.core.constants import RATE_LIMIT_AUTH_WRITE, RATE_LIMIT_DESTRUCTIVE, RATE_LIMIT_PASSWORD_RESET, RATE_LIMIT_STANDARD, RATE_LIMIT_STRICT
from app.core.errors import ApiError
from app.core.logging import logger
from app.core.response import error
from app.core.validation import load_schema
from app.extensions import limiter
from app.schemas.auth import AuthorizeSchema, ChangePasswordSchema, ExchangeCodeSchema, ForgotPasswordSchema, GoogleLoginSchema, LoginSchema, ProfileChangedSchema, RegisterSchema, ResetPasswordSchema
from app.schemas.domain import UserUpdateSchema
from app.services.auth_service import AuthService
from app.services.security import current_user_id, secured

bp = Blueprint("auth", __name__)


def _verify_jwt(refresh: bool = False):
    """Verify JWT with full exception handling. Returns error response on failure or None."""
    try:
        verify_jwt_in_request(refresh=refresh)
    except NoAuthorizationError:
        return error("unauthorized", "Authentication required", status=401)
    except RevokedTokenError:
        return error("token_revoked", "Token has been revoked", status=401)
    except InvalidHeaderError:
        return error("invalid_token", "Invalid authorization header", status=401)
    except JWTDecodeError:
        return error("invalid_token", "Token is invalid or expired", status=401)
    except WrongTokenError:
        return error("wrong_token", "Wrong token type for this endpoint", status=401)
    except CSRFError:
        return error("csrf_error", "CSRF validation failed", status=401)
    return None



def deployment_mode():
    """Return the current deployment mode ('local' or 'cloud')."""
    return current_app.config.get("GNOVIUM_MODE", os.environ.get("GNOVIUM_MODE", "local")).strip().lower()


def is_local_mode():
    """Check if running in local mode."""
    return deployment_mode() == "local"


def require_local_auth(fn):
    """Require local auth to be enabled in local mode."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        mode = deployment_mode()
        if mode == "local" and not current_app.config.get("LOCAL_AUTH_ENABLED", False):
            return error("auth_disabled", "Local authentication is not enabled", status=400)
        return fn(*args, **kwargs)
    return wrapper


def cloud_url():
    """Return the cloud API base URL."""
    return current_app.config.get("CLOUD_API_URL", os.environ.get("CLOUD_API_URL", "https://api.gnovium.com")).rstrip("/")


def _validate_cloud_url(url):
    """Validate cloud URL is from an allowed host. Returns error response or None."""
    parsed = urlparse(url)
    allowed_hosts = set(
        current_app.config.get("ALLOWED_CLOUD_HOSTS", [])
    )
    if parsed.hostname and parsed.hostname not in allowed_hosts:
        return error("forbidden", "Request to disallowed host", status=403)
    return None


def proxy_to_cloud(method: str, path: str, *, json_data=None):
    """Proxy an auth request to the cloud backend in local mode.

    Trust model: local mode proxies auth to a trusted cloud backend.
    Only outbound requests to explicitly allowed hosts are permitted
    (validated by _validate_cloud_url). The cloud backend is responsible
    for all authentication and authorization checks.
    """
    headers = {}
    auth_header = request.headers.get("Authorization")
    if auth_header:
        headers["Authorization"] = auth_header

    target_url = f"{cloud_url()}/api/v1/auth/{path.lstrip('/')}"
    err = _validate_cloud_url(target_url)
    if err:
        return err
    try:
        resp = http_requests.request(
            method,
            target_url,
            json=json_data,
            headers=headers,
            timeout=10,
        )
        payload = resp.json()
        if "data" in payload:
            return raw_response(payload.get("data"), resp.status_code)
        if "error" in payload:
            err = payload.get("error") or {}
            return error(
                err.get("code", "bad_gateway"),
                err.get("message", "Cloud auth request failed"),
                status=resp.status_code,
            )
        return raw_response(payload, resp.status_code)
    except http_requests.RequestException:
        logger.warning("Failed to reach cloud backend at %s/%s", method, path)
        return error("bad_gateway", "Failed to reach cloud backend", status=502)


@bp.post("/register")
@limiter.limit(RATE_LIMIT_AUTH_WRITE)
@cloud_only
@require_local_auth
def register() -> Response:
    """Email/password registration."""
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    result = AuthService().register(load_schema(RegisterSchema(), data))
    return raw_response(result, 201)


@bp.post("/login")
@limiter.limit(RATE_LIMIT_AUTH_WRITE)
@cloud_only
@require_local_auth
def login() -> Response:
    """Email/password login."""
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    return raw_response(AuthService().login(load_schema(LoginSchema(), data), ip_address=request.remote_addr))


@bp.get("/check-email")
@limiter.limit(RATE_LIMIT_STRICT)
@cloud_only
def check_email() -> Response:
    """Check email availability."""
    email = request.args.get("email", "").strip().lower()
    if len(email) > 254:
        return error("invalid_email", "Invalid email format", status=400)
    if not email or not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
        return error("bad_request", "Valid email is required.", status=400)
    exists = UserRepository().find_by_email(email) is not None
    return raw_response({"available": not exists})


@bp.post("/google")
@limiter.limit(RATE_LIMIT_AUTH_WRITE)
@cloud_only
def google_login() -> Response:
    """Google OAuth sign-in. Creates account if not exists."""
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    data = load_schema(GoogleLoginSchema(), data)
    return raw_response(AuthService().google_login(data["credential"]))


@bp.post("/refresh")
@limiter.limit(RATE_LIMIT_STANDARD)
@cloud_only
def refresh() -> Response:
    """Refresh access token."""
    if deployment_mode() == "local":
        return proxy_to_cloud("POST", "refresh")
    err = _verify_jwt(refresh=True)
    if err:
        return err
    return raw_response(AuthService().refresh())


@bp.post("/logout")
@limiter.limit(RATE_LIMIT_STANDARD)
@cloud_only
def logout() -> Response:
    """Revoke session. Accepts both access and refresh tokens."""
    if deployment_mode() == "local":
        return proxy_to_cloud("POST", "logout")
    err = _verify_jwt(refresh=True)
    if err:
        err2 = _verify_jwt(refresh=False)
        if err2:
            return err2
    return raw_response(AuthService().logout())


@bp.get("/me")
@limiter.limit(RATE_LIMIT_STANDARD)
@cloud_only
def get_me() -> Response:
    """Get current user profile."""
    err = _verify_jwt()
    if err:
        return err
    return item_response(AuthService().get_profile(current_user_id()))


@bp.patch("/me")
@limiter.limit(RATE_LIMIT_STRICT)
@cloud_only
def update_me() -> Response:
    """Update current user profile."""
    err = _verify_jwt()
    if err:
        return err
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    data = load_schema(UserUpdateSchema(), data)
    result = AuthService().update_profile(current_user_id(), data)
    return item_response(result)


@bp.post("/avatar")
@limiter.limit(RATE_LIMIT_STRICT)
@cloud_only
@secured
def upload_avatar() -> Response:
    """Upload profile avatar image."""
    user_id = current_user_id()
    if "file" not in request.files:
        return error("bad_request", "No file provided", status=400)
    file = request.files["file"]
    if not file.filename:
        return error("bad_request", "No file selected", status=400)
    import hashlib
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "png"
    ext = ext if ext in {"png", "jpg", "jpeg", "gif", "webp"} else "png"
    data = file.read()
    content_hash = hashlib.sha256(data).hexdigest()
    object_key = f"v1/avatars/{user_id}/{content_hash}.{ext}"
    from app.services.storage_provider import create_storage_provider
    provider = create_storage_provider(current_app.config)
    provider.store(object_key, data, file.content_type or "image/png")
    AuthService().update_profile(user_id, {"avatar_url": object_key})
    presigned = provider.presign_download(object_key, expires_in=3600)
    return item_response({"avatar_url": presigned})


@bp.post("/change-password")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
@cloud_only
def change_password() -> Response:
    """Change password for the authenticated user."""
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    return raw_response(AuthService().change_password(current_user_id(), load_schema(ChangePasswordSchema(), data)))


@bp.post("/forgot-password")
@limiter.limit(RATE_LIMIT_PASSWORD_RESET)
@cloud_only
@require_local_auth
def forgot_password() -> Response:
    """Request a password reset email."""
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    data = load_schema(ForgotPasswordSchema(), data)
    return proxy_to_cloud("POST", "forgot-password", json_data={"email": data["email"]})


@bp.post("/reset-password")
@limiter.limit(RATE_LIMIT_PASSWORD_RESET)
@cloud_only
@require_local_auth
def reset_password() -> Response:
    """Reset password using a reset token."""
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    data = load_schema(ResetPasswordSchema(), data)
    return proxy_to_cloud("POST", "reset-password", json_data=data)


@bp.post("/exchange-code")
@limiter.limit(RATE_LIMIT_DESTRUCTIVE)
@cloud_only
@secured
def generate_exchange_code() -> Response:
    """Generate a one-time code for desktop app authentication."""
    user_id = current_user_id()
    try:
        code = AuthService().generate_auth_code(user_id)
        return raw_response({"code": code})
    except ApiError:
        raise
    except Exception as e:
        logger.warning("Failed to generate auth code for user %s: %s", user_id, e)
        return error("internal_error", "Failed to generate auth code", status=500)


@bp.post("/authorize")
@limiter.limit(RATE_LIMIT_AUTH_WRITE)
@cloud_only
@secured
@require_local_auth
def authorize() -> Response:
    """Generate an authorization code for webview-based desktop auth.

    The web frontend calls this after the user successfully authenticates
    via the webview. This creates a one-time code and returns
    a redirect URI that the webview follows.
    """
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    data = load_schema(AuthorizeSchema(), data)
    user_id = current_user_id()
    redirect_uri = data["redirect_uri"]
    state = data.get("state")
    workspace_id = data.get("workspace_id")

    try:
        result = AuthService().authorize(user_id, redirect_uri, state, workspace_id)
        return raw_response(result)
    except ApiError:
        raise
    except Exception as e:
        logger.warning("Failed to generate auth code for user %s: %s", user_id, e)
        return error("internal_error", "Failed to generate auth code", status=500)


@bp.get("/authorize")
@limiter.limit(RATE_LIMIT_STANDARD)
@cloud_only
def webview_authorize() -> Response:
    """Webview-based authorization redirect.

    The local-app opens this URL in a webview:
      https://app.gnovium.com/api/v1/auth/authorize?redirect_uri=gnovium://auth&state=abc&workspace_id=xyz
    User authenticates on the web app, then is redirected to:
      gnovium://auth?code=xxx&state=abc

    In local dev mode:
      http://localhost:5100/api/v1/auth/authorize?redirect_uri=http://localhost:3000/auth/callback
    """
    redirect_uri = request.args.get("redirect_uri", "")
    if not redirect_uri:
        return error("bad_request", "redirect_uri query param is required", status=400)
    state = request.args.get("state")
    workspace_id = request.args.get("workspace_id")

    if len(redirect_uri) > 2048:
        return error("bad_request", "redirect_uri exceeds maximum length", status=400)
    allowed_schemes = {"gnovium", "gnovium-dev", "gnovium-auth", "http", "https"}
    parsed = urlparse(redirect_uri)
    if parsed.scheme not in allowed_schemes:
        return error("bad_request", "Invalid redirect_uri scheme", status=400)
    if parsed.scheme in ("http", "https") and parsed.hostname not in ("localhost", "127.0.0.1"):
        return error("bad_request", "Invalid redirect_uri host", status=400)

    from urllib.parse import urlencode
    web_app_url = current_app.config.get("WEB_APP_URL", "https://app.gnovium.com")
    params = {"redirect_uri": redirect_uri}
    if state:
        params["state"] = state
    if workspace_id:
        params["workspace_id"] = workspace_id
    auth_url = f"{web_app_url}/auth/login?{urlencode(params)}"
    from flask import redirect as flask_redirect
    return flask_redirect(auth_url, 302)


@bp.post("/profile-changed")
@limiter.limit(RATE_LIMIT_STANDARD)
@cloud_only
@secured
@require_local_auth
def profile_changed() -> Response:
    """Check if user profile has changed since a given timestamp.

    Local-app calls this periodically to detect profile updates
    made on the cloud web app. If changed, local-app re-opens
    the webview for re-authentication.
    """
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    data = load_schema(ProfileChangedSchema(), data)
    try:
        result = AuthService().get_profile_changed_since(current_user_id(), data["since"])
        return raw_response(result)
    except ApiError:
        raise
    except Exception as e:
        logger.warning("profile_changed_check failed: %s", e)
        return error("internal_error", "Failed to check profile changes", status=500)


@bp.post("/exchange")
@limiter.limit(RATE_LIMIT_DESTRUCTIVE)
@cloud_only
@require_local_auth
def exchange_code() -> Response:
    """Exchange a one-time code for access + refresh tokens."""
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    data = load_schema(ExchangeCodeSchema(), data)
    code = data["code"]
    redirect_uri = data.get("redirect_uri")

    if deployment_mode() == "local":
        payload = {"code": code}
        if redirect_uri:
            payload["redirect_uri"] = redirect_uri
        return proxy_to_cloud("POST", "exchange", json_data=payload)

    try:
        result = AuthService().exchange_code(code, redirect_uri)
        return raw_response(result)
    except ApiError as e:
        logger.warning("Auth code exchange failed", exc_info=True)
        return error(e.code, str(e), status=e.status_code)
    except Exception:
        logger.warning("Auth code exchange failed", exc_info=True)
        return error("internal_error", "Exchange failed", status=500)
