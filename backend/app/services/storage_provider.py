"""
Storage provider abstraction for GNOVIUM file storage.

Implements the Strategy pattern: LocalProvider for local filesystem,
S3Provider for AWS S3. The FileService delegates all I/O to the active provider.

Object key layout (v1/):
  v1/objects/{variant}/{prefix1}/{prefix2}/{full_sha256}{ext}
  v1/temp/{purpose}/{id}/...
  v1/quarantine/{reason}/{hash}
"""

import hashlib
import os
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Optional

from app.core.circuit_breaker import CircuitBreaker
from app.core.logging import logger
from app.extensions import db



LAYOUT_VERSION = "v1"


def compute_content_hash(data: bytes) -> str:
    """Compute SHA-256 hex digest for content-addressable storage."""
    return hashlib.sha256(data).hexdigest()


def generate_object_key(content_hash: str, variant: str = "original", ext: str = "") -> str:
    """
    Generate a deterministic S3 object key from a SHA-256 content hash.

    Key format: v1/objects/{variant}/{prefix1}/{prefix2}/{full_sha256}{ext}
    """
    prefix1 = content_hash[:2]
    prefix2 = content_hash[2:4]
    key = f"{LAYOUT_VERSION}/objects/{variant}/{prefix1}/{prefix2}/{content_hash}"
    if ext:
        key += ext
    return key


def generate_derived_key(original_hash: str, variant_type: str, ext: str = ".webp") -> str:
    """
    Generate derived object key using the SAME hash as the original.
    Deterministic: same hash + variant_type + ext = same key.
    """
    return generate_object_key(original_hash, f"derived/{variant_type}", ext)


def generate_quarantine_key(reason: str, content_hash: str) -> str:
    return f"{LAYOUT_VERSION}/quarantine/{reason}/{content_hash}"


