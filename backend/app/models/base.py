import uuid
from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from app.extensions import db

def _UTCNOW():
    return datetime.now(timezone.utc)


class UUIDPrimaryKeyMixin:
    """Mixin providing a UUID primary key column with server-generated default."""
    id = db.Column(
        PG_UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        server_default=text("gen_random_uuid()"),
    )


class TimestampMixin:
    """Mixin providing created_at and updated_at timestamp columns."""
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=_UTCNOW, server_default=text("now()"))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=_UTCNOW, onupdate=_UTCNOW, server_default=text("now()"))


class SoftDeleteMixin:
    """Mixin providing soft-delete support with is_deleted, deleted_at, and deleted_by columns."""
    is_deleted = db.Column(db.Boolean, nullable=False, default=False, server_default=text("false"))
    deleted_at = db.Column(db.DateTime(timezone=True), nullable=True)
    deleted_by = db.Column(PG_UUID(as_uuid=False), db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)


class CreatedOnlyMixin:
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=_UTCNOW, server_default=text("now()"))
