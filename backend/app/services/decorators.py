from functools import wraps

from flask import current_app, jsonify

from app.core.errors import ApiError
from app.core.logging import logger
from app.extensions import db


def transactional(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        try:
            result = f(*args, **kwargs)
            db.session.commit()
            return result
        except Exception:
            db.session.rollback()
            logger.exception(f"Transaction rolled back in {f.__name__}")
            raise
    return wrapper


def feature_flag(flag):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            if not current_app.config.get(f"FEATURE_{flag.upper()}_ENABLED", False):
                return jsonify({"error": "Feature not available", "code": "feature_disabled"}), 501
            return f(*args, **kwargs)
        return wrapper
    return decorator


def _ensure_cloud():
    """Raise if not in cloud mode. Call at the top of every cloud-only service method."""
    mode = current_app.config.get("GNOVIUM_MODE", "local")
    if mode != "cloud":
        raise ApiError("This operation is only available in cloud mode", 400, "cloud_only")
