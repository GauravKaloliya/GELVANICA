"""Version control routes for changesets, snapshots, and comparisons."""

from flask import Blueprint, Response, request

from app.api.v1.helpers import check_workspace_access, item_response, list_response, pagination_args, raw_response, request_json
from app.core.constants import RATE_LIMIT_DESTRUCTIVE, RATE_LIMIT_STANDARD, RATE_LIMIT_STRICT
from app.core.errors import NotFoundError
from app.core.response import error
from app.core.validation import load_schema
from app.extensions import db, limiter
from app.repositories import BranchRepository
from app.repositories import BlockRepository as BlockRepo
from app.repositories.domain import BlockVersionRepository, ChangesetRepository, EntityRepository, EntityVersionRepository, SnapshotRepository
from app.schemas.domain import ChangesetCreateSchema, EntitySnapshotSchema, SnapshotCreateSchema
from app.services.security import current_user_id, secured
from app.services.versioning_service import VersioningService

bp = Blueprint("versions", __name__)


@bp.get("/<string:workspace_id>/versions/changesets")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def list_changesets(workspace_id: str) -> Response:
    """List changesets, optionally filtered by branch_id or workspace_id."""
    args = pagination_args()
    branch_id = request.args.get("branch_id")
    if branch_id:
        branch = BranchRepository().get(branch_id, include_deleted=True)
        if not branch:
            return error("not_found", "Branch not found", status=404)
        if branch and branch.workspace_id:
            access_err = check_workspace_access(str(branch.workspace_id))
            if access_err:
                return access_err
    else:
        access_err = check_workspace_access(workspace_id)
        if access_err:
            return access_err
        from app.models import Branch as BranchModel
        branch_ids = [b.id for b in BranchModel.query.filter_by(workspace_id=workspace_id, is_deleted=False).all()]
        if not branch_ids:
            return list_response({"items": [], "total": 0, "page": args["page"], "per_page": args["per_page"]})
        model = ChangesetRepository.model
        pagination = ChangesetRepository().query().filter(model.branch_id.in_(branch_ids)).order_by(model.created_at.desc()).paginate(
            page=args["page"], per_page=min(args["per_page"], 100), error_out=False
        )
        return list_response(pagination)
    return list_response(ChangesetRepository().list(page=args["page"], per_page=args["per_page"], filters={"branch_id": branch_id}))


@bp.get("/<string:workspace_id>/versions/changesets/<string:changeset_id>")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def get_changeset(workspace_id: str, changeset_id: str) -> Response:
    """Retrieve a single changeset by ID."""
    changeset = ChangesetRepository().get(changeset_id)
    if not changeset:
        return error("not_found", "Changeset not found", status=404)
    branch = BranchRepository().get(changeset.branch_id, include_deleted=True)
    access_err = check_workspace_access(getattr(branch, "workspace_id", None))
    if access_err:
        return access_err
    return item_response(changeset)


@bp.delete("/<string:workspace_id>/versions/changesets/<string:changeset_id>")
@limiter.limit(RATE_LIMIT_DESTRUCTIVE)
@secured
def delete_changeset(workspace_id: str, changeset_id: str) -> Response:
    """Delete a changeset."""
    changeset = ChangesetRepository().get(changeset_id)
    if not changeset:
        return error("not_found", "Changeset not found", status=404)
    branch = BranchRepository().get(changeset.branch_id, include_deleted=True)
    access_err = check_workspace_access(getattr(branch, "workspace_id", None))
    if access_err:
        return access_err
    ChangesetRepository().soft_delete(changeset)
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise
    return item_response(changeset)


@bp.post("/<string:workspace_id>/versions/changesets")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def create_changeset(workspace_id: str) -> Response:
    """Create a new changeset recording a set of edits."""
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Invalid request body", status=400)
    branch_id = data.get("branch_id")
    if branch_id:
        branch = BranchRepository().get(branch_id)
        if branch and branch.workspace_id:
            access_err = check_workspace_access(str(branch.workspace_id))
            if access_err:
                return access_err
    return item_response(VersioningService().create_changeset(load_schema(ChangesetCreateSchema(), data), current_user_id()), 201)


@bp.get("/<string:workspace_id>/versions/snapshots")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def list_snapshots(workspace_id: str) -> Response:
    """List snapshots, optionally filtered by branch_id or workspace_id."""
    args = pagination_args()
    branch_id = request.args.get("branch_id")
    if branch_id:
        branch = BranchRepository().get(branch_id, include_deleted=True)
        if not branch:
            return error("not_found", "Branch not found", status=404)
        if branch and branch.workspace_id:
            access_err = check_workspace_access(str(branch.workspace_id))
            if access_err:
                return access_err
    else:
        access_err = check_workspace_access(workspace_id)
        if access_err:
            return access_err
        from app.models import Branch as BranchModel
        branch_ids = [b.id for b in BranchModel.query.filter_by(workspace_id=workspace_id, is_deleted=False).all()]
        if not branch_ids:
            return list_response({"items": [], "total": 0, "page": args["page"], "per_page": args["per_page"]})
        model = SnapshotRepository.model
        pagination = SnapshotRepository().query().filter(model.branch_id.in_(branch_ids)).order_by(model.created_at.desc()).paginate(
            page=args["page"], per_page=min(args["per_page"], 100), error_out=False
        )
        return list_response(pagination)
    return list_response(SnapshotRepository().list(page=args["page"], per_page=args["per_page"], filters={"branch_id": branch_id}))


