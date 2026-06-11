from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.db.queries import get_analytics_rows, get_peak_per_minute
from auth.jwt_handler import require_auth

router = APIRouter(tags=["analytics"])

_RANGE_CFG: dict[str, tuple[str, str, str]] = {
    "24h": ("-24 hours", "%H:00", "%H"),
    "7d":  ("-7 days",   "%m/%d", "%Y-%m-%d"),
    "30d": ("-30 days",  "%m/%d", "%Y-%m-%d"),
}


def _fill_hourly(rows: list[dict]) -> tuple[list, list, list, list]:
    lookup = {r["label"]: r for r in rows}
    labels: list[str] = []
    normal: list[int] = []
    anomaly: list[int] = []
    critical: list[int] = []
    for h in range(24):
        lbl = f"{h:02d}:00"
        r = lookup.get(lbl, {})
        labels.append(lbl)
        normal.append(int(r.get("normal", 0)))
        anomaly.append(int(r.get("anomaly", 0)))
        critical.append(int(r.get("critical", 0)))
    return labels, normal, anomaly, critical


def _fill_daily(rows: list[dict], days: int) -> tuple[list, list, list, list]:
    lookup = {r["label"]: r for r in rows}
    today = date.today()
    labels: list[str] = []
    normal: list[int] = []
    anomaly: list[int] = []
    critical: list[int] = []
    for i in range(days - 1, -1, -1):
        lbl = (today - timedelta(days=i)).strftime("%m/%d")
        r = lookup.get(lbl, {})
        labels.append(lbl)
        normal.append(int(r.get("normal", 0)))
        anomaly.append(int(r.get("anomaly", 0)))
        critical.append(int(r.get("critical", 0)))
    return labels, normal, anomaly, critical


@router.get("/analytics")
async def analytics(
    period: Annotated[str, Query(alias="range")] = "24h",
    _: str = Depends(require_auth),
) -> dict:
    since, label_fmt, group_fmt = _RANGE_CFG.get(period, _RANGE_CFG["24h"])
    rows = get_analytics_rows(since, label_fmt, group_fmt)
    peak = get_peak_per_minute(since)

    if period == "24h":
        labels, normal, anomaly, critical = _fill_hourly(rows)
    else:
        days = 7 if period == "7d" else 30
        labels, normal, anomaly, critical = _fill_daily(rows, days)

    return {
        "labels": labels,
        "normal": normal,
        "anomaly": anomaly,
        "critical": critical,
        "peak_per_minute": peak,
    }
