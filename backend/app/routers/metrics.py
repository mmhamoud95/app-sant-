from fastapi import APIRouter, Depends

from app.auth.dependencies import get_current_admin
from app.services.metrics import registry

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("", dependencies=[Depends(get_current_admin)])
def get_metrics():
    """Expose basic operational metrics. Requires admin access."""
    return registry.snapshot()
