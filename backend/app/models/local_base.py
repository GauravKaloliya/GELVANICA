import uuid
from datetime import datetime, timezone

from app.extensions import db

def _UTCNOW():
    return datetime.now(timezone.utc)


class TextPKMixin:
    id = db.Column(
        db.String(36),
        primary_key=True,
        default=lambda: uuid.uuid4().hex,
        server_default=db.text("(lower(hex(randomblob(16))))"),
    )


class TimestampMixin:
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=_UTCNOW, server_default=db.text('CURRENT_TIMESTAMP'))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=_UTCNOW, onupdate=_UTCNOW, server_default=db.text('CURRENT_TIMESTAMP'))


class CreatedOnlyMixin:
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=_UTCNOW, server_default=db.text('CURRENT_TIMESTAMP'))
