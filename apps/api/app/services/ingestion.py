import json
import re
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
    "/backup.zip", "/db.sql", "/admin/config", "/.DS_Store",
    "/server-status", "/xmlrpc.php", "/shell.php", "/cmd.php",
})

# Ordered rules: (regex, threat_type, score)
_RULES: list[tuple[re.Pattern, str, float]] = [
    (re.compile(r"(\bunion\b.+\bselect\b|\bselect\b.+\bfrom\b|\bdrop\b.+\btable\b|sleep\s*\(|benchmark\s*\(|'--|\bor\b\s+'?1'?\s*=\s*'?1)", re.I), "SQL_INJECTION", 92.0),
    (re.compile(r"(<script|javascript:|onerror\s*=|onload\s*=|alert\s*\(|document\.cookie|<img[^>]+src\s*=\s*x)", re.I), "XSS", 88.0),
    (re.compile(r"(\.\./|\.\.\\|%2e%2e|%252e|etc/passwd|etc/shadow|/proc/self)", re.I), "PATH_TRAVERSAL", 90.0),
    (re.compile(r"(;|\||\$\(|`|&&|\|\|)\s*(ls|cat|wget|curl|bash|sh|nc|python|perl|rm\s+-rf)", re.I), "CMD_INJECTION", 95.0),
    (re.compile(r"(wp-login\.php|wp-admin|xmlrpc\.php|phpmyadmin|/admin/login|/auth/login)", re.I), "BRUTE_FORCE", 78.0),
    (re.compile(r"(\.(env|git|htaccess|htpasswd|config|bak|sql|zip|tar|gz|dump)|phpinfo|shell\.php|cmd\.php)", re.I), "PATH_SCAN", 75.0),
]

_DDOS_RPM_THRESHOLD = 30.0

_STATIC_EXT = re.compile(
    r"\.(css|js|mjs|map|ts|jsx|tsx|jpg|jpeg|png|gif|webp|avif|svg|ico|woff|woff2|ttf|eot|otf|mp4|webm|ogg|zip|gz|br)(\?.*)?$",
    re.I,
)
_STATIC_PREFIXES = ("/uploads/", "/app/uploads/", "/static/", "/assets/", "/media/", "/api/")


def is_static(path: str) -> bool:
    base = path.split("?")[0]
    return bool(_STATIC_EXT.search(base)) or any(base.startswith(p) for p in _STATIC_PREFIXES)


def _path_base(path: str) -> str:
    return path.split("?")[0]


def _rule_score(path: str, requests_per_minute: float) -> ThreatScore | None:
    """Returns a ThreatScore if a rule matches, else None."""
    for pattern, threat_type, base_score in _RULES:
        if pattern.search(path):
            level: ThreatLevel = "critical" if base_score >= 88 else "warning" if base_score >= 75 else "suspicious"
            return ThreatScore(
                anomaly_score=base_score,
                classifier_confidence=base_score,
                threat_type=threat_type,
                final_score=base_score,
                threat_level=level,
            )
    if requests_per_minute >= _DDOS_RPM_THRESHOLD:
        return ThreatScore(
            anomaly_score=85.0,
            classifier_confidence=0.0,
            threat_type="DDOS",
            final_score=85.0,
            threat_level="critical",
        )
    return None


def _fallback_score(scorer_input: ScorerInput) -> ThreatScore:
    rule_hit = _rule_score(scorer_input["path"], scorer_input["requests_per_minute"])
    if rule_hit:
        return rule_hit
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


class StaticAssetError(ValueError):
    pass


def parse_and_score(raw: str, models: ScorerModels | None) -> tuple[LogEntryInsert, ThreatScore]:
    data: dict = json.loads(raw)

    timestamp: str = data["timestamp"]
    ip: str = data["ip"]
    path: str = data["path"]

    if is_static(path):
        raise StaticAssetError(f"skipped static asset: {path}")

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

    # Rule-based detection always wins — ML can't override a known attack signature
    rule_threat = _rule_score(path, scorer_input["requests_per_minute"])
    if rule_threat is not None:
        threat = rule_threat
        threat.scored_by = "rules"
    elif models is not None:
        threat = score(models, scorer_input)
        threat.scored_by = "ml"
    else:
        threat = _fallback_score(scorer_input)
        threat.scored_by = "fallback"

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
        scored_by=threat.scored_by,
        raw=raw,
    )

    return entry, threat
