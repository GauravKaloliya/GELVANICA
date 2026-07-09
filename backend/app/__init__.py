from redis import Redis
from importlib import import_module

from app.core.config import get_config
from app.core.errors import ApiError
from app.core.logging import configure_logging
from app.core.response import error, ok
from app.extensions import cache, cors, db, jwt, limiter
import app.extensions as extensions
from app.middleware.request_context import install_request_context
from app.middleware.security import install_security_middleware


def create_app(config_object=None):
    from flask import Flask

    if config_object is None:
        config_object = get_config()

    app = Flask(__name__)
    app.config.from_object(config_object)

    configure_logging()
    import_module("app.models")

    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, origins=app.config["CORS_ORIGINS"], supports_credentials=True)
    install_request_context(app)
    install_security_middleware(app)
    limiter.init_app(app)

    try:
        redis_url = app.config.get("REDIS_URL")
        if redis_url and isinstance(redis_url, str) and redis_url.startswith("redis"):
            extensions.redis_client = Redis.from_url(redis_url, decode_responses=True)
            extensions.redis_client.ping()
        else:
            extensions.redis_client = None
    except Exception:
        if app.config.get("REQUIRE_REDIS"):
            raise
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
        if db_url.startswith("sqlite") and (app.config.get("AUTO_CREATE_TABLES", False) or app.config.get("TESTING")):
            try:
                db.create_all()
            except Exception as e:
                app.logger.warning(f"Table creation skipped: {e}")
        if app.config.get("GNOVIUM_MODE") != "cloud":
            try:
                from pathlib import Path
                sql_path = Path(__file__).resolve().parent.parent / "SQLITE_SCHEMA.sql"
                if sql_path.exists():
                    sql = sql_path.read_text()

                    def split_sql_statements(text):
                        statements = []
                        current = []
                        depth = 0
                        for line in text.split("\n"):
                            stripped = line.strip()
                            if stripped.upper().startswith("BEGIN"):
                                depth += 1
                            elif stripped.upper().startswith("END") and depth > 0:
                                depth -= 1
                                current.append(line)
                                if depth == 0:
                                    stmt = "\n".join(current).strip().rstrip(";")
                                    if stmt:
                                        statements.append(stmt)
                                    current = []
                                continue
                            if depth > 0:
                                current.append(line)
                            else:
                                if ";" in stripped:
                                    parts = line.split(";")
                                    for i, part in enumerate(parts):
                                        if i < len(parts) - 1:
                                            current.append(part)
                                            stmt = "\n".join(current).strip()
                                            if stmt:
                                                statements.append(stmt)
                                            current = []
                                        else:
                                            current.append(part)
                                elif stripped:
                                    current.append(line)
                        remainder = "\n".join(current).strip().rstrip(";")
                        if remainder:
                            statements.append(remainder)
                        return statements

                    for statement in split_sql_statements(sql):
                        stmt = statement.strip()
                        if stmt and any(kw in stmt.upper() for kw in ("VIRTUAL TABLE", "TRIGGER", "INDEX", "INSERT", "PRAGMA", "CREATE UNIQUE INDEX", "CREATE INDEX")):
                            try:
                                db.session.execute(db.text(stmt))
                            except Exception:
                                pass
                    db.session.commit()
                    app.logger.info("SQLite FTS/trigger/index setup complete")
            except Exception as e:
                app.logger.warning(f"SQLite extras init skipped: {e}")

    register_error_handlers(app)
    register_routes(app)
    return app


def register_routes(app):
    from app.api.v1 import api_v1

    @app.get("/health")
    def health():
        return ok({"status": "healthy", "service": "gnovium-api"})

    app.register_blueprint(api_v1, url_prefix="/api/v1")


def register_error_handlers(app):
    @app.errorhandler(ApiError)
    def handle_api_error(exc):
        return error(exc.message, exc.code, exc.status_code, exc.details)

    @app.errorhandler(404)
    def handle_not_found(_):
        return error("Route not found", "not_found", 404)

    @app.errorhandler(422)
    def handle_validation(exc):
        return error("Validation failed", "validation_error", 422, getattr(exc, "data", None))

    @app.errorhandler(Exception)
    def handle_unexpected(exc):
        app.logger.exception("Unhandled exception", exc_info=exc)
        return error("Internal server error", "internal_error", 500)
