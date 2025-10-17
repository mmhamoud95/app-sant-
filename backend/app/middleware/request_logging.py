from __future__ import annotations

import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.services.metrics import registry

logger = logging.getLogger("app.request")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = str(uuid.uuid4())
        start = time.perf_counter()
        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception:  # pragma: no cover - ensure logging on unexpected errors
            duration_ms = (time.perf_counter() - start) * 1000
            logger.exception(
                "request failed",
                extra={
                    "request_id": request_id,
                    "path": request.url.path,
                    "method": request.method,
                    "status_code": 500,
                    "latency_ms": round(duration_ms, 3),
                },
            )
            registry.record_request(
                path=request.url.path,
                method=request.method,
                status_code=500,
                latency_ms=duration_ms,
            )
            raise

        duration_ms = (time.perf_counter() - start) * 1000
        logger.info(
            "request completed",
            extra={
                "request_id": request_id,
                "path": request.url.path,
                "method": request.method,
                "status_code": status_code,
                "latency_ms": round(duration_ms, 3),
            },
        )
        registry.record_request(
            path=request.url.path,
            method=request.method,
            status_code=status_code,
            latency_ms=duration_ms,
        )
        response.headers["X-Request-ID"] = request_id
        return response
