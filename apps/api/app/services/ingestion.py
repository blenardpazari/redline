import json
from datetime import datetime

from app.db.queries import LogEntryInsert, count_recent_requests
from app.services.geoip import lookup as geoip_lookup
from app.services.scorer import ScorerInput, ScorerModels, score
from app.types.models import ThreatLevel, ThreatScore

_KNOWN_ATTACK_PATHS = frozenset({
    "/.env", "/.git/config", "/wp-admin", "/phpmyadmin", "/phpinfo.php",
    "/admin", "/.htaccess", "/config.php", "/../../../etc/passwd",
    "/../../etc/shadow", "/%2e%2e/%2e%2e/etc/passwd",
    "/wp-login.php", "/auth/login", "/admin/login",
})


def _path_base(path: str) -> str:
    return path.split("?")[0]


def _fallback_score(scorer_input: ScorerInput) -> ThreatScore:
    is_attack = scorer_input["is_known_attack_path"] or scorer_input["status_code"] >= 400
    level: ThreatLevel = "suspicious" if is_attack else "normal"
    score_val = 60.0 if is_attack else 0.0
    return ThreatScore(
        anomaly_score=score_val,
        classifier_confidence=0.0,
        threat_type="UNKNOWN" if is_attack else "NORMAL",
        final_score=score_val,
        threat_level=level,
    )


def parse_and_score(raw: str, models: ScorerModels | None) -> tuple[LogEntryInsert, ThreatScore]:
    data: dict = json.loads(raw)

    timestamp: str = data["timestamp"]
    ip: str = data["ip"]
    path: str = data["path"]

    dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    recent_count = count_recent_requests(ip, minutes=5)

    scorer_input = ScorerInput(
        path=path,
        response_time_ms=float(data["response_time_ms"]),
        status_code=int(data["status_code"]),
        hour_of_day=dt.hour,
        is_known_attack_path=_path_base(path) in _KNOWN_ATTACK_PATHS,
        requests_per_minute=recent_count / 5.0,
    )

    threat = score(models, scorer_input) if models is not None else _fallback_score(scorer_input)

    country = data.get("country")
    lat = data.get("lat")
    lon = data.get("lon")
    if not lat or not lon:
        country_geo, lat, lon = geoip_lookup(ip)
        if not country:
            country = country_geo

    entry = LogEntryInsert(
        timestamp=timestamp,
        ip=ip,
        country=country,
        lat=lat,
        lon=lon,
        method=data["method"],
        path=path,
        status_code=int(data["status_code"]),
        response_time_ms=float(data["response_time_ms"]),
        threat_level=threat.threat_level,
        threat_score=threat.final_score,
        threat_type=threat.threat_type,
        raw=raw,
    )

    return entry, threat
