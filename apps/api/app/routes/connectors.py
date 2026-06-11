from typing import Literal
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.db.queries import get_connector_stats
from auth.jwt_handler import require_auth

router = APIRouter(prefix="/connectors", tags=["connectors"])

_REGISTRY = [
    {
        "id": "http_ingest",
        "name": "HTTP Ingest",
        "source_type": "Built-in",
        "description": "Native REST endpoint for real-time log ingestion via POST /ingest.",
    },
    {
        "id": "nginx",
        "name": "NGINX Access Logs",
        "source_type": "File Tail",
        "description": "Tails nginx access.log in Combined Log Format via file watcher.",
    },
    {
        "id": "gcp",
        "name": "GCP Cloud Logging",
        "source_type": "Pull API",
        "description": "Streams logs from Google Cloud Logging via Pub/Sub subscription.",
    },
    {
        "id": "cloudflare",
        "name": "Cloudflare Logpush",
        "source_type": "Webhook",
        "description": "Receives Cloudflare HTTP request logs via Logpush webhook.",
    },
]


class ConnectorOut(BaseModel):
    id: str
    name: str
    source_type: str
    description: str
    status: Literal["active", "inactive", "unconfigured"]
    total_events: int
    last_event: str | None


@router.get("", response_model=list[ConnectorOut])
def list_connectors(_: str = Depends(require_auth)) -> list[ConnectorOut]:
    stats = get_connector_stats()
    out: list[ConnectorOut] = []
    for c in _REGISTRY:
        if c["id"] == "http_ingest":
            s: Literal["active", "inactive", "unconfigured"] = "active" if stats["total"] > 0 else "inactive"
            out.append(ConnectorOut(**c, status=s, total_events=stats["total"], last_event=stats["last_event"]))
        else:
            out.append(ConnectorOut(**c, status="unconfigured", total_events=0, last_event=None))
    return out
