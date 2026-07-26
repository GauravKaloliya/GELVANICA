from flask import Blueprint, Response, request

from app.api.v1.helpers import check_workspace_access, item_response, list_response, pagination_args, raw_response, request_json
from app.core.constants import RATE_LIMIT_DESTRUCTIVE, RATE_LIMIT_STANDARD, RATE_LIMIT_STRICT
from app.core.errors import NotFoundError
from app.core.response import error
from app.core.validation import load_schema
from app.extensions import db, limiter
from app.repositories import EntityRepository, EntityTypeRepository, EntityVersionRepository, PropertyRepository
from app.schemas.domain import EntityCreateSchema, EntityTypeCreateSchema, EntityTypeUpdateSchema, EntityUpdateSchema, PropertyCreateSchema
from app.services.entity_service import EntityService
from app.services.security import current_user_id, secured

bp = Blueprint("entities", __name__)


@bp.get("/<string:workspace_id>/entities/")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def list_entities(workspace_id: str) -> Response:
    """List entities, optionally filtered by workspace_id and entity_type_id."""
    args = pagination_args()
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    filters = {"workspace_id": workspace_id}
    entity_type_id = request.args.get("type") or request.args.get("entity_type_id")
    if entity_type_id:
        filters["entity_type_id"] = entity_type_id
    search = request.args.get("search")
    if search:
        filters["search"] = search
    tags = request.args.get("tags")
    if tags:
        filters["tags"] = tags
    deleted = request.args.get("deleted")
    if deleted:
        filters["is_deleted"] = deleted.lower() in ("true", "1")
    sort = request.args.get("sort")
    order = request.args.get("order")
    descending = order != "asc"
    return list_response(EntityRepository().list(filters, args["page"], args["per_page"], order_by=sort, descending=descending))


@bp.post("/<string:workspace_id>/entities/")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def create_entity(workspace_id: str) -> Response:
    """Create a new entity."""
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    data["workspace_id"] = workspace_id
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    return item_response(EntityService().create(load_schema(EntityCreateSchema(), data), current_user_id()), 201)


@bp.get("/<string:workspace_id>/entities/<string:entity_id>")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def get_entity(workspace_id: str, entity_id: str) -> Response:
    """Get an entity by ID with flattened properties."""
    try:
        entity = EntityRepository().get(entity_id)
    except NotFoundError:
        return error("not_found", "Entity not found", status=404)
    if entity and entity.workspace_id:
        access_err = check_workspace_access(str(entity.workspace_id))
        if access_err:
            return access_err
    result = EntityService().get_with_blocks(entity_id)
    result["properties"] = EntityService().flatten_properties(entity_id)
    blocks = result.pop("blocks", [])
    return raw_response({"entity": result, "blocks": blocks, "storage_used": 0})


@bp.patch("/<string:workspace_id>/entities/<string:entity_id>")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def update_entity(workspace_id: str, entity_id: str) -> Response:
    """Update an entity."""
    try:
        entity = EntityRepository().get(entity_id)
    except NotFoundError:
        return error("not_found", "Entity not found", status=404)
    if entity.workspace_id:
        access_err = check_workspace_access(str(entity.workspace_id))
        if access_err:
            return access_err
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    return item_response(
        EntityService().update(entity_id, load_schema(EntityUpdateSchema(), data, partial=True), current_user_id())
    )


@bp.delete("/<string:workspace_id>/entities/<string:entity_id>")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def delete_entity(workspace_id: str, entity_id: str) -> Response:
    """Soft-delete an entity."""
    try:
        entity = EntityRepository().get(entity_id)
    except NotFoundError:
        return error("not_found", "Entity not found", status=404)
    if entity.workspace_id:
        access_err = check_workspace_access(str(entity.workspace_id))
        if access_err:
            return access_err
    return item_response(EntityService().soft_delete(entity_id, current_user_id()))


@bp.delete("/<string:workspace_id>/entities/<string:entity_id>/permanent")
@limiter.limit(RATE_LIMIT_DESTRUCTIVE)
@secured
def permanent_delete_entity(workspace_id: str, entity_id: str) -> Response:
    """Permanently delete an entity (must be soft-deleted first)."""
    from app.repositories import EntityRepository
    from app.services.entity_service import EntityService
    try:
        entity = EntityRepository().get(entity_id, include_deleted=True)
    except NotFoundError:
        return error("not_found", "Entity not found", status=404)
    if entity.workspace_id:
        access_err = check_workspace_access(str(entity.workspace_id))
        if access_err:
            return access_err
    return item_response(EntityService().permanent_delete(entity_id, current_user_id()))


