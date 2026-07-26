"""Comment API routes."""

from flask import Blueprint, request
from flask.typing import ResponseValue

from app.api.v1.helpers import (
    check_workspace_access,
    cloud_only,
    item_response,
    list_response,
    pagination_args,
    request_json,
)
from app.core.constants import RATE_LIMIT_STANDARD, RATE_LIMIT_STRICT
from app.core.errors import NotFoundError
from app.core.response import error
from app.core.validation import load_schema
from app.extensions import limiter
from app.repositories import CommentRepository, EntityRepository
from app.schemas.domain import CommentCreateSchema, CommentUpdateSchema
from app.services.comment_service import CommentService
from app.services.security import current_user_id, secured

bp = Blueprint("comments", __name__)


@bp.get("/<string:workspace_id>/comments/")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured

def list_comments(workspace_id: str) -> ResponseValue:
    """List comments, optionally filtered by entity or parent."""
    args = pagination_args()
    entity_id = request.args.get("entity_id")
    parent_id = request.args.get("parent_id")
    if entity_id:
        try:
            entity = EntityRepository().get(entity_id)
        except NotFoundError:
            return error("not_found", "Entity not found", status=404)
        access_err = check_workspace_access(str(entity.workspace_id))
        if access_err:
            return access_err
    if parent_id:
        try:
            parent_comment = CommentRepository().get(parent_id)
        except NotFoundError:
            return error("not_found", "Comment not found", status=404)
        if parent_comment and parent_comment.entity_id:
            try:
                entity = EntityRepository().get(parent_comment.entity_id)
            except NotFoundError:
                return error("not_found", "Entity not found", status=404)
            if entity and entity.workspace_id:
                access_err = check_workspace_access(str(entity.workspace_id))
                if access_err:
                    return access_err
        elif parent_comment:
            access_err = check_workspace_access(parent_comment.workspace_id)
            if access_err:
                return access_err
        return list_response(
            CommentRepository().list_replies(parent_id, args["page"], args["per_page"])
        )
    if entity_id:
        return list_response(
            CommentRepository().list_for_entity(entity_id, args["page"], args["per_page"])
        )
    return error("bad_request", "entity_id or parent_id query param is required", status=400)


@bp.post("/<string:workspace_id>/comments/")
@limiter.limit(RATE_LIMIT_STRICT)
@secured

def create_comment(workspace_id: str) -> ResponseValue:
    """Create a new comment."""
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    data["workspace_id"] = workspace_id
    validated = load_schema(CommentCreateSchema(), data)
    entity_id = validated.get("entity_id")
    if entity_id:
        try:
            entity = EntityRepository().get(entity_id)
        except NotFoundError:
            return error("not_found", "Entity not found", status=404)
        access_err = check_workspace_access(str(entity.workspace_id))
        if access_err:
            return access_err
    else:
        access_err = check_workspace_access(workspace_id)
        if access_err:
            return access_err
    return item_response(
        CommentService().create(validated, current_user_id()),
        201,
    )


@bp.get("/<string:workspace_id>/comments/<string:comment_id>")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured

def get_comment(workspace_id: str, comment_id: str) -> ResponseValue:
    """Get a single comment by ID."""
    try:
        comment = CommentRepository().get(comment_id)
    except NotFoundError:
        return error("not_found", "Comment not found", status=404)
    if comment.entity_id:
        try:
            entity = EntityRepository().get(comment.entity_id)
        except NotFoundError:
            return error("not_found", "Entity not found", status=404)
        access_err = check_workspace_access(str(entity.workspace_id))
    else:
        access_err = check_workspace_access(comment.workspace_id)
    if access_err:
        return access_err
    return item_response(comment)


@bp.patch("/<string:workspace_id>/comments/<string:comment_id>")
@limiter.limit(RATE_LIMIT_STRICT)
@secured

def update_comment(workspace_id: str, comment_id: str) -> ResponseValue:
    """Update an existing comment."""
    try:
        comment = CommentRepository().get(comment_id)
    except NotFoundError:
        return error("not_found", "Comment not found", status=404)
    if comment.entity_id:
        try:
            entity = EntityRepository().get(comment.entity_id)
        except NotFoundError:
            return error("not_found", "Entity not found", status=404)
        access_err = check_workspace_access(str(entity.workspace_id))
    else:
        access_err = check_workspace_access(comment.workspace_id)
    if access_err:
        return access_err
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    return item_response(
        CommentService().update(
            comment_id,
            load_schema(CommentUpdateSchema(), data),
            current_user_id(),
        )
    )


@bp.delete("/<string:workspace_id>/comments/<string:comment_id>")
@limiter.limit(RATE_LIMIT_STRICT)
@secured

def delete_comment(workspace_id: str, comment_id: str) -> ResponseValue:
    """Delete a comment."""
    try:
        comment = CommentRepository().get(comment_id)
    except NotFoundError:
        return error("not_found", "Comment not found", status=404)
    if comment.entity_id:
        try:
            entity = EntityRepository().get(comment.entity_id)
        except NotFoundError:
            return error("not_found", "Entity not found", status=404)
        access_err = check_workspace_access(str(entity.workspace_id))
    else:
        access_err = check_workspace_access(comment.workspace_id)
    if access_err:
        return access_err
    return item_response(CommentService().delete(comment_id, current_user_id()))


@bp.post("/<string:workspace_id>/comments/<string:comment_id>/restore")
@limiter.limit(RATE_LIMIT_STRICT)
@secured

def restore_comment(workspace_id: str, comment_id: str) -> ResponseValue:
    """Restore a soft-deleted comment."""
    try:
        comment = CommentRepository().get(comment_id, include_deleted=True)
    except NotFoundError:
        return error("not_found", "Comment not found", status=404)
    if comment.entity_id:
        try:
            entity = EntityRepository().get(comment.entity_id)
        except NotFoundError:
            return error("not_found", "Entity not found", status=404)
        access_err = check_workspace_access(str(entity.workspace_id))
    else:
        access_err = check_workspace_access(comment.workspace_id)
    if access_err:
        return access_err
    if not comment.is_deleted:
        return error("bad_request", "Comment is not deleted", status=400)
    if str(comment.user_id) != str(current_user_id()):
        return error("forbidden", "Not authorized", status=403)
    return item_response(CommentService().restore(comment_id))
