from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.db.server_queries import (
    create_server,
    delete_server,
    get_server_by_id,
    get_server_stats,
    list_servers,
    rotate_server_key,
    update_server,
)
from auth.jwt_handler import require_admin, require_auth

router = APIRouter(prefix="/servers", tags=["servers"])

_SOURCE_TYPES = {"cloudpanel"}
_ENVS = {"production", "staging", "dev"}

_SETUP_INSTRUCTIONS: dict[str, dict] = {
    "cloudpanel": {
        "title": "CloudPanel Agent Setup",
        "steps": [
            "1. SSH into your CloudPanel server.",
            "2. Copy redline-agent.py to the server (e.g. /root/redline-agent.py).",
            "3. Find your log paths:",
            "ls /home/*/logs/nginx/",
            "4. Run the agent:",
            "nohup env REDLINE_URL=https://your-redline-host REDLINE_KEY={api_key} python3 /root/redline-agent.py > /var/log/redline-agent.log 2>&1 &",
        ],
    },
}


class ServerCreate(BaseModel):
    name: str
    env: str = "production"
    source_type: str


class ServerUpdate(BaseModel):
    name: str | None = None
    env: str | None = None
    source_type: str | None = None


@router.get("", response_model=list[dict])
def get_servers(_: str = Depends(require_auth)) -> list[dict]:
    return list_servers()


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
def create(body: ServerCreate, _: str = Depends(require_admin)) -> dict:
    if body.source_type not in _SOURCE_TYPES:
        raise HTTPException(status_code=422, detail=f"source_type must be one of: {sorted(_SOURCE_TYPES)}")
    if body.env not in _ENVS:
        raise HTTPException(status_code=422, detail=f"env must be one of: {sorted(_ENVS)}")
    server = create_server({"name": body.name, "env": body.env, "source_type": body.source_type})
    server["setup"] = _build_setup(server["source_type"], server["api_key"])
    return server


@router.get("/{server_id}", response_model=dict)
def get_server(server_id: int, _: str = Depends(require_auth)) -> dict:
    server = get_server_by_id(server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    server["setup"] = _build_setup(server["source_type"], server["api_key"])
    return server


@router.patch("/{server_id}", response_model=dict)
def patch_server(server_id: int, body: ServerUpdate, _: str = Depends(require_admin)) -> dict:
    if not get_server_by_id(server_id):
        raise HTTPException(status_code=404, detail="Server not found")
    updated = update_server(server_id, body.model_dump(exclude_none=True))
    return updated or {}


@router.delete("/{server_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_server(server_id: int, _: str = Depends(require_admin)) -> None:
    if not delete_server(server_id):
        raise HTTPException(status_code=404, detail="Server not found")


@router.post("/{server_id}/rotate-key", response_model=dict)
def rotate_key(server_id: int, _: str = Depends(require_admin)) -> dict:
    new_key = rotate_server_key(server_id)
    if not new_key:
        raise HTTPException(status_code=404, detail="Server not found")
    return {"api_key": new_key}


@router.get("/{server_id}/stats", response_model=dict)
def server_stats(server_id: int, _: str = Depends(require_auth)) -> dict:
    if not get_server_by_id(server_id):
        raise HTTPException(status_code=404, detail="Server not found")
    return get_server_stats(server_id)


def _build_setup(source_type: str, api_key: str) -> dict:
    tmpl = _SETUP_INSTRUCTIONS.get(source_type, {"title": "Custom Setup", "steps": []})
    return {
        "title": tmpl["title"],
        "steps": [s.replace("{api_key}", api_key) for s in tmpl["steps"]],
    }
