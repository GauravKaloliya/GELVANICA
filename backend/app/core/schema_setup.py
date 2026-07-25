from pathlib import Path

from app.core.logging import logger
from app.extensions import db


def execute_pg_schema(app) -> None:
    """Enable PostgreSQL extensions required by the cloud schema."""
    extensions = [
        'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"',
        "CREATE EXTENSION IF NOT EXISTS vector",
        "CREATE EXTENSION IF NOT EXISTS pg_trgm",
        "CREATE EXTENSION IF NOT EXISTS pgcrypto",
    ]
    try:
        conn = db.engine.raw_connection()
        try:
            cursor = conn.cursor()
            for stmt in extensions:
                cursor.execute(stmt)
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
        logger.info("pg_extensions_init_complete")
    except Exception as e:
        logger.warning("pg_extensions_init_skipped", error=str(e))


def execute_sqlite_schema(app) -> None:
    try:
        sql_path = Path(__file__).resolve().parent.parent.parent / "SQLITE_SCHEMA.sql"
        if not sql_path.exists():
            return
        raw_sql = sql_path.read_text(encoding="utf-8")
        conn = db.engine.raw_connection()
        try:
            cursor = conn.cursor()
            cursor.executescript(raw_sql)
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
        logger.info("sqlite_extras_init_complete")
    except Exception as e:
        logger.warning("sqlite_extras_init_skipped", error=str(e))



