from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.db.server_queries import add_geo_block, delete_geo_block, list_geo_blocks
from auth.jwt_handler import require_admin, require_auth

router = APIRouter(prefix="/geo-blocks", tags=["geo-blocks"])


class GeoBlockCreate(BaseModel):
    country_code: str
    server_id: int | None = None


@router.get("", response_model=list[dict])
def get_geo_blocks(
    server_id: int | None = None,
    _: str = Depends(require_auth),
) -> list[dict]:
    return list_geo_blocks(server_id)


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_block(body: GeoBlockCreate, _: str = Depends(require_admin)) -> dict:
    if len(body.country_code) != 2:
        raise HTTPException(status_code=422, detail="country_code must be a 2-letter ISO code")
    return add_geo_block(body.country_code, body.server_id)


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_block(rule_id: int, _: str = Depends(require_admin)) -> None:
    if not delete_geo_block(rule_id):
        raise HTTPException(status_code=404, detail="Rule not found")
