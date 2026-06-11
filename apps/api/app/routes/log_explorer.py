from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.db.queries import search_log_entries
from app.types.models import LogEntry
from auth.jwt_handler import require_auth

router = APIRouter(prefix="/logs", tags=["logs"])


class LogSearchResponse(BaseModel):
    entries: list[LogEntry]
    total: int
    page: int
    limit: int


@router.get("/search", response_model=LogSearchResponse)
def log_search(
    q:            Annotated[str | None, Query()] = None,
    threat_level: Annotated[str | None, Query()] = None,
    status:       Annotated[str | None, Query()] = None,
    from_date:    Annotated[str | None, Query(alias="from")] = None,
    to_date:      Annotated[str | None, Query(alias="to")] = None,
    sort:         Annotated[str, Query()] = "timestamp",
    order:        Annotated[str, Query()] = "desc",
    page:         Annotated[int, Query(ge=1)] = 1,
    limit:        Annotated[int, Query(ge=1, le=200)] = 50,
    _:            str = Depends(require_auth),
) -> LogSearchResponse:
    valid_sorts = {"timestamp", "threat_score", "status_code"}
    entries, total = search_log_entries(
        q=q,
        threat_level=threat_level,
        status=status,
        from_date=from_date,
        to_date=to_date,
        sort=sort if sort in valid_sorts else "timestamp",
        order=order if order in ("asc", "desc") else "desc",
        page=page,
        limit=limit,
    )
    return LogSearchResponse(entries=entries, total=total, page=page, limit=limit)
