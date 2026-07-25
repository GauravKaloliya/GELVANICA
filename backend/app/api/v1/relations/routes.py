"""Relation management and graph traversal routes."""

from flask import Blueprint, Response, request

from app.api.v1.helpers import check_workspace_access, item_response, list_response, pagination_args, raw_response, request_json
from app.core.constants import RATE_LIMIT_STANDARD, RATE_LIMIT_STRICT
from app.core.errors import NotFoundError
from app.core.response import error
from app.core.validation import load_schema
from app.extensions import limiter
from app.services.graph_service import GraphService as GraphTraversalService
from app.repositories import EntityRepository, RelationRepository
from app.schemas.domain import RelationCreateSchema, RelationUpdateSchema
from app.services.relation_service import RelationService
from app.services.security import current_user_id, secured

bp = Blueprint("relations", __name__)


@bp.get("/<string:workspace_id>/relations/")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def list_relations(workspace_id: str) -> Response:
    """List relations, optionally filtered by workspace_id."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    args = pagination_args()
    filters = {"workspace_id": workspace_id}
    entity_id = request.args.get("entity_id")
    target_id = request.args.get("target_id")
    type_ = request.args.get("type")
    if entity_id:
        filters["entity_id"] = entity_id
    if target_id:
        filters["target_id"] = target_id
    if type_:
        filters["type"] = type_
    return list_response(RelationRepository().list(filters, args["page"], args["per_page"]))


@bp.post("/<string:workspace_id>/relations/")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def create_relation(workspace_id: str) -> Response:
    """Create a new relation between two entities."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    data["workspace_id"] = workspace_id
    validated = load_schema(RelationCreateSchema(), data)
    return item_response(RelationService().create(validated, current_user_id()), 201)


@bp.get("/<string:workspace_id>/relations/<string:relation_id>")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def get_relation(workspace_id: str, relation_id: str) -> Response:
    """Retrieve a single relation by ID."""
    try:
        relation = RelationRepository().get(relation_id)
    except NotFoundError:
        return error("not_found", "Relation not found", status=404)
    access_err = check_workspace_access(relation.workspace_id)
    if access_err:
        return access_err
    return item_response(relation)


@bp.patch("/<string:workspace_id>/relations/<string:relation_id>")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def update_relation(workspace_id: str, relation_id: str) -> Response:
    """Update a relation."""
    try:
        rel = RelationRepository().get(relation_id)
    except NotFoundError:
        return error("not_found", "Relation not found", status=404)
    access_err = check_workspace_access(rel.workspace_id)
    if access_err:
        return access_err
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    data = load_schema(RelationUpdateSchema(), data, partial=True)
    return item_response(RelationService().update(relation_id, data))


@bp.delete("/<string:workspace_id>/relations/<string:relation_id>")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def delete_relation(workspace_id: str, relation_id: str) -> Response:
    """Soft-delete a relation."""
    try:
        relation = RelationRepository().get(relation_id)
    except NotFoundError:
        return error("not_found", "Relation not found", status=404)
    access_err = check_workspace_access(relation.workspace_id)
    if access_err:
        return access_err
    return item_response(RelationService().delete(relation_id, current_user_id()))


@bp.get("/<string:workspace_id>/relations/entity/<string:entity_id>")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def entity_relations(workspace_id: str, entity_id: str) -> Response:
    """List all outgoing relations for an entity."""
    try:
        entity = EntityRepository().get(entity_id)
    except NotFoundError:
        return error("not_found", "Entity not found", status=404)
    access_err = check_workspace_access(str(entity.workspace_id))
    if access_err:
        return access_err
    args = pagination_args()
    result = RelationService().outgoing(entity_id, args["page"], args["per_page"])
    return list_response(result)


@bp.get("/<string:workspace_id>/relations/backlinks/<string:entity_id>")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def backlinks(workspace_id: str, entity_id: str) -> Response:
    """List all incoming relations (backlinks) for an entity."""
    try:
        entity = EntityRepository().get(entity_id)
    except NotFoundError:
        return error("not_found", "Entity not found", status=404)
    access_err = check_workspace_access(str(entity.workspace_id))
    if access_err:
        return access_err
    args = pagination_args()
    result = RelationService().backlinks(entity_id, args["page"], args["per_page"])
    return list_response(result)


@bp.post("/<string:workspace_id>/relations/<string:relation_id>/restore")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def restore_relation(workspace_id: str, relation_id: str) -> Response:
    """Restore a soft-deleted relation."""
    try:
        rel = RelationRepository().get(relation_id, include_deleted=True)
    except NotFoundError:
        return error("not_found", "Relation not found", status=404)
    access_err = check_workspace_access(rel.workspace_id)
    if access_err:
        return access_err
    return item_response(RelationService().restore(relation_id))


@bp.get("/<string:workspace_id>/relations/neighbors/<string:entity_id>")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def neighbors(workspace_id: str, entity_id: str) -> Response:
    """Return neighboring entities in the knowledge graph."""
    try:
        entity = EntityRepository().get(entity_id)
    except NotFoundError:
        return error("not_found", "Entity not found", status=404)
    access_err = check_workspace_access(str(entity.workspace_id))
    if access_err:
        return access_err
    return raw_response(GraphTraversalService().get_related_entities(entity_id))


@bp.get("/<string:workspace_id>/relations/path")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def path(workspace_id: str) -> Response:
    """Find shortest path between two entities."""
    source_id = request.args.get("source_entity_id")
    target_id = request.args.get("target_entity_id")
    if not source_id or not target_id:
        return error("bad_request", "source_entity_id and target_entity_id are required", status=400)
    try:
        entity = EntityRepository().get(source_id)
    except NotFoundError:
        return error("not_found", "Source entity not found", status=404)
    access_err = check_workspace_access(str(entity.workspace_id))
    if access_err:
        return access_err
    return raw_response(GraphTraversalService().find_shortest_path(str(entity.workspace_id), source_id, target_id))


@bp.post("/<string:workspace_id>/relations/batch")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def bulk_create_relations(workspace_id: str) -> Response:
    """Bulk-create relations with atomic batch semantics."""
    data = request_json()
    if isinstance(data, dict):
        data = data.get("relations", data)
    if not isinstance(data, list):
        return error("bad_request", "Request body must be a list of relation objects", status=400)
    if not data:
        return error("bad_request", "Request body cannot be empty", status=400)
    for item in data:
        item["workspace_id"] = workspace_id
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    result = RelationService().bulk_create(data, current_user_id())
    return raw_response(result, 201)
