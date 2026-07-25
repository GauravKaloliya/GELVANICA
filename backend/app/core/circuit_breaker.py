import time
import threading
from enum import Enum
from functools import wraps
from typing import Any, Callable


class CircuitOpenError(Exception):
    pass


class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class CircuitBreaker:
    def __init__(self, failure_threshold: int = 5, recovery_timeout: int = 60) -> None:
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._last_failure_time: float | None = None
        self._lock = threading.Lock()

    @property
    def state(self) -> CircuitState:
        return self._state

    @property
    def failure_count(self) -> int:
        return self._failure_count

    @property
    def success_count(self) -> int:
        return self._success_count

    @property
    def last_failure_time(self) -> float | None:
        return self._last_failure_time

    def call(self, func: Callable, *args: Any, **kwargs: Any) -> Any:
        with self._lock:
            if self._state is CircuitState.OPEN:
                if (
                    self._last_failure_time is not None
                    and (time.monotonic() - self._last_failure_time) >= self.recovery_timeout
                ):
                    self._state = CircuitState.HALF_OPEN
                else:
                    raise CircuitOpenError(
                        f"Circuit is open. Retry after {self.recovery_timeout}s."
                    )

        try:
            result = func(*args, **kwargs)
        except Exception:
            with self._lock:
                self._last_failure_time = time.monotonic()
                if self._state is CircuitState.HALF_OPEN:
                    self._state = CircuitState.OPEN
                else:
                    self._failure_count += 1
                    if self._failure_count >= self.failure_threshold:
                        self._state = CircuitState.OPEN
            raise

        with self._lock:
            if self._state is CircuitState.HALF_OPEN:
                self._state = CircuitState.CLOSED
                self._failure_count = 0
                self._success_count += 1
            elif self._state is CircuitState.CLOSED:
                self._failure_count = 0
                self._success_count += 1

        return result


def circuit_breaker(failure_threshold: int = 5, recovery_timeout: int = 60) -> Callable:
    def decorator(func: Callable) -> Callable:
        cb = CircuitBreaker(
            failure_threshold=failure_threshold,
            recovery_timeout=recovery_timeout,
        )

        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            return cb.call(func, *args, **kwargs)

        wrapper.circuit_breaker = cb
        return wrapper

    return decorator
