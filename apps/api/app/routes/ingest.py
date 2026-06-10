from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from app.db.queries import insert_log_entry
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


@router.post("/ingest", response_model=IngestResponse)
async def ingest(
    body: IngestRequest,
    request: Request,
    _: str = Depends(require_auth),
) -> IngestResponse:
    cfg = get_config()

    try:
        entry_insert, threat = parse_and_score(body.raw, request.app.state.models)
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    entry_id = insert_log_entry(entry_insert)
    entry = LogEntry(
        id=entry_id,
        **{k: v for k, v in entry_insert.items() if k != "raw"},  # type: ignore[arg-type]
    )

    alert = process_alert(threat, ip=entry.ip, country=entry.country, path=entry.path, cfg=cfg)

    await broadcast_log(entry)
    if alert is not None:
        await broadcast_alert(alert)

    return IngestResponse(entry=entry, alert=alert)
