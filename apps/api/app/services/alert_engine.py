from datetime import datetime, timezone

from app.db.queries import AlertInsert, check_alert_cooldown, insert_alert
from app.services.email_sender import send_critical_alert
from app.types.models import Alert, ThreatScore
from config import AppConfig


def process(
    threat: ThreatScore,
    ip: str,
    country: str | None,
    path: str,
    cfg: AppConfig,
) -> Alert | None:
    if threat.final_score < 70:
        return None

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    should_email = (
        threat.final_score >= cfg.redline_threshold
        and not check_alert_cooldown(ip, cfg.alert_cooldown_minutes)
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

    alert_id = insert_alert(alert_insert)

    if should_email:
        send_critical_alert(
            cfg,
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
