"""
PostgreSQL-specific custom column types.
These use native PG extensions (pgvector, TSVECTOR) with safe fallbacks to standard types on SQLite.
"""
from sqlalchemy.types import UserDefinedType, Text


class Vector(UserDefinedType):
    """pgvector VECTOR(n) column type for embedding similarity search with SQLite fallback."""
    cache_ok = True

    def __init__(self, dim=1024):
        self.dim = dim

    def get_col_spec(self, **kw):
        return f"VECTOR({self.dim})"

    def bind_processor(self, dialect):
        def process(value):
            if value is None:
                return None
            if isinstance(value, (list, tuple)):
                return f"[{','.join(str(v) for v in value)}]"
            return value
        return process

    def result_processor(self, dialect, coltype):
        def process(value):
            if value is None:
                return None
            if isinstance(value, str):
                inner = value.strip()
                if inner.startswith("[") and inner.endswith("]"):
                    inner = inner[1:-1]
                if not inner:
                    return []
                return [float(x.strip()) for x in inner.split(",")]
            if isinstance(value, list):
                return [float(x) for x in value]
            return value
        return process

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(self)
        return dialect.type_descriptor(Text())


class TSVectorType(UserDefinedType):
    """PostgreSQL TSVECTOR column type for full-text search with SQLite fallback."""
    cache_ok = True

    def get_col_spec(self, **kw):
        return "TSVECTOR"

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(self)
        return dialect.type_descriptor(Text())

