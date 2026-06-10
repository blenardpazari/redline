from fastapi import APIRouter, Depends

from app.db.queries import get_stats
from app.types.models import Stats
from auth.jwt_handler import require_auth

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("", response_model=Stats)
def get_stats_route(_: str = Depends(require_auth)) -> Stats:
    return Stats(**get_stats())
