import json

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel

from app.db.queries import insert_log_entry
from app.db.server_queries import get_server_by_api_key, touch_server_last_seen
from app.services.alert_engine import process as process_alert
from app.services.ingestion import parse_and_score
from app.types.models import Alert, LogEntry
from auth.jwt_handler import require_auth
from config import get_config
from ws.stream import broadcast_alert, broadcast_log

router = APIRouter(tags=["ingest"])


class IngestRequest(BaseModel):
    raw: str


class IngestResponse(BaseModel):
    entry: LogEntry
    alert: Alert | None


def _resolve_server(api_key: str | None) -> dict | None:
    if not api_key:
        return None
    return get_server_by_api_key(api_key)


@router.post("/ingest", response_model=IngestResponse)
async def ingest(
    body: IngestRequest,
    request: Request,
    x_api_key: str | None = Header(default=None),
    _: str = Depends(require_auth),
) -> IngestResponse:
    cfg = get_config()

    server = _resolve_server(x_api_key)
    server_id: int | None = server["id"] if server else None

    try:
        entry_insert, threat = parse_and_score(body.raw, request.app.state.models)
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    entry_insert["server_id"] = server_id  # type: ignore[typeddict-unknown-key]
    entry_id = insert_log_entry(entry_insert)
    entry = LogEntry(
        id=entry_id,
        **{k: v for k, v in entry_insert.items() if k not in ("raw", "server_id")},  # type: ignore[arg-type]
    )

    if server_id is not None:
        touch_server_last_seen(server_id)

    alert = process_alert(
        threat,
        ip=entry.ip,
        country=entry.country,
        path=entry.path,
        cfg=cfg,
        server_id=server_id,
    )

    await broadcast_log(entry)
    if alert is not None:
        await broadcast_alert(alert)

    return IngestResponse(entry=entry, alert=alert)


@router.post("/ingest/webhook/{api_key}", response_model=IngestResponse)
async def ingest_webhook(
    api_key: str,
    body: IngestRequest,
    request: Request,
) -> IngestResponse:
    server = get_server_by_api_key(api_key)
    if not server:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")

    server_id: int = server["id"]

    try:
        entry_insert, threat = parse_and_score(body.raw, request.app.state.models)
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    entry_insert["server_id"] = server_id  # type: ignore[typeddict-unknown-key]
    entry_id = insert_log_entry(entry_insert)
    entry = LogEntry(
        id=entry_id,
        **{k: v for k, v in entry_insert.items() if k not in ("raw", "server_id")},  # type: ignore[arg-type]
    )

    touch_server_last_seen(server_id)
    cfg = get_config()
    alert = process_alert(threat, ip=entry.ip, country=entry.country, path=entry.path, cfg=cfg, server_id=server_id)

    await broadcast_log(entry)
    if alert is not None:
        await broadcast_alert(alert)

    return IngestResponse(entry=entry, alert=alert)
