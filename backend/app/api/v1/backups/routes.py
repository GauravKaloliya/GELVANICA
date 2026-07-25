"""Backup and export routes."""

import os
import uuid

from flask import Blueprint, current_app, request, send_from_directory
from flask.typing import ResponseValue


from app.api.v1.helpers import check_workspace_access, list_response, pagination_args, raw_response, request_json
from app.core.constants import RATE_LIMIT_DESTRUCTIVE, RATE_LIMIT_STANDARD, RATE_LIMIT_STRICT
from app.core.errors import NotFoundError
from app.core.response import error
from app.extensions import limiter
from app.services.backup_service import BackupService
from app.services.export_service import ExportService
from app.services.security import secured
from app.services.zip_service import ZipService

bp = Blueprint("backups", __name__)


def _deployment_mode():
    from flask import current_app as app
    return app.config.get("GNOVIUM_MODE", "local")


def _expected_zip_source():
    """Return the expected .gnv origin for import validation.

    Cloud may only import zips from local-app, and vice-versa.
    """
    mode = _deployment_mode()
    return "local" if mode == "cloud" else "cloud"


@bp.get("/<string:workspace_id>/backups")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def list_backups(workspace_id: str) -> ResponseValue:
    """List backups for a workspace."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    args = pagination_args()
    page = args["page"]
    per_page = args["per_page"]
    try:
        backups = ExportService().list_backups(workspace_id)
    except Exception as e:
        return error("internal_error", str(e), status=500)
    start = (page - 1) * per_page
    end = start + per_page
    return list_response({
        "items": backups[start:end],
        "total": len(backups),
        "page": page,
        "per_page": per_page,
    })


@bp.post("/<string:workspace_id>/backups/export")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def export_workspace(workspace_id: str) -> ResponseValue:
    """Export a full workspace as JSON."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    try:
        return raw_response(ExportService().export_workspace(workspace_id))
    except Exception as e:
        return error("internal_error", str(e), status=500)


@bp.post("/<string:workspace_id>/backups/create")
@limiter.limit(RATE_LIMIT_DESTRUCTIVE)
@secured
def create_backup(workspace_id: str) -> ResponseValue:
    """Create a secure encrypted ZIP backup of a workspace."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    result = BackupService().create_backup(workspace_id)
    return raw_response(result, 201)


@bp.post("/<string:workspace_id>/backups/<path:filename>/restore")
@limiter.limit(RATE_LIMIT_DESTRUCTIVE)
@secured
def restore_backup(workspace_id: str, filename: str) -> ResponseValue:
    """Restore a workspace from a backup file by filename."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    backup_dir = os.path.join(current_app.instance_path, "backups")
    real_backup_dir = os.path.realpath(backup_dir)
    real_path = os.path.realpath(os.path.join(backup_dir, filename))
    if not real_path.startswith(real_backup_dir + os.sep) and real_path != real_backup_dir:
        return error("bad_request", "Invalid file path", status=400)
    expected_source = _expected_zip_source()
    try:
        result = BackupService().restore_backup(workspace_id, real_path, expected_source=expected_source)
        return raw_response(result, 201)
    except (FileNotFoundError, NotFoundError) as e:
        return error("not_found", str(e), status=404)
    except (ValueError, PermissionError) as e:
        return error("bad_request", str(e), status=400)


@bp.post("/<string:workspace_id>/backups/export-to-disk")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def export_to_disk(workspace_id: str) -> ResponseValue:
    """Export a workspace to a file on disk."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    try:
        path = ExportService().export_to_disk(workspace_id)
    except RuntimeError as e:
        return error("internal_error", str(e), status=500)
    return raw_response({"filename": os.path.basename(path)})


@bp.post("/<string:workspace_id>/backups/import")
@limiter.limit(RATE_LIMIT_DESTRUCTIVE)
@secured
def import_workspace(workspace_id: str) -> ResponseValue:
    """Import a workspace from exported JSON data."""
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    return raw_response(BackupService().import_workspace(workspace_id, data), 201)


@bp.post("/<string:workspace_id>/backups/export-markdown")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def export_markdown(workspace_id: str) -> ResponseValue:
    """Export a workspace as Markdown."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    try:
        return raw_response(ExportService().export_markdown(workspace_id))
    except Exception as e:
        return error("internal_error", str(e), status=500)


