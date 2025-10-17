from __future__ import annotations

import logging
from typing import Any, Mapping

from fastapi import Request
from sqlalchemy.orm import Session

from app.db.models import AuditLog
from app.db.session import SessionLocal

logger = logging.getLogger(__name__)


def _extract_ip(request: Request | None) -> str | None:
    if not request or not request.client:
        return None
    return request.client.host


def _extract_user_agent(request: Request | None) -> str | None:
    if not request:
        return None
    return request.headers.get("user-agent")


def log_audit_event(
    db: Session | None,
    *,
    action: str,
    resource: str,
    request: Request | None,
    user_id: int | None = None,
    metadata: Mapping[str, Any] | None = None,
    use_separate_session: bool = False,
) -> None:
    """Persist an audit event while shielding callers from logging failures."""

    session: Session | None = None
    if use_separate_session or db is None:
        session = SessionLocal()
    else:
        session = db

    try:
        entry = AuditLog(
            user_id=user_id,
            action=action,
            resource=resource,
            ip_address=_extract_ip(request),
            user_agent=_extract_user_agent(request),
            metadata_json=dict(metadata) if metadata else None,
        )
        session.add(entry)
        if session is not db:
            session.commit()
    except Exception:  # pragma: no cover - logging failures shouldn't break flow
        if session is not db:
            session.rollback()
        logger.exception("Failed to write audit log", extra={"action": action, "resource": resource})
    finally:
        if session is not db:
            session.close()
