from __future__ import annotations

from collections import defaultdict
from threading import Lock
from typing import Any, Dict


class MetricsRegistry:
    def __init__(self) -> None:
        self._lock = Lock()
        self._total_requests = 0
        self._requests_by_method: Dict[str, int] = defaultdict(int)
        self._requests_by_path: Dict[str, int] = defaultdict(int)
        self._requests_by_status: Dict[str, int] = defaultdict(int)
        self._latency_total_ms: float = 0.0
        self._latency_max_ms: float = 0.0

    def record_request(self, *, path: str, method: str, status_code: int, latency_ms: float) -> None:
        with self._lock:
            self._total_requests += 1
            self._requests_by_method[method] += 1
            self._requests_by_path[path] += 1
            self._requests_by_status[str(status_code)] += 1
            self._latency_total_ms += latency_ms
            if latency_ms > self._latency_max_ms:
                self._latency_max_ms = latency_ms

    def snapshot(self) -> Dict[str, Any]:
        with self._lock:
            average_latency = (self._latency_total_ms / self._total_requests) if self._total_requests else 0.0
            return {
                "total_requests": self._total_requests,
                "requests_by_method": dict(self._requests_by_method),
                "requests_by_path": dict(self._requests_by_path),
                "requests_by_status": dict(self._requests_by_status),
                "latency_ms": {
                    "average": round(average_latency, 3),
                    "max": round(self._latency_max_ms, 3),
                },
            }

    def reset(self) -> None:
        with self._lock:
            self._total_requests = 0
            self._requests_by_method.clear()
            self._requests_by_path.clear()
            self._requests_by_status.clear()
            self._latency_total_ms = 0.0
            self._latency_max_ms = 0.0


registry = MetricsRegistry()
