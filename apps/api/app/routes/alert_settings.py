from fastapi import APIRouter, Depends, HTTPException, status as http_status
from pydantic import BaseModel, Field

from app.db.queries import get_effective_settings, upsert_settings
from app.services.email_sender import send_test_alert
from auth.jwt_handler import require_auth
from config import get_config

router = APIRouter(prefix="/settings", tags=["settings"])


class AlertSettingsIn(BaseModel):
    critical_threshold: float = Field(ge=70, le=100)
    warning_threshold: float = Field(ge=50, le=90)
    cooldown_minutes: int = Field(ge=1, le=1440)
    email_enabled: bool
    email_recipient: str


class AlertSettingsOut(BaseModel):
    critical_threshold: float
    warning_threshold: float
    cooldown_minutes: int
    email_enabled: bool
    email_recipient: str


@router.get("", response_model=AlertSettingsOut)
def get_settings(_: str = Depends(require_auth)) -> AlertSettingsOut:
    return AlertSettingsOut(**get_effective_settings())


@router.post("", response_model=AlertSettingsOut)
def save_settings(body: AlertSettingsIn, _: str = Depends(require_auth)) -> AlertSettingsOut:
    upsert_settings(body.model_dump())
    return AlertSettingsOut(**get_effective_settings())


@router.post("/test-email")
def test_email(_: str = Depends(require_auth)) -> dict[str, bool]:
    cfg = get_config()
    settings = get_effective_settings()
    recipient = settings["email_recipient"] or cfg.alert_email_to
    if not recipient:
        raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail="No recipient email configured")
    try:
        send_test_alert(cfg, recipient)
    except Exception as exc:
        raise HTTPException(status_code=http_status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    return {"ok": True}
