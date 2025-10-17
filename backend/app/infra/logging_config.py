from __future__ import annotations

import json
import logging
import logging.config
from datetime import datetime
from typing import Any, Dict

_logger_configured = False


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        if hasattr(record, "request_id"):
            payload["request_id"] = getattr(record, "request_id")
        if hasattr(record, "path"):
            payload["path"] = getattr(record, "path")
        if hasattr(record, "method"):
            payload["method"] = getattr(record, "method")
        if hasattr(record, "status_code"):
            payload["status_code"] = getattr(record, "status_code")
        if hasattr(record, "latency_ms"):
            payload["latency_ms"] = getattr(record, "latency_ms")
        return json.dumps(payload, ensure_ascii=False)


def configure_logging() -> None:
    global _logger_configured
    if _logger_configured:
        return

    logging_config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "json": {
                "()": JsonFormatter,
            }
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "json",
                "level": "INFO",
            }
        },
        "loggers": {
            "": {"handlers": ["console"], "level": "INFO"},
            "uvicorn": {"handlers": ["console"], "level": "INFO", "propagate": False},
            "uvicorn.error": {"handlers": ["console"], "level": "INFO", "propagate": False},
            "uvicorn.access": {"handlers": ["console"], "level": "INFO", "propagate": False},
        },
    }

    logging.config.dictConfig(logging_config)
    _logger_configured = True
