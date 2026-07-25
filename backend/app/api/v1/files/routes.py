"""
File management routes.

Endpoints:
  GET    /<workspace_id>/files/                              — List files
  POST   /<workspace_id>/files/upload                        — Upload a file (multipart, direct)
  POST   /<workspace_id>/files/                              — Register file metadata (no upload)
  GET    /<workspace_id>/files/<id>                          — Get file details
  GET    /<workspace_id>/files/<id>/download                 — Download file content
  DELETE /<workspace_id>/files/<id>                          — Delete file (soft-delete)
  GET    /<workspace_id>/files/<id>/thumbnail                — Serve thumbnail variant (local) / redirect (cloud)
  GET    /<workspace_id>/files/<id>/preview                  — Serve preview variant (local) / redirect (cloud)
  POST   /<workspace_id>/files/presign                       — Get presigned S3 upload URL (cloud-only)
  POST   /<workspace_id>/files/<id>/confirm                  — Confirm upload after PUT (cloud-only)
  GET    /<workspace_id>/files/<id>/variants/<variant_type>  — Get variant presigned URL
  GET    /<workspace_id>/files/<id>/variants                 — List all variants
  POST   /<workspace_id>/files/<id>/entities/<eid>           — Link file to entity
  DELETE /<workspace_id>/files/<id>/entities/<eid>           — Unlink file from entity
  POST   /<workspace_id>/files/quarantine/<id>/resolve       — Resolve quarantined file
  POST   /<workspace_id>/files/cleanup-orphans               — Remove unlinked file records
  POST   /<workspace_id>/files/cleanup-quarantine            — Clean up expired quarantine items
  POST   /<workspace_id>/files/cleanup-deleted               — Hard-delete expired soft-deleted files
  GET    /<workspace_id>/files/storage-info                  — Get storage usage stats
"""

import os

from flask import Blueprint, Response, current_app, redirect, request, send_from_directory

from app.api.v1.helpers import check_workspace_access, item_response, list_response, pagination_args, raw_response, request_json
from app.core.constants import ALLOWED_EXTENSIONS, RATE_LIMIT_FILE_DOWNLOAD, RATE_LIMIT_FILE_UPLOAD, RATE_LIMIT_STANDARD, RATE_LIMIT_STRICT
from app.core.response import error
from app.core.validation import load_schema
from app.extensions import limiter
from app.repositories import EntityRepository, FileRepository
from app.schemas.domain import (
    FileCreateSchema,
    PresignMultipartCompleteSchema,
    PresignMultipartSchema,
    PresignUploadSchema,
    QuarantineResolveSchema,
)
from app.services.file_service import FileService
from app.services.security import current_user_id, secured
from app.services.storage_provider import create_storage_provider


def _safe_send(directory, filename, **kwargs):
    """Send file with path traversal protection."""
    real_dir = os.path.realpath(directory)
    real_path = os.path.realpath(os.path.join(directory, filename))
    if not real_path.startswith(real_dir + os.sep) and real_path != real_dir:
        return error("bad_request", "Invalid file path", status=400)
    return send_from_directory(directory, filename, **kwargs)

bp = Blueprint("files", __name__)


