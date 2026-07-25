from app.core.config import get_config, validate_config
from app.core.errors import ApiError
from app.core.logging import configure_logging, logger
from app.core.response import error, ok
from app.core.schema_setup import execute_sqlite_schema
from flask import g, current_app
from flask_limiter.errors import RateLimitExceeded
from werkzeug.middleware.proxy_fix import ProxyFix

from app.core.constants import RATE_LIMIT_STANDARD
from app.extensions import cache, cors, db, jwt, limiter
import app.extensions as extensions
from app.middleware.request_context import install_request_context
from app.middleware.security import install_security_middleware


def register_jwt_callbacks(jwt):
    """Register JWT callbacks for token verification, user loading, and blocklist checking."""

    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        from app.repositories.domain import SessionRepository
        jti = jwt_payload.get("jti")
        if not jti:
            return False
        session = SessionRepository().find_by_any_jti(jti)
        return session is not None and session.revoked_at is not None

    @jwt.user_lookup_loader
    def user_lookup_callback(_jwt_header, jwt_payload):
        from app.repositories.domain import UserRepository
        identity = jwt_payload.get("sub")
        if not identity:
            return None
        return UserRepository().get(identity)

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        from app.core.response import error
        return error("token_expired", "Token has expired", status=401)

    @jwt.invalid_token_loader
    def invalid_token_callback(error_string):
        from app.core.response import error
        return error("invalid_token", "Token is invalid or expired", status=401)

    @jwt.unauthorized_loader
    def missing_token_callback(error_string):
        from app.core.response import error
        return error("unauthorized", "Authentication required", status=401)

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        from app.core.response import error
        return error("token_revoked", "Token has been revoked", status=401)


def create_app(config_object=None):
    from flask import Flask

    if config_object is None:
        config_object = get_config()

    app = Flask(__name__)
    app.config.from_object(config_object)
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1, x_prefix=1)

    configure_logging()
    import app.models as _models  # noqa: F401
    validate_config()

    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, origins=app.config["CORS_ORIGINS"], supports_credentials=True)
    install_request_context(app)
    install_security_middleware(app)
    limiter.init_app(app)

    register_jwt_callbacks(jwt)

    try:
        redis_url = app.config.get("REDIS_URL")
        if redis_url and isinstance(redis_url, str) and redis_url.startswith("redis"):
            from redis import Redis
            extensions.redis_client = Redis.from_url(redis_url, decode_responses=True)
            extensions.redis_client.ping()
        else:
            extensions.redis_client = None
    except Exception as e:
        if app.config.get("REQUIRE_REDIS"):
            raise
        logger.warning("redis_connection_failed", error=str(e))
        extensions.redis_client = None

    cache_config = {
        "CACHE_TYPE": app.config.get("CACHE_TYPE", "SimpleCache"),
        "CACHE_DEFAULT_TIMEOUT": app.config.get("CACHE_DEFAULT_TIMEOUT", 300),
    }
    if app.config.get("CACHE_REDIS_URL"):
        cache_config["CACHE_REDIS_URL"] = app.config["CACHE_REDIS_URL"]
    if app.config.get("CACHE_KEY_PREFIX"):
        cache_config["CACHE_KEY_PREFIX"] = app.config["CACHE_KEY_PREFIX"]
    app.config.update(cache_config)
    cache.init_app(app)

    with app.app_context():
        db_url = app.config.get("SQLALCHEMY_DATABASE_URI", "")
        auto_create = app.config.get("AUTO_CREATE_TABLES", False)
        is_testing = app.config.get("TESTING", False)
        is_cloud = app.config.get("GNOVIUM_MODE") == "cloud"

        if auto_create or is_testing:
            try:
                db.create_all()
                logger.info("tables_created", database=db_url.split(":")[0])
            except Exception as e:
                logger.warning("table_creation_skipped", error=str(e))

        if not is_cloud:
            execute_sqlite_schema(app)

    register_error_handlers(app)
    register_routes(app)
    return app


