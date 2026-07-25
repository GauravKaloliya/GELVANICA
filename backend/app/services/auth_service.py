from datetime import datetime, timezone, timedelta

import uuid
import time
from collections import defaultdict
from typing import Dict, List, Optional

import bcrypt as bcrypt_lib

from flask import current_app
from flask_jwt_extended import create_access_token, create_refresh_token, decode_token, get_jwt
from sqlalchemy.exc import IntegrityError

from app.core.errors import AccountLockedError, ApiError, ConflictError, ForbiddenError, NotFoundError
from app.extensions import db
from app.models import User
from app.repositories import AuthCodeRepository, SessionRepository, UserRepository
from app.core.logging import logger
from app.schemas.domain import UserSchema
from urllib.parse import urlencode, urlparse, urlunparse



def _is_auth_cloud():
    return current_app.config.get("GNOVIUM_MODE") == "cloud"


def _ensure_cloud():
    if not _is_auth_cloud():
        raise ApiError("Authentication operations are only available in cloud mode", 400, "cloud_only")


def hash_password(password: str) -> str:
    return bcrypt_lib.hashpw(password.encode("utf-8"), bcrypt_lib.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt_lib.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


# ── Brute-force protection ─────────────────────────────────────────────────
_login_attempts: Dict[str, List[float]] = defaultdict(list)
MAX_LOGIN_ATTEMPTS = 5
LOGIN_WINDOW_SECONDS = 300  # 5 minutes


def _get_login_attempts(email: str) -> list:
    now = time.time()
    attempts = []
    try:
        from app.extensions import cache
        key = f"login_attempts:{email}"
        attempts = cache.get(key) or []
        attempts = [t for t in attempts if now - t < LOGIN_WINDOW_SECONDS]
        cache.set(key, attempts, timeout=LOGIN_WINDOW_SECONDS)
    except Exception:
        attempts = _login_attempts.get(email, [])
        attempts = [t for t in attempts if now - t < LOGIN_WINDOW_SECONDS]
        _login_attempts[email] = attempts
    return attempts


def _record_login_attempt(email: str) -> None:
    now = time.time()
    try:
        from app.extensions import cache
        key = f"login_attempts:{email}"
        attempts = cache.get(key) or []
        attempts = [t for t in attempts if now - t < LOGIN_WINDOW_SECONDS]
        attempts.append(now)
        cache.set(key, attempts, timeout=LOGIN_WINDOW_SECONDS)
    except Exception:
        _login_attempts[email].append(now)
        _login_attempts[email] = [t for t in _login_attempts[email] if now - t < LOGIN_WINDOW_SECONDS]


def _clear_login_attempts(email: str) -> None:
    try:
        from app.extensions import cache
        cache.delete(f"login_attempts:{email}")
    except Exception:
        _login_attempts.pop(email, None)


class AuthService:
    def __init__(self, user_repo=None, session_repo=None, auth_code_repo=None):
        self.user_repo = user_repo or UserRepository()
        self.session_repo = session_repo or SessionRepository()
        self.auth_code_repo = auth_code_repo or AuthCodeRepository()

    def register(self, data: dict) -> dict:
        """Email/password registration. Creates user + session, returns tokens."""
        if current_app.config.get("GNOVIUM_MODE") != "cloud" and not current_app.config.get("LOCAL_AUTH_ENABLED", False):
            _ensure_cloud()
        email_clean = data.get("email", "").lower().strip()

        if not email_clean:
            raise ApiError("Email is required", 400, "validation_error")

        if self.user_repo.find_by_email(email_clean):
            raise ConflictError("Email is already registered")

        password = data.get("password")
        if not password:
            raise ApiError("Password is required", 400, "validation_error")

        name_seed = (data.get("name") or email_clean).strip()
        avatar_url = f"https://api.dicebear.com/7.x/identicon/svg?seed={name_seed}"

        try:
            user = self.user_repo.create(
                {
                    "email": email_clean,
                    "name": data.get("name"),
                    "password_hash": hash_password(password),
                    "avatar_url": avatar_url,
                }
            )
            db.session.flush()
        except IntegrityError:
            db.session.rollback()
            raise ConflictError("Email is already registered")

        return self._create_session(user)

    def login(self, data: dict, ip_address: Optional[str] = None) -> dict:
        """Email/password login. Verifies password, creates session, returns tokens."""
        if current_app.config.get("GNOVIUM_MODE") != "cloud" and not current_app.config.get("LOCAL_AUTH_ENABLED", False):
            _ensure_cloud()
        email_clean = data.get("email", "").lower().strip()
        if not email_clean:
            raise ApiError("Email is required", 400, "validation_error")
        password = data.get("password")
        if not password:
            raise ApiError("Password is required", 400, "validation_error")

        if self._check_account_locked(email_clean):
            raise AccountLockedError("Account temporarily locked due to too many failed login attempts. Try again later.")

        user = self.user_repo.find_by_email(email_clean)
        if not user or not user.password_hash or not verify_password(password, user.password_hash):
            self._record_failed_attempt(email_clean)
            raise ApiError("Invalid email or password", 401, "invalid_credentials")

        _clear_login_attempts(email_clean)
        return self._create_session(user, ip_address=ip_address)

    def google_login(self, credential: str) -> dict:
        """Google OAuth sign-in. Creates account if not exists, then signs in."""
        _ensure_cloud()
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token

        client_id = current_app.config["GOOGLE_CLIENT_ID"]
        if not client_id:
            raise ApiError("Google sign-in is not configured.")

        try:
            id_info = id_token.verify_oauth2_token(credential, google_requests.Request(), client_id)
        except ValueError:
            raise ApiError("Invalid authentication token", 401)

        if id_info.get("iss") not in ["accounts.google.com", "https://accounts.google.com"]:
            raise ApiError("Invalid Google token issuer.")

        email = id_info.get("email")
        if not email:
            raise ApiError("Google account has no email address.")

        google_id = id_info.get("sub")
        name = id_info.get("name", "")
        avatar_url = id_info.get("picture", "")

        user = self.user_repo.find_by_email(email)

        if not user:
            try:
                user = self.user_repo.create(
                    {
                        "email": email.lower().strip(),
                        "name": name,
                        "avatar_url": avatar_url,
                        "google_id": google_id,
                    }
                )
                db.session.flush()
            except IntegrityError:
                db.session.rollback()
                raise ConflictError("Email is already registered")

        return self._create_session(user)

    def refresh(self) -> dict:
        """Refresh access token. Issues new refresh token and revokes old one."""
        claims = get_jwt()
        session = self.session_repo.find_active_refresh(claims.get("jti"))
        if not session:
            raise ForbiddenError("Refresh token is revoked or expired")

        session.revoked_at = datetime.now(timezone.utc)

        try:
            db.session.flush()
        except Exception:
            db.session.rollback()
            raise

        return self._create_session(session.user, include_user=False)

    def logout(self) -> dict:
        """Revoke session."""
        claims = get_jwt()
        session = self.session_repo.find_by_any_jti(claims.get("jti"))
        if session:
            session.revoked_at = datetime.now(timezone.utc)
            try:
                db.session.flush()
            except Exception:
                db.session.rollback()
                raise
        return {"revoked": True}

    def get_profile(self, user_id: str) -> dict:
        """Get user profile."""
        user = self.user_repo.get(user_id)
        if not user:
            raise NotFoundError("User not found")
        return UserSchema().dump(user)

    def update_profile(self, user_id: str, data: dict) -> dict:
        """Update user profile (name, avatar_url, profile_image_url)."""
        allowed = {"name", "avatar_url", "profile_image_url"}
        updates = {k: v for k, v in data.items() if k in allowed}
        user = self.user_repo.get(user_id)
        if not user:
            raise NotFoundError("User not found")
        self.user_repo.update(user, updates)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return UserSchema().dump(user)

    def change_password(self, user_id: str, data: dict) -> dict:
        """Change password for authenticated user."""
        _ensure_cloud()
        old_password = data.get("old_password")
        new_password = data.get("new_password")

        if not old_password or not new_password:
            raise ApiError("Old and new password are required", 400, "bad_request")

        if len(new_password) < 8:
            raise ApiError("Password must be at least 8 characters", 400, "bad_request")

        user = self.user_repo.get(user_id)
        if not user or not user.password_hash:
            raise NotFoundError("User not found")

        if not verify_password(old_password, user.password_hash):
            raise ForbiddenError("Current password is incorrect")

        user.password_hash = hash_password(new_password)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return UserSchema().dump(user)

    def generate_auth_code(self, user_id: str, redirect_uri: str = None) -> str:
        """Generate a one-time code for desktop app exchange. Valid for AUTH_CODE_EXPIRY_MINUTES (default 5)."""
        user = self.user_repo.get(user_id)
        if not user:
            raise NotFoundError("User not found")
        code = str(uuid.uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=current_app.config.get('AUTH_CODE_EXPIRY_MINUTES', 5))
        self.auth_code_repo.create(
            {
                "code": code,
                "user_id": user_id,
                "redirect_uri": redirect_uri,
                "expires_at": expires_at,
            }
        )
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return code

    def authorize(self, user_id: str, redirect_uri: str, state: str = None, workspace_id: str = None) -> dict:
        """Generate authorization code for webview-based desktop auth.

        Creates a one-time code and returns a full redirect URI with code and state.
        """
        if not redirect_uri:
            raise ApiError("redirect_uri is required", 400, "bad_request")

        parsed = urlparse(redirect_uri)
        if parsed.scheme not in ("gnovium", "gnovium-dev", "gnovium-auth", "http", "https"):
            raise ApiError("Invalid redirect_uri scheme", 400, "bad_request")
        if parsed.scheme in ("http", "https") and parsed.hostname not in ("localhost", "127.0.0.1"):
            raise ApiError("Invalid redirect_uri host", 400, "bad_request")

        code = self.generate_auth_code(user_id, redirect_uri)
        params = {"code": code}
        if state:
            params["state"] = state
        if workspace_id:
            params["workspace_id"] = workspace_id
        redirect_full = urlunparse(parsed._replace(query=urlencode(params)))

        return {
            "code": code,
            "state": state,
            "redirect_uri": redirect_full,
        }

    def exchange_code(self, code: str, redirect_uri: str = None) -> dict:
        """Exchange a one-time code for tokens + user. Single use, 5-min expiry."""
        auth_code = self.auth_code_repo.query().filter(
            self.auth_code_repo.model.code == code
        ).order_by(self.auth_code_repo.model.id).with_for_update().first()
        if not auth_code:
            raise ApiError("Invalid exchange code", 400, "bad_request")
        if auth_code.consumed_at:
            raise ApiError("Exchange code has already been used", 400, "code_already_used")
        if auth_code.expires_at < datetime.now(timezone.utc):
            raise ApiError("Exchange code has expired. Please request a new one.", 400, "code_expired")

        # Validate redirect_uri if stored on the code
        if auth_code.redirect_uri and redirect_uri and auth_code.redirect_uri != redirect_uri:
            raise ApiError("redirect_uri mismatch", 400, "bad_request")

        user = self.user_repo.get(auth_code.user_id)
        if not user:
            raise ApiError("User not found", 404, "not_found")

        try:
            # Mark consumed BEFORE creating session so both are in the same commit
            auth_code.consumed_at = datetime.now(timezone.utc)
            result = self._create_session(user)

            return result
        except Exception:
            db.session.rollback()
            logger.exception("session_creation_failed", extra={"user_id": str(auth_code.user_id)})
            raise ApiError("Session creation failed", 500, "internal_error")

    def get_profile_changed_since(self, user_id: str, since: str) -> dict:
        """Check if user profile has changed since a given ISO timestamp.

        Used by local-app to detect profile updates from cloud.
        """
        user = self.user_repo.get(user_id)
        if not user:
            raise NotFoundError("User not found")
        try:
            since_dt = datetime.fromisoformat(since)
        except (ValueError, TypeError):
            raise ApiError("Invalid 'since' timestamp format. Use ISO 8601.", 400, "bad_request")
        if since_dt.tzinfo is None:
            since_dt = since_dt.replace(tzinfo=timezone.utc)
        profile = UserSchema().dump(user)
        updated_at = profile.get("updated_at") or profile.get("created_at")
        if isinstance(updated_at, str):
            try:
                updated_dt = datetime.fromisoformat(updated_at)
                if updated_dt.tzinfo is None:
                    updated_dt = updated_dt.replace(tzinfo=timezone.utc)
                changed = updated_dt > since_dt
            except (ValueError, TypeError):
                changed = False
        else:
            changed = False
        return {
            "changed": changed,
            "profile": profile if changed else None,
        }

    def _check_account_locked(self, email: str) -> bool:
        """Check if account is temporarily locked due to too many failed attempts."""
        attempts = _get_login_attempts(email)
        return len(attempts) >= MAX_LOGIN_ATTEMPTS

    def _record_failed_attempt(self, email: str) -> None:
        _record_login_attempt(email)

    def _create_session(self, user: User, ip_address: Optional[str] = None, include_user: bool = True) -> dict:
        """Create JWT tokens + session record. Returns tokens + user profile."""
        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))
        decoded_access = decode_token(access_token)
        decoded = decode_token(refresh_token)

        ip = ip_address or "unknown"
        self.session_repo.create(
            {
                "user_id": user.id,
                "jti": decoded_access.get("jti"),
                "refresh_jti": decoded.get("jti"),
                "user_agent": None,
                "ip_address": ip,
                "expires_at": datetime.fromtimestamp(decoded.get("exp"), tz=timezone.utc),
            }
        )
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise

        expires_in = decoded_access.get("exp", 0) - decoded_access.get("iat", 0)

        result = {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": expires_in,
        }
        if include_user:
            result["user"] = UserSchema().dump(user)
        return result
