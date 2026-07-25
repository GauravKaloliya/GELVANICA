from marshmallow import ValidationError

from app.core.errors import ApiError
from app.core.sanitization import sanitize_text


def _sanitize_dict(d):
    if isinstance(d, dict):
        return {k: _sanitize_dict(v) for k, v in d.items()}
    if isinstance(d, list):
        return [_sanitize_dict(item) for item in d]
    if isinstance(d, str):
        return sanitize_text(d)
    return d


def load_schema(schema, payload, *, partial=False, many=False):
    try:
        if many:
            data = schema.load(payload if payload is not None else [], partial=partial, many=True)
            return [_sanitize_dict(item) for item in data]
        data = schema.load(payload if payload is not None else {}, partial=partial)
        return _sanitize_dict(data)
    except ValidationError as exc:
        raise ApiError("Validation failed", 422, "validation_error", exc.messages) from exc
