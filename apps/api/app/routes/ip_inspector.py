from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.db.queries import get_ip_profile
from app.types.models import LogEntry
from auth.jwt_handler import require_auth

router = APIRouter(tags=["ip"])


class IpProfileResponse(BaseModel):
    ip: str
    country: str | None
    total_requests: int
    first_seen: str
    last_seen: str
    avg_score: float
    max_score: float
    threat_types: list[str]
    requests: list[LogEntry]


@router.get("/ip/{ip}", response_model=IpProfileResponse)
async def ip_inspector(
    ip: str,
    _: str = Depends(require_auth),
) -> IpProfileResponse:
    profile = get_ip_profile(ip)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="IP not found")
    return IpProfileResponse(**profile)
