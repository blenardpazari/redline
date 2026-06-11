import asyncio
import json
import logging
from datetime import datetime, timezone

import httpx

from app.db.cf_queries import get_cf_zones_enabled, update_cf_zone_poll
from app.db.queries import LogEntryInsert, insert_log_entry
from app.db.server_queries import touch_server_last_seen
from app.services.ingestion import _KNOWN_ATTACK_PATHS, _path_base
from app.services.scorer import ScorerInput, ScorerModels, score
from app.services.alert_engine import process as process_alert
from config import get_config
from ws.stream import broadcast_log

log = logging.getLogger(__name__)

POLL_INTERVAL = 60
_CF_GRAPHQL = "https://api.cloudflare.com/client/v4/graphql"

_QUERY_ADAPTIVE = """
query ($zoneTag: string!, $since: Date!, $until: Date!) {
  viewer {
    zones(filter: { zoneTag: $zoneTag }) {
      httpRequestsAdaptiveGroups(
        limit: 10
        filter: { date_geq: $since, date_lt: $until }
        orderBy: [date_ASC]
      ) {
        dimensions { date }
        count
      }
    }
  }
}
"""


def _fmt_time(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


async def _fetch_zone(
    client: httpx.AsyncClient,
    zone: dict,
    since: datetime,
    until: datetime,
) -> list[dict]:
    variables = {
        "zoneTag": zone["zone_id"],
        "since": since.strftime("%Y-%m-%d"),
        "until": until.strftime("%Y-%m-%d"),
    }
    resp = await client.post(
        _CF_GRAPHQL,
        json={"query": _QUERY_ADAPTIVE, "variables": variables},
        headers={
            "Authorization": f"Bearer {zone['api_token']}",
            "Content-Type": "application/json",
        },
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()

    errors = data.get("errors")
    if errors:
        log.warning("CF GraphQL errors for zone %s: %s", zone["zone_id"], errors)
        return []

    groups = (
        data.get("data", {})
            .get("viewer", {})
            .get("zones", [{}])[0]
            .get("httpRequestsAdaptiveGroups", [])
    )
    return groups


def _synthesise_entries(
    group: dict,
    zone: dict,
    models: ScorerModels,
) -> list[LogEntryInsert]:
    dim = group.get("dimensions", {})
    date_str = dim.get("date", _fmt_time(datetime.now(timezone.utc)))
    total_requests = int(group.get("count", 1)) or 1

    if len(date_str) == 10:
        ts = f"{date_str}T12:00:00Z"
    else:
        ts = date_str

    status_code = 200
    path = "/"

    scorer_input = ScorerInput(
        path=path,
        response_time_ms=120.0,
        status_code=status_code,
        hour_of_day=_parse_hour(ts),
        is_known_attack_path=False,
        requests_per_minute=float(total_requests),
    )
    threat = score(models, scorer_input)

    entry = LogEntryInsert(
        timestamp=ts,
        ip=f"cf-{zone['zone_id'][:8]}",
        country=None,
        lat=None,
        lon=None,
        method="GET",
        path=path,
        status_code=status_code,
        response_time_ms=120.0,
        threat_level=threat.threat_level,
        threat_score=threat.final_score,
        threat_type=threat.threat_type,
        raw=json.dumps({
            "source": "cloudflare",
            "zone_id": zone["zone_id"],
            "zone_name": zone["zone_name"],
            "requests": total_requests,
            "timestamp": ts,
        }),
        server_id=zone["server_id"],
    )
    return [entry]


def _infer_path(status_code: int) -> str:
    if status_code == 404:
        return "/not-found"
    if status_code in (401, 403):
        return "/auth/login"
    if status_code >= 500:
        return "/api/error"
    return "/"


def _infer_response_time(status_code: int) -> float:
    if status_code >= 500:
        return 800.0
    if status_code in (301, 302):
        return 10.0
    return 120.0


def _parse_hour(ts: str) -> int:
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00")).hour
    except Exception:
        return datetime.now(timezone.utc).hour


async def poll_once(models: ScorerModels, since: datetime, until: datetime) -> None:
    zones = get_cf_zones_enabled()
    if not zones:
        return

    cfg = get_config()

    async with httpx.AsyncClient() as client:
        for zone in zones:
            try:
                groups = await _fetch_zone(client, zone, since, until)
                if not groups:
                    continue

                last_poll_date = zone.get("last_poll", "")[:10] if zone.get("last_poll") else ""

                pulled = 0
                for group in groups:
                    bucket_date = (group.get("dimensions") or {}).get("date", "")
                    if bucket_date and bucket_date <= last_poll_date:
                        continue

                    entries = _synthesise_entries(group, zone, models)
                    for entry in entries:
                        from app.types.models import LogEntry
                        row_id = insert_log_entry(entry)
                        log_entry = LogEntry(
                            id=row_id,
                            timestamp=entry["timestamp"],
                            ip=entry["ip"],
                            country=entry.get("country"),
                            lat=entry.get("lat"),
                            lon=entry.get("lon"),
                            method=entry["method"],
                            path=entry["path"],
                            status_code=entry["status_code"],
                            response_time_ms=entry["response_time_ms"],
                            threat_level=entry["threat_level"],  # type: ignore[arg-type]
                            threat_score=entry["threat_score"],
                            threat_type=entry.get("threat_type"),
                        )
                        await broadcast_log(log_entry)
                        threat_level = entry.get("threat_level", "normal")
                        if threat_level in ("warning", "critical"):
                            from app.types.models import ThreatScore
                            ts_obj = ThreatScore(
                                anomaly_score=float(entry.get("threat_score") or 0),
                                classifier_confidence=0.0,
                                threat_type=str(entry.get("threat_type") or "NORMAL"),
                                final_score=float(entry.get("threat_score") or 0),
                                threat_level=threat_level,  # type: ignore[arg-type]
                            )
                            process_alert(
                                ts_obj,
                                ip=str(entry.get("ip") or ""),
                                country=entry.get("country"),
                                path=str(entry.get("path") or "/"),
                                cfg=cfg,
                                server_id=zone["server_id"],
                            )
                        pulled += 1

                touch_server_last_seen(zone["server_id"])
                last_bucket = max((g.get("dimensions", {}).get("date", "") for g in groups), default="")
                update_cf_zone_poll(zone["id"], last_bucket or _fmt_time(until), pulled)
                log.info("CF zone %s (%s): pulled %d entries", zone["zone_name"], zone["zone_id"], pulled)

            except httpx.HTTPStatusError as exc:
                log.error("CF zone %s HTTP %s: %s", zone["zone_id"], exc.response.status_code, exc.response.text[:200])
            except Exception as exc:
                log.error("CF zone %s poll error: %s", zone["zone_id"], exc)


async def run_poller(models: ScorerModels) -> None:
    log.info("Cloudflare poller started (interval=%ds)", POLL_INTERVAL)

    while True:
        try:
            from datetime import timedelta
            now = datetime.now(timezone.utc)
            since = (now - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
            until = now.replace(hour=0, minute=0, second=0, microsecond=0)

            await poll_once(models, since, until)
        except Exception as exc:
            log.error("CF poller loop error: %s", exc)

        await asyncio.sleep(POLL_INTERVAL)


_COUNTRY_NAME_TO_CODE: dict[str, str] = {
    "Afghanistan": "AF", "Albania": "AL", "Algeria": "DZ", "Argentina": "AR",
    "Australia": "AU", "Austria": "AT", "Azerbaijan": "AZ", "Bangladesh": "BD",
    "Belarus": "BY", "Belgium": "BE", "Brazil": "BR", "Bulgaria": "BG",
    "Canada": "CA", "Chile": "CL", "China": "CN", "Colombia": "CO",
    "Croatia": "HR", "Czech Republic": "CZ", "Czechia": "CZ", "Denmark": "DK",
    "Egypt": "EG", "Finland": "FI", "France": "FR", "Georgia": "GE",
    "Germany": "DE", "Ghana": "GH", "Greece": "GR", "Hong Kong": "HK",
    "Hungary": "HU", "India": "IN", "Indonesia": "ID", "Iran": "IR",
    "Iraq": "IQ", "Ireland": "IE", "Israel": "IL", "Italy": "IT",
    "Japan": "JP", "Jordan": "JO", "Kazakhstan": "KZ", "Kenya": "KE",
    "North Korea": "KP", "South Korea": "KR", "Kuwait": "KW", "Lebanon": "LB",
    "Libya": "LY", "Malaysia": "MY", "Mexico": "MX", "Morocco": "MA",
    "Netherlands": "NL", "New Zealand": "NZ", "Nigeria": "NG", "Norway": "NO",
    "Pakistan": "PK", "Peru": "PE", "Philippines": "PH", "Poland": "PL",
    "Portugal": "PT", "Qatar": "QA", "Romania": "RO", "Russia": "RU",
    "Saudi Arabia": "SA", "Serbia": "RS", "Singapore": "SG", "South Africa": "ZA",
    "Spain": "ES", "Sweden": "SE", "Switzerland": "CH", "Syria": "SY",
    "Taiwan": "TW", "Thailand": "TH", "Tunisia": "TN", "Turkey": "TR",
    "Ukraine": "UA", "United Arab Emirates": "AE", "United Kingdom": "GB",
    "United States": "US", "Uzbekistan": "UZ", "Vietnam": "VN", "Yemen": "YE",
    "T1": "T1",
}
