from __future__ import annotations

import json
import os
from typing import Callable

import boto3

from app.core.logging import logger

RESUME_FILE = ".s3_migrate_progress.json"


def _load_progress(bucket: str, old_prefix: str) -> set[str]:
    path = RESUME_FILE
    if not os.path.exists(path):
        return set()
    try:
        with open(path, "r") as f:
            data = json.load(f)
        if data.get("bucket") == bucket and data.get("old_prefix") == old_prefix:
            return set(data.get("completed_keys", []))
    except (OSError, json.JSONDecodeError) as exc:
        logger.warning("s3_migrate.progress_load_failed", error=str(exc))
    return set()


def _save_progress(bucket: str, old_prefix: str, completed: set[str]) -> None:
    try:
        with open(RESUME_FILE, "w") as f:
            json.dump(
                {"bucket": bucket, "old_prefix": old_prefix, "completed_keys": sorted(completed)},
                f,
            )
    except Exception as exc:
        logger.error("s3_migrate.progress_save_failed", error=str(exc))


def _remove_progress_file() -> None:
    try:
        if os.path.exists(RESUME_FILE):
            os.remove(RESUME_FILE)
    except OSError as exc:
        logger.warning("s3_migrate.progress_remove_failed", error=str(exc))


def migrate_prefix(
    bucket: str,
    old_prefix: str,
    new_prefix: str,
    dry_run: bool = True,
    resume: bool = False,
    on_progress: Callable[[dict], None] | None = None,
) -> dict:
    s3 = boto3.client("s3")
    stats = {"migrated": 0, "skipped": 0, "errors": 0, "total_bytes": 0}
    continuation_token = None

    completed_keys: set[str] = set()
    if resume:
        completed_keys = _load_progress(bucket, old_prefix)
        if completed_keys:
            logger.info("s3_migrate.resuming", already_completed=len(completed_keys))

    while True:
        kwargs: dict = {"Bucket": bucket, "Prefix": old_prefix}
        if continuation_token:
            kwargs["ContinuationToken"] = continuation_token

        response = s3.list_objects_v2(**kwargs)
        contents = response.get("Contents", [])

        for obj in contents:
            key = obj["Key"]
            size = obj.get("Size", 0)
            dest_key = new_prefix + key[len(old_prefix) :]

            if key in completed_keys:
                stats["skipped"] += 1
                continue

            if dry_run:
                logger.info(
                    "s3_migrate.dry_run",
                    source=key,
                    destination=dest_key,
                    size=size,
                )
                stats["migrated"] += 1
                stats["total_bytes"] += size
                continue

            try:
                copy_source = {"Bucket": bucket, "Key": key}
                s3.copy_object(
                    Bucket=bucket,
                    CopySource=copy_source,
                    Key=dest_key,
                )
                s3.delete_object(Bucket=bucket, Key=key)
                stats["migrated"] += 1
                stats["total_bytes"] += size
                completed_keys.add(key)
            except Exception as exc:
                logger.error(
                    "s3_migrate.object_failed",
                    key=key,
                    error=str(exc),
                )
                stats["errors"] += 1
                continue

            total = stats["migrated"] + stats["errors"]
            if total % 100 == 0:
                _save_progress(bucket, old_prefix, completed_keys)
                logger.info(
                    "s3_migrate.progress",
                    migrated=stats["migrated"],
                    skipped=stats["skipped"],
                    errors=stats["errors"],
                    total_bytes=stats["total_bytes"],
                )
                if on_progress:
                    on_progress(dict(stats))

        if not response.get("IsTruncated"):
            break
        continuation_token = response.get("NextContinuationToken")

    if not dry_run:
        if stats["errors"] > 0:
            _save_progress(bucket, old_prefix, completed_keys)
        else:
            _remove_progress_file()

    logger.info("s3_migrate.complete", dry_run=dry_run, **stats)
    if on_progress:
        on_progress(dict(stats))
    return stats