@bp.post("/<string:workspace_id>/entities/<string:entity_id>/restore")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def restore_entity(workspace_id: str, entity_id: str) -> Response:
    """Restore a soft-deleted entity."""
    try:
        entity = EntityRepository().get(entity_id, include_deleted=True)
    except NotFoundError:
        return error("not_found", "Entity not found", status=404)
    if entity.workspace_id:
        access_err = check_workspace_access(str(entity.workspace_id))
        if access_err:
            return access_err
    return item_response(EntityService().restore(entity_id, current_user_id()))


@bp.post("/<string:workspace_id>/entities/<string:entity_id>/archive")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def archive_entity(workspace_id: str, entity_id: str) -> Response:
    """Archive an entity."""
    try:
        entity = EntityRepository().get(entity_id)
    except NotFoundError:
        return error("not_found", "Entity not found", status=404)
    if entity.workspace_id:
        access_err = check_workspace_access(str(entity.workspace_id))
        if access_err:
            return access_err
    return item_response(EntityService().archive(entity_id, archived=True, user_id=current_user_id()))


@bp.post("/<string:workspace_id>/entities/<string:entity_id>/duplicate")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def duplicate_entity(workspace_id: str, entity_id: str) -> Response:
    """Duplicate an entity with all its blocks."""
    try:
        entity = EntityRepository().get(entity_id)
    except NotFoundError:
        return error("not_found", "Entity not found", status=404)
    if entity.workspace_id:
        access_err = check_workspace_access(str(entity.workspace_id))
        if access_err:
            return access_err
    return item_response(EntityService().duplicate(entity_id, current_user_id()), 201)


@bp.get("/<string:workspace_id>/entities/<string:entity_id>/children")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def get_children(workspace_id: str, entity_id: str) -> Response:
    """List child entities."""
    try:
        entity = EntityRepository().get(entity_id)
    except NotFoundError:
        return error("not_found", "Entity not found", status=404)
    if entity.workspace_id:
        access_err = check_workspace_access(str(entity.workspace_id))
        if access_err:
            return access_err
    args = pagination_args()
    return list_response(EntityService().get_children(entity_id, args["page"], args["per_page"]))


@bp.post("/<string:workspace_id>/entities/<string:entity_id>/children")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def create_child(workspace_id: str, entity_id: str) -> Response:
    """Create a child entity under the given parent."""
    try:
        entity = EntityRepository().get(entity_id)
    except NotFoundError:
        return error("not_found", "Entity not found", status=404)
    if entity.workspace_id:
        access_err = check_workspace_access(str(entity.workspace_id))
        if access_err:
            return access_err
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    data["workspace_id"] = workspace_id
    data["parent_id"] = entity_id
    validated = load_schema(EntityCreateSchema(), data)
    return item_response(EntityService().create(validated, current_user_id()), 201)


@bp.get("/<string:workspace_id>/entities/<string:entity_id>/versions")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def get_versions(workspace_id: str, entity_id: str) -> Response:
    """List entity versions."""
    try:
        entity = EntityRepository().get(entity_id)
    except NotFoundError:
        return error("not_found", "Entity not found", status=404)
    if entity.workspace_id:
        access_err = check_workspace_access(str(entity.workspace_id))
        if access_err:
            return access_err
    args = pagination_args()
    return list_response(EntityVersionRepository().list({"entity_id": entity_id}, args["page"], args["per_page"]))


@bp.post("/<string:workspace_id>/entities/types")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def create_entity_type(workspace_id: str) -> Response:
    """Create a new entity type."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    data = {**data, "workspace_id": workspace_id}
    validated = load_schema(EntityTypeCreateSchema(), data)
    return item_response(EntityService().create_type(validated), 201)


@bp.get("/<string:workspace_id>/entities/types/<string:type_id>")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def get_entity_type(workspace_id: str, type_id: str) -> Response:
    try:
        et = EntityTypeRepository().get(type_id)
    except NotFoundError:
        return error("not_found", "Entity type not found", status=404)
    access_err = check_workspace_access(str(et.workspace_id))
    if access_err:
        return access_err
    return item_response(et)


@bp.get("/<string:workspace_id>/entities/types")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def list_entity_types(workspace_id: str) -> Response:
    """List entity types for a workspace."""
    args = pagination_args()
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    return list_response(EntityTypeRepository().list({"workspace_id": workspace_id}, args["page"], args["per_page"]))


@bp.post("/<string:workspace_id>/entities/properties")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def create_property(workspace_id: str) -> Response:
    """Create a new property definition."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    data = {**data, "workspace_id": workspace_id}
    validated = load_schema(PropertyCreateSchema(), data)
    return item_response(EntityService().create_property(validated), 201)


