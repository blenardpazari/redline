from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.db.cf_queries import (
    create_cf_zone,
    delete_cf_zone,
    get_cf_zone,
    list_cf_zones,
    set_cf_zone_enabled,
    update_cf_zone_poll,
    update_cf_zone_token,
)
from app.db.server_queries import create_server, delete_server, get_server_by_id
from auth.jwt_handler import require_admin, require_auth

router = APIRouter(prefix="/sites", tags=["sites"])


class SiteCreate(BaseModel):
    name: str
    zone_id: str
    zone_name: str
    api_token: str


class SiteToggle(BaseModel):
    enabled: bool

class SiteUpdateToken(BaseModel):
    api_token: str


def _build_site(zone: dict) -> dict:
    return {
        "id": zone["id"],
        "server_id": zone["server_id"],
        "name": zone["zone_name"],
        "server_name": zone.get("server_name") or zone["zone_name"],
        "zone_id": zone["zone_id"],
        "zone_name": zone["zone_name"],
        "last_poll": zone["last_poll"],
        "total_pulled": zone["total_pulled"],
        "enabled": bool(zone["enabled"]),
        "created_at": zone["created_at"],
    }


@router.get("")
def list_sites(_: str = Depends(require_auth)) -> list[dict]:
    return [_build_site(z) for z in list_cf_zones()]


@router.post("", status_code=201)
def create_site(
    body: SiteCreate,
    _: str = Depends(require_admin),
) -> dict:
    if get_cf_zone(body.zone_id.strip()):
        raise HTTPException(409, "Zone already registered")

    server = create_server({
        "name": body.name.strip() or body.zone_name.strip(),
        "env": "production",
        "source_type": "cloudflare",
    })

    zone = create_cf_zone(
        server_id=server["id"],
        zone_id=body.zone_id.strip(),
        zone_name=body.zone_name.strip(),
        api_token=body.api_token.strip(),
    )
    return _build_site(zone)


@router.patch("/{site_id}/token")
def update_token(
    site_id: int,
    body: SiteUpdateToken,
    _: str = Depends(require_admin),
) -> dict:
    update_cf_zone_token(site_id, body.api_token.strip())
    return {"ok": True}


@router.patch("/{site_id}/toggle")
def toggle_site(
    site_id: int,
    body: SiteToggle,
    _: str = Depends(require_admin),
) -> dict:
    set_cf_zone_enabled(site_id, body.enabled)
    return {"ok": True}


@router.delete("/{site_id}", status_code=204)
def delete_site(
    site_id: int,
    _: str = Depends(require_admin),
) -> None:
    zones = list_cf_zones()
    zone = next((z for z in zones if z["id"] == site_id), None)
    if not zone:
        raise HTTPException(404, "Site not found")

    delete_cf_zone(site_id)
    delete_server(zone["server_id"])
