from __future__ import annotations

import atexit
from typing import Any, Callable, Optional

from apscheduler.schedulers.background import BackgroundScheduler
from flask import Flask, current_app

from app.core.logging import logger
from app.repositories.domain import JobRepository

scheduler: BackgroundScheduler | None = None
_flask_app: Optional[Flask] = None


def _with_app_context(func: Callable) -> Callable:
    """Decorator that wraps a function with Flask app context."""
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        if _flask_app is not None:
            with _flask_app.app_context():
                return func(*args, **kwargs)
        return func(*args, **kwargs)
    wrapper.__name__ = func.__name__
    wrapper.__qualname__ = func.__qualname__
    return wrapper


@_with_app_context
def _reset_stale_jobs() -> None:
    from app.extensions import db

    if current_app.config.get("GNOVIUM_MODE") != "cloud":
        return
    try:
        repo = JobRepository()
        stale = repo.find_stale_running()
        for job in stale:
            repo.reset_stale(job)
        if stale:
            db.session.commit()
            logger.info("scheduler.stale_jobs_reset", count=len(stale))
    except Exception as exc:
        db.session.rollback()
        logger.error("scheduler.stale_jobs_reset_failed", error=str(exc))


@_with_app_context
def _cleanup_pending_uploads() -> None:
    try:
        from app.services.file_service import FileService

        FileService().cleanup_expired_pending()
        logger.info("scheduler.pending_uploads_cleanup_complete")
    except Exception as exc:
        logger.error("scheduler.pending_uploads_cleanup_failed", error=str(exc))


@_with_app_context
def _cleanup_orphans() -> None:
    try:
        from app.services.file_service import FileService

        FileService().cleanup_orphans()
        logger.info("scheduler.orphan_cleanup_complete")
    except Exception as exc:
        logger.error("scheduler.orphan_cleanup_failed", error=str(exc))


@_with_app_context
def _cleanup_quarantine() -> None:
    try:
        from app.services.file_service import FileService

        FileService().cleanup_expired_quarantine()
        logger.info("scheduler.quarantine_cleanup_complete")
    except Exception as exc:
        logger.error("scheduler.quarantine_cleanup_failed", error=str(exc))


@_with_app_context
def _cleanup_deleted() -> None:
    try:
        from app.services.file_service import FileService

        FileService().cleanup_deleted_files()
        logger.info("scheduler.deleted_cleanup_complete")
    except Exception as exc:
        logger.error("scheduler.deleted_cleanup_failed", error=str(exc))


@_with_app_context
def _run_pending_jobs() -> None:
    try:
        if current_app.config.get("GNOVIUM_MODE") != "cloud":
            return
        _reset_stale_jobs()
        from app.services.processing.job_runner import _get_default_runner

        _get_default_runner().run_pending_jobs()
        logger.info("scheduler.pending_jobs_run_complete")
    except Exception as exc:
        logger.error("scheduler.pending_jobs_run_failed", error=str(exc))


@_with_app_context
def _cleanup_export_files() -> None:
    try:
        import os
        import time

        retention_days = current_app.config.get("BACKUP_RETENTION_DAYS", 30)
        cutoff = time.time() - (retention_days * 86400)
        removed = 0

        for subdir in ("zip", "json", "pdf"):
            export_dir = os.path.join(current_app.instance_path, "exports", subdir)
            if not os.path.isdir(export_dir):
                continue
            for fname in os.listdir(export_dir):
                fpath = os.path.join(export_dir, fname)
                if not os.path.isfile(fpath):
                    continue
                mtime = os.path.getmtime(fpath)
                if mtime < cutoff and time.time() - mtime > 3600:
                    try:
                        os.remove(fpath)
                        removed += 1
                        logger.info("scheduler.export_file_removed", filename=fname, subdir=subdir)
                    except OSError:
                        pass

        logger.info("scheduler.export_cleanup_complete", removed=removed, retention_days=retention_days)
    except Exception as exc:
        logger.error("scheduler.export_cleanup_failed", error=str(exc))


@_with_app_context
def _cleanup_expired_materializations() -> None:
    from app.extensions import db

    try:
        from app.models import Workspace
        from app.services.graph_service import GraphService

        workspaces = db.session.query(Workspace).all()
        graph_service = GraphService()
        total = 0
        for ws in workspaces:
            total += graph_service.cleanup_old_materializations(ws.id, keep=10)
        if total:
            logger.info("scheduler.expired_materializations_removed", count=total)
        else:
            logger.info("scheduler.expired_materializations_cleanup_complete")
    except Exception as exc:
        logger.error("scheduler.expired_materializations_cleanup_failed", error=str(exc))


@_with_app_context
def _materialize_graph() -> None:
    from app.extensions import db

    try:
        from app.models import Workspace
        from app.services.graph_service import GraphService

        workspaces = db.session.query(Workspace).all()
        graph_service = GraphService()
        for ws in workspaces:
            graph_service.materialize(ws.id)
        logger.info("scheduler.graph_materialized", workspace_count=len(workspaces))
    except Exception as exc:
        logger.error("scheduler.graph_materialize_failed", error=str(exc))


def init_scheduler(app: Flask) -> BackgroundScheduler:
    global scheduler, _flask_app

    _flask_app = app
    scheduler = BackgroundScheduler(daemon=False)

    scheduler.add_job(
        _reset_stale_jobs,
        "interval",
        minutes=5,
        id="reset_stale_jobs",
        replace_existing=True,
    )
    scheduler.add_job(
        _cleanup_orphans,
        "interval",
        hours=6,
        id="cleanup_orphans",
        replace_existing=True,
    )
    scheduler.add_job(
        _cleanup_quarantine,
        "interval",
        days=1,
        id="cleanup_quarantine",
        replace_existing=True,
    )
    scheduler.add_job(
        _cleanup_deleted,
        "interval",
        days=1,
        id="cleanup_deleted",
        replace_existing=True,
    )
    scheduler.add_job(
        _run_pending_jobs,
        "interval",
        minutes=5,
        id="run_pending_jobs",
        replace_existing=True,
    )
    scheduler.add_job(
        _cleanup_pending_uploads,
        "interval",
        hours=1,
        id="cleanup_pending_uploads",
        replace_existing=True,
    )
    scheduler.add_job(
        _materialize_graph,
        "interval",
        minutes=30,
        id="materialize_graph",
        replace_existing=True,
    )
    scheduler.add_job(
        _cleanup_expired_materializations,
        "interval",
        hours=6,
        id="cleanup_expired_materializations",
        replace_existing=True,
    )
    scheduler.add_job(
        _cleanup_export_files,
        "interval",
        days=1,
        id="cleanup_export_files",
        replace_existing=True,
    )

    scheduler.start()
    atexit.register(lambda: shutdown_scheduler())

    logger.info("scheduler.initialized")
    return scheduler


def shutdown_scheduler(wait: bool = True) -> None:
    global scheduler
    if scheduler is not None:
        scheduler.shutdown(wait=wait)
        scheduler = None
        logger.info("scheduler.shutdown")
