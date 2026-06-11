from typing import Annotated
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.db.queries import get_stats, get_threat_breakdown_data
from auth.jwt_handler import require_auth

router = APIRouter(prefix="/stats", tags=["stats"])

_RANGE_MAP = {"24h": "-24 hours", "7d": "-7 days", "30d": "-30 days"}


class BreakdownItem(BaseModel):
    threat_type: str
    count: int
    percent: float


class StatsResponse(BaseModel):
    requests_today: int
    anomalies_today: int
    redlines_today: int
    breakdown: list[BreakdownItem] | None = None
    top_path: str | None = None
    top_ip: str | None = None
    busiest_hour: int | None = None


@router.get("", response_model=StatsResponse)
def get_stats_route(
    period:    Annotated[str | None, Query(alias="range")] = None,
    server_id: Annotated[int | None, Query()] = None,
    _: str = Depends(require_auth),
) -> StatsResponse:
    base = get_stats(server_id=server_id)
    if period and period in _RANGE_MAP:
        extra = get_threat_breakdown_data(_RANGE_MAP[period], server_id=server_id)
        return StatsResponse(**base, **extra)
    return StatsResponse(**base)