@bp.get("/<string:workspace_id>/versions/snapshots/<string:snapshot_id>")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def get_snapshot(workspace_id: str, snapshot_id: str) -> Response:
    """Retrieve a single snapshot by ID."""
    snapshot = SnapshotRepository().get(snapshot_id)
    if not snapshot:
        return error("not_found", "Snapshot not found", status=404)
    branch = BranchRepository().get(snapshot.branch_id, include_deleted=True)
    access_err = check_workspace_access(getattr(branch, "workspace_id", None))
    if access_err:
        return access_err
    return item_response(snapshot)


@bp.delete("/<string:workspace_id>/versions/snapshots/<string:snapshot_id>")
@limiter.limit(RATE_LIMIT_DESTRUCTIVE)
@secured
def delete_snapshot(workspace_id: str, snapshot_id: str) -> Response:
    """Delete a snapshot."""
    snapshot = SnapshotRepository().get(snapshot_id)
    if not snapshot:
        return error("not_found", "Snapshot not found", status=404)
    branch = BranchRepository().get(snapshot.branch_id, include_deleted=True)
    access_err = check_workspace_access(getattr(branch, "workspace_id", None))
    if access_err:
        return access_err
    SnapshotRepository().soft_delete(snapshot)
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise
    return item_response(snapshot)


@bp.post("/<string:workspace_id>/versions/snapshots")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def create_snapshot(workspace_id: str) -> Response:
    """Create a point-in-time snapshot of the workspace state."""
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Invalid request body", status=400)
    branch_id = data.get("branch_id")
    if branch_id:
        branch = BranchRepository().get(branch_id)
        if branch and branch.workspace_id:
            access_err = check_workspace_access(str(branch.workspace_id))
            if access_err:
                return access_err
    return item_response(VersioningService().create_snapshot(load_schema(SnapshotCreateSchema(), data), current_user_id()), 201)


@bp.post("/<string:workspace_id>/versions/entities/<string:entity_id>/snapshot")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def snapshot_entity(workspace_id: str, entity_id: str) -> Response:
    """Snapshot a single entity, optionally linked to a changeset."""
    try:
        entity = EntityRepository().get(entity_id)
    except NotFoundError:
        return error("not_found", "Entity not found", status=404)
    if entity and entity.workspace_id:
        access_err = check_workspace_access(str(entity.workspace_id))
        if access_err:
            return access_err
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    data = load_schema(EntitySnapshotSchema(), data)
    return item_response(VersioningService().snapshot_entity(entity_id, data.get("changeset_id")), 201)


@bp.get("/<string:workspace_id>/versions/entities/<string:entity_id>")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def list_entity_versions(workspace_id: str, entity_id: str) -> Response:
    """List all versioned snapshots of an entity."""
    try:
        entity = EntityRepository().get(entity_id)
    except NotFoundError:
        return error("not_found", "Entity not found", status=404)
    if entity and entity.workspace_id:
        access_err = check_workspace_access(str(entity.workspace_id))
        if access_err:
            return access_err
    args = pagination_args()
    return list_response(EntityVersionRepository().list(page=args["page"], per_page=args["per_page"], filters={"entity_id": entity_id}))


@bp.get("/<string:workspace_id>/versions/blocks/<string:block_id>")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def list_block_versions(workspace_id: str, block_id: str) -> Response:
    """List all versioned snapshots of a block."""
    try:
        block = BlockRepo().get(block_id)
    except NotFoundError:
        return error("not_found", "Block not found", status=404)
    if block and getattr(block, 'entity_id', None):
        try:
            entity = EntityRepository().get(block.entity_id)
        except NotFoundError:
            return error("not_found", "Entity not found", status=404)
        if entity and entity.workspace_id:
            access_err = check_workspace_access(str(entity.workspace_id))
            if access_err:
                return access_err
    args = pagination_args()
    return list_response(BlockVersionRepository().list_for_block(block_id, args["page"], args["per_page"]))


@bp.get("/<string:workspace_id>/versions/compare")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def compare_versions(workspace_id: str) -> Response:
    """Compare two entity versions and return their differences."""
    left_id = request.args.get("left_version_id")
    right_id = request.args.get("right_version_id")
    if not left_id or not right_id:
        return error("bad_request", "left_version_id and right_version_id are required", status=400)
    left_version = EntityVersionRepository().get(left_id)
    right_version = EntityVersionRepository().get(right_id)
    if left_version and left_version.entity_id:
        entity = EntityRepository().get(left_version.entity_id)
        if entity and entity.workspace_id:
            access_err = check_workspace_access(str(entity.workspace_id))
            if access_err:
                return access_err
    if right_version and right_version.entity_id:
        entity = EntityRepository().get(right_version.entity_id)
        if entity and entity.workspace_id:
            access_err = check_workspace_access(str(entity.workspace_id))
            if access_err:
                return access_err
    try:
        diff = VersioningService().compare_versions(left_id, right_id)
    except NotFoundError:
        return error("not_found", "Version not found", status=404)
    if diff is None:
        return error("bad_request", "Could not compare versions", status=400)
    return raw_response(diff)


@bp.post("/<string:workspace_id>/versions/<string:version_id>/restore")
@limiter.limit(RATE_LIMIT_DESTRUCTIVE)
@secured
def restore_version(workspace_id: str, version_id: str) -> Response:
    """Restore an entity to a previous version."""
    version = EntityVersionRepository().get(version_id)
    if version and version.entity_id:
        entity = EntityRepository().get(version.entity_id)
        if entity and entity.workspace_id:
            access_err = check_workspace_access(str(entity.workspace_id))
            if access_err:
                return access_err
    return item_response(VersioningService().restore_entity_version(version_id))
