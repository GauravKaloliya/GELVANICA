"""Tag API routes."""

from flask import Blueprint
from flask.typing import ResponseValue

from app.api.v1.helpers import (
    check_workspace_access,
    item_response,
    list_response,
    pagination_args,
    request_json,
)
from app.core.constants import RATE_LIMIT_STANDARD, RATE_LIMIT_STRICT
from app.core.response import error
from app.core.validation import load_schema
from app.core.errors import NotFoundError
from app.extensions import limiter
from app.repositories import EntityRepository, TagRepository
from app.schemas.domain import TagCreateSchema, TagUpdateSchema
from app.services.security import current_user_id, secured
from app.services.tag_service import TagService

bp = Blueprint("tags", __name__)


@bp.get("/<string:workspace_id>/tags/")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def list_tags(workspace_id: str) -> ResponseValue:
    """List all tags in a workspace."""
    args = pagination_args()
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    return list_response(
        TagRepository().list(
            {"workspace_id": workspace_id},
            args["page"],
            args["per_page"],
        )
    )


@bp.post("/<string:workspace_id>/tags/")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def create_tag(workspace_id: str) -> ResponseValue:
    """Create a new tag."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    body = request_json()
    if not isinstance(body, dict):
        return error("bad_request", "Invalid request body", status=400)
    data = {**body, "workspace_id": workspace_id}
    validated = load_schema(TagCreateSchema(), data)
    return item_response(TagService().create(validated), 201)


@bp.get("/<string:workspace_id>/tags/<string:tag_id>")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def get_tag(workspace_id: str, tag_id: str) -> ResponseValue:
    """Get a single tag by ID."""
    try:
        tag = TagRepository().get(tag_id)
    except NotFoundError:
        return error("not_found", "Tag not found", status=404)
    access_err = check_workspace_access(str(tag.workspace_id))
    if access_err:
        return access_err
    return item_response(tag)


@bp.patch("/<string:workspace_id>/tags/<string:tag_id>")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def update_tag(workspace_id: str, tag_id: str) -> ResponseValue:
    """Update an existing tag."""
    try:
        tag = TagRepository().get(tag_id)
    except NotFoundError:
        return error("not_found", "Tag not found", status=404)
    access_err = check_workspace_access(str(tag.workspace_id))
    if access_err:
        return access_err
    body = request_json()
    if not isinstance(body, dict):
        return error("bad_request", "Invalid request body", status=400)
    return item_response(
        TagService().update(
            tag_id, load_schema(TagUpdateSchema(), body, partial=True)
        )
    )


@bp.delete("/<string:workspace_id>/tags/<string:tag_id>")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def delete_tag(workspace_id: str, tag_id: str) -> ResponseValue:
    """Delete a tag."""
    try:
        tag = TagRepository().get(tag_id)
    except NotFoundError:
        return error("not_found", "Tag not found", status=404)
    access_err = check_workspace_access(str(tag.workspace_id))
    if access_err:
        return access_err
    return item_response(TagService().delete(tag_id, current_user_id()))


@bp.post("/<string:workspace_id>/tags/<string:tag_id>/restore")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def restore_tag(workspace_id: str, tag_id: str) -> ResponseValue:
    """Restore a soft-deleted tag."""
    try:
        tag = TagRepository().get(tag_id, include_deleted=True)
    except NotFoundError:
        return error("not_found", "Tag not found", status=404)
    access_err = check_workspace_access(str(tag.workspace_id))
    if access_err:
        return access_err
    return item_response(TagService().restore(tag_id))


@bp.post("/<string:workspace_id>/tags/<string:tag_id>/entities/<string:entity_id>")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def tag_entity(workspace_id: str, tag_id: str, entity_id: str) -> ResponseValue:
    """Associate an entity with a tag."""
    try:
        tag = TagRepository().get(tag_id)
    except NotFoundError:
        return error("not_found", "Tag not found", status=404)
    try:
        entity = EntityRepository().get(entity_id)
    except NotFoundError:
        return error("not_found", "Entity not found", status=404)
    access_err = check_workspace_access(str(tag.workspace_id))
    if access_err:
        return access_err
    if str(entity.workspace_id) != str(tag.workspace_id):
        return error("bad_request", "Entity does not belong to the tag's workspace", status=400)
    return item_response(TagService().tag_entity(entity_id, tag_id), 201)


@bp.delete("/<string:workspace_id>/tags/<string:tag_id>/entities/<string:entity_id>")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def untag_entity(workspace_id: str, tag_id: str, entity_id: str) -> ResponseValue:
    """Remove the association between an entity and a tag."""
    try:
        tag = TagRepository().get(tag_id)
    except NotFoundError:
        return error("not_found", "Tag not found", status=404)
    access_err = check_workspace_access(str(tag.workspace_id))
    if access_err:
        return access_err
    return item_response(TagService().untag_entity(entity_id, tag_id))
