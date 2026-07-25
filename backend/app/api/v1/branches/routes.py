"""Branch management and merge-conflict resolution routes."""

from flask import Blueprint, Response, request

from app.api.v1.helpers import (
    check_workspace_access,
    item_response,
    list_response,
    pagination_args,
    request_json,
)
from app.core.constants import RATE_LIMIT_DESTRUCTIVE, RATE_LIMIT_STANDARD, RATE_LIMIT_STRICT
from app.core.errors import NotFoundError
from app.core.response import error
from app.core.validation import load_schema
from app.extensions import db, limiter
from app.repositories import BranchRepository, BranchMergeRepository, MergeConflictRepository
from app.schemas.domain import BranchCreateSchema, BranchUpdateSchema, MergeBranchSchema
from app.services.security import current_user_id, secured
from app.services.versioning_service import BranchService, VersioningService

bp = Blueprint("branches", __name__)


@bp.get("/<string:workspace_id>/branches")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def list_branches(workspace_id: str) -> Response:
    """List all branches in a workspace."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    args = pagination_args()
    return list_response(BranchRepository().list(page=args["page"], per_page=args["per_page"], filters={"workspace_id": workspace_id}))


@bp.post("/<string:workspace_id>/branches")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def create_branch(workspace_id: str) -> Response:
    """Create a new branch from the given base."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    data["workspace_id"] = workspace_id
    data = load_schema(BranchCreateSchema(), data)
    return item_response(BranchService().create(data, current_user_id()), 201)


@bp.get("/<string:workspace_id>/branches/<string:branch_id>")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def get_branch(workspace_id: str, branch_id: str) -> Response:
    """Retrieve a single branch by ID."""
    try:
        branch = BranchRepository().get(branch_id)
    except NotFoundError:
        return error("not_found", "Branch not found", status=404)
    access_err = check_workspace_access(getattr(branch, "workspace_id", None))
    if access_err:
        return access_err
    return item_response(branch)


@bp.delete("/<string:workspace_id>/branches/<string:branch_id>")
@limiter.limit(RATE_LIMIT_DESTRUCTIVE)
@secured
def delete_branch(workspace_id: str, branch_id: str) -> Response:
    """Delete a branch (non-protected only)."""
    try:
        branch = BranchRepository().get(branch_id)
    except NotFoundError:
        return error("not_found", "Branch not found", status=404)
    access_err = check_workspace_access(getattr(branch, "workspace_id", None))
    if access_err:
        return access_err
    return item_response(BranchService().delete(branch_id, current_user_id()))


@bp.patch("/<string:workspace_id>/branches/<string:branch_id>")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def update_branch(workspace_id: str, branch_id: str) -> Response:
    """Update a branch's name and/or description."""
    try:
        branch = BranchRepository().get(branch_id)
    except NotFoundError:
        return error("not_found", "Branch not found", status=404)
    access_err = check_workspace_access(getattr(branch, "workspace_id", None))
    if access_err:
        return access_err
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    data = load_schema(BranchUpdateSchema(), data)
    BranchRepository().update(branch, data)
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise
    return item_response(branch)


@bp.post("/<string:workspace_id>/branches/<string:branch_id>/restore")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def restore_branch(workspace_id: str, branch_id: str) -> Response:
    """Restore a soft-deleted branch."""
    try:
        branch = BranchRepository().get(branch_id, include_deleted=True)
    except NotFoundError:
        return error("not_found", "Branch not found", status=404)
    access_err = check_workspace_access(getattr(branch, "workspace_id", None))
    if access_err:
        return access_err
    return item_response(BranchService().restore(branch_id))


