"""
File service for GNOVIUM.

Local mode: direct upload to filesystem, inline image processing, no state machine.
Cloud mode: S3 presigned uploads, state machine, variants, quarantine, dedup.
"""

import hashlib
import io
import json
import os
import uuid
from datetime import datetime, timezone

from flask import current_app, send_from_directory
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.core.constants import ALLOWED_EXTENSIONS, ALLOWED_MIMETYPES, IMAGE_PROCESSING_THRESHOLD
from app.core.errors import ConflictError, NotFoundError
from app.core.sanitization import sanitize_filename
from app.extensions import db
from app.models import EntityFile, File, FileVariant, Job, Workspace, WorkspaceMember
from app.repositories import EntityFileRepository, FileRepository
from app.services.storage_provider import LAYOUT_VERSION, create_storage_provider, generate_object_key

from app.core.logging import logger


MAGIC_BYTE_MAP = {
    "pdf": [(b"%PDF", 0)],
    "png": [(b"\x89PNG\r\n\x1a\n", 0)],
    "jpg": [(b"\xff\xd8\xff", 0), (b"JFIF", 6)],
    "jpeg": [(b"\xff\xd8\xff", 0), (b"JFIF", 6)],
    "gif": [(b"GIF87a", 0), (b"GIF89a", 0)],
    "webp": [(b"WEBP", 8)],
    "zip": [(b"PK\x03\x04", 0), (b"PK\x05\x06", 0), (b"PK\x07\x08", 0)],
    "svg": [(b"<svg", 0), (b"<?xml", 0)],
    "mp4": [(b"\x00\x00\x00\x18ftyp", 4), (b"\x00\x00\x00\x1cftyp", 4)],
    "mp3": [(b"ID3", 0), (b"\xff\xfb", 0)],
    "json": [(b"{", 0), (b"[", 0)],
    "txt": [],
}


def _validate_magic_bytes(data: bytes, ext: str) -> bool:
    if ext not in MAGIC_BYTE_MAP:
        return True
    signatures = MAGIC_BYTE_MAP[ext]
    if not signatures:
        return True
    return any(
        data[offset:offset + len(sig)] == sig
        for sig, offset in signatures
    )


