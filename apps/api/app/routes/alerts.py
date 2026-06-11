from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.db.queries import get_alerts
from app.db.server_queries import acknowledge_alert, get_alerts_full
from app.types.models import Alert
from auth.jwt_handler import require_admin, require_auth

router = APIRouter(prefix="/alerts", tags=["alerts"])


class AckRequest(BaseModel):
    note: str = ""


class AlertFull(BaseModel):
    id: int
    created_at: str
    ip: str
    country: str | None
    threat_type: str
    score: float
    path: str
    email_sent: bool
    server_id: int | None = None
    acked_at: str | None = None
    acked_by: str | None = None
    ack_note: str | None = None


class AlertsFullResponse(BaseModel):
    alerts: list[AlertFull]
    total: int
    page: int
    limit: int


@router.get("", response_model=list[Alert])
def list_alerts(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    _: str = Depends(require_auth),
) -> list[Alert]:
    return get_alerts(limit, offset)


@router.get("/history", response_model=AlertsFullResponse)
def alert_history(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    server_id: int | None = Query(default=None),
    unacked_only: bool = Query(default=False),
    _: str = Depends(require_auth),
) -> AlertsFullResponse:
    rows, total = get_alerts_full(
        limit=limit,
        offset=(page - 1) * limit,
        server_id=server_id,
        unacked_only=unacked_only,
    )
    return AlertsFullResponse(
        alerts=[AlertFull(**r) for r in rows],
        total=total,
        page=page,
        limit=limit,
    )


@router.post("/{alert_id}/acknowledge", response_model=dict)
def ack_alert(
    alert_id: int,
    body: AckRequest,
    username: str = Depends(require_admin),
) -> dict:
    ok = acknowledge_alert(alert_id, acked_by=username, note=body.note)
    if not ok:
        raise HTTPException(status_code=404, detail="Alert not found or already acknowledged")
    return {"ok": True}