@bp.get("/<string:workspace_id>/entities/properties")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def list_properties(workspace_id: str) -> Response:
    """List property definitions for a workspace."""
    args = pagination_args()
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    return list_response(PropertyRepository().list({"workspace_id": workspace_id}, args["page"], args["per_page"]))


@bp.patch("/<string:workspace_id>/entities/types/<string:type_id>")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def update_entity_type(workspace_id: str, type_id: str) -> Response:
    """Update an entity type."""
    try:
        et = EntityTypeRepository().get(type_id)
    except NotFoundError:
        return error("not_found", "Entity type not found", status=404)
    access_err = check_workspace_access(str(et.workspace_id))
    if access_err:
        return access_err
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    data = load_schema(EntityTypeUpdateSchema(), data, partial=True)
    et = EntityTypeRepository().update(et, data)
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise
    return item_response(et)


@bp.delete("/<string:workspace_id>/entities/types/<string:type_id>")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def delete_entity_type(workspace_id: str, type_id: str) -> Response:
    """Soft-delete an entity type."""
    try:
        et = EntityTypeRepository().get(type_id)
    except NotFoundError:
        return error("not_found", "Entity type not found", status=404)
    access_err = check_workspace_access(str(et.workspace_id))
    if access_err:
        return access_err
    EntityTypeRepository().soft_delete(et)
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise
    return item_response(et)


@bp.post("/<string:workspace_id>/entities/bulk-delete")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def bulk_delete_entities(workspace_id: str) -> Response:
    """Soft-delete multiple entities."""
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    entity_ids = data.get("entity_ids", [])
    if not isinstance(entity_ids, list) or not entity_ids:
        return error("bad_request", "entity_ids must be a non-empty array", status=400)
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    results = []
    for eid in entity_ids:
        try:
            entity = EntityRepository().get(eid)
            if entity and str(entity.workspace_id) == workspace_id:
                results.append(EntityService().soft_delete(eid, current_user_id()))
        except NotFoundError:
            pass
    return item_response({"deleted": len(results)})


@bp.post("/<string:workspace_id>/entities/bulk-archive")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def bulk_archive_entities(workspace_id: str) -> Response:
    """Archive multiple entities."""
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    entity_ids = data.get("entity_ids", [])
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    results = []
    for eid in entity_ids:
        try:
            entity = EntityRepository().get(eid)
            if entity and str(entity.workspace_id) == workspace_id:
                results.append(EntityService().archive(eid, archived=True, user_id=current_user_id()))
        except NotFoundError:
            pass
    return item_response({"archived": len(results)})


@bp.post("/<string:workspace_id>/entities/bulk-restore")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def bulk_restore_entities(workspace_id: str) -> Response:
    """Restore multiple soft-deleted entities."""
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    entity_ids = data.get("entity_ids", [])
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    results = []
    for eid in entity_ids:
        try:
            entity = EntityRepository().get(eid, include_deleted=True)
            if entity and str(entity.workspace_id) == workspace_id:
                results.append(EntityService().restore(eid, current_user_id()))
        except NotFoundError:
            pass
    return item_response({"restored": len(results)})


@bp.post("/<string:workspace_id>/entities/bulk-tag")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def bulk_tag_entities(workspace_id: str) -> Response:
    """Apply a tag to multiple entities."""
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    entity_ids = data.get("entity_ids", [])
    tag_id = data.get("tag_id")
    if not tag_id:
        return error("bad_request", "tag_id is required", status=400)
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    from app.models import EntityTag
    tagged = 0
    for eid in entity_ids:
        try:
            entity = EntityRepository().get(eid)
            if entity and str(entity.workspace_id) == workspace_id:
                existing = EntityTag.query.filter_by(entity_id=eid, tag_id=tag_id, is_deleted=False).first()
                if not existing:
                    et = EntityTag(entity_id=eid, tag_id=tag_id)
                    db.session.add(et)
                    tagged += 1
        except NotFoundError:
            pass
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise
    return item_response({"tagged": tagged})


@bp.post("/<string:workspace_id>/entities/bulk-move")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def bulk_move_entities(workspace_id: str) -> Response:
    """Move multiple entities to another workspace."""
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    entity_ids = data.get("entity_ids", [])
    target_workspace_id = data.get("target_workspace_id")
    if not target_workspace_id:
        return error("bad_request", "target_workspace_id is required", status=400)
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    moved = 0
    for eid in entity_ids:
        try:
            entity = EntityRepository().get(eid)
            if entity and str(entity.workspace_id) == workspace_id:
                EntityRepository().update(entity, {"workspace_id": target_workspace_id})
                moved += 1
        except NotFoundError:
            pass
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise
    return item_response({"moved": moved})
