"""Top-level scheduler entry point. Delegates to app.scheduler."""
import os
import time

from app import create_app
from app.scheduler import init_scheduler, scheduler as _scheduler, shutdown_scheduler


def main():
    app = create_app()
    with app.app_context():
        init_scheduler(app)
        try:
            interval = int(os.getenv("SCHEDULER_INTERVAL_SECONDS", str(60 * 60)))
        except (ValueError, TypeError):
            interval = 60 * 60
        once = os.getenv("SCHEDULER_ONCE", "").lower() in {"1", "true", "yes"}
        try:
            while True:
                if once:
                    if _scheduler is not None:
                        for job in _scheduler.get_jobs():
                            job.func()
                    shutdown_scheduler()
                    break
                time.sleep(interval)
        except KeyboardInterrupt:
            shutdown_scheduler()


if __name__ == "__main__":
    main()