def register_routes(app):
    from app.api.v1 import api_v1

    @app.get("/metrics")
    @limiter.limit(RATE_LIMIT_STANDARD)
    def prometheus_metrics():
        from app.monitoring import metrics
        from flask import Response
        return Response(metrics.export_prometheus(), mimetype="text/plain; version=0.0.4")

    @app.get("/health")
    @limiter.limit(RATE_LIMIT_STANDARD)
    def health():
        from app.monitoring import metrics

        status = {}
        all_ok = True

        try:
            db.session.execute(db.text("SELECT 1"))
            status["database"] = "ok"
        except Exception:
            current_app.logger.exception("health_check_db_failed")
            status["database"] = "error: database unavailable"
            all_ok = False

        try:
            if getattr(extensions, "redis_client", None) is not None:
                extensions.redis_client.ping()
                status["redis"] = "ok"
            else:
                status["redis"] = "unavailable"
        except Exception:
            current_app.logger.exception("health_check_redis_failed")
            status["redis"] = "error: cache unavailable"
            all_ok = False

        status["db_pool"] = metrics.get_db_pool_status()

        code = 200 if all_ok else 503
        response_data = {"service": "gnovium-api", "dependencies": status, "status": "healthy" if all_ok else "degraded"}
        if all_ok:
            return ok(response_data)
        else:
            return error("service_degraded", "Service degraded", details=response_data, status=code)

    app.register_blueprint(api_v1, url_prefix="/api/v1")


def register_error_handlers(app):
    @app.errorhandler(RateLimitExceeded)
    def handle_rate_limit(exc):
        from app.core.security_logger import security_logger
        from flask import request as req
        rid = getattr(g, 'request_id', None)
        security_logger.log_rate_limit_hit(req.path, req.remote_addr, rid)
        return error("rate_limit_exceeded", "Rate limit exceeded", status=429, request_id=rid)

    @app.errorhandler(ApiError)
    def handle_api_error(exc):
        rid = getattr(g, 'request_id', None)
        return error(exc.code, exc.message, details=exc.details, status=exc.status_code, request_id=rid)

    @app.errorhandler(400)
    def handle_bad_request(exc):
        rid = getattr(g, 'request_id', None)
        logger.warning("bad_request", error=str(exc))
        return error("bad_request", "Bad request", status=400, request_id=rid)

    @app.errorhandler(401)
    def handle_unauthorized(exc):
        rid = getattr(g, 'request_id', None)
        return error("unauthorized", "Authentication required", status=401, request_id=rid)

    @app.errorhandler(403)
    def handle_forbidden(exc):
        rid = getattr(g, 'request_id', None)
        return error("forbidden", "Forbidden", status=403, request_id=rid)

    @app.errorhandler(404)
    def handle_not_found(_):
        rid = getattr(g, 'request_id', None)
        return error("not_found", "Route not found", status=404, request_id=rid)

    @app.errorhandler(405)
    def handle_method_not_allowed(exc):
        rid = getattr(g, 'request_id', None)
        logger.warning("method_not_allowed", method=exc.method if hasattr(exc, 'method') else None)
        return error("method_not_allowed", "Method not allowed", status=405, request_id=rid)

    @app.errorhandler(409)
    def handle_conflict(exc):
        rid = getattr(g, 'request_id', None)
        logger.warning("conflict", error=str(exc))
        return error("conflict", "Resource already exists", status=409, request_id=rid)

    @app.errorhandler(413)
    def handle_payload_too_large(exc):
        rid = getattr(g, 'request_id', None)
        logger.warning("payload_too_large", error=str(exc))
        return error("payload_too_large", "Request body exceeds limit", status=413, request_id=rid)

    @app.errorhandler(415)
    def handle_unsupported_media_type(exc):
        rid = getattr(g, 'request_id', None)
        logger.warning("unsupported_media_type", error=str(exc))
        return error("unsupported_media_type", "Unsupported content type", status=415, request_id=rid)

    @app.errorhandler(422)
    def handle_validation(exc):
        rid = getattr(g, 'request_id', None)
        return error("validation_error", "Validation failed", details=getattr(exc, "data", None), status=422, request_id=rid)

    @app.errorhandler(500)
    def handle_internal_error(exc):
        rid = getattr(g, 'request_id', None)
        logger.error("internal_error", error=str(exc), exc_info=True)
        return error("internal_error", "Internal server error", status=500, request_id=rid)

    @app.errorhandler(501)
    def handle_not_implemented(exc):
        rid = getattr(g, 'request_id', None)
        logger.warning("not_implemented", error=str(exc))
        return error("not_implemented", "Not implemented", status=501, request_id=rid)

    @app.errorhandler(502)
    def handle_bad_gateway(exc):
        rid = getattr(g, 'request_id', None)
        logger.error("bad_gateway", error=str(exc))
        return error("bad_gateway", "Bad gateway", status=502, request_id=rid)

    @app.errorhandler(503)
    def handle_service_degraded(exc):
        rid = getattr(g, 'request_id', None)
        logger.error("service_degraded", error=str(exc))
        return error("service_degraded", "Service degraded", status=503, request_id=rid)

    @app.errorhandler(Exception)
    def handle_unexpected(exc):
        rid = getattr(g, 'request_id', None)
        logger.error("unhandled_exception", error=str(exc), exc_info=True)
        return error("internal_error", "Internal server error", status=500, request_id=rid)
