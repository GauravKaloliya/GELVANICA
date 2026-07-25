from __future__ import annotations

import math
import threading
import time
from collections import defaultdict

from app.core.constants import METRICS_MAX_DURATION_SAMPLES


class MetricsCollector:
    def __init__(self, max_duration_samples: int = METRICS_MAX_DURATION_SAMPLES) -> None:
        self._lock = threading.Lock()
        self._request_count: dict[str, int] = defaultdict(int)
        self._request_duration: list[float] = []
        self._max_duration_samples = max_duration_samples
        self._error_count: dict[str, int] = defaultdict(int)
        self._active_connections: int = 0
        self._start_time: float = time.time()

    def record_request(
        self, method: str, path: str, status_code: int, duration: float
    ) -> None:
        key = f"{method} {path} {status_code}"
        with self._lock:
            self._request_count[key] += 1
            self._request_duration.append(duration)
            if len(self._request_duration) > self._max_duration_samples:
                self._request_duration = self._request_duration[-self._max_duration_samples:]

    def record_error(self, error_type: str) -> None:
        with self._lock:
            self._error_count[error_type] += 1

    def increment_connections(self) -> None:
        with self._lock:
            self._active_connections += 1

    def decrement_connections(self) -> None:
        with self._lock:
            self._active_connections = max(0, self._active_connections - 1)

    @staticmethod
    def _percentile(sorted_data: list[float], pct: float) -> float:
        if not sorted_data:
            return 0.0
        k = (len(sorted_data) - 1) * pct
        f = math.floor(k)
        c = math.ceil(k)
        if f == c:
            return sorted_data[int(k)]
        d0 = sorted_data[int(f)] * (c - k)
        d1 = sorted_data[int(c)] * (k - f)
        return d0 + d1

    def get_metrics(self) -> dict:
        with self._lock:
            durations = sorted(self._request_duration)
            return {
                "uptime_seconds": time.time() - self._start_time,
                "total_requests": sum(self._request_count.values()),
                "request_count_by_key": dict(self._request_count),
                "request_duration": {
                    "p50": self._percentile(durations, 0.50),
                    "p95": self._percentile(durations, 0.95),
                    "p99": self._percentile(durations, 0.99),
                    "min": durations[0] if durations else 0.0,
                    "max": durations[-1] if durations else 0.0,
                    "avg": sum(durations) / len(durations) if durations else 0.0,
                    "count": len(durations),
                },
                "error_count_by_type": dict(self._error_count),
                "total_errors": sum(self._error_count.values()),
                "active_connections": self._active_connections,
            }

    def reset(self) -> None:
        with self._lock:
            self._request_count.clear()
            self._request_duration.clear()
            self._error_count.clear()
            self._active_connections = 0
            self._start_time = time.time()

    def get_db_pool_status(self) -> dict:
        try:
            from app.extensions import db

            pool = db.engine.pool
            return {
                "size": pool.size(),
                "checked_in": pool.checkedin(),
                "checked_out": pool.checkedout(),
                "overflow": pool.overflow(),
            }
        except Exception:
            return {"error": "unable to retrieve pool status"}


    def export_prometheus(self) -> str:
        _BUCKETS = [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
        with self._lock:
            lines = []
            lines.append("# HELP gnovium_requests_total Total request count")
            lines.append("# TYPE gnovium_requests_total counter")
            for key, count in self._request_count.items():
                method, path, status = key.rsplit(" ", 2)
                lines.append(f'gnovium_requests_total{{method="{method}",path="{path}",status="{status}"}} {count}')
            lines.append("# HELP gnovium_request_duration_seconds Request duration histogram")
            lines.append("# TYPE gnovium_request_duration_seconds histogram")
            durations = self._request_duration
            n = len(durations)
            bucket_counts = {b: sum(1 for d in durations if d <= b) for b in _BUCKETS}
            for b in _BUCKETS:
                lines.append(f'gnovium_request_duration_seconds_bucket{{le="{b}"}} {bucket_counts[b]}')
            lines.append(f'gnovium_request_duration_seconds_bucket{{le="+Inf"}} {n}')
            lines.append(f'gnovium_request_duration_seconds_count {n}')
            lines.append(f'gnovium_request_duration_seconds_sum {sum(durations)}')
            lines.append("# HELP gnovium_errors_total Total error count")
            lines.append("# TYPE gnovium_errors_total counter")
            for etype, count in self._error_count.items():
                lines.append(f'gnovium_errors_total{{type="{etype}"}} {count}')
            lines.append("# HELP gnovium_active_connections Active connections")
            lines.append("# TYPE gnovium_active_connections gauge")
            lines.append(f"gnovium_active_connections {self._active_connections}")
            lines.append("# HELP gnovium_uptime_seconds Uptime")
            lines.append("# TYPE gnovium_uptime_seconds gauge")
            lines.append(f"gnovium_uptime_seconds {time.time() - self._start_time}")
            return "\n".join(lines) + "\n"


metrics = MetricsCollector()