class StorageProvider(ABC):
    """Abstract base class for storage providers.

    Defines the interface for storing, retrieving, deleting, and querying
    binary objects (files). Implementations include LocalProvider (filesystem)
    and S3Provider (AWS S3).
    """

    @abstractmethod
    def store(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        """Store bytes at the given key. Returns the final object_key."""

    @abstractmethod
    def retrieve(self, key: str) -> bytes:
        """Retrieve raw bytes from the given key."""

    @abstractmethod
    def delete(self, key: str) -> bool:
        """Delete the object at the given key. Returns True if deleted."""

    @abstractmethod
    def exists(self, key: str) -> bool:
        """Check if an object exists at the given key."""

    @abstractmethod
    def size(self, key: str) -> int:
        """Get the size in bytes of the object at the given key."""

    @abstractmethod
    def presign_upload(self, key: str, content_type: str, expires_in: int = 3600) -> dict[str, Any]:
        """Generate a presigned upload URL."""

    @abstractmethod
    def presign_download(self, key: str, expires_in: int = 3600, response_content_type: Optional[str] = None, response_content_disposition: Optional[str] = None) -> str:
        """Generate a presigned download URL."""

    @abstractmethod
    def get_provider_name(self) -> str:
        """Return the provider identifier ('local' or 'aws_s3')."""

    def generate_object_key(self, workspace_id: str, filename: str, content_hash: str) -> str:
        """Generate a local-mode object key. Preserves original layout for backwards compatibility."""
        prefix = content_hash[:2]
        return f"objects/original/{prefix}/{content_hash}"


class LocalProvider(StorageProvider):
    """Local filesystem storage provider.

    Object layout (matching storage.md):
      objects/original/{prefix}/{sha256}           — raw uploaded bytes
      objects/thumbnail/{prefix}/{sha256}.webp      — ≤256px WebP
      objects/preview/{prefix}/{sha256}.webp        — ≤1024px WebP
      objects/optimized/{prefix}/{sha256}           — compressed/resized

    All keys use SHA-256 prefix sharding (2-char prefix = 256 dirs).
    """

    def __init__(self, storage_root: str) -> None:
        self.storage_root = storage_root
        os.makedirs(storage_root, exist_ok=True)

    def _validate_path(self, key: str) -> str:
        """Resolve *key* under storage_root and reject path-traversal attempts.

        Returns the resolved absolute path if safe. Raises ``ValueError``
        if the resolved path escapes the storage root.
        """
        full_path = os.path.realpath(os.path.join(self.storage_root, key))
        real_storage = os.path.realpath(self.storage_root)
        if not full_path.startswith(real_storage + os.sep) and full_path != real_storage:
            raise ValueError(f"Path traversal detected: {key}")
        return full_path

    # ─── Core CRUD ──────────────────────────────────────────

    def store(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        """Store bytes at *key*, creating parent directories as needed."""
        full_path = self._validate_path(key)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "wb") as f:
            f.write(data)
        return key

    def retrieve(self, key: str) -> bytes:
        """Read and return the raw bytes stored at *key*."""
        full_path = self._validate_path(key)
        with open(full_path, "rb") as f:
            return f.read()

    def delete(self, key: str) -> bool:
        """Delete the file at *key*. Returns True if a file was removed."""
        full_path = self._validate_path(key)
        if os.path.exists(full_path):
            os.remove(full_path)
            self._cleanup_empty_parent(full_path)
            return True
        return False

    def exists(self, key: str) -> bool:
        """Return True if a regular file exists at *key*."""
        full_path = self._validate_path(key)
        return os.path.isfile(full_path)

    def size(self, key: str) -> int:
        """Return the size in bytes of the file at *key*."""
        full_path = self._validate_path(key)
        return os.path.getsize(full_path)

    def get_path(self, key: str) -> str:
        """Return the resolved absolute filesystem path for *key*."""
        return self._validate_path(key)

    # ─── Presign stubs (local mode: not used) ────────────────

    def presign_upload(self, key: str, content_type: str, expires_in: int = 3600) -> dict[str, Any]:
        """Return a stub dict (presigned uploads are unsupported in local mode)."""
        return {"enabled": False, "message": "Presigned uploads not available in local mode", "object_key": key}

    def presign_download(self, key: str, expires_in: int = 3600, response_content_type: Optional[str] = None, response_content_disposition: Optional[str] = None) -> str:
        """Return the local filesystem path (presigned downloads unsupported in local mode)."""
        return self._validate_path(key)

    def get_provider_name(self) -> str:
        """Return ``'local'``."""
        return "local"

    # ─── Local key generation (preserved layout) ──────────────

    def generate_object_key(self, workspace_id: str, filename: str, content_hash: str) -> str:
        """Generate a deterministic object key under objects/original/."""
        prefix = content_hash[:2]
        return f"objects/original/{prefix}/{content_hash}"

    def generate_variant_key(self, tier: str, content_hash: str, ext: str = "") -> str:
        """Generate a variant key under objects/{tier}/{prefix}/{hash}{ext}.

        Args:
            tier: One of 'thumbnail', 'preview', 'optimized'
            content_hash: SHA-256 of the ORIGINAL file (deterministic, shared across variants)
            ext: File extension (e.g. '.webp')
        """
        prefix = content_hash[:2]
        return f"objects/{tier}/{prefix}/{content_hash}{ext}"

    # ─── Variant storage ──────────────────────────────────────

    def store_variant(self, tier: str, content_hash: str, data: bytes,
                      ext: str = ".webp", content_type: str = "image/webp") -> str:
        """Store a processed variant. Returns the object_key."""
        key = self.generate_variant_key(tier, content_hash, ext)
        self.store(key, data, content_type)
        return key

    def retrieve_variant(self, tier: str, content_hash: str, ext: str = ".webp") -> bytes:
        """Retrieve a variant by tier and content hash."""
        key = self.generate_variant_key(tier, content_hash, ext)
        return self.retrieve(key)

    def has_variant(self, tier: str, content_hash: str, ext: str = ".webp") -> bool:
        """Check whether a variant exists for the given tier and content hash."""
        key = self.generate_variant_key(tier, content_hash, ext)
        return self.exists(key)

    def delete_variant(self, tier: str, content_hash: str, ext: str = ".webp") -> bool:
        """Delete a single variant. Returns True if removed."""
        key = self.generate_variant_key(tier, content_hash, ext)
        return self.delete(key)

    def delete_all_variants(self, content_hash: str) -> int:
        """Remove all variants (thumbnail, preview, optimized) for a content hash. Returns count deleted."""
        count = 0
        for tier in ("thumbnail", "preview", "optimized"):
            for ext in (".webp", ""):
                if ext and self.delete_variant(tier, content_hash, ext):
                    count += 1
        return count

    def cleanup_orphans(self, storage_root: Optional[str] = None) -> int:
        """Remove files on disk that have no corresponding DB record. Returns count deleted."""
        from app.models import File
        objects_dir = os.path.join(self.storage_root, "objects")
        if not os.path.isdir(objects_dir):
            return 0

        db_keys: set[str] = set()
        for record in db.session.query(File.object_key).filter(File.is_deleted.is_(False)).all():
            db_keys.add(record[0])

        count = 0
        for root, dirs, files in os.walk(objects_dir):
            for fname in files:
                fpath = os.path.join(root, fname)
                rel_key = os.path.relpath(fpath, self.storage_root)
                if rel_key not in db_keys:
                    os.remove(fpath)
                    count += 1
                    self._cleanup_empty_parent(fpath)
        return count

    # ─── Storage info ──────────────────────────────────────────

    def get_storage_stats(self) -> dict[str, dict[str, int]]:
        """Walk objects/ and compute per-tier stats."""
        stats: dict[str, dict[str, int]] = {
            "original": {"count": 0, "bytes": 0},
            "thumbnail": {"count": 0, "bytes": 0},
            "preview": {"count": 0, "bytes": 0},
            "optimized": {"count": 0, "bytes": 0},
        }
        for tier in stats:
            tier_dir = os.path.join(self.storage_root, "objects", tier)
            if not os.path.isdir(tier_dir):
                continue
            for root, dirs, files in os.walk(tier_dir):
                for fname in files:
                    fpath = os.path.join(root, fname)
                    if os.path.isfile(fpath):
                        stats[tier]["count"] += 1
                        stats[tier]["bytes"] += os.path.getsize(fpath)
        return stats

    # ─── Internal helpers ──────────────────────────────────────

    def _cleanup_empty_parent(self, file_path: str) -> None:
        """Remove empty parent directories up to (but not including) storage_root."""
        parent = os.path.dirname(file_path)
        stop = self.storage_root
        while parent != stop and os.path.isdir(parent) and not os.listdir(parent):
            os.rmdir(parent)
            parent = os.path.dirname(parent)


class S3Provider(StorageProvider):
    """AWS S3 storage provider with full lifecycle management and circuit breaker."""

    def __init__(self, bucket: str, region: str = "us-east-1",
                 access_key_id: Optional[str] = None,
                 secret_access_key: Optional[str] = None) -> None:
        self.bucket = bucket
        self.region = region
        self.access_key_id = access_key_id
        self.secret_access_key = secret_access_key
        self._client: Any = None
        self._cb = CircuitBreaker(failure_threshold=5, recovery_timeout=60)

    def _get_client(self) -> Any:
        """Return a cached boto3 S3 client, creating it lazily on first call."""
        if self._client is None:
            import boto3
            kwargs: dict[str, str] = {"region_name": self.region}
            if self.access_key_id:
                kwargs["aws_access_key_id"] = self.access_key_id
            if self.secret_access_key:
                kwargs["aws_secret_access_key"] = self.secret_access_key
            self._client = boto3.client("s3", **kwargs)
        return self._client

    def store(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        """Upload *data* to S3 at *key* with server-side encryption."""
        def _op() -> str:
            client = self._get_client()
            client.put_object(
                Bucket=self.bucket, Key=key, Body=data, ContentType=content_type,
                ServerSideEncryption="AES256",
            )
            return key
        return self._cb.call(_op)

    def retrieve(self, key: str) -> bytes:
        """Download and return the raw bytes for *key* from S3."""
        def _op() -> bytes:
            client = self._get_client()
            response = client.get_object(Bucket=self.bucket, Key=key)
            return response["Body"].read()
        return self._cb.call(_op)

    def delete(self, key: str) -> bool:
        """Delete the object at *key* from S3. Returns True on success."""
        def _op() -> bool:
            client = self._get_client()
            client.delete_object(Bucket=self.bucket, Key=key)
            return True
        try:
            return self._cb.call(_op)
        except Exception:
            logger.warning("S3 delete failed for key=%s", key, exc_info=True)
            return False

    def exists(self, key: str) -> bool:
        """Check whether an object exists at *key* in S3."""
        def _op() -> bool:
            client = self._get_client()
            client.head_object(Bucket=self.bucket, Key=key)
            return True
        try:
            return self._cb.call(_op)
        except Exception:
            logger.debug("S3 exists check failed for key=%s", key)
            return False

    def size(self, key: str) -> int:
        """Return the ContentLength (in bytes) of the object at *key*."""
        def _op() -> int:
            client = self._get_client()
            response = client.head_object(Bucket=self.bucket, Key=key)
            return response.get("ContentLength", 0)
        return self._cb.call(_op)

    def presign_upload(self, key: str, content_type: str, expires_in: int = 3600) -> dict[str, Any]:
        """Generate a presigned PUT URL for uploading to *key*."""
        def _op() -> dict[str, Any]:
            client = self._get_client()
            expires_at = datetime.now(timezone.utc).timestamp() + expires_in
            upload_url = client.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": self.bucket,
                    "Key": key,
                    "ContentType": content_type,
                    "ServerSideEncryption": "AES256",
                },
                ExpiresIn=expires_in,
            )
            return {
                "enabled": True,
                "upload_url": upload_url,
                "object_key": key,
                "expires_at": datetime.fromtimestamp(expires_at, tz=timezone.utc).isoformat(),
            }
        return self._cb.call(_op)

    def presign_download(self, key: str, expires_in: int = 3600,
                         response_content_type: Optional[str] = None,
                         response_content_disposition: Optional[str] = None) -> str:
        """Generate a presigned GET URL for downloading *key*."""
        def _op() -> str:
            client = self._get_client()
            params: dict[str, Any] = {"Bucket": self.bucket, "Key": key}
            if response_content_type:
                params["ResponseContentType"] = response_content_type
            if response_content_disposition:
                params["ResponseContentDisposition"] = response_content_disposition
            return client.generate_presigned_url("get_object", Params=params, ExpiresIn=expires_in)
        return self._cb.call(_op)

    def create_multipart_upload(self, key: str, content_type: str) -> dict[str, Any]:
        """Create a multipart upload and return the UploadId."""
        def _op() -> dict[str, Any]:
            client = self._get_client()
            response = client.create_multipart_upload(
                Bucket=self.bucket,
                Key=key,
                ContentType=content_type,
                ServerSideEncryption="AES256",
            )
            return {
                "upload_id": response["UploadId"],
                "object_key": key,
            }
        return self._cb.call(_op)

    def complete_multipart_upload(self, key: str, upload_id: str, parts: list[dict]) -> dict[str, Any]:
        """Complete a multipart upload with the given parts."""
        def _op() -> dict[str, Any]:
            client = self._get_client()
            response = client.complete_multipart_upload(
                Bucket=self.bucket,
                Key=key,
                UploadId=upload_id,
                MultipartUpload={"Parts": parts},
            )
            return {
                "location": response.get("Location"),
                "etag": response.get("ETag"),
            }
        return self._cb.call(_op)

    def get_provider_name(self) -> str:
        """Return ``'aws_s3'``."""
        return "aws_s3"

    def enable_versioning(self) -> None:
        client = self._get_client()
        client.put_bucket_versioning(
            Bucket=self.bucket,
            VersioningConfiguration={"Status": "Enabled"}
        )

    def configure_object_lock(self) -> None:
        client = self._get_client()
        client.put_object_lock_configuration(
            Bucket=self.bucket,
            ObjectLockConfiguration={
                "ObjectLockEnabled": "Enabled",
                "Rule": {
                    "DefaultRetention": {
                        "Mode": "GOVERNANCE",
                        "Days": 30
                    }
                }
            }
        )

    def configure_lifecycle_rules(self) -> list[dict[str, Any]]:
        """Apply S3 lifecycle rules for temp cleanup, quarantine retention,
        deleted object cleanup, storage class transitions, and noncurrent version expiration."""
        client = self._get_client()
        rules: list[dict[str, Any]] = [
            {
                "ID": "gnovium-temp-cleanup",
                "Status": "Enabled",
                "Filter": {"Prefix": "v1/temp/"},
                "AbortIncompleteMultipartUpload": {"DaysAfterInitiation": 1},
                "Expiration": {"Days": 7},
            },
            {
                "ID": "gnovium-quarantine-retention",
                "Status": "Enabled",
                "Filter": {"Prefix": "v1/quarantine/"},
                "Expiration": {"Days": 30},
            },
            {
                "ID": "gnovium-deleted-object-cleanup",
                "Filter": {"Prefix": "v1/objects/"},
                "Status": "Enabled",
                "Expiration": {"ExpiredObjectDeleteMarker": True},
            },
            {
                "ID": "gnovium-glacier-transition",
                "Filter": {"Prefix": "v1/"},
                "Status": "Enabled",
                "Transitions": [
                    {"Days": 90, "StorageClass": "STANDARD_IA"},
                    {"Days": 180, "StorageClass": "GLACIER"},
                    {"Days": 365, "StorageClass": "DEEP_ARCHIVE"},
                ],
            },
            {
                "ID": "gnovium-noncurrent-expiration",
                "Filter": {"Prefix": "v1/"},
                "Status": "Enabled",
                "NoncurrentVersionExpiration": {"NoncurrentDays": 90},
            },
        ]
        client.put_bucket_lifecycle_configuration(
            Bucket=self.bucket,
            LifecycleConfiguration={"Rules": rules},
        )
        return rules


def create_storage_provider(config: dict[str, Any]) -> StorageProvider:
    """Factory function to create the appropriate storage provider.

    Returns ``S3Provider`` when ``GNOVIUM_MODE`` is ``'cloud'`` and an S3 bucket
    is configured; otherwise falls back to ``LocalProvider``.
    """
    mode = config.get("GNOVIUM_MODE", "cloud")
    s3_bucket = config.get("S3_BUCKET", "")
    if mode == "cloud" and s3_bucket:
        return S3Provider(
            bucket=s3_bucket,
            region=config.get("AWS_REGION", "us-east-1"),
            access_key_id=config.get("AWS_ACCESS_KEY_ID") or None,
            secret_access_key=config.get("AWS_SECRET_ACCESS_KEY") or None,
        )
    storage_root = config.get("STORAGE_ROOT")
    if not storage_root:
        from flask import current_app
        storage_root = os.path.join(current_app.instance_path, "objects")
    return LocalProvider(storage_root)
