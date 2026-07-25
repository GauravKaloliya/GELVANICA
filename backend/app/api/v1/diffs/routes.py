"""Diff comparison routes."""

from flask import Blueprint, Response, request

from app.api.v1.helpers import check_workspace_access, raw_response, request_json
from app.core.constants import RATE_LIMIT_STANDARD, RATE_LIMIT_STRICT
from app.core.errors import NotFoundError
from app.core.response import error
from app.core.validation import load_schema
from app.extensions import limiter
from app.repositories import BlockRepository, EntityRepository
from app.repositories.domain import BlockVersionRepository, EntityVersionRepository, SnapshotRepository
from app.schemas.domain import DiffQuerySchema
from app.services.security import secured
from app.services.versioning_service import VersioningService

bp = Blueprint("diffs", __name__)


@bp.get("/<string:workspace_id>/diffs/compare")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def compare(workspace_id: str) -> Response:
    """Compare two versions or snapshots and return their differences."""
    data = dict(workspace_id=workspace_id, **request.args.to_dict())
    data = load_schema(DiffQuerySchema(), data)

    entity_id = request.args.get("entity_id")

    left_version_id = data["left_version_id"]
    right_version_id = data["right_version_id"]
    left_snapshot_id = data["left_snapshot_id"]
    right_snapshot_id = data["right_snapshot_id"]
    left_branch_id = data.get("left_branch_id")
    right_branch_id = data.get("right_branch_id")

    if left_version_id and left_snapshot_id:
        return error("bad_request", "Provide either left_version_id or left_snapshot_id, not both", status=400)
    if right_version_id and right_snapshot_id:
        return error("bad_request", "Provide either right_version_id or right_snapshot_id, not both", status=400)

    left_id = left_version_id or left_snapshot_id
    right_id = right_version_id or right_snapshot_id

    if left_version_id and right_version_id:
        left_version = EntityVersionRepository().get(left_version_id)
        right_version = EntityVersionRepository().get(right_version_id)
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
        diff = VersioningService().compare_versions(left_version_id, right_version_id)
        if diff is None:
            return error("bad_request", "Could not compare versions", status=400)
        return raw_response(diff)

    if left_snapshot_id and right_snapshot_id:
        left_snapshot = SnapshotRepository().get(left_snapshot_id)
        right_snapshot = SnapshotRepository().get(right_snapshot_id)
        if not left_snapshot or not right_snapshot:
            return error("not_found", "Snapshot not found", status=404)
        if left_snapshot.branch_id:
            from app.repositories import BranchRepository
            left_branch = BranchRepository().get(left_snapshot.branch_id)
            if left_branch and left_branch.workspace_id:
                access_err = check_workspace_access(str(left_branch.workspace_id))
                if access_err:
                    return access_err
        if right_snapshot.branch_id:
            from app.repositories import BranchRepository
            right_branch = BranchRepository().get(right_snapshot.branch_id)
            if right_branch and right_branch.workspace_id:
                access_err = check_workspace_access(str(right_branch.workspace_id))
                if access_err:
                    return access_err
        return raw_response(VersioningService().compare_branches(
            left_snapshot.branch_id, right_snapshot.branch_id
        ))

    if entity_id and (left_version_id or right_version_id or left_snapshot_id or right_snapshot_id):
        entity = EntityRepository().get(entity_id)
        if entity and entity.workspace_id:
            access_err = check_workspace_access(str(entity.workspace_id))
            if access_err:
                return access_err

    if left_branch_id and right_branch_id:
        from app.repositories import BranchRepository
        left_branch = BranchRepository().get(left_branch_id)
        right_branch = BranchRepository().get(right_branch_id)
        if left_branch and left_branch.workspace_id:
            access_err = check_workspace_access(str(left_branch.workspace_id))
            if access_err:
                return access_err
        if right_branch and right_branch.workspace_id:
            access_err = check_workspace_access(str(right_branch.workspace_id))
            if access_err:
                return access_err
        return raw_response(VersioningService().compare_branches(left_branch_id, right_branch_id))

    if left_id and right_id:
        return error("bad_request", "Provide either two version IDs or two snapshot IDs, not a mix", status=400)

    return error("bad_request", "Provide left_version_id+right_version_id, left_snapshot_id+right_snapshot_id, left_branch_id+right_branch_id, or entity_id", status=400)


@bp.post("/<string:workspace_id>/diffs/blocks")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def compare_blocks(workspace_id: str) -> Response:
    """Compare two block versions or block snapshots."""
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Invalid request body", status=400)
    left_block_id = data.get("left_block_id")
    right_block_id = data.get("right_block_id")
    left_version_id = data.get("left_version_id")
    right_version_id = data.get("right_version_id")

    if left_version_id and right_version_id:
        left_version = BlockVersionRepository().get(left_version_id)
        right_version = BlockVersionRepository().get(right_version_id)
        if left_version and left_version.block_id:
            try:
                block = BlockRepository().get(left_version.block_id)
            except NotFoundError:
                return error("not_found", "Block not found", status=404)
            if block and block.entity and block.entity.workspace_id:
                access_err = check_workspace_access(str(block.entity.workspace_id))
                if access_err:
                    return access_err
        if right_version and right_version.block_id:
            try:
                block = BlockRepository().get(right_version.block_id)
            except NotFoundError:
                return error("not_found", "Block not found", status=404)
            if block and block.entity and block.entity.workspace_id:
                access_err = check_workspace_access(str(block.entity.workspace_id))
                if access_err:
                    return access_err
        return raw_response(VersioningService().compare_block_versions(left_version_id, right_version_id))

    if left_block_id and right_block_id:
        try:
            left_block = BlockRepository().get(left_block_id)
        except NotFoundError:
            return error("not_found", "Left block not found", status=404)
        if left_block and left_block.entity and left_block.entity.workspace_id:
            access_err = check_workspace_access(str(left_block.entity.workspace_id))
            if access_err:
                return access_err
        try:
            right_block = BlockRepository().get(right_block_id)
        except NotFoundError:
            return error("not_found", "Right block not found", status=404)
        if right_block and right_block.entity and right_block.entity.workspace_id:
            access_err = check_workspace_access(str(right_block.entity.workspace_id))
            if access_err:
                return access_err
        return raw_response(VersioningService().compare_block_snapshots(left_block_id, right_block_id))

    return error("bad_request", "Provide either left_block_id+right_block_id or left_version_id+right_version_id", status=400)
