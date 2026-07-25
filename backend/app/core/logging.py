import logging
import os
import re

import structlog

_LOG_LEVELS = {
    "DEBUG": logging.DEBUG,
    "INFO": logging.INFO,
    "WARNING": logging.WARNING,
    "ERROR": logging.ERROR,
    "CRITICAL": logging.CRITICAL,
}

_SENSITIVE_KEYS = re.compile(
    r"(?i)(?<![a-zA-Z0-9])(password|passwd|secret|token|jwt|authorization|api_key|api_secret|access_key|private_key)(?![a-zA-Z0-9])"
)

_REDACTED = "***REDACTED***"


def _redact_sensitive(logger, method_name, event_dict):
    """Redact sensitive fields from log output."""
    redacted = {}
    for key, value in event_dict.items():
        if isinstance(key, str) and _SENSITIVE_KEYS.search(key):
            redacted[key] = _REDACTED
        elif isinstance(value, str) and _SENSITIVE_KEYS.search(value):
            redacted[key] = _REDACTED
        else:
            redacted[key] = value
    return redacted


def configure_logging():
    level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    level = _LOG_LEVELS.get(level_name)
    if level is None:
        import warnings
        warnings.warn(f"Unrecognized LOG_LEVEL '{level_name}', defaulting to INFO")
        level = logging.INFO
    logging.basicConfig(level=level, format="%(message)s")

    processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        _redact_sensitive,
    ]

    log_format = os.getenv("LOG_FORMAT", "json").lower()
    if log_format == "console":
        processors.append(structlog.dev.ConsoleRenderer())
    else:
        processors.append(structlog.processors.JSONRenderer())

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(level),
        cache_logger_on_first_use=True,
    )


logger = structlog.get_logger("gnovium")


def get_logger(name="gnovium"):
    return structlog.get_logger(name)
