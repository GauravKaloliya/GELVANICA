"""Sync and conflict resolution routes."""

from flask import Blueprint, Response, request

from app.api.v1.helpers import check_workspace_access, item_response, list_response, pagination_args, raw_response, request_json
from app.core.constants import RATE_LIMIT_STANDARD, RATE_LIMIT_STRICT
from app.core.response import error
from app.core.validation import load_schema
from app.extensions import limiter
from app.repositories.domain import MergeConflictRepository, SyncOperationRepository
from app.schemas.domain import SyncOperationCreateSchema
from app.services.security import current_user_id, secured
from app.services.sync_service import SyncService
from app.services.versioning_service import VersioningService

bp = Blueprint("sync", __name__)


@bp.get("/<string:workspace_id>/sync")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured

def list_sync_operations(workspace_id: str) -> Response:
    """List sync operations, optionally filtered by workspace and pending status."""
    args = pagination_args()
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    pending_only = request.args.get("pending", "false").lower() == "true"
    repo = SyncOperationRepository()
    if pending_only and workspace_id:
        return list_response(repo.pending_for_workspace(workspace_id, args["page"], args["per_page"]))
    return list_response(repo.list({"workspace_id": workspace_id}, args["page"], args["per_page"]))


@bp.post("/<string:workspace_id>/sync")
@limiter.limit(RATE_LIMIT_STRICT)
@secured

def create_sync_operation(workspace_id: str) -> Response:
    """Ingest a new sync operation from a client."""
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    data = load_schema(SyncOperationCreateSchema(), data)
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    return item_response(
        SyncService().ingest(data, current_user_id()),
        201,
    )


@bp.get("/<string:workspace_id>/sync/devices")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured

def list_sync_devices(workspace_id: str) -> Response:
    """List sync device IDs that have pushed operations."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    return raw_response(SyncService().list_devices(workspace_id))


@bp.get("/<string:workspace_id>/sync/<string:op_id>")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured

def get_sync_operation(workspace_id: str, op_id: str) -> Response:
    """Retrieve a single sync operation by ID."""
    op = SyncOperationRepository().get(op_id)
    if not op:
        return error("not_found", "Sync operation not found", status=404)
    if op.workspace_id:
        access_err = check_workspace_access(str(op.workspace_id))
        if access_err:
            return access_err
    return item_response(op)


@bp.post("/<string:workspace_id>/sync/<string:op_id>/ack")
@limiter.limit(RATE_LIMIT_STRICT)
@secured

def ack_sync_operation(workspace_id: str, op_id: str) -> Response:
    """Acknowledge (mark synced) a sync operation after client applies it."""
    op = SyncOperationRepository().get(op_id)
    if not op:
        return error("not_found", "Sync operation not found", status=404)
    if op.workspace_id:
        access_err = check_workspace_access(str(op.workspace_id))
        if access_err:
            return access_err
    result = SyncService().mark_synced(op_id)
    if result is None:
        return error("not_found", "Resource not found", status=404)
    return item_response(result)


@bp.post("/<string:workspace_id>/sync/diff")
@limiter.limit(RATE_LIMIT_STRICT)
@secured

def diff_sync_data(workspace_id: str) -> Response:
    """Compare local workspace against remote export data and return what's missing locally."""
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Invalid request body", status=400)
    remote_export = data.get("export_data")
    if not remote_export:
        return error("bad_request", "export_data is required", status=400)
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    svc = SyncService()
    diff = svc.diff_workspaces(workspace_id, remote_export)
    if diff is None:
        return error("not_found", "Resource not found", status=404)
    return raw_response(diff)


@bp.post("/<string:workspace_id>/sync/apply-diff")
@limiter.limit(RATE_LIMIT_STRICT)
@secured

def apply_sync_diff(workspace_id: str) -> Response:
    """Apply a diff (records missing locally) to the local workspace."""
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Invalid request body", status=400)
    diff = data.get("diff")
    if not diff:
        return error("bad_request", "diff is required", status=400)
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    svc = SyncService()
    result = svc.apply_diff(workspace_id, diff)
    if result is None:
        return error("not_found", "Resource not found", status=404)
    return item_response(result, 201)


