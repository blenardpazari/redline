from fastapi import APIRouter, Depends, HTTPException, status as http_status
from pydantic import BaseModel
from typing import Any

from app.db.queries import (
    list_connectors, get_connector, insert_connector,
    update_connector, delete_connector,
)
from app.services.notify import test_connector
from auth.jwt_handler import require_admin, require_auth

router = APIRouter(prefix="/connectors", tags=["connectors"])


class ConnectorIn(BaseModel):
    name: str
    type: str
    config: dict[str, Any]
    enabled: bool = True


class ConnectorOut(BaseModel):
    id: int
    name: str
    type: str
    config: dict[str, Any]
    enabled: bool
    created_at: str


class TestIn(BaseModel):
    type: str
    config: dict[str, Any]


VALID_TYPES = {"slack", "telegram", "discord", "webhook", "email"}


def _validate_type(type_: str) -> None:
    if type_ not in VALID_TYPES:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown connector type '{type_}'. Valid: {sorted(VALID_TYPES)}",
        )


@router.get("", response_model=list[ConnectorOut])
def get_connectors(_: str = Depends(require_auth)):
    return list_connectors()


@router.post("", response_model=ConnectorOut, status_code=http_status.HTTP_201_CREATED)
def create_connector(body: ConnectorIn, _: str = Depends(require_admin)):
    _validate_type(body.type)
    return insert_connector(body.name, body.type, body.config, body.enabled)


@router.put("/{connector_id}", response_model=ConnectorOut)
def update_connector_route(connector_id: int, body: ConnectorIn, _: str = Depends(require_admin)):
    _validate_type(body.type)
    result = update_connector(connector_id, body.name, body.type, body.config, body.enabled)
    if not result:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Connector not found")
    return result


@router.delete("/{connector_id}", status_code=http_status.HTTP_204_NO_CONTENT)
def delete_connector_route(connector_id: int, _: str = Depends(require_admin)):
    if not delete_connector(connector_id):
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Connector not found")


@router.post("/test")
def test_connector_route(body: TestIn, _: str = Depends(require_admin)):
    _validate_type(body.type)
    try:
        test_connector(body.type, body.config)
    except Exception as exc:
        raise HTTPException(status_code=http_status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    return {"ok": True}
