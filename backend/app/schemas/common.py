from marshmallow import Schema, EXCLUDE, fields, validate

from app.core.constants import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE


class PaginationMixin(Schema):
    class Meta:
        unknown = EXCLUDE  # silently ignore extra query params like workspace_id, entity_id, etc.

    page = fields.Int(load_default=1, validate=validate.Range(min=1))
    per_page = fields.Int(load_default=DEFAULT_PAGE_SIZE, validate=validate.Range(min=1, max=MAX_PAGE_SIZE))
