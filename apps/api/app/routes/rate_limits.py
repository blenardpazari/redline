from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.db.server_queries import block_ip, list_rate_blocks, unblock_ip
from auth.jwt_handler import require_admin, require_auth

router = APIRouter(prefix="/rate-limits", tags=["rate-limits"])


class ManualBlockCreate(BaseModel):
    ip: str
    server_id: int | None = None
    duration_minutes: int = 60
    reason: str = "manual"


@router.get("", response_model=list[dict])
def get_blocks(
    server_id: int | None = None,
    _: str = Depends(require_auth),
) -> list[dict]:
    return list_rate_blocks(server_id)


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_block(body: ManualBlockCreate, _: str = Depends(require_admin)) -> dict:
    block_ip(body.ip, body.server_id, body.duration_minutes, body.reason)
    blocks = list_rate_blocks(body.server_id)
    match = next((b for b in blocks if b["ip"] == body.ip), None)
    return match or {}


@router.delete("/{block_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_block(block_id: int, _: str = Depends(require_admin)) -> None:
    if not unblock_ip(block_id):
        raise HTTPException(status_code=404, detail="Block not found")
