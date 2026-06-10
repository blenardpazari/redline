from typing import TypedDict
from app.db.connection import get_connection
from app.types.models import Alert, LogEntry


class LogEntryInsert(TypedDict):
    timestamp: str
    ip: str
    country: str | None
    lat: float | None
    lon: float | None
    method: str
    path: str
    status_code: int
    response_time_ms: float
    threat_level: str
    threat_score: float
    threat_type: str | None
    raw: str


class AlertInsert(TypedDict):
    created_at: str
    ip: str
    country: str | None
    threat_type: str
    score: float
    path: str
    email_sent: bool


def insert_log_entry(entry: LogEntryInsert) -> int:
    conn = get_connection()
    cursor = conn.execute(
        """
        INSERT INTO log_entries
            (timestamp, ip, country, lat, lon, method, path,
             status_code, response_time_ms, threat_level, threat_score, threat_type, raw)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            entry["timestamp"], entry["ip"], entry["country"], entry["lat"],
            entry["lon"], entry["method"], entry["path"], entry["status_code"],
            entry["response_time_ms"], entry["threat_level"], entry["threat_score"],
            entry["threat_type"], entry["raw"],
        ),
    )
    conn.commit()
    if cursor.lastrowid is None:
        raise RuntimeError("INSERT log_entry returned no row id")
    return cursor.lastrowid


def get_log_entries(limit: int, offset: int) -> list[LogEntry]:
    conn = get_connection()
    cursor = conn.execute(
        """
        SELECT id, timestamp, ip, country, lat, lon, method, path,
               status_code, response_time_ms, threat_level, threat_score, threat_type
        FROM log_entries
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
        """,
        (limit, offset),
    )
    return [LogEntry(**dict(row)) for row in cursor.fetchall()]


def insert_alert(alert: AlertInsert) -> int:
    conn = get_connection()
    cursor = conn.execute(
        """
        INSERT INTO alerts (created_at, ip, country, threat_type, score, path, email_sent)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            alert["created_at"], alert["ip"], alert["country"],
            alert["threat_type"], alert["score"], alert["path"],
            int(alert["email_sent"]),
        ),
    )
    conn.commit()
    if cursor.lastrowid is None:
        raise RuntimeError("INSERT alert returned no row id")
    return cursor.lastrowid


def get_alerts(limit: int, offset: int) -> list[Alert]:
    conn = get_connection()
    cursor = conn.execute(
        """
        SELECT id, created_at, ip, country, threat_type, score, path, email_sent
        FROM alerts
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
        """,
        (limit, offset),
    )
    return [Alert(**dict(row)) for row in cursor.fetchall()]


def get_stats() -> dict[str, int]:
    conn = get_connection()
    cursor = conn.execute(
        """
        SELECT
            COUNT(*) AS requests_today,
            SUM(CASE WHEN threat_level IN ('suspicious','warning','critical') THEN 1 ELSE 0 END) AS anomalies_today,
            SUM(CASE WHEN threat_level = 'critical' THEN 1 ELSE 0 END) AS redlines_today
        FROM log_entries
        WHERE date(timestamp) = date('now')
        """
    )
    row = dict(cursor.fetchone())
    return {
        "requests_today": int(row["requests_today"] or 0),
        "anomalies_today": int(row["anomalies_today"] or 0),
        "redlines_today": int(row["redlines_today"] or 0),
    }


def count_recent_requests(ip: str, minutes: int) -> int:
    conn = get_connection()
    cursor = conn.execute(
        "SELECT COUNT(*) FROM log_entries WHERE ip = ? AND timestamp > datetime('now', ?)",
        (ip, f"-{minutes} minutes"),
    )
    return int(cursor.fetchone()[0])


def check_alert_cooldown(ip: str, cooldown_minutes: int) -> bool:
    conn = get_connection()
    cursor = conn.execute(
        "SELECT COUNT(*) FROM alerts WHERE ip = ? AND created_at > datetime('now', ?)",
        (ip, f"-{cooldown_minutes} minutes"),
    )
    count: int = cursor.fetchone()[0]
    return count > 0
