from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

import structlog
from sqlalchemy import inspect as sa_inspect

log = structlog.get_logger(__name__)


def to_json(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, bytes):
        return value.decode("utf-8")
    if isinstance(value, (set, frozenset)):
        return [to_json(item) for item in value]
    if isinstance(value, tuple):
        return [to_json(item) for item in value]
    if isinstance(value, list):
        return [to_json(item) for item in value]
    if isinstance(value, dict):
        return {key: to_json(item) for key, item in value.items()}
    return value


_ATTR_TO_RESPONSE = {
    "relation_metadata": "metadata",
    "merge_metadata": "metadata",
}


def model_to_dict(model, exclude=None):
    """Serialize a SQLAlchemy model instance (or plain dict) to a plain dict.

    Uses the ORM mapper's column_attrs. Attribute names are mapped to
    response keys via ``_ATTR_TO_RESPONSE`` so the API output matches the spec
    (e.g. ``relation_metadata`` → ``metadata``).
    """
    exclude = set(exclude or [])
    if isinstance(model, dict):
        return {k: to_json(v) for k, v in model.items() if k not in exclude}
    result = {}
    mapper = sa_inspect(type(model))
    for attr in mapper.column_attrs:
        key = attr.key
        col_name = attr.columns[0].name
        if key in exclude or col_name in exclude:
            continue
        response_key = _ATTR_TO_RESPONSE.get(key, key)
        try:
            value = getattr(model, key)
            result[response_key] = to_json(value)
        except AttributeError:
            log.warning(
                "model_serialization_failed",
                response_key=response_key,
                model_type=type(model).__name__,
                exc_info=True,
            )
            result[response_key] = None
    return result
