import json
from datetime import datetime, timezone
from typing import Callable, TypedDict

import httpx


class SimEvent(TypedDict):
    ip: str
    country: str | None
    method: str
    path: str
    status_code: int
    threat_level: str
    threat_score: float
    threat_type: str | None
    alert_fired: bool


def make_raw(
    ip: str, country: str, lat: float, lon: float,
    method: str, path: str, status_code: int,
    response_time_ms: float, user_agent: str,
) -> str:
    return json.dumps({
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "ip": ip, "country": country, "lat": lat, "lon": lon,
        "method": method, "path": path,
        "status_code": status_code,
        "response_time_ms": response_time_ms,
        "user_agent": user_agent,
    })


async def send_entry(
    client: httpx.AsyncClient, raw: str, on_event: Callable[[SimEvent], None]
) -> None:
    try:
        resp = await client.post("/ingest", json={"raw": raw}, timeout=5.0)
        if resp.status_code == 200:
            data = resp.json()
            e = data["entry"]
            on_event(SimEvent(
                ip=e["ip"], country=e.get("country"),
                method=e["method"], path=e["path"],
                status_code=e["status_code"],
                threat_level=e["threat_level"],
                threat_score=e["threat_score"],
                threat_type=e.get("threat_type"),
                alert_fired=data.get("alert") is not None,
            ))
    except httpx.RequestError:
        pass