@bp.post("/<string:workspace_id>/backups/export-zip")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def export_zip(workspace_id: str) -> ResponseValue:
    """Export a workspace as a standard (unencrypted) ZIP with markdown + assets."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    try:
        result = ExportService().export_zip(workspace_id)
    except RuntimeError as e:
        return error("internal_error", str(e), status=500)
    export_dir = os.path.join(current_app.instance_path, "exports", "zip")
    filename = os.path.basename(result["path"])
    return send_from_directory(export_dir, filename, as_attachment=True)


@bp.post("/<string:workspace_id>/backups/export-html")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def export_html(workspace_id: str) -> ResponseValue:
    """Export a single entity as an HTML page."""
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    entity_id = data.get("entity_id")
    if not entity_id:
        return error("bad_request", "entity_id is required", status=400)
    try:
        uuid.UUID(entity_id)
    except (ValueError, AttributeError):
        return error("bad_request", "Invalid entity_id format", status=400)
    try:
        return raw_response(ExportService().export_html(workspace_id, entity_id))
    except Exception as e:
        return error("internal_error", str(e), status=500)


@bp.post("/<string:workspace_id>/backups/export-pdf")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def export_pdf(workspace_id: str) -> ResponseValue:
    """Export a single entity (optionally a specific block) as PDF."""
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Request body must be a JSON object", status=400)
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    entity_id = data.get("entity_id")
    if not entity_id:
        return error("bad_request", "entity_id is required", status=400)
    try:
        uuid.UUID(entity_id)
    except (ValueError, AttributeError):
        return error("bad_request", "Invalid entity_id format", status=400)
    block_id = data.get("block_id")
    try:
        return raw_response(ExportService().export_pdf(workspace_id, entity_id, block_id=block_id))
    except Exception as e:
        return error("internal_error", str(e), status=500)


@bp.post("/<string:workspace_id>/backups/export-zip-encrypted")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def export_zip_encrypted(workspace_id: str) -> ResponseValue:
    """Export workspace as a signed, encrypted .gnv ZIP archive.

    The archive is tagged with the current mode as its 'source'.
    Cloud exports can only be imported by local-app, and vice-versa.
    """
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    try:
        result = ZipService().export_workspace_to_zip(workspace_id)
    except RuntimeError as e:
        return error("internal_error", str(e), status=500)
    export_dir = os.path.join(current_app.instance_path, "exports", "zip")
    return send_from_directory(export_dir, result["filename"], as_attachment=True)


@bp.post("/<string:workspace_id>/backups/import-zip")
@limiter.limit(RATE_LIMIT_DESTRUCTIVE)
@secured
def import_zip(workspace_id: str) -> ResponseValue:
    """Import workspace from a signed, encrypted .gnv ZIP archive.

    Enforces bidirectional sync origin validation:
      - Cloud mode may only import zips created by local-app
      - Local mode may only import zips created by cloud

    Expects multipart form data with a 'file' field containing the .gnv file.
    """
    if "file" not in request.files:
        return error("bad_request", "file field is required", status=400)
    file = request.files["file"]
    if not file.filename or not file.filename.endswith('.gnv'):
        return error("bad_request", "Only .gnv files are supported for import", status=400)
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err

    expected_source = _expected_zip_source()

    import tempfile
    with tempfile.NamedTemporaryFile(delete=False, suffix=".gnv") as tmp:
        file.save(tmp.name)
        tmp_path = tmp.name

    try:
        result = ZipService().import_workspace_from_zip(tmp_path, workspace_id, expected_source=expected_source)
        return raw_response(result, 201)
    except (ValueError, FileNotFoundError, PermissionError) as e:
        return error("bad_request", str(e), status=400)
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


@bp.get("/<string:workspace_id>/backups/download-zip/<path:filename>")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def download_zip(workspace_id: str, filename: str) -> ResponseValue:
    """Download an exported ZIP file by filename."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err

    export_dir = os.path.join(current_app.instance_path, "exports", "zip")
    real_export_dir = os.path.realpath(export_dir)
    real_path = os.path.realpath(os.path.join(export_dir, filename))
    if not real_path.startswith(real_export_dir + os.sep) and real_path != real_export_dir:
        return error("bad_request", "Invalid file path", status=400)
    return send_from_directory(export_dir, filename, as_attachment=True)
