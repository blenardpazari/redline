"""CRUD routes for Cloudflare zone management."""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.db.cf_queries import (
    create_cf_zone,
    delete_cf_zone,
    get_cf_zone,
    list_cf_zones,
    set_cf_zone_enabled,
)
from app.db.server_queries import get_server_by_id
from auth.jwt_handler import require_admin, require_auth

router = APIRouter(prefix="/cloudflare", tags=["cloudflare"])


class ZoneCreate(BaseModel):
    server_id: int
    zone_id: str
    zone_name: str
    api_token: str


class ZoneToggle(BaseModel):
    enabled: bool


@router.get("/zones")
def zones_list(
    _: str = Depends(require_auth),
) -> list[dict]:
    return list_cf_zones()


@router.post("/zones", status_code=201)
def zones_create(
    body: ZoneCreate,
    _: Annotated[str, Depends(require_admin)],
) -> dict:
    srv = get_server_by_id(body.server_id)
    if not srv:
        raise HTTPException(404, "Server not found")

    existing = get_cf_zone(body.zone_id)
    if existing:
        raise HTTPException(409, "Zone already registered")

    return create_cf_zone(
        server_id=body.server_id,
        zone_id=body.zone_id.strip(),
        zone_name=body.zone_name.strip(),
        api_token=body.api_token.strip(),
    )


@router.patch("/zones/{zone_db_id}/toggle")
def zones_toggle(
    zone_db_id: int,
    body: ZoneToggle,
    _: Annotated[str, Depends(require_admin)],
) -> dict:
    set_cf_zone_enabled(zone_db_id, body.enabled)
    return {"ok": True}


@router.delete("/zones/{zone_db_id}", status_code=204)
def zones_delete(
    zone_db_id: int,
    _: Annotated[str, Depends(require_admin)],
) -> None:
    if not delete_cf_zone(zone_db_id):
        raise HTTPException(404, "Zone not found")
