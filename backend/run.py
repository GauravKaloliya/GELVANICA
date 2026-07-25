import os
import signal
import sys

from app import create_app
from app.core.logging import logger

if __name__ == "__main__":
    app = create_app()

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "5000"))
    debug = os.getenv("FLASK_DEBUG", "0").lower() in {"1", "true", "yes"}

    if os.getenv("GNOVIUM_MODE") == "cloud" and not debug:
        try:
            import gunicorn  # noqa: F401
            logger.warning(
                "production_mode_no_gunicorn",
                message="Production mode: run with gunicorn instead",
                command=f"gunicorn -w 4 -b {host}:{port} 'app:create_app()'",
                fallback="Flask dev server",
            )
        except ImportError:
            pass

    def _shutdown_handler(signum, frame):
        logger.info("server.shutdown_signal_received", signal=signum)
        sys.exit(0)

    signal.signal(signal.SIGTERM, _shutdown_handler)
    signal.signal(signal.SIGINT, _shutdown_handler)

    logger.info("server.starting", host=host, port=port, debug=debug)
    app.run(host=host, port=port, debug=debug)