@bp.post("/<string:workspace_id>/branches/<string:branch_id>/merge")
@limiter.limit(RATE_LIMIT_DESTRUCTIVE)
@secured
def merge_branch(workspace_id: str, branch_id: str) -> Response:
    """Merge a source branch into a target branch."""
    from app.models import _CloudOnlyStub, BranchMerge
    if issubclass(BranchMerge, _CloudOnlyStub):
        return error("bad_request", "Branch merge is only available in cloud mode", status=400)
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    target_branch_id = data.get("target_branch_id")
    if not target_branch_id:
        return error("bad_request", "target_branch_id is required", status=400)
    try:
        source = BranchRepository().get(branch_id)
    except NotFoundError:
        return error("not_found", "Source branch not found", status=404)
    try:
        target = BranchRepository().get(target_branch_id)
    except NotFoundError:
        return error("not_found", "Target branch not found", status=404)
    access_err = check_workspace_access(getattr(source, "workspace_id", None) or getattr(target, "workspace_id", None))
    if access_err:
        return access_err
    return item_response(BranchService().merge({
        "source_branch_id": branch_id,
        "target_branch_id": target_branch_id,
    }, current_user_id()), 201)


@bp.post("/<string:workspace_id>/branches/merge")
@limiter.limit(RATE_LIMIT_DESTRUCTIVE)
@secured
def merge_branches(workspace_id: str) -> Response:
    """Merge two branches using schema-validated input."""
    from app.models import _CloudOnlyStub, BranchMerge
    if issubclass(BranchMerge, _CloudOnlyStub):
        return error("bad_request", "Branch merge is only available in cloud mode", status=400)
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    data = load_schema(MergeBranchSchema(), data)
    try:
        source = BranchRepository().get(data.get("source_branch_id"))
    except NotFoundError:
        return error("not_found", "Source branch not found", status=404)
    try:
        target = BranchRepository().get(data.get("target_branch_id"))
    except NotFoundError:
        return error("not_found", "Target branch not found", status=404)
    access_err = check_workspace_access(getattr(source, "workspace_id", None) or getattr(target, "workspace_id", None))
    if access_err:
        return access_err
    return item_response(BranchService().merge(data, current_user_id()), 201)


@bp.get("/<string:workspace_id>/branches/merge-conflicts")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def list_merge_conflicts(workspace_id: str) -> Response:
    """List merge conflicts, optionally filtered by merge_id."""
    from app.models import _CloudOnlyStub, MergeConflict
    if issubclass(MergeConflict, _CloudOnlyStub):
        return error("bad_request", "Merge conflicts are only available in cloud mode", status=400)
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    args = pagination_args()
    merge_id = request.args.get("merge_id")
    if merge_id:
        conflicts = MergeConflictRepository().list_for_merge(merge_id, page=args["page"], per_page=args["per_page"])
    else:
        conflicts = MergeConflictRepository().list_unresolved(workspace_id, page=args["page"], per_page=args["per_page"])
    return list_response(conflicts)


@bp.patch("/<string:workspace_id>/branches/merge-conflicts/<string:conflict_id>/resolve")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def resolve_conflict(workspace_id: str, conflict_id: str) -> Response:
    """Resolve a merge conflict with ours/theirs/manual strategy."""
    from app.models import _CloudOnlyStub, MergeConflict
    if issubclass(MergeConflict, _CloudOnlyStub):
        return error("bad_request", "Merge conflicts are only available in cloud mode", status=400)
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Invalid request body", status=400)
    resolution = data.get("resolution")
    if not resolution or resolution not in ("source", "target", "manual"):
        return error("bad_request", "resolution must be 'source', 'target', or 'manual'", status=400)
    merged_content = data.get("merged_content") if resolution == "manual" else None
    conflict = MergeConflictRepository().get(conflict_id)
    if not conflict:
        return error("not_found", "Conflict not found", status=404)
    merge = BranchMergeRepository().get(conflict.merge_id)
    if not merge:
        return error("not_found", "Merge not found", status=404)
    access_err = check_workspace_access(conflict.workspace_id)
    if access_err:
        return access_err
    result = VersioningService().resolve_conflict(
        conflict_id, resolution, merged_content, current_user_id()
    )
    return item_response(result)
