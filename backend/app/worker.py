"""
Background job worker for GNOVIUM.

Runs a polling loop that picks up pending jobs from the job queue and processes
them via process_next_job(). This worker handles infrastructure-level retries
(polling recovery after crashes, DB outages). Job-level retries are managed by
JobRunner (retry_count / max_retries / dead_letter).

Worker Pool:
  To run multiple worker instances for higher throughput, start additional
  processes:  python worker.py  (each process runs its own polling loop).
  Concurrency is handled by SELECT ... FOR UPDATE SKIP LOCKED in the pipeline.
"""

from __future__ import annotations

import atexit
import signal
import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError
from typing import Optional

from flask import Flask

from app.core.logging import logger
from app.services.processing.job_runner import process_next_job


_flask_app: Optional[Flask] = None


def _run_with_context(fn):
    if _flask_app is not None:
        with _flask_app.app_context():
            return fn()
    return fn()

should_run: bool = True

JOB_TIMEOUT_SECONDS: int = 300

_executor = ThreadPoolExecutor(max_workers=1)
atexit.register(lambda: _executor.shutdown(wait=False))


def _handle_signal(signum: int, _frame) -> None:
    global should_run
    should_run = False
    logger.info("worker.shutdown_signal_received", signal=signum)


def run_worker(interval: float = 30.0) -> None:
    global should_run, _flask_app

    from flask import current_app
    _flask_app = current_app._get_current_object()

    signal.signal(signal.SIGINT, _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGALRM, signal.SIG_DFL)

    logger.info("worker.started", interval=interval)

    while should_run:
        try:
            future = _executor.submit(lambda: _run_with_context(process_next_job))
            result = future.result(timeout=JOB_TIMEOUT_SECONDS)
            if result is None:
                time.sleep(interval)
        except TimeoutError:
            logger.error("worker.job_timeout", timeout=JOB_TIMEOUT_SECONDS)
        except Exception as exc:
            logger.error("worker.poll_failed", error=str(exc))
            time.sleep(interval)

    logger.info("worker.stopped")


def _parse_args() -> dict:
    import argparse

    parser = argparse.ArgumentParser(description="GNOVIUM background worker")
    parser.add_argument("--interval", type=float, default=30.0, help="Poll interval in seconds")
    args = parser.parse_args()
    return {"interval": args.interval}


if __name__ == "__main__":
    kwargs = _parse_args()
    run_worker(**kwargs)
