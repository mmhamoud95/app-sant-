from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.session import get_db
from app.infra.redis_client import get_redis_client


router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
def healthcheck(db: Session = Depends(get_db)):
    # DB check: simple SELECT 1
    db.execute(text("SELECT 1"))

    # Redis check
    redis_status = "ok"
    try:
        r = get_redis_client()
        pong = r.ping()
        if not pong:
            redis_status = "fail"
    except Exception:
        redis_status = "fail"

    status = "ok" if redis_status == "ok" else "degraded"
    return {"status": status, "db": "ok", "redis": redis_status}
