from functools import wraps

from flask import request
from app.core.response import error
from app.core.security_logger import security_logger
from app.core.errors import ApiError
from flask_jwt_extended import get_jwt_identity, jwt_required
from flask_jwt_extended.exceptions import (
    InvalidHeaderError,
    JWTDecodeError,
    NoAuthorizationError,
    RevokedTokenError,
    WrongTokenError,
)


def current_user_id() -> str | None:
    """Return the JWT identity of the current user, or None."""
    identity = get_jwt_identity()
    return str(identity) if identity else None


def secured(fn):
    """Decorator that wraps a route with JWT authentication and error handling."""
    wrapped = jwt_required()(fn)

    @wraps(fn)
    def wrapper(*args, **kwargs):
        ip_address = request.access_route[0] if request.access_route else request.remote_addr
        try:
            return wrapped(*args, **kwargs)
        except NoAuthorizationError:
            security_logger.log_auth_failure("unknown", "no_authorization", ip_address or "unknown")
            return error("unauthorized", "Authentication required", status=401)
        except RevokedTokenError:
            security_logger.log_auth_failure("unknown", "token_revoked", ip_address or "unknown")
            return error("token_revoked", "Token has been revoked", status=401)
        except InvalidHeaderError:
            security_logger.log_auth_failure("unknown", "invalid_header", ip_address or "unknown")
            return error("invalid_token", "Invalid authorization header", status=401)
        except JWTDecodeError:
            security_logger.log_auth_failure("unknown", "jwt_decode_error", ip_address or "unknown")
            return error("invalid_token", "Token is invalid or expired", status=401)
        except WrongTokenError:
            security_logger.log_auth_failure("unknown", "wrong_token_type", ip_address or "unknown")
            return error("wrong_token", "Wrong token type for this endpoint", status=401)
        except ApiError:
            raise

    return wrapper
