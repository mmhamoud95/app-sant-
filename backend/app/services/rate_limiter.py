from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status

from app.config import settings
from app.infra.redis_client import get_redis_client

RATE_LIMIT_PREFIX = "ratelimit"


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def rate_limit(key: str, limit: int, window_seconds: int) -> None:
    if limit <= 0 or window_seconds <= 0:
        return

    try:
        client = get_redis_client()
    except Exception:
        # Redis unavailable; skip rate limiting to avoid blocking authentication completely.
        return

    namespaced_key = f"{RATE_LIMIT_PREFIX}:{key}"
    try:
        count = client.incr(namespaced_key)
        if count == 1:
            client.expire(namespaced_key, window_seconds)
        elif count > limit:
            # Ensure key expires even when already set to avoid indefinite growth.
            ttl = client.ttl(namespaced_key)
            if ttl == -1:
                client.expire(namespaced_key, window_seconds)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests",
            )
    except HTTPException:
        raise
    except Exception:
        # If Redis errors mid-operation, fail open to preserve login flow reliability.
        return


def rate_limit_login_attempt(ip: str | None, email: str | None) -> None:
    window_seconds = settings.login_rate_limit_window_seconds

    if ip:
        rate_limit(
            key=f"auth:login:ip:{ip}",
            limit=settings.login_rate_limit_per_ip,
            window_seconds=window_seconds,
        )

    if email:
        normalized = email.strip().lower()
        rate_limit(
            key=f"auth:login:email:{normalized}",
            limit=settings.login_rate_limit_per_email,
            window_seconds=window_seconds,
        )
