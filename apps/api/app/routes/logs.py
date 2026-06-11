from fastapi import APIRouter, Depends, Query

from app.db.queries import get_log_entries
from app.types.models import LogEntry
from auth.jwt_handler import require_auth

router = APIRouter(prefix="/logs", tags=["logs"])


@router.get("", response_model=list[LogEntry])
def list_logs(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    server_id: int | None = Query(default=None),
    _: str = Depends(require_auth),
) -> list[LogEntry]:
    return get_log_entries(limit, offset, server_id=server_id)
