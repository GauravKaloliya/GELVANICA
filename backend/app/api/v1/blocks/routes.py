from flask import Blueprint, Response, request, url_for
from flask import redirect as _redirect

from app.api.v1.helpers import (
    check_workspace_access,
    item_response,
    list_response,
    pagination_args,
    raw_response,
    request_json,
)
from app.core.constants import RATE_LIMIT_STANDARD, RATE_LIMIT_STRICT
from app.core.errors import NotFoundError
from app.core.response import error
from app.core.validation import load_schema
from app.extensions import limiter
from app.models import Block
from app.repositories import BlockRepository, EntityRepository
from app.schemas.domain import BlockCreateSchema, BlockUpdateSchema, MoveBlockSchema
from app.services.block_service import BlockService
from app.services.security import current_user_id, secured

bp = Blueprint("blocks", __name__)


def _get_block_entity_id(block_id: str) -> str | None:
    """Look up the workspace_id for a block via its entity."""
    try:
        block = BlockRepository().get(block_id)
    except NotFoundError:
        return None
    if getattr(block, 'entity_id', None):
        try:
            entity = EntityRepository().get(block.entity_id)
        except NotFoundError:
            return None
        if entity.workspace_id:
            return str(entity.workspace_id)
    return None


@bp.get("/<string:workspace_id>/blocks/")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def list_blocks(workspace_id: str) -> Response:
    """List blocks, optionally filtered by entity_id."""
    entity_id = request.args.get("entity_id")
    if not entity_id:
        return error("bad_request", "entity_id query param is required", status=400)
    args = pagination_args()
    page, per_page = args["page"], args["per_page"]

    query = BlockRepository().query().filter(Block.is_deleted.is_(False))
    try:
        entity = EntityRepository().get(entity_id)
    except NotFoundError:
        return error("not_found", "Entity not found", status=404)
    if entity and entity.workspace_id:
        access_err = check_workspace_access(str(entity.workspace_id))
        if access_err:
            return access_err
    query = query.filter(Block.entity_id == entity_id)

    pagination = query.order_by(Block.position).paginate(page=page, per_page=per_page, error_out=False)
    return list_response(pagination)


@bp.post("/<string:workspace_id>/blocks/")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def create_block(workspace_id: str) -> Response:
    """Create a new block."""
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Invalid request body", status=400)
    entity_id = data.get("entity_id")
    if entity_id:
        try:
            entity = EntityRepository().get(entity_id)
        except NotFoundError:
            return error("not_found", "Entity not found", status=404)
        if entity and entity.workspace_id:
            access_err = check_workspace_access(str(entity.workspace_id))
            if access_err:
                return access_err
    return item_response(BlockService().create(load_schema(BlockCreateSchema(), data), current_user_id()), 201)


@bp.get("/<string:workspace_id>/blocks/<string:block_id>")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def get_block(workspace_id: str, block_id: str) -> Response:
    """Get a block by ID."""
    ws_id = _get_block_entity_id(block_id)
    if ws_id:
        access_err = check_workspace_access(ws_id)
        if access_err:
            return access_err
    try:
        block = BlockRepository().get(block_id)
    except NotFoundError:
        return error("not_found", "Block not found", status=404)
    return item_response(block)


@bp.patch("/<string:workspace_id>/blocks/<string:block_id>")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def update_block(workspace_id: str, block_id: str) -> Response:
    """Update a block."""
    ws_id = _get_block_entity_id(block_id)
    if ws_id:
        access_err = check_workspace_access(ws_id)
        if access_err:
            return access_err
    try:
        body = request_json()
        if not isinstance(body, dict):
            return error("bad_request", "Invalid request body", status=400)
        result = BlockService().update(block_id, load_schema(BlockUpdateSchema(), body, partial=True), current_user_id())
    except NotFoundError:
        return error("not_found", "Block not found", status=404)
    return item_response(result)


@bp.post("/<string:workspace_id>/blocks/<string:block_id>/move")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def move_block(workspace_id: str, block_id: str) -> Response:
    """Move a block to a different position or entity."""
    ws_id = _get_block_entity_id(block_id)
    if ws_id:
        access_err = check_workspace_access(ws_id)
        if access_err:
            return access_err
    try:
        body = request_json()
        if not isinstance(body, dict):
            return error("bad_request", "Invalid request body", status=400)
        result = BlockService().move(block_id, load_schema(MoveBlockSchema(), body), user_id=current_user_id())
    except NotFoundError:
        return error("not_found", "Block not found", status=404)
    return item_response(result)


@bp.delete("/<string:workspace_id>/blocks/<string:block_id>")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def delete_block(workspace_id: str, block_id: str) -> Response:
    """Soft-delete a block."""
    ws_id = _get_block_entity_id(block_id)
    if ws_id:
        access_err = check_workspace_access(ws_id)
        if access_err:
            return access_err
    try:
        result = BlockService().delete(block_id, current_user_id())
    except NotFoundError:
        return error("not_found", "Block not found", status=404)
    return item_response(result)


@bp.post("/<string:workspace_id>/blocks/reorder")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def reorder_blocks(workspace_id: str) -> Response:
    """Reorder all blocks within an entity."""
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Invalid request body", status=400)
    entity_id = data.get("entity_id")
    block_order = data.get("blocks", [])
    if not entity_id or not block_order:
        return error("bad_request", "entity_id and blocks are required", status=400)
    if not isinstance(block_order, list):
        return error("bad_request", "blocks must be a list", status=400)
    for item in block_order:
        if not isinstance(item, dict) or "id" not in item or "position" not in item:
            return error("bad_request", "Each block must have 'id' and 'position'", status=400)
        try:
            float(item["position"])
        except (TypeError, ValueError):
            return error("bad_request", "position must be numeric", status=400)
    try:
        entity = EntityRepository().get(entity_id)
    except NotFoundError:
        return error("not_found", "Entity not found", status=404)
    if entity and entity.workspace_id:
        access_err = check_workspace_access(str(entity.workspace_id))
        if access_err:
            return access_err
    result = BlockService().reorder(entity_id, block_order)
    return raw_response({"reordered": len(result)})


@bp.post("/<string:workspace_id>/blocks/<string:block_id>/restore")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def restore_block(workspace_id: str, block_id: str) -> Response:
    """Restore a soft-deleted block."""
    ws_id = _get_block_entity_id(block_id)
    if ws_id:
        access_err = check_workspace_access(ws_id)
        if access_err:
            return access_err
    try:
        result = BlockService().restore(block_id, current_user_id())
    except NotFoundError:
        return error("not_found", "Block not found", status=404)
    return item_response(result)


@bp.get("/<string:workspace_id>/blocks/entity/<string:entity_id>")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def entity_blocks(workspace_id: str, entity_id: str) -> Response:
    """Alias: redirects to GET /blocks?entity_id=X."""
    try:
        entity = EntityRepository().get(entity_id)
    except NotFoundError:
        return error("not_found", "Entity not found", status=404)
    if entity and entity.workspace_id:
        access_err = check_workspace_access(str(entity.workspace_id))
        if access_err:
            return access_err
    return _redirect(url_for('api_v1.blocks.list_blocks', workspace_id=workspace_id, entity_id=entity_id), code=308)
