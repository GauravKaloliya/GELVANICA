import time
import uuid

import structlog
from flask import g, request

from app.monitoring import metrics


def _load_current_user():
    """Load current user from JWT token into g.current_user."""
    try:
        from flask_jwt_extended import get_jwt_identity
        identity = get_jwt_identity()
        if identity:
            from app.repositories.domain import UserRepository
            user = UserRepository().get(identity)
            g.current_user = user
            g.current_workspace = None
            structlog.contextvars.bind_contextvars(user_id=str(identity))
            return
    except Exception:
        pass
    g.current_user = None
    g.current_workspace = None


def install_request_context(app):
    @app.before_request
    def bind_request_context():
        g.request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        g.started_at = time.perf_counter()
        g._wall_start = time.time()
        g._did_increment = request.method != 'OPTIONS'
        if g._did_increment:
            metrics.increment_connections()
        structlog.contextvars.bind_contextvars(
            request_id=g.request_id,
            method=request.method,
            path=request.path,
        )
        _load_current_user()

    @app.after_request
    def add_request_headers(response):
        response.headers["X-Request-ID"] = g.get("request_id", "")
        if g.get("started_at") is not None:
            response.headers["X-Response-Time-Ms"] = f"{(time.perf_counter() - g.started_at) * 1000:.2f}"
        duration = time.time() - getattr(g, '_wall_start', time.time())
        metrics.record_request(request.method, request.path, response.status_code, duration)
        if g.get("_did_increment"):
            metrics.decrement_connections()
        return response

    @app.teardown_request
    def teardown_request_context(error=None):
        structlog.contextvars.clear_contextvars()