@bp.post("/<string:workspace_id>/sync/sync-from-export")
@limiter.limit(RATE_LIMIT_STRICT)
@secured

def sync_from_export(workspace_id: str) -> Response:
    """Full sync: import remote export data into local workspace (differential)."""
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Invalid request body", status=400)
    export_data = data.get("export_data")
    if not export_data:
        return error("bad_request", "export_data is required", status=400)
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    svc = SyncService()
    result = svc.sync_from_export(workspace_id, export_data)
    if result is None:
        return error("not_found", "Resource not found", status=404)
    return item_response(result, 201)


@bp.post("/<string:workspace_id>/sync/push")
@limiter.limit(RATE_LIMIT_STRICT)
@secured

def push_changes(workspace_id: str) -> Response:
    """Push local changes (entities, entity_types, tags, blocks, relations, comments, property values) to the cloud."""
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Invalid request body", status=400)
    changes = data.get("changes", {})
    if not isinstance(changes, dict):
        return error("bad_request", "changes must be a dict", status=400)
    device_id = data.get("device_id", "local")
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    result = SyncService().push(workspace_id, changes, device_id)
    return raw_response(result)


@bp.post("/<string:workspace_id>/sync/pull")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured

def pull_changes(workspace_id: str) -> Response:
    """Pull pending sync operations for a workspace."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    result = SyncService().pull(workspace_id)
    return raw_response(result)


@bp.post("/<string:workspace_id>/sync/full-sync")
@limiter.limit(RATE_LIMIT_STRICT)
@secured

def full_sync(workspace_id: str) -> Response:
    """Perform a bidirectional full sync, optionally comparing against a remote export."""
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Invalid request body", status=400)
    remote_export = data.get("export_data")
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    result = SyncService().full_sync(workspace_id, remote_export)
    return raw_response(result)


@bp.get("/<string:workspace_id>/sync/status")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured

def sync_status(workspace_id: str) -> Response:
    """Get sync status for a workspace."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    result = SyncService().status(workspace_id)
    return raw_response(result)


@bp.get("/<string:workspace_id>/sync/changes")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured

def local_diff(workspace_id: str) -> Response:
    """Get local data export and pending operations diff."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    result = SyncService().diff(workspace_id)
    return raw_response(result)


@bp.post("/<string:workspace_id>/sync/conflicts/<conflict_id>/resolve")
@limiter.limit(RATE_LIMIT_STRICT)
@secured

def resolve_conflict(workspace_id: str, conflict_id: str) -> Response:
    """Resolve a merge conflict."""
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Invalid request body", status=400)
    resolution = data.get("resolution", "ours")
    merged_content = data.get("merged_content") if resolution == "manual" else None

    conflict = MergeConflictRepository().get(conflict_id)
    if not conflict:
        return error("not_found", "Conflict not found", status=404)

    access_err = check_workspace_access(conflict.workspace_id)
    if access_err:
        return access_err

    result = VersioningService().resolve_conflict(
        conflict_id, resolution, merged_content, current_user_id()
    )
    return item_response(result)


@bp.post("/<string:workspace_id>/sync/resolve-conflict")
@limiter.limit(RATE_LIMIT_STRICT)
@secured

def resolve_conflict_body(workspace_id: str) -> Response:
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Invalid request body", status=400)
    conflict_id = data.get("conflict_id")
    resolution = data.get("resolution", "ours")
    merged_content = data.get("merged_content") if resolution == "manual" else None

    if not conflict_id:
        return error("bad_request", "conflict_id is required", status=400)

    conflict = MergeConflictRepository().get(conflict_id)
    if not conflict:
        return error("not_found", "Conflict not found", status=404)

    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err

    result = VersioningService().resolve_conflict(
        conflict_id, resolution, merged_content, current_user_id()
    )
    return item_response(result)
