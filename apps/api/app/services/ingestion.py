import json
from datetime import datetime

from app.db.queries import LogEntryInsert, count_recent_requests
from app.services.geoip import lookup as geoip_lookup
from app.services.scorer import ScorerInput, ScorerModels, score
from app.types.models import ThreatScore

_KNOWN_ATTACK_PATHS = frozenset({
    "/.env", "/.git/config", "/wp-admin", "/phpmyadmin", "/phpinfo.php",
    "/admin", "/.htaccess", "/config.php", "/../../../etc/passwd",
    "/../../etc/shadow", "/%2e%2e/%2e%2e/etc/passwd",
    "/wp-login.php", "/auth/login", "/admin/login",
})


def _path_base(path: str) -> str:
    return path.split("?")[0]


def parse_and_score(raw: str, models: ScorerModels) -> tuple[LogEntryInsert, ThreatScore]:
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

    threat = score(models, scorer_input)

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
