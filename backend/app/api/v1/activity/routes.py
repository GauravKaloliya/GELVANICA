"""Activity log routes."""

from flask import Blueprint, Response, request

from app.api.v1.helpers import check_workspace_access, list_response, pagination_args
from app.core.constants import RATE_LIMIT_STANDARD
from app.extensions import limiter
from app.repositories import EntityEventRepository
from app.services.activity_service import ActivityService
from app.services.security import secured

bp = Blueprint("activity", __name__)


@bp.get("/<string:workspace_id>/activity")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def list_activity(workspace_id: str) -> Response:
    """List activity logs for a workspace (most recent first)."""
    args = pagination_args()
    filters = {
        "entity_id": request.args.get("entity_id"),
        "action": request.args.get("action"),
        "user_id": request.args.get("user_id"),
        "start_date": request.args.get("start_date"),
        "end_date": request.args.get("end_date"),
    }
    filters = {k: v for k, v in filters.items() if v is not None}
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    return list_response(ActivityService().list_by_workspace(workspace_id, args["page"], args["per_page"], filters))


@bp.get("/<string:workspace_id>/activity/events")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def list_entity_events(workspace_id: str) -> Response:
    """List entity-specific events from the entity_events table."""
    args = pagination_args()
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    allowed_filters = {"entity_id", "changeset_id"}
    filters = {"workspace_id": workspace_id}
    entity_id = request.args.get("entity_id")
    if entity_id and "entity_id" in allowed_filters:
        filters["entity_id"] = entity_id
    changeset_id = request.args.get("changeset_id")
    if changeset_id and "changeset_id" in allowed_filters:
        filters["changeset_id"] = changeset_id
    page = EntityEventRepository().list(
        filters=filters, page=args["page"], per_page=args["per_page"],
        order_by="created_at", descending=True,
    )
    return list_response(page)