@bp.get("/<string:workspace_id>/files")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def list_files(workspace_id: str) -> Response:
    """List files, optionally filtered by uploader."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    args = pagination_args()
    filters = {"workspace_id": workspace_id, "uploaded_by": request.args.get("uploaded_by")}
    return list_response(FileRepository().list(filters, args["page"], args["per_page"], order_by="uploaded_at", descending=True))


@bp.post("/<string:workspace_id>/files/upload")
@limiter.limit(RATE_LIMIT_FILE_UPLOAD)
@secured
def upload_file(workspace_id: str) -> Response:
    """Upload a file via multipart form data."""
    if "file" not in request.files:
        return error("bad_request", "file is required", status=400)
    file = request.files["file"]
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err

    try:
        result = FileService().upload(file, workspace_id, current_user_id())
        status = 200 if result.get("deduplicated") else 201
        return raw_response(result, status)
    except (ValueError, OSError) as e:
        return error("upload_error", f"Upload failed: {str(e)}", status=400)


@bp.post("/<string:workspace_id>/files")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def create_file(workspace_id: str) -> Response:
    """Register file metadata without uploading content."""
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    data["workspace_id"] = workspace_id
    data = load_schema(FileCreateSchema(), data)
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    return item_response(FileService().create_metadata(data, current_user_id()), 201)


@bp.get("/<string:workspace_id>/files/<string:file_id>")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def get_file(workspace_id: str, file_id: str) -> Response:
    """Retrieve detailed metadata for a single file."""
    file_record = FileRepository().get(file_id)
    if not file_record:
        return error("not_found", "File not found", status=404)
    access_err = check_workspace_access(str(file_record.workspace_id))
    if access_err:
        return access_err
    result = {
        "id": str(file_record.id),
        "workspace_id": str(file_record.workspace_id),
        "file_name": file_record.file_name,
        "mime_type": file_record.mime_type,
        "file_size": file_record.file_size,
        "content_hash": file_record.content_hash,
        "state": file_record.state,
        "storage_provider": file_record.storage_provider,
        "object_key": file_record.object_key,
        "uploaded_by": str(file_record.uploaded_by) if file_record.uploaded_by else None,
        "uploaded_at": file_record.uploaded_at.isoformat() if file_record.uploaded_at else None,
        "updated_at": file_record.updated_at.isoformat() if file_record.updated_at else None,
        "deleted_at": file_record.deleted_at.isoformat() if file_record.deleted_at else None,
        "deleted_by": str(file_record.deleted_by) if file_record.deleted_by else None,
        "is_deleted": file_record.is_deleted,
        "has_extracted_text": bool(getattr(file_record, "has_extracted_text", False)),
        "has_metadata": bool(getattr(file_record, "has_metadata", False)),
    }
    return raw_response(result)


@bp.get("/<string:workspace_id>/files/<string:file_id>/download")
@limiter.limit(RATE_LIMIT_FILE_DOWNLOAD)
@secured
def download_file(workspace_id: str, file_id: str) -> Response:
    """Download file content (local disk or presigned redirect)."""
    file_record = FileRepository().get(file_id)
    if not file_record:
        return error("not_found", "File not found", status=404)
    access_err = check_workspace_access(str(file_record.workspace_id))
    if access_err:
        return access_err
    fs = FileService()
    if not _is_cloud():
        if file_record.state != "READY":
            return error("bad_request", f"File is in '{file_record.state}' state, not available for download", status=400)
        provider = create_storage_provider(current_app.config)
        full_path = provider.get_path(file_record.object_key)
        if os.path.isfile(full_path):
            directory = os.path.dirname(full_path)
            filename = os.path.basename(full_path)
            return _safe_send(directory, filename, download_name=file_record.file_name, mimetype=file_record.mime_type)
        return error("not_found", "File not found on disk", status=404)

    if file_record.state != "READY":
        return error("bad_request", f"File is in '{file_record.state}' state, not available for download", status=400)

    try:
        presigned_url = fs.download_file(file_record)
        return redirect(presigned_url)
    except ValueError as e:
        return error("bad_request", str(e), status=400)


@bp.get("/<string:workspace_id>/files/<string:file_id>/thumbnail")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def serve_thumbnail(workspace_id: str, file_id: str) -> Response:
    """Serve the thumbnail variant of a file."""
    return _serve_variant(file_id, "thumbnail")


@bp.get("/<string:workspace_id>/files/<string:file_id>/preview")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def serve_preview(workspace_id: str, file_id: str) -> Response:
    """Serve the preview variant of a file."""
    return _serve_variant(file_id, "preview")


@bp.get("/<string:workspace_id>/files/<string:file_id>/optimized")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def serve_optimized(workspace_id: str, file_id: str) -> Response:
    """Serve the optimized variant of a file."""
    return _serve_variant(file_id, "optimized")


def _serve_variant(file_id: str, variant_type: str):
    """Serve a file variant (local) or redirect to presigned URL (cloud)."""
    file_record = FileRepository().get(file_id)
    if not file_record:
        return error("not_found", "File not found", status=404)
    access_err = check_workspace_access(str(file_record.workspace_id))
    if access_err:
        return access_err
    if _is_cloud():
        result = FileService().get_variant(file_id, variant_type)
        if not result or not result.get("download_url"):
            return error("not_found", f"{variant_type} not found", status=404)
        return redirect(result["download_url"])

    response = FileService().serve_local_variant(file_id, variant_type)
    if not response:
        return error("not_found", f"{variant_type} not found", status=404)
    return response


@bp.delete("/<string:workspace_id>/files/<string:file_id>")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def delete_file(workspace_id: str, file_id: str) -> Response:
    """Soft-delete a file (cloud) or mark for deletion (local)."""
    file_record = FileRepository().get(file_id)
    if not file_record:
        return error("not_found", "File not found", status=404)
    access_err = check_workspace_access(str(file_record.workspace_id))
    if access_err:
        return access_err
    fs = FileService()
    if _is_cloud():
        fs.delete_file_cloud(file_record, deleted_by=current_user_id())
    else:
        fs.delete_file(file_record, deleted_by=current_user_id())
    return item_response(file_record)


@bp.get("/<string:workspace_id>/files/<string:file_id>/variants/<string:variant_type>")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def get_variant(workspace_id: str, file_id: str, variant_type: str) -> Response:
    """Get a specific file variant (local serve or presigned URL)."""
    file_record = FileRepository().get(file_id)
    if not file_record:
        return error("not_found", "File not found", status=404)
    access_err = check_workspace_access(str(file_record.workspace_id))
    if access_err:
        return access_err
    result = FileService().get_variant(file_id, variant_type)
    if not result:
        return error("not_found", "Variant not found", status=404)
    if not _is_cloud() and result.get("local_path"):
        path = result["local_path"]
        if os.path.isfile(path):
            directory = os.path.dirname(path)
            filename = os.path.basename(path)
            return _safe_send(directory, filename, mimetype=result.get("mime_type", "application/octet-stream"))
    return raw_response(result)


@bp.get("/<string:workspace_id>/files/<string:file_id>/variants")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def list_variants(workspace_id: str, file_id: str) -> Response:
    """List all variants for a file."""
    file_record = FileRepository().get(file_id)
    if not file_record:
        return error("not_found", "File not found", status=404)
    access_err = check_workspace_access(str(file_record.workspace_id))
    if access_err:
        return access_err
    fs = FileService()
    if _is_cloud():
        variants = fs.list_variants(file_id)
        return raw_response([{
            "id": str(v.id),
            "variant_type": v.variant_type,
            "object_key": v.object_key,
            "mime_type": v.mime_type,
            "width": v.width,
            "height": v.height,
            "file_size": v.file_size,
            "algorithm": v.algorithm,
            "algorithm_version": v.algorithm_version,
            "quality": v.quality,
            "created_at": v.created_at.isoformat() if v.created_at else None,
        } for v in variants])
    return raw_response(fs.list_local_variants(file_id))


@bp.post("/<string:workspace_id>/files/<string:file_id>/entities/<string:entity_id>")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def link_entity(workspace_id: str, file_id: str, entity_id: str) -> Response:
    """Associate a file with an entity."""
    entity = EntityRepository().get(entity_id)
    if not entity:
        return error("not_found", "Entity not found", status=404)
    file_record = FileRepository().get(file_id)
    if not file_record:
        return error("not_found", "File not found", status=404)
    if str(file_record.workspace_id) != str(entity.workspace_id):
        return error("bad_request", "File and entity must be in the same workspace", status=400)
    access_err = check_workspace_access(str(entity.workspace_id))
    if access_err:
        return access_err
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    return item_response(FileService().link_entity(entity_id, file_id, data.get("block_id")), 201)


@bp.delete("/<string:workspace_id>/files/<string:file_id>/entities/<string:entity_id>")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def unlink_entity(workspace_id: str, file_id: str, entity_id: str) -> Response:
    """Remove the association between a file and an entity."""
    entity = EntityRepository().get(entity_id)
    if not entity:
        return error("not_found", "Entity not found", status=404)
    file_record = FileRepository().get(file_id)
    if not file_record:
        return error("not_found", "File not found", status=404)
    if str(file_record.workspace_id) != str(entity.workspace_id):
        return error("bad_request", "File and entity must be in the same workspace", status=400)
    access_err = check_workspace_access(str(entity.workspace_id))
    if access_err:
        return access_err
    FileService().unlink_entity(entity_id, file_id)
    return raw_response({"unlinked": True})


@bp.post("/<string:workspace_id>/files/presign")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def presign(workspace_id: str) -> Response:
    """Get a presigned S3 upload URL (cloud-only)."""
    if not _is_cloud():
        return error("not_found", "Presigned uploads are only available in cloud mode", status=404)
    data = load_schema(PresignUploadSchema(), request_json())
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    try:
        result = FileService().presign_upload(
            workspace_id=workspace_id,
            file_name=data["file_name"],
            content_type=data["content_type"],
            file_size=data["file_size"],
            user_id=current_user_id(),
            content_hash=data.get("content_hash"),
        )
        return raw_response(result)
    except ValueError as e:
        return error("bad_request", str(e), status=400)


@bp.post("/<string:workspace_id>/files/presign-multipart")
@limiter.limit(RATE_LIMIT_FILE_UPLOAD)
@secured
def presign_multipart(workspace_id: str) -> Response:
    """Initiate a multipart upload (cloud-only)."""
    if not _is_cloud():
        return error("not_found", "Presigned multipart uploads are only available in cloud mode", status=404)
    data = load_schema(PresignMultipartSchema(), request_json())
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    try:
        result = FileService().presign_multipart_upload(
            workspace_id=workspace_id,
            file_name=data["file_name"],
            content_type=data["content_type"],
            file_size=data["file_size"],
            user_id=current_user_id(),
            content_hash=data.get("content_hash"),
        )
        return raw_response(result)
    except ValueError as e:
        return error("bad_request", str(e), status=400)


@bp.post("/<string:workspace_id>/files/presign-multipart/complete")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def presign_multipart_complete(workspace_id: str) -> Response:
    """Complete a multipart upload (cloud-only)."""
    if not _is_cloud():
        return error("not_found", "Multipart upload completion is only available in cloud mode", status=404)
    data = load_schema(PresignMultipartCompleteSchema(), request_json())
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    try:
        result = FileService().complete_multipart_upload(
            file_id=data["file_id"],
            upload_id=data["upload_id"],
            parts=data["parts"],
            workspace_id=workspace_id,
            user_id=current_user_id(),
        )
        return raw_response(result)
    except ValueError as e:
        return error("bad_request", str(e), status=400)


@bp.post("/<string:workspace_id>/files/<string:file_id>/confirm")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def confirm_upload(workspace_id: str, file_id: str) -> Response:
    """Confirm a presigned upload completed successfully (cloud-only)."""
    if not _is_cloud():
        return error("not_found", "Upload confirmation only available in cloud mode", status=404)
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    try:
        result = FileService().confirm_upload(file_id, workspace_id, current_user_id())
        return raw_response(result)
    except ValueError as e:
        return error("bad_request", str(e), status=400)


@bp.post("/<string:workspace_id>/files/quarantine/<string:file_id>/resolve")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def resolve_quarantine(workspace_id: str, file_id: str) -> Response:
    """Approve or reject a quarantined file (cloud-only)."""
    if not _is_cloud():
        return error("not_found", "Quarantine resolution only available in cloud mode", status=404)
    file_record = FileRepository().get(file_id)
    if not file_record:
        return error("not_found", "File not found", status=404)
    access_err = check_workspace_access(str(file_record.workspace_id))
    if access_err:
        return access_err
    data = load_schema(QuarantineResolveSchema(), request_json())
    try:
        result = FileService().resolve_quarantine(file_id, approve=data["approve"], resolved_by=current_user_id())
        return item_response(result)
    except ValueError as e:
        return error("bad_request", str(e), status=400)


@bp.post("/<string:workspace_id>/files/cleanup-orphans")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def cleanup_orphans(workspace_id: str) -> Response:
    """Remove file records with no linked entities."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    count = FileService().cleanup_orphans(workspace_id)
    return raw_response({"deleted": count})


@bp.post("/<string:workspace_id>/files/cleanup-quarantine")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def cleanup_quarantine(workspace_id: str) -> Response:
    """Remove expired quarantine items (cloud-only)."""
    if not _is_cloud():
        return error("not_found", "Quarantine cleanup only available in cloud mode", status=404)
    count = FileService().cleanup_expired_quarantine()
    return raw_response({"deleted": count})


@bp.post("/<string:workspace_id>/files/cleanup-deleted")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def cleanup_deleted(workspace_id: str) -> Response:
    """Hard-delete expired soft-deleted files (cloud-only)."""
    if not _is_cloud():
        return error("not_found", "Deleted cleanup only available in cloud mode", status=404)
    count = FileService().cleanup_deleted_files()
    return raw_response({"deleted": count})


@bp.get("/<string:workspace_id>/files/storage-info")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def storage_info(workspace_id: str) -> Response:
    """Return storage usage statistics for a workspace."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    return raw_response(FileService().get_storage_info(workspace_id))


def _is_cloud() -> bool:
    """Check if running in cloud mode."""
    return current_app.config.get("GNOVIUM_MODE") == "cloud"
