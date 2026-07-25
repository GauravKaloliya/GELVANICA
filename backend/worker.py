"""Top-level worker entry point. Delegates to app.worker."""
from app import create_app
from app.worker import run_worker
import os


def main():
    app = create_app()
    with app.app_context():
        try:
            interval = float(os.getenv("WORKER_POLL_SECONDS", "5"))
        except (ValueError, TypeError):
            interval = 5.0
        run_worker(interval=interval)


if __name__ == "__main__":
    main()
