from datetime import datetime, timezone

from app.db.queries import AlertInsert, check_alert_cooldown, get_effective_settings, insert_alert
from app.services.email_sender import send_critical_alert
from app.services.notify import fire_connectors
from app.types.models import Alert, ThreatScore
from config import AppConfig


def process(
    threat: ThreatScore,
    ip: str,
    country: str | None,
    path: str,
    cfg: AppConfig,
    server_id: int | None = None,
) -> Alert | None:
    settings = get_effective_settings()

    if threat.final_score < settings["warning_threshold"]:
        return None

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    should_email = (
        bool(settings["email_enabled"])
        and threat.final_score >= settings["critical_threshold"]
        and not check_alert_cooldown(ip, settings["cooldown_minutes"])
    )

    alert_insert = AlertInsert(
        created_at=now,
        ip=ip,
        country=country,
        threat_type=threat.threat_type,
        score=threat.final_score,
        path=path,
        email_sent=should_email,
    )

    alert_id = insert_alert(alert_insert, server_id=server_id)

    if should_email:
        recipient = settings["email_recipient"] or cfg.alert_email_to
        send_critical_alert(
            cfg,
            ip=ip,
            country=country,
            threat_type=threat.threat_type,
            score=threat.final_score,
            path=path,
            timestamp=now,
            recipient=recipient,
        )

    fire_connectors(
        ip=ip,
        country=country,
        threat_type=threat.threat_type,
        score=threat.final_score,
        path=path,
        timestamp=now,
    )

    return Alert(
        id=alert_id,
        created_at=now,
        ip=ip,
        country=country,
        threat_type=threat.threat_type,
        score=threat.final_score,
        path=path,
        email_sent=should_email,
    )
