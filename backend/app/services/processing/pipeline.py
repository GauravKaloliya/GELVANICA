"""
File processing pipeline for GNOVIUM.

Cloud mode: background Job queue, FileVariant tracking, S3 I/O.
Local mode: processing is inline during upload (see FileService._generate_local_variants).
This module provides the cloud processing pipeline and a local-mode fallback entry point.
"""

import os
import uuid
from typing import Any, Dict, List, Optional, Tuple

from flask import current_app

from app.core.constants import IMAGE_PROCESSING_THRESHOLD, LARGE_FILE_THRESHOLD, TEXT_EXTRACTION_MAX_LENGTH
from app.core.logging import logger
from app.extensions import db
from app.models import File, FileVariant, Job, Notification
from app.services.file_service import FileService
from app.services.storage_provider import create_storage_provider, generate_derived_key, generate_quarantine_key


class ProcessingPipeline:
    """Orchestrates file processing jobs.

    Each method is idempotent. In cloud mode, jobs are enqueued and executed
    asynchronously via the Job queue. In local mode, processing is done inline
    during upload.
    """

    IMAGE_ALGORITHM: str = "sharp-1.0"
    IMAGE_ALGORITHM_VERSION: str = "1.0"
    PDF_ALGORITHM: str = "pdf-lib-1.0"
    PDF_ALGORITHM_VERSION: str = "1.0"
    THUMBNAIL_SIZE: Tuple[int, int] = (256, 256)
    THUMBNAIL_QUALITY: int = 80
    PREVIEW_SIZE: Tuple[int, int] = (1024, 1024)
    PREVIEW_QUALITY: int = 85
    OPTIMIZED_QUALITY: int = 80

    def _get_provider(self) -> Any:
        provider = getattr(current_app, "_storage_provider", None)
        if provider is None:
            provider = create_storage_provider(current_app.config)
            current_app._storage_provider = provider
        return provider

    def _is_cloud(self) -> bool:
        return current_app.config.get("GNOVIUM_MODE") == "cloud"

    def _get_file(self, file_id: str) -> Optional[File]:
        return File.query.with_for_update().filter(File.id == file_id).first()

    def _get_file_bytes(self, file_record: File) -> bytes:
        if not file_record.object_key:
            raise ValueError("File has no object_key")
        provider = self._get_provider()
        return provider.retrieve(file_record.object_key)

    def _is_image(self, mime_type: Optional[str]) -> bool:
        """Return True if mime_type is a supported image type."""
        return mime_type and mime_type.startswith("image/") and mime_type not in ("image/svg+xml",)

    def _is_pdf(self, mime_type: Optional[str]) -> bool:
        """Return True if mime_type is PDF."""
        return mime_type == "application/pdf"

    def _is_large_file(self, file_size: Optional[int]) -> bool:
        """Return True if file_size exceeds IMAGE_PROCESSING_THRESHOLD."""
        return bool(file_size) and file_size > IMAGE_PROCESSING_THRESHOLD

    # ─── Cloud-mode: Job queue processing ──────────────────────

    def validate_file(self, file_id: str) -> Dict[str, Any]:
        """Validate file: extension, MIME, optional virus scan. Cloud only.

        Transitions the file through UPLOADED -> VALIDATING -> READY or QUARANTINED.
        Enqueues derived processing jobs on success.
        """
        if not self._is_cloud():
            return {"status": "skipped", "reason": "Validation is inline in local mode"}

        file_record = self._get_file(file_id)
        if not file_record:
            return {"status": "skipped", "reason": "File not found"}

        if not hasattr(file_record, "state"):
            return {"status": "skipped", "reason": "Local mode has no state machine"}

        if file_record.state == "READY":
            return {"status": "passed", "file_id": str(file_id)}

        if file_record.state not in ("UPLOADED", "VALIDATING"):
            return {"status": "skipped", "reason": f"File not in UPLOADED/VALIDATING state (current: {file_record.state})"}

        try:
            file_record.state = "VALIDATING"

            fs = FileService()
            ext = file_record.file_name.rsplit(".", 1)[-1].lower() if "." in file_record.file_name else ""
            if ext and ext not in fs.ALLOWED_EXTENSIONS:
                return self._quarantine(file_record, "invalid", f"Extension '.{ext}' not allowed")

            if file_record.mime_type and file_record.mime_type not in fs.ALLOWED_MIMETYPES:
                return self._quarantine(file_record, "invalid", f"MIME type '{file_record.mime_type}' not allowed")

            if current_app.config.get("CLAMAV_ENABLED"):
                scan_result = self._virus_scan(file_record)
                if scan_result == "INFECTED":
                    return self._quarantine(file_record, "virus", "Virus detected")
                if scan_result in ("SCAN_TIMEOUT", "SCAN_ERROR"):
                    retry_result = self._virus_scan(file_record)
                    if retry_result == "CLEAN":
                        pass
                    elif retry_result == "INFECTED":
                        return self._quarantine(file_record, "virus", "Virus detected")
                    else:
                        return self._quarantine(file_record, "failed", f"Virus scan failed after retry: {retry_result}")

            file_record.state = "READY"
            db.session.commit()

            self._enqueue_derived_jobs(file_id)

            return {"status": "passed", "file_id": str(file_id)}
        except Exception as e:
            logger.warning("Validation error for file %s: %s", file_id, e)
            try:
                db.session.rollback()
            except Exception:
                pass
            file_record = self._get_file(file_id)
            if file_record:
                file_record.state = "PENDING"
            try:
                db.session.commit()
            except Exception:
                db.session.rollback()
            return {"status": "error", "error": str(e), "file_id": str(file_id)}

    def _virus_scan(self, file_record: File) -> str:
        """Run ClamAV virus scan on a file. Returns CLEAN, INFECTED, SCAN_UNAVAILABLE, SCAN_TIMEOUT, or SCAN_ERROR."""
        file_id = str(file_record.id) if file_record.id else "unknown"
        try:
            import subprocess
            file_bytes = self._get_file_bytes(file_record)
            import tempfile
            with tempfile.NamedTemporaryFile(delete=False) as tmp:
                tmp.write(file_bytes)
                tmp_path = tmp.name
            try:
                result = subprocess.run(
                    ["clamscan", "--no-summary", tmp_path],
                    capture_output=True, text=True, timeout=120,
                )
                if "OK" in result.stdout:
                    return "CLEAN"
                return "INFECTED"
            finally:
                os.unlink(tmp_path)
        except FileNotFoundError:
            logger.warning("Virus scan unavailable (clamscan not found) for file %s", file_id)
            return "SCAN_UNAVAILABLE"
        except subprocess.TimeoutExpired:
            logger.warning("Virus scan timed out for file %s", file_id)
            return "SCAN_TIMEOUT"
        except Exception:
            logger.warning("Virus scan failed for file %s", file_id, exc_info=True)
            return "SCAN_ERROR"

    def _quarantine(self, file_record: File, reason: str, message: str) -> Dict[str, Any]:
        """Move file to quarantine storage, update state, and notify the uploader."""
        if not self._is_cloud():
            return {"status": "skipped", "reason": "Quarantine not supported in local mode"}

        provider = self._get_provider()
        quarantine_key = generate_quarantine_key(reason, file_record.content_hash or str(uuid.uuid4()))

        try:
            file_bytes = self._get_file_bytes(file_record)
            provider.store(quarantine_key, file_bytes, file_record.mime_type or "application/octet-stream")
        except Exception as e:
            logger.warning("Failed to copy file to quarantine storage: %s", e)
            return {"status": "error", "reason": "quarantine_copy_failed", "message": str(e)}

        original_object_key = file_record.object_key
        file_record.object_key = quarantine_key
        file_record.state = "QUARANTINED"
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            return {"status": "error", "reason": "commit_failed", "message": "Failed to persist quarantine state"}

        try:
            provider.delete(original_object_key)
        except Exception as e:
            logger.warning("Failed to delete quarantined file: %s", e)

        try:
            file_record_for_notif = self._get_file(file_record.id)
            if file_record_for_notif:
                notif = Notification(
                    workspace_id=file_record_for_notif.workspace_id,
                    user_id=file_record_for_notif.uploaded_by,
                    type="system",
                    title=f"File quarantined: {file_record_for_notif.file_name}",
                    body=f"Reason: {reason}. {message}",
                )
                db.session.add(notif)
                db.session.commit()
        except Exception:
            db.session.rollback()

        return {"status": "quarantined", "reason": reason, "message": message}

    def _enqueue_derived_jobs(self, file_id: str) -> None:
        """Enqueue image variant, PDF page rendering, and content extraction jobs for a file."""
        if not self._is_cloud():
            return

        file_record = self._get_file(file_id)
        if not file_record:
            return

        jobs_to_add = []

        if self._is_image(file_record.mime_type) and not self._is_large_file(file_record.file_size):
            for job_type in ["image_thumbnail", "image_preview", "image_optimized"]:
                existing = Job.query.filter_by(
                    type=job_type, status="pending",
                ).filter(
                    Job.payload["file_id"].as_string() == str(file_id)
                ).with_for_update().first()
                if not existing:
                    jobs_to_add.append(Job(
                        type=job_type, status="pending", priority="medium",
                        payload={"file_id": str(file_id)},
                    ))

        if self._is_pdf(file_record.mime_type):
            existing = Job.query.filter_by(
                type="pdf_pages", status="pending",
            ).filter(
                Job.payload["file_id"].as_string() == str(file_id)
            ).with_for_update().first()
            if not existing:
                jobs_to_add.append(Job(
                    type="pdf_pages", status="pending", priority="medium",
                    payload={"file_id": str(file_id)},
                ))

        if (self._is_pdf(file_record.mime_type) and file_record.file_size and file_record.file_size <= LARGE_FILE_THRESHOLD) or (
            file_record.mime_type and (
                file_record.mime_type.startswith("text/")
                or file_record.mime_type in ("application/json", "application/xml")
            )
        ):
            existing = Job.query.filter_by(
                type="content_extract", status="pending",
            ).filter(
                Job.payload["file_id"].as_string() == str(file_id)
            ).with_for_update().first()
            if not existing:
                jobs_to_add.append(Job(
                    type="content_extract", status="pending", priority="low",
                    timeout_seconds=300,
                    payload={"file_id": str(file_id)},
                ))

        for job in jobs_to_add:
            db.session.add(job)
        if jobs_to_add:
            try:
                db.session.commit()
            except Exception:
                db.session.rollback()
                logger.warning("enqueue_derived_jobs_failed", extra={"file_id": str(file_id)})

    # ─── Cloud-mode: Image processing via FileVariant ───────────

    def _process_image_variant(self, file_id: str, variant_type: str, size: Optional[Tuple[int, int]] = None, quality: int = 80) -> Dict[str, Any]:
        """Process an image variant (thumbnail, preview, optimized).

        Args:
            file_id: The file ID to process.
            variant_type: One of 'thumbnail', 'preview', 'optimized'.
            size: Tuple of (width, height) for resize. None for compress-only.
            quality: JPEG quality (1-100).

        Returns:
            Dict with status and object_key on success.
        """
        if not self._is_cloud():
            return {"status": "skipped", "reason": "Local mode uses inline variant generation"}

        file_record = self._get_file(file_id)
        if not file_record or not hasattr(file_record, "state"):
            return {"status": "skipped", "reason": "File not found or not cloud mode"}

        existing = FileVariant.query.filter_by(
            file_id=file_id, variant_type=variant_type, is_deleted=False
        ).first()
        if existing:
            return {"status": "skipped", "reason": f"{variant_type.title()} already exists"}

        try:
            file_bytes = self._get_file_bytes(file_record)
            if size:
                processed_bytes = self._resize_image(file_bytes, size, quality, "webp")
                mime_type = "image/webp"
                ext = ".webp"
            else:
                processed_bytes = self._compress_image(file_bytes, quality)
                mime_type = "image/webp"
                ext = ".webp"
            if not processed_bytes:
                return {"status": "skipped", "reason": "Image processing unavailable"}

            actual_width, actual_height = self._get_image_dimensions(processed_bytes)

            object_key = generate_derived_key(file_record.content_hash, variant_type, ext)
            provider = self._get_provider()
            provider.store(object_key, processed_bytes, mime_type)

            create_kwargs: Dict[str, Any] = dict(
                file_id=file_id,
                variant_type=variant_type,
                object_key=object_key,
                mime_type=mime_type,
                width=actual_width,
                height=actual_height,
                file_size=len(processed_bytes),
                algorithm=self.IMAGE_ALGORITHM,
                algorithm_version=self.IMAGE_ALGORITHM_VERSION,
                quality=quality,
            )
            FileService().create_variant(**create_kwargs)
            return {"status": "completed", "object_key": object_key}
        except Exception as e:
            return {"status": "failed", "error": str(e)}

    def process_image_thumbnail(self, file_id: str) -> Dict[str, Any]:
        """Generate a thumbnail variant of an image file."""
        return self._process_image_variant(file_id, "thumbnail", self.THUMBNAIL_SIZE, self.THUMBNAIL_QUALITY)

    def process_image_preview(self, file_id: str) -> Dict[str, Any]:
        """Generate a preview variant of an image file."""
        return self._process_image_variant(file_id, "preview", self.PREVIEW_SIZE, self.PREVIEW_QUALITY)

    def process_image_optimized(self, file_id: str) -> Dict[str, Any]:
        """Generate an optimized (compressed) variant of an image file."""
        return self._process_image_variant(file_id, "optimized", None, self.OPTIMIZED_QUALITY)

    def process_pdf_pages(self, file_id: str) -> Dict[str, Any]:
        """Render PDF pages as webp images. Cloud only."""
        if not self._is_cloud():
            return {"status": "skipped", "reason": "Local mode uses inline text extraction only"}

        file_record = self._get_file(file_id)
        if not file_record or not hasattr(file_record, "state"):
            return {"status": "skipped", "reason": "File not found or not cloud mode"}

        existing = FileVariant.query.filter_by(
            file_id=file_id, variant_type="pdf-page", is_deleted=False
        ).first()
        if existing:
            return {"status": "skipped", "reason": "PDF pages already rendered"}

        try:
            page_bytes_list = self._render_pdf_pages(file_record)
            if not page_bytes_list:
                return {"status": "skipped", "reason": "PDF rendering unavailable"}

            provider = self._get_provider()
            for i, page_bytes in enumerate(page_bytes_list, 1):
                object_key = generate_derived_key(file_record.content_hash, "pdf-pages", f"_p{i}.webp")
                provider.store(object_key, page_bytes, "image/webp")
                FileService().create_variant(
                    file_id=file_id,
                    variant_type="pdf-page",
                    object_key=object_key,
                    mime_type="image/webp",
                    file_size=len(page_bytes),
                    algorithm=self.PDF_ALGORITHM,
                    algorithm_version=self.PDF_ALGORITHM_VERSION,
                    quality=85,
                )
            return {"status": "completed", "pages": len(page_bytes_list)}
        except Exception as e:
            return {"status": "failed", "error": str(e)}

    def process_content_extract(self, file_id: str) -> Dict[str, Any]:
        """Extract text content from documents (PDF, text, JSON, XML). Cloud only."""
        if not self._is_cloud():
            return {"status": "skipped", "reason": "Local mode uses inline extraction"}

        file_record = self._get_file(file_id)
        if not file_record or not hasattr(file_record, "state"):
            return {"status": "skipped", "reason": "File not found or not cloud mode"}

        try:
            file_bytes = self._get_file_bytes(file_record)
            extracted_text = None

            if self._is_pdf(file_record.mime_type):
                if file_record.file_size and file_record.file_size > LARGE_FILE_THRESHOLD:
                    logger.warning("Skipping PDF text extraction for file %s (size %d exceeds LARGE_FILE_THRESHOLD)", file_id, file_record.file_size)
                else:
                    try:
                        import fitz
                        doc = fitz.open(stream=file_bytes, filetype="pdf")
                        parts = []
                        for page_num in range(min(len(doc), 20)):
                            text = doc[page_num].get_text("text")
                            if text.strip():
                                parts.append(text)
                        doc.close()
                        if parts:
                            extracted_text = "\n\n".join(parts)[:TEXT_EXTRACTION_MAX_LENGTH]
                    except ImportError:
                        pass

            elif file_record.mime_type and (
                file_record.mime_type.startswith("text/")
                or file_record.mime_type in ("application/json", "application/xml")
            ):
                try:
                    extracted_text = file_bytes.decode("utf-8", errors="replace")[:TEXT_EXTRACTION_MAX_LENGTH]
                except Exception:
                    logger.warning("Failed to decode text content in pipeline")

            if extracted_text:
                if hasattr(file_record, "has_extracted_text"):
                    file_record.has_extracted_text = True
                    file_record.extracted_text = extracted_text
                    try:
                        db.session.commit()
                    except Exception:
                        db.session.rollback()
                        return {"status": "failed", "error": "Failed to persist extracted text"}

            return {"status": "completed", "has_text": bool(extracted_text)}
        except Exception as e:
            db.session.rollback()
            return {"status": "failed", "error": str(e)}

    # ─── Cleanup ──────────────────────────────────────────────

    def cleanup_orphans(self, workspace_id: Optional[str] = None) -> int:
        """Remove orphaned file records. Delegates to FileService."""
        return FileService().cleanup_orphans(workspace_id)

    def cleanup_expired_quarantine(self) -> int:
        """Remove quarantine files that have exceeded the retention period."""
        if not self._is_cloud():
            return 0
        return FileService().cleanup_expired_quarantine()

    def cleanup_deleted_files(self) -> int:
        """Remove soft-deleted files that have exceeded the grace period."""
        if not self._is_cloud():
            return 0
        return FileService().cleanup_deleted_files()

    # ─── Job runner (moved to job_runner.py) ──────────────────

    # ─── Image processing helpers ──────────────────────────────

    def _get_image_dimensions(self, image_bytes: bytes) -> Tuple[int, int]:
        try:
            from PIL import Image
            import io
            img = Image.open(io.BytesIO(image_bytes))
            return img.width, img.height
        except Exception:
            return 0, 0

    def _resize_image(self, image_bytes: bytes, target_size: Tuple[int, int], quality: int, output_format: str) -> Optional[bytes]:
        """Resize an image to fit within target_size, returning encoded bytes or None."""
        try:
            from PIL import Image
            import io
            img = Image.open(io.BytesIO(image_bytes))
            img.thumbnail(target_size, Image.Resampling.LANCZOS)
            if img.mode in ("RGBA", "P", "LA"):
                img = img.convert("RGB")
            buf = io.BytesIO()
            img.save(buf, format=output_format.upper(), quality=quality)
            return buf.getvalue()
        except ImportError:
            return None
        except Exception:
            logger.warning("Image resize failed", exc_info=True)
            return None

    def _compress_image(self, image_bytes: bytes, quality: int) -> Optional[bytes]:
        """Re-encode an image as WebP at the given quality, returning bytes or None."""
        try:
            from PIL import Image
            import io
            img = Image.open(io.BytesIO(image_bytes))
            if img.mode in ("RGBA", "P", "LA"):
                img = img.convert("RGB")
            buf = io.BytesIO()
            img.save(buf, format="WEBP", quality=quality)
            return buf.getvalue()
        except ImportError:
            return None
        except Exception:
            logger.warning("Image compression failed", exc_info=True)
            return None

    def _render_pdf_pages(self, file_record: File) -> List[bytes]:
        """Render up to 10 PDF pages as WebP images. Returns list of page bytes."""
        try:
            import fitz
            from PIL import Image
            import io
            file_bytes = self._get_file_bytes(file_record)
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            pages = []
            for page_num in range(min(len(doc), 10)):
                page = doc[page_num]
                pix = page.get_pixmap(dpi=150)
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                buf = io.BytesIO()
                img.save(buf, format="WEBP", quality=85)
                pages.append(buf.getvalue())
            doc.close()
            return pages
        except ImportError:
            return []
        except Exception:
            logger.warning("PDF rendering failed", exc_info=True)
            return []





def process_local_upload(file_id: str) -> Dict[str, Any]:
    """Inline processing for local mode. Called by FileService after upload."""
    pipeline = ProcessingPipeline()
    file_record = pipeline._get_file(file_id)
    if not file_record:
        return {"status": "skipped", "reason": "File not found"}

    results: Dict[str, Any] = {}

    if pipeline._is_image(file_record.mime_type):
        fs = FileService()
        provider = pipeline._get_provider()
        file_bytes = pipeline._get_file_bytes(file_record)
        fs._generate_local_variants(provider, file_record.content_hash, file_bytes)
        results["variants"] = "generated"

    if pipeline._is_pdf(file_record.mime_type):
        fs = FileService()
        file_bytes = pipeline._get_file_bytes(file_record)
        fs._extract_local_pdf_text(file_record, file_bytes)
        results["text_extraction"] = "completed"

    return results
