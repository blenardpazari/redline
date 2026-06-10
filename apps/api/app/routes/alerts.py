from fastapi import APIRouter, Depends, Query

from app.db.queries import get_alerts
from app.types.models import Alert
from auth.jwt_handler import require_auth

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=list[Alert])
def list_alerts(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    _: str = Depends(require_auth),
) -> list[Alert]:
    return get_alerts(limit, offset)