class FileService:
    """Unified file service for local and cloud (S3) storage.

    Handles upload, download, variant generation, quarantine lifecycle,
    deduplication, and orphan cleanup for both storage backends.
    """

    def __init__(self, file_repo=None, storage_provider=None, entity_file_repo=None):
        self.file_repo = file_repo or FileRepository()
        self.storage_provider = storage_provider
        self.entity_file_repo = entity_file_repo or EntityFileRepository()

    def _get_provider(self):
        if self.storage_provider:
            return self.storage_provider
        provider = getattr(current_app, "storage_provider", None)
        if provider is None:
            provider = create_storage_provider(current_app.config)
            current_app.storage_provider = provider
        return provider

    ALLOWED_EXTENSIONS = ALLOWED_EXTENSIONS
    ALLOWED_MIMETYPES = ALLOWED_MIMETYPES
    # ─── Thumbnail/preview sizes (matching storage.md spec) ───
    THUMBNAIL_MAX_DIMENSION = (256, 256)
    THUMBNAIL_QUALITY = 80
    PREVIEW_MAX_DIMENSION = (1024, 1024)
    PREVIEW_QUALITY = 85

    def _is_cloud(self):
        return current_app.config.get("GNOVIUM_MODE", "local") == "cloud"

    def _validate_file(self, file_obj):
        filename = sanitize_filename(file_obj.filename)
        _, ext = os.path.splitext(filename)
        ext = ext.lstrip(".").lower()
        if ext and ext not in ALLOWED_EXTENSIONS:
            raise ValueError(f"File extension '.{ext}' is not allowed")
        if file_obj.content_type and file_obj.content_type not in ALLOWED_MIMETYPES:
            raise ValueError(f"MIME type '{file_obj.content_type}' is not allowed")
        file_obj.seek(0)
        magic_bytes = file_obj.read(16)
        file_obj.seek(0)
        if not _validate_magic_bytes(magic_bytes, ext):
            raise ValueError(f"File content does not match expected format for '.{ext}'")
        return ext

    def _validate_file_by_name(self, file_name, mime_type=None):
        file_name = sanitize_filename(file_name)
        ext = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else ""
        if ext and ext not in ALLOWED_EXTENSIONS:
            raise ValueError(f"File extension '.{ext}' is not allowed")
        if mime_type and mime_type not in ALLOWED_MIMETYPES:
            raise ValueError(f"MIME type '{mime_type}' is not allowed")
        return ext

    def _compute_hash(self, data):
        return hashlib.sha256(data).hexdigest()

    def _compute_hash_streaming(self, provider, object_key):
        """Compute SHA-256 hash by streaming file content."""
        hasher = hashlib.sha256()
        if hasattr(provider, 'get_path'):
            full_path = provider.get_path(object_key)
            with open(full_path, 'rb') as f:
                for chunk in iter(lambda: f.read(8192), b''):
                    hasher.update(chunk)
        elif hasattr(provider, '_get_client'):
            client = provider._get_client()
            response = client.get_object(Bucket=provider.bucket, Key=object_key)
            for chunk in response['Body'].iter_chunks(8192):
                hasher.update(chunk)
        else:
            data = provider.retrieve(object_key)
            hasher.update(data)
        return hasher.hexdigest()

    def _check_quota(self, workspace_id, additional_bytes):
        max_bytes = current_app.config.get("LOCAL_STORAGE_QUOTA", 1024 * 1024 * 1024)

        db.session.execute(
            select(Workspace).filter(Workspace.id == workspace_id).with_for_update()
        )

        subq = (
            select(func.coalesce(func.sum(File.file_size), 0))
            .filter(
                File.workspace_id == workspace_id,
                File.is_deleted.is_(False),
                File.state.in_(["READY", "VALIDATING", "UPLOADED"]),
            )
        )
        used = db.session.execute(subq).scalar()
        if used + additional_bytes > max_bytes:
            raise ValueError(f"Storage quota exceeded ({used + additional_bytes} > {max_bytes})")

    def _cloud_upload_response(self, file_record, deduplicated=False):
        return {
            "id": str(file_record.id),
            "workspace_id": str(file_record.workspace_id),
            "file_name": file_record.file_name,
            "mime_type": file_record.mime_type,
            "file_size": file_record.file_size,
            "content_hash": file_record.content_hash,
            "storage_provider": file_record.storage_provider,
            "object_key": file_record.object_key,
            "state": file_record.state,
            "uploaded_by": str(file_record.uploaded_by) if file_record.uploaded_by else None,
            "uploaded_at": file_record.uploaded_at.isoformat() if file_record.uploaded_at else None,
            "deduplicated": deduplicated,
        }

    def _finalize_cloud_upload(self, file_id):
        if not self._is_cloud():
            return {"status": "skipped", "reason": "Not cloud mode"}

        if not current_app.config.get("INLINE_FILE_PROCESSING", True):
            self._enqueue_validation(file_id)
            return {"status": "queued"}

        try:
            from app.services.processing.pipeline import ProcessingPipeline
            pipeline = ProcessingPipeline()
            result = pipeline.validate_file(file_id)
            if result.get("status") != "passed":
                return result

            file_record = self.file_repo.get(file_id)
            if not file_record:
                return {"status": "skipped", "reason": "File not found"}

            if self._is_image(file_record.mime_type) and (file_record.file_size or 0) <= IMAGE_PROCESSING_THRESHOLD:
                pipeline.process_image_thumbnail(file_id)
                pipeline.process_image_preview(file_id)
                pipeline.process_image_optimized(file_id)
            elif self._is_pdf(file_record.mime_type):
                pipeline.process_pdf_pages(file_id)
                pipeline.process_content_extract(file_id)
            elif self._is_text(file_record.mime_type):
                pipeline.process_content_extract(file_id)

            return result
        except Exception as exc:
            logger.warning("file_inline_processing_failed", file_id=file_id, error=str(exc))
            self._enqueue_validation(file_id)
            return {"status": "queued", "error": str(exc)}

    # ═══════════════════════════════════════════════════════════════
    # LOCAL MODE — direct upload, inline processing, no state machine
    # ═══════════════════════════════════════════════════════════════

    def upload(self, file_obj, workspace_id, user_id):
        """Upload a file to storage, deduplicate, and generate local variants.

        Args:
            file_obj: A file-like object with filename, content_type, and read() method.
            workspace_id: The workspace to upload into.
            user_id: The ID of the uploading user.

        Returns:
            Dict with file metadata including id, hash, and variant availability.
        """
        provider = self._get_provider()
        filename = sanitize_filename(file_obj.filename)
        self._validate_file(file_obj)
        self._scan_file_for_malware(file_obj.filename)
        file_obj.seek(0)
        file_bytes = file_obj.read()
        content_hash = self._compute_hash(file_bytes)
        file_size = len(file_bytes)
        self._check_quota(workspace_id, file_size)

        existing = File.query.with_for_update().filter(
            File.content_hash == content_hash,
            File.workspace_id == workspace_id,
            File.is_deleted.is_(False),
        ).first()
        if existing:
            return {
                "id": str(existing.id),
                "workspace_id": str(existing.workspace_id),
                "file_name": existing.file_name,
                "mime_type": existing.mime_type,
                "file_size": existing.file_size,
                "content_hash": existing.content_hash,
                "storage_provider": existing.storage_provider,
                "object_key": existing.object_key,
                "uploaded_at": existing.uploaded_at.isoformat() if existing.uploaded_at else None,
                "deduplicated": True,
                "has_thumbnail": provider.has_variant("thumbnail", existing.content_hash, ".webp"),
                "has_preview": provider.has_variant("preview", existing.content_hash, ".webp"),
            }

        object_key = provider.generate_object_key(workspace_id, filename, content_hash)
        provider.store(object_key, file_bytes, file_obj.content_type or "application/octet-stream")

        extracted_text = None
        metadata_json = None
        mime_type = file_obj.content_type or "application/octet-stream"

        if current_app.config.get("IMAGE_PROCESSING_ENABLED"):
            extracted_text, metadata_json = self._extract_local_metadata(file_bytes, mime_type)

        create_data = {
            "workspace_id": workspace_id,
            "file_name": filename,
            "mime_type": mime_type,
            "file_size": file_size,
            "content_hash": content_hash,
            "storage_provider": provider.get_provider_name(),
            "object_key": object_key,
            "uploaded_by": user_id,
        }
        if not self._is_cloud():
            create_data["has_extracted_text"] = bool(extracted_text)
            create_data["extracted_text"] = extracted_text
            create_data["has_metadata"] = bool(metadata_json)
            create_data["metadata_json"] = metadata_json
        try:
            file_record = self.file_repo.create(create_data)
            db.session.commit()
        except Exception:
            db.session.rollback()
            existing = File.query.with_for_update().filter(
                File.content_hash == content_hash,
                File.workspace_id == workspace_id,
                File.is_deleted.is_(False),
            ).first()
            if existing:
                return {
                    "id": str(existing.id),
                    "workspace_id": str(existing.workspace_id),
                    "file_name": existing.file_name,
                    "mime_type": existing.mime_type,
                    "file_size": existing.file_size,
                    "content_hash": existing.content_hash,
                    "storage_provider": existing.storage_provider,
                    "object_key": existing.object_key,
                    "uploaded_at": existing.uploaded_at.isoformat() if existing.uploaded_at else None,
                    "deduplicated": True,
                }
            raise

        if self._is_image(mime_type) and file_size <= IMAGE_PROCESSING_THRESHOLD:
            self._generate_local_variants(provider, content_hash, file_bytes)

        if self._is_pdf(mime_type) and file_size <= 50 * 1024 * 1024:
            self._extract_local_pdf_text(file_record, file_bytes)

        return {
            "id": str(file_record.id),
            "workspace_id": str(file_record.workspace_id),
            "file_name": file_record.file_name,
            "mime_type": file_record.mime_type,
            "file_size": file_record.file_size,
            "content_hash": file_record.content_hash,
            "storage_provider": file_record.storage_provider,
            "object_key": object_key,
            "uploaded_at": file_record.uploaded_at.isoformat() if file_record.uploaded_at else None,
            "deduplicated": False,
            "has_thumbnail": provider.has_variant("thumbnail", content_hash, ".webp"),
            "has_preview": provider.has_variant("preview", content_hash, ".webp"),
        }

    def create_metadata(self, data, user_id):
        provider = self._get_provider()
        existing = File.query.with_for_update().filter(
            File.content_hash == data.get("content_hash"),
            File.workspace_id == data.get("workspace_id"),
            File.is_deleted.is_(False),
        ).first()
        if existing:
            return {
                "id": str(existing.id),
                "workspace_id": str(existing.workspace_id),
                "file_name": existing.file_name,
                "mime_type": existing.mime_type,
                "file_size": existing.file_size,
                "content_hash": existing.content_hash,
                "storage_provider": existing.storage_provider,
                "object_key": existing.object_key,
                "uploaded_by": str(existing.uploaded_by) if existing.uploaded_by else None,
                "uploaded_at": existing.uploaded_at.isoformat() if existing.uploaded_at else None,
                "deduplicated": True,
            }
        file = self.file_repo.create({
            **data,
            "storage_provider": provider.get_provider_name(),
            "uploaded_by": user_id,
        })
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return file

    def download_file(self, file_record, expires_in=3600):
        """Generate a presigned or local download URL for a file.

        Args:
            file_record: The File model instance to download.
            expires_in: URL expiration time in seconds (cloud mode).

        Returns:
            A presigned URL (cloud) or local filesystem path.
        """
        provider = self._get_provider()
        return provider.presign_download(file_record.object_key, expires_in)

    def get_file_content(self, file_record):
        """Read and return the raw text content of a file.

        Args:
            file_record: The File model instance to read.

        Returns:
            Decoded UTF-8 string content of the file.
        """
        provider = self._get_provider()
        raw = provider.retrieve(file_record.object_key)
        return raw.decode("utf-8")

    def delete_file(self, file_record, deleted_by=None):
        """Soft-delete a file, removing it from storage in local mode.

        Args:
            file_record: The File model instance to delete.
            deleted_by: The user ID performing the deletion.
        """
        file_record.state = "DELETED"
        self.file_repo.soft_delete(file_record, deleted_by=deleted_by)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise

    def link_entity(self, entity_id, file_id, block_id=None):
        existing = EntityFile.query.with_for_update().filter_by(
            entity_id=entity_id,
            file_id=file_id,
            is_deleted=False,
        ).first()
        if existing:
            raise ConflictError("Entity-file link already exists")
        link = self.entity_file_repo.create({
            "entity_id": entity_id,
            "file_id": file_id,
            "block_id": block_id,
        })
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            raise ConflictError("Entity-file link already exists")
        except Exception:
            db.session.rollback()
            raise
        return link

    def unlink_entity(self, entity_id, file_id):
        link = EntityFile.query.with_for_update().filter(
            EntityFile.entity_id == entity_id,
            EntityFile.file_id == file_id,
            EntityFile.is_deleted.is_(False),
        ).first()
        if link:
            link.is_deleted = True
            link.deleted_at = datetime.now(timezone.utc)
            try:
                db.session.commit()
            except Exception:
                db.session.rollback()
                raise
        return link

    def get_storage_info(self, workspace_id=None):
        query = db.session.query(
            db.func.coalesce(db.func.sum(File.file_size), 0),
            db.func.count(File.id),
        ).filter(
            File.is_deleted.is_(False),
            File.state.in_(["READY", "VALIDATING", "UPLOADED"]),
        )
        if workspace_id:
            query = query.filter(File.workspace_id == workspace_id)
        total_size, file_count = query.one()
        max_bytes = current_app.config.get("LOCAL_STORAGE_QUOTA", 1024 * 1024 * 1024)
        max_file_size = current_app.config.get("MAX_FILE_SIZE", 100 * 1024 * 1024)
        provider = self._get_provider()

        result = {
            "used_bytes": total_size,
            "file_count": file_count,
            "quota_bytes": max_bytes,
            "max_file_size": max_file_size,
            "quota_used_percent": round((total_size / max_bytes) * 100, 2) if max_bytes > 0 else 0,
            "storage_provider": provider.get_provider_name(),
        }
        if not self._is_cloud() and hasattr(provider, "get_storage_stats"):
            result["tier_stats"] = provider.get_storage_stats()
        return result

    def get_file(self, file_id, workspace_id=None):
        file_record = self.file_repo.get(file_id)
        if not file_record:
            raise NotFoundError("File not found")
        if workspace_id and str(file_record.workspace_id) != str(workspace_id):
            raise NotFoundError("File not found in this workspace")
        return file_record

    def list_by_workspace(self, workspace_id: str, page: int = 1, per_page: int = 50,
                          mime_type: str = None) -> dict:
        query = self.file_repo.query().filter(
            File.workspace_id == workspace_id,
            File.is_deleted.is_(False),
        )
        if mime_type:
            query = query.filter(File.mime_type == mime_type)
        query = query.order_by(File.uploaded_at.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        return {
            "items": [
                {
                    "id": str(f.id),
                    "workspace_id": str(f.workspace_id),
                    "file_name": f.file_name,
                    "mime_type": f.mime_type,
                    "file_size": f.file_size,
                    "content_hash": f.content_hash,
                    "storage_provider": f.storage_provider,
                    "object_key": f.object_key,
                    "state": f.state if hasattr(f, 'state') else "READY",
                    "uploaded_by": str(f.uploaded_by) if f.uploaded_by else None,
                    "uploaded_at": f.uploaded_at.isoformat() if hasattr(f, 'uploaded_at') and f.uploaded_at else None,
                }
                for f in pagination.items
            ],
            "total": pagination.total,
            "page": page,
            "per_page": per_page,
        }

    def cleanup_expired_pending(self):
        """Delete PENDING file records that were never confirmed (stale presigned uploads).

        In cloud mode, these records consume no S3 storage (the temp object may or
        may not exist). In local mode, any local temp files are removed from disk.
        """
        provider = self._get_provider()
        TEMP_EXPIRATION_DAYS = current_app.config.get("TEMP_EXPIRATION_DAYS", 7)
        expired = self.file_repo.find_pending_expired(hours=TEMP_EXPIRATION_DAYS * 24)
        count = 0
        for file_record in expired:
            if self._is_cloud():
                self.file_repo.soft_delete(file_record)
            else:
                if hasattr(provider, "delete"):
                    try:
                        provider.delete(file_record.object_key)
                    except Exception as exc:
                        logger.warning("cleanup_pending_delete_failed", file_id=str(file_record.id), error=str(exc))
                self.file_repo.hard_delete(file_record)
            count += 1
        if count:
            try:
                db.session.commit()
            except Exception:
                db.session.rollback()
                raise
        return count

    @staticmethod
    def cleanup_orphans(self, workspace_id=None):
        """Remove files that have no corresponding entity link.

        Finds all non-deleted files without EntityFile references,
        permanently removes them from storage and the database.

        Args:
            workspace_id: If provided, restrict to this workspace.

        Returns:
            Number of orphaned files cleaned up.
        """
        provider = self._get_provider()
        count = FileRepository(session=db.session).cleanup_orphans(workspace_id=workspace_id)
        try:
            provider.cleanup_orphans()
        except Exception:
            logger.exception("orphan_storage_cleanup_failed")
        if count:
            try:
                db.session.commit()
            except Exception:
                db.session.rollback()
                raise
        return count

    # ─── Local variant serving ──────────────────────────────────

    def get_local_variant(self, file_id, variant_type):
        """Get the filesystem path for a variant. Returns (path, mime_type) or (None, None)."""
        provider = self._get_provider()
        if not hasattr(provider, "generate_variant_key"):
            return None, None

        file_record = self.file_repo.get(file_id)
        if not file_record or not file_record.content_hash:
            return None, None
        ext = ".webp" if variant_type in ("thumbnail", "preview", "optimized") else ""
        key = provider.generate_variant_key(variant_type, file_record.content_hash, ext)
        full_path = provider.get_path(key)

        if not os.path.isfile(full_path):
            return None, None

        mime_map = {"thumbnail": "image/webp", "preview": "image/webp", "optimized": "image/webp"}
        return full_path, mime_map.get(variant_type, "application/octet-stream")

    def serve_local_variant(self, file_id, variant_type):
        """Return a Flask response serving the variant file."""
        path, mime_type = self.get_local_variant(file_id, variant_type)
        if not path:
            return None
        directory = os.path.dirname(path)
        filename = os.path.basename(path)
        return send_from_directory(directory, filename, mimetype=mime_type)

    def list_local_variants(self, file_id):
        """List all available variants for a local file."""
        provider = self._get_provider()
        if not hasattr(provider, "has_variant"):
            return []

        file_record = self.file_repo.get(file_id)
        if not file_record or not file_record.content_hash:
            return []
        variants = []
        for variant_type, ext in [
            ("thumbnail", ".webp"),
            ("preview", ".webp"),
            ("optimized", ".webp"),
        ]:
            if provider.has_variant(variant_type, file_record.content_hash, ext):
                key = provider.generate_variant_key(variant_type, file_record.content_hash, ext)
                variants.append({
                    "variant_type": variant_type,
                    "object_key": key,
                    "mime_type": "image/webp" if ext == ".webp" else "application/octet-stream",
                })
        return variants

    # ─── Local image processing (inline on upload) ─────────────

    def _generate_local_variants(self, provider, content_hash, file_bytes):
        """Generate thumbnail (≤256px) and preview (≤1024px) WebP variants inline."""
        try:
            from PIL import Image
        except ImportError:
            return

        try:
            img = Image.open(io.BytesIO(file_bytes))
        except (OSError, ValueError):
            logger.warning("Failed to open image for variant generation", exc_info=True)
            return

        for tier, max_dim, quality in [
            ("thumbnail", self.THUMBNAIL_MAX_DIMENSION, self.THUMBNAIL_QUALITY),
            ("preview", self.PREVIEW_MAX_DIMENSION, self.PREVIEW_QUALITY),
            ("optimized", None, 80),
        ]:
            try:
                variant = img.copy()
                if max_dim:
                    variant.thumbnail(max_dim, Image.Resampling.LANCZOS)
                if variant.mode in ("RGBA", "P", "LA"):
                    variant = variant.convert("RGB")
                buf = io.BytesIO()
                variant.save(buf, format="WEBP", quality=quality, method=6)
                provider.store_variant(tier, content_hash, buf.getvalue(), ".webp", "image/webp")
            except (OSError, ValueError):
                logger.warning("Failed to generate variant %s", tier, exc_info=True)
                continue

    # ─── Local metadata extraction ──────────────────────────────

    def _extract_local_metadata(self, file_bytes, mime_type):
        """Extract metadata from uploaded file. Returns (extracted_text, metadata_json)."""
        extracted_text = None
        metadata = {}

        if mime_type.startswith("image/"):
            metadata = self._extract_image_metadata(file_bytes)
        elif self._is_text(mime_type):
            try:
                extracted_text = file_bytes.decode("utf-8", errors="replace")[:100000]
            except Exception:
                logger.warning("Failed to decode text content")
        elif mime_type == "application/json":
            try:
                parsed = json.loads(file_bytes)
                extracted_text = json.dumps(parsed, indent=2)[:100000]
                metadata["keys"] = list(parsed.keys()) if isinstance(parsed, dict) else None
            except Exception:
                logger.warning("Failed to parse JSON content")

        return extracted_text, metadata or None

    def _extract_image_metadata(self, file_bytes):
        """Extract EXIF and dimensions from an image."""
        metadata = {}
        try:
            from PIL import Image
            from PIL.ExifTags import TAGS
            img = Image.open(io.BytesIO(file_bytes))
            metadata["width"] = img.width
            metadata["height"] = img.height
            metadata["format"] = img.format
            metadata["mode"] = img.mode
            exif_data = img.getexif() if hasattr(img, "getexif") else {}
            if exif_data:
                exif_dict = {}
                for tag_id, value in exif_data.items():
                    tag_name = TAGS.get(tag_id, str(tag_id))
                    if isinstance(value, (str, int, float)):
                        exif_dict[tag_name] = value
                if exif_dict:
                    metadata["exif"] = exif_dict
        except Exception:
            logger.warning("Failed to extract image metadata")
        return metadata

    def _extract_local_pdf_text(self, file_record, file_bytes):
        """Extract text from PDF using PyMuPDF and store on file record."""
        try:
            import fitz
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            text_parts = []
            for page_num in range(min(len(doc), 20)):
                page = doc[page_num]
                text = page.get_text("text")
                if text.strip():
                    text_parts.append(text)
            doc.close()
            if text_parts:
                file_record.has_extracted_text = True
                file_record.extracted_text = "\n\n".join(text_parts)
                try:
                    db.session.commit()
                except Exception:
                    db.session.rollback()
                    raise
        except ImportError:
            pass
        except Exception:
            logger.warning("Failed to extract PDF text")

    @staticmethod
    def validate_object_key(object_key: str) -> bool:
        if not object_key:
            return False
        if ".." in object_key:
            return False
        if object_key.startswith("/"):
            return False
        if "\\" in object_key:
            return False
        return True

    def _scan_file_for_malware(self, file_path: str) -> bool:
        """Scan file for malware using ClamAV if enabled."""
        if not current_app.config.get("CLAMAV_ENABLED", False):
            return True
        try:
            import subprocess
            result = subprocess.run(
                ["clamscan", "--no-summary", file_path],
                capture_output=True, text=True, timeout=120,
            )
            if "OK" in result.stdout:
                return True
            logger.warning("Malware detected in file %s: %s", file_path, result.stdout.strip())
            return False
        except FileNotFoundError:
            logger.warning("Virus scan unavailable (clamscan not found) for %s", file_path)
            return True
        except subprocess.TimeoutExpired:
            logger.warning("Virus scan timed out for %s", file_path)
            return True
        except Exception:
            logger.warning("Virus scan failed for %s", file_path, exc_info=True)
            return True

    # ─── Helpers ──────────────────────────────────────────────────

    def _is_image(self, mime_type):
        return mime_type and mime_type.startswith("image/") and mime_type not in ("image/svg+xml",)

    def _is_pdf(self, mime_type):
        return mime_type == "application/pdf"

    def _is_text(self, mime_type):
        return mime_type and (
            mime_type.startswith("text/")
            or mime_type in ("application/json", "application/xml", "application/javascript")
            or mime_type.endswith("+json")
            or mime_type.endswith("+xml")
        )

    def _finalize_upload(self, file_record, provider, workspace_id, user_id):
        """Finalize a cloud upload: validate state, check storage, compute hash,
        deduplicate, re-key, commit, and trigger post-upload processing.

        This is shared by complete_multipart_upload and confirm_upload.
        """
        if file_record.state != "PENDING":
            raise ValueError(f"File is in '{file_record.state}' state, expected 'PENDING'")

        if not provider.exists(file_record.object_key):
            raise ValueError("Object not found in storage")

        actual_size = provider.size(file_record.object_key)
        if file_record.file_size is not None and actual_size != file_record.file_size:
            raise ValueError(f"Size mismatch: expected {file_record.file_size}, got {actual_size}")

        actual_hash = self._compute_hash_streaming(provider, file_record.object_key)

        if file_record.content_hash and not file_record.content_hash.startswith("pending_"):
            if actual_hash != file_record.content_hash:
                raise ValueError("Content hash mismatch")

        # NOTE(F10): There is a race between this dedup check and the commit below.
        # Two concurrent requests for the same hash may both pass this check; the
        # IntegrityError handler after commit retries the dedup to resolve it.
        existing = File.query.with_for_update().filter(
            File.content_hash == actual_hash,
            File.workspace_id == workspace_id,
            File.is_deleted.is_(False),
        ).first()
        if existing and existing.id != file_record.id and existing.state in ("READY", "VALIDATING", "UPLOADED"):
            if self._is_cloud():
                self.file_repo.soft_delete(file_record)
            else:
                self.file_repo.hard_delete(file_record)
            try:
                db.session.commit()
            except Exception:
                db.session.rollback()
                raise
            return self._cloud_upload_response(existing, deduplicated=True)

        file_record.content_hash = actual_hash
        if not file_record.object_key.endswith(actual_hash):
            new_key = generate_object_key(actual_hash)
            actual_bytes = provider.retrieve(file_record.object_key)
            provider.store(new_key, actual_bytes, file_record.mime_type or "application/octet-stream")
            provider.delete(file_record.object_key)
            file_record.object_key = new_key

        file_record.state = "UPLOADED"
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            existing = File.query.with_for_update().filter(
                File.content_hash == actual_hash,
                File.workspace_id == workspace_id,
                File.is_deleted.is_(False),
            ).first()
            if existing and existing.id != file_record.id and existing.state in ("READY", "VALIDATING", "UPLOADED"):
                if self._is_cloud():
                    self.file_repo.soft_delete(file_record)
                else:
                    self.file_repo.hard_delete(file_record)
                try:
                    db.session.commit()
                except Exception:
                    db.session.rollback()
                    raise
                return self._cloud_upload_response(existing, deduplicated=True)
            raise

        self._finalize_cloud_upload(file_record.id)
        db.session.refresh(file_record)
        return self._cloud_upload_response(file_record, deduplicated=False)

    # ═══════════════════════════════════════════════════════════════
    # CLOUD MODE — S3, state machine, variants, quarantine
    # ═══════════════════════════════════════════════════════════════

    def presign_upload(self, workspace_id, file_name, content_type, file_size, user_id, content_hash=None):
        if not self._is_cloud():
            return {"enabled": False, "message": "Presigned uploads only available in cloud mode"}

        membership = WorkspaceMember.query.filter(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
            WorkspaceMember.is_deleted.is_(False),
        ).first()
        if not membership:
            raise ValueError("Access denied to workspace")

        provider = self._get_provider()
        self._validate_file_by_name(file_name, content_type)

        max_file_size = current_app.config.get("MAX_FILE_SIZE", 100 * 1024 * 1024)
        if file_size and file_size > max_file_size:
            raise ValueError(f"File size {file_size} exceeds maximum allowed size of {max_file_size} bytes")

        if content_hash:
            existing = File.query.with_for_update().filter(
                File.content_hash == content_hash,
                File.workspace_id == workspace_id,
                File.is_deleted.is_(False),
            ).first()
            if existing and existing.state in ("READY", "VALIDATING", "UPLOADED"):
                return {
                    "enabled": False,
                    "deduplicated": True,
                    "file": self._cloud_upload_response(existing, deduplicated=True),
                }

        if file_size:
            self._check_quota(workspace_id, file_size)

        pending_id = uuid.uuid4().hex

        object_key = f"{LAYOUT_VERSION}/temp/pending/{pending_id[:2]}/{pending_id[2:4]}/{pending_id}"
        presigned = provider.presign_upload(object_key, content_type or "application/octet-stream")

        file_record = self.file_repo.create({
            "workspace_id": workspace_id,
            "file_name": file_name,
            "mime_type": content_type,
            "file_size": file_size or 0,
            "content_hash": f"pending_{pending_id}",
            "state": "PENDING",
            "storage_provider": provider.get_provider_name(),
            "object_key": object_key,
            "uploaded_by": user_id,
        })
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise

        return {
            "enabled": True,
            "upload_url": presigned["upload_url"],
            "object_key": object_key,
            "file_id": str(file_record.id),
            "expires_at": presigned["expires_at"],
        }

    def presign_multipart_upload(self, workspace_id, file_name, content_type, file_size, user_id, content_hash=None):
        if not self._is_cloud():
            return {"enabled": False, "message": "Presigned multipart uploads only available in cloud mode"}

        membership = WorkspaceMember.query.filter(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
            WorkspaceMember.is_deleted.is_(False),
        ).first()
        if not membership:
            raise ValueError("Access denied to workspace")

        provider = self._get_provider()
        self._validate_file_by_name(file_name, content_type)

        max_file_size = current_app.config.get("MAX_FILE_SIZE", 100 * 1024 * 1024)
        if file_size and file_size > max_file_size:
            raise ValueError(f"File size {file_size} exceeds maximum allowed size of {max_file_size} bytes")

        if content_hash:
            existing = File.query.with_for_update().filter(
                File.content_hash == content_hash,
                File.workspace_id == workspace_id,
                File.is_deleted.is_(False),
            ).first()
            if existing and existing.state in ("READY", "VALIDATING", "UPLOADED"):
                return {
                    "enabled": False,
                    "deduplicated": True,
                    "file": self._cloud_upload_response(existing, deduplicated=True),
                }

        if file_size:
            self._check_quota(workspace_id, file_size)

        pending_id = uuid.uuid4().hex
        object_key = f"{LAYOUT_VERSION}/temp/pending/{pending_id[:2]}/{pending_id[2:4]}/{pending_id}"

        multipart = provider.create_multipart_upload(object_key, content_type or "application/octet-stream")

        file_record = self.file_repo.create({
            "workspace_id": workspace_id,
            "file_name": file_name,
            "mime_type": content_type,
            "file_size": file_size or 0,
            "content_hash": f"pending_{pending_id}",
            "state": "PENDING",
            "storage_provider": provider.get_provider_name(),
            "object_key": object_key,
            "uploaded_by": user_id,
        })
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise

        return {
            "enabled": True,
            "upload_id": multipart["upload_id"],
            "object_key": object_key,
            "file_id": str(file_record.id),
        }

    def complete_multipart_upload(self, file_id, upload_id, parts, workspace_id, user_id):
        if not self._is_cloud():
            raise ValueError("Multipart upload completion only available in cloud mode")

        provider = self._get_provider()
        file_record = File.query.with_for_update().filter(File.id == file_id).first()
        if not file_record:
            raise ValueError("File not found")
        if str(file_record.workspace_id) != str(workspace_id):
            raise ValueError("File not found in this workspace")

        if file_record.state != "PENDING":
            raise ValueError(f"File is in '{file_record.state}' state, expected 'PENDING'")

        provider.complete_multipart_upload(file_record.object_key, upload_id, parts)

        return self._finalize_upload(file_record, provider, workspace_id, user_id)

    def confirm_upload(self, file_id, workspace_id, user_id):
        if not self._is_cloud():
            raise ValueError("Upload confirmation only available in cloud mode")

        provider = self._get_provider()
        file_record = File.query.with_for_update().filter(File.id == file_id).first()
        if not file_record:
            raise ValueError("File not found")
        if str(file_record.workspace_id) != str(workspace_id):
            raise ValueError("File not found in this workspace")

        return self._finalize_upload(file_record, provider, workspace_id, user_id)

    def _enqueue_validation(self, file_id):
        job = Job(
            workspace_id=None,
            type="file_validation",
            status="pending",
            payload={"file_id": str(file_id)},
        )
        db.session.add(job)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise

    def delete_file_cloud(self, file_record, deleted_by=None):
        if not self._is_cloud():
            raise ValueError("Cloud delete only available in cloud mode")
        file_record.state = "DELETED"
        self.file_repo.soft_delete(file_record, deleted_by=deleted_by)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise

    def resolve_quarantine(self, file_id, approve=True, resolved_by=None):
        if not self._is_cloud():
            raise ValueError("Quarantine resolution only available in cloud mode")
        file_record = self.file_repo.get(file_id)
        if file_record.state != "QUARANTINED":
            raise ValueError(f"File is in '{file_record.state}' state, not quarantined")
        if approve:
            file_record.state = "READY"
        else:
            file_record.state = "DELETED"
            file_record.is_deleted = True
            file_record.deleted_at = datetime.now(timezone.utc)
            if resolved_by:
                file_record.deleted_by = str(resolved_by)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return file_record

    def get_variant(self, file_id, variant_type, expires_in=3600):
        if self._is_cloud():
            return self._get_cloud_variant(file_id, variant_type, expires_in)
        return self._get_local_variant_info(file_id, variant_type)

    def _get_cloud_variant(self, file_id, variant_type, expires_in):
        from flask import current_app
        if current_app.config.get("GNOVIUM_MODE") != "cloud":
            return None
        variant = FileVariant.query.filter(
            FileVariant.file_id == file_id,
            FileVariant.variant_type == variant_type,
            FileVariant.is_deleted.is_(False),
        ).first()
        if not variant:
            return None
        provider = self._get_provider()
        return {
            "variant_type": variant.variant_type,
            "object_key": variant.object_key,
            "mime_type": variant.mime_type,
            "width": variant.width,
            "height": variant.height,
            "file_size": variant.file_size,
            "download_url": provider.presign_download(variant.object_key, expires_in),
        }

    def _get_local_variant_info(self, file_id, variant_type):
        """Get info about a local variant without serving it."""
        provider = self._get_provider()
        if not hasattr(provider, "has_variant"):
            return None
        file_record = self.file_repo.get(file_id)
        if not file_record or not file_record.content_hash:
            return None
        ext = ".webp" if variant_type in ("thumbnail", "preview", "optimized") else ""
        if not provider.has_variant(variant_type, file_record.content_hash, ext):
            return None
        key = provider.generate_variant_key(variant_type, file_record.content_hash, ext)
        return {
            "variant_type": variant_type,
            "object_key": key,
            "mime_type": "image/webp" if ext == ".webp" else "application/octet-stream",
            "file_size": provider.size(key),
            "local_path": provider.get_path(key),
        }

    def list_variants(self, file_id):
        if self._is_cloud():
            from flask import current_app
            if current_app.config.get("GNOVIUM_MODE") != "cloud":
                return []
            return FileVariant.query.filter(
                FileVariant.file_id == file_id,
                FileVariant.is_deleted.is_(False),
            ).all()
        return self.list_local_variants(file_id)

    def cleanup_expired_quarantine(self):
        """Clean up expired quarantined files.

        In local mode, removes files from disk and soft-deletes the DB record.
        In cloud mode, only soft-deletes the DB record — S3 lifecycle rules
        handle physical cleanup.

        Returns:
            Number of expired quarantine files cleaned up.
        """
        days = current_app.config.get("QUARANTINE_EXPIRATION_DAYS", 30)
        expired = self.file_repo.find_quarantined_expired(days)
        count = 0
        if self._is_cloud():
            for file_record in expired:
                self.file_repo.soft_delete(file_record)
                count += 1
        else:
            provider = self._get_provider()
            for file_record in expired:
                provider.delete(file_record.object_key)
                provider.delete_all_variants(file_record.content_hash)
                self.file_repo.hard_delete(file_record)
                count += 1
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return count

    def cleanup_deleted_files(self):
        """Clean up files past their soft-delete retention period.

        Removes files (and variants) from storage and
        hard-deletes the DB record in both local and cloud modes.

        Returns:
            Number of deleted files cleaned up.
        """
        days = current_app.config.get("DELETED_RETENTION_DAYS", 30)
        expired = self.file_repo.find_deleted_pending_cleanup(days)
        count = 0
        provider = self._get_provider()
        for file_record in expired:
            try:
                if hasattr(provider, "delete_all_variants"):
                    provider.delete_all_variants(file_record.content_hash)
                provider.delete(file_record.object_key)
                self.file_repo.hard_delete(file_record)
                count += 1
            except Exception as e:
                logger.error("file_cleanup_failed", extra={"file_id": str(file_record.id), "error": str(e)})
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return count

    def create_variant(self, file_id, variant_type, object_key, mime_type, width=None, height=None, file_size=None, algorithm=None, algorithm_version=None, quality=None):
        from flask import current_app
        if current_app.config.get("GNOVIUM_MODE") != "cloud":
            return None
        existing = FileVariant.query.filter(
            FileVariant.file_id == file_id,
            FileVariant.variant_type == variant_type,
            FileVariant.is_deleted.is_(False),
        ).first()
        if existing:
            if existing.algorithm_version == algorithm_version:
                return existing
            existing.is_deleted = True
            existing.deleted_at = datetime.now(timezone.utc)
        variant = FileVariant(
            file_id=file_id,
            variant_type=variant_type,
            object_key=object_key,
            mime_type=mime_type,
            width=width,
            height=height,
            file_size=file_size,
            algorithm=algorithm,
            algorithm_version=algorithm_version,
            quality=quality,
        )
        db.session.add(variant)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return variant
