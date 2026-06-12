import sqlite3
from typing import TypedDict
from app.db.connection import get_connection
from app.types.models import Alert, LogEntry


def purge_old_entries(retention_days: int) -> tuple[int, int]:
    """Delete log entries and alerts older than retention_days. Returns (logs_deleted, alerts_deleted)."""
    conn = get_connection()
    cutoff = f"datetime('now', '-{retention_days} days')"
    logs = conn.execute(
        f"DELETE FROM log_entries WHERE timestamp < {cutoff}"
    ).rowcount
    alerts = conn.execute(
        f"DELETE FROM alerts WHERE created_at < {cutoff}"
    ).rowcount
    conn.commit()
    return logs, alerts


class LogEntryInsert(TypedDict, total=False):
    timestamp: str
    ip: str
    country: str | None
    lat: float | None
    lon: float | None
    method: str
    path: str
    status_code: int
    response_time_ms: float
    scored_by: str
    threat_level: str
    threat_score: float
    threat_type: str | None
    raw: str
    server_id: int | None


class AlertInsert(TypedDict):
    created_at: str
    ip: str
    country: str | None
    threat_type: str
    score: float
    path: str
    email_sent: bool


def _server_filter(server_id: int | None) -> tuple[str, list]:
    if server_id is not None:
        return "server_id = ?", [server_id]
    return "", []


def insert_log_entry(entry: LogEntryInsert) -> int:
    conn = get_connection()
    cursor = conn.execute(
        """
        INSERT INTO log_entries
            (timestamp, ip, country, lat, lon, method, path,
             status_code, response_time_ms, threat_level, threat_score, threat_type, raw, server_id, scored_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            entry["timestamp"], entry["ip"], entry.get("country"), entry.get("lat"),
            entry.get("lon"), entry["method"], entry["path"], entry["status_code"],
            entry["response_time_ms"], entry["threat_level"], entry["threat_score"],
            entry.get("threat_type"), entry["raw"], entry.get("server_id"),
            entry.get("scored_by", "rules"),
        ),
    )
    conn.commit()
    if cursor.lastrowid is None:
        raise RuntimeError("INSERT log_entry returned no row id")
    return cursor.lastrowid


def get_log_entries(limit: int, offset: int, server_id: int | None = None, hours: int | None = None) -> list[LogEntry]:
    conn = get_connection()
    clause, params = _server_filter(server_id)
    conditions = [clause] if clause else []
    if hours is not None:
        conditions.append(f"timestamp >= datetime('now', '-{hours} hours')")
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    cursor = conn.execute(
        f"""
        SELECT id, timestamp, ip, country, lat, lon, method, path,
               status_code, response_time_ms, threat_level, threat_score, threat_type, scored_by
        FROM log_entries {where}
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
        """,
        [*params, limit, offset],
    )
    return [LogEntry(**dict(row)) for row in cursor.fetchall()]


def insert_alert(alert: AlertInsert, server_id: int | None = None) -> int:
    conn = get_connection()
    cursor = conn.execute(
        """
        INSERT INTO alerts (created_at, ip, country, threat_type, score, path, email_sent, server_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            alert["created_at"], alert["ip"], alert["country"],
            alert["threat_type"], alert["score"], alert["path"],
            int(alert["email_sent"]), server_id,
        ),
    )
    conn.commit()
    if cursor.lastrowid is None:
        raise RuntimeError("INSERT alert returned no row id")
    return cursor.lastrowid


def get_alerts(limit: int, offset: int, server_id: int | None = None) -> list[Alert]:
    conn = get_connection()
    clause, params = _server_filter(server_id)
    where = f"WHERE {clause}" if clause else ""
    cursor = conn.execute(
        f"""
        SELECT id, created_at, ip, country, threat_type, score, path, email_sent
        FROM alerts {where}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
        """,
        [*params, limit, offset],
    )
    return [Alert(**dict(row)) for row in cursor.fetchall()]


def get_stats(server_id: int | None = None) -> dict[str, int]:
    conn = get_connection()
    clause, params = _server_filter(server_id)
    date_clause = "date(timestamp) = date('now')"
    where = f"WHERE {date_clause} AND {clause}" if clause else f"WHERE {date_clause}"
    cursor = conn.execute(
        f"""
        SELECT
            COUNT(*) AS requests_today,
            SUM(CASE WHEN threat_level IN ('suspicious','warning','critical') THEN 1 ELSE 0 END) AS anomalies_today,
            SUM(CASE WHEN threat_level = 'critical' THEN 1 ELSE 0 END) AS redlines_today
        FROM log_entries {where}
        """,
        params,
    )
    row = dict(cursor.fetchone())
    return {
        "requests_today": int(row["requests_today"] or 0),
        "anomalies_today": int(row["anomalies_today"] or 0),
        "redlines_today": int(row["redlines_today"] or 0),
    }


def count_recent_requests(ip: str, minutes: int, server_id: int | None = None) -> int:
    conn = get_connection()
    clause, params = _server_filter(server_id)
    extra = f" AND {clause}" if clause else ""
    cursor = conn.execute(
        f"SELECT COUNT(*) FROM log_entries WHERE ip = ? AND timestamp > datetime('now', ?){extra}",
        [ip, f"-{minutes} minutes", *params],
    )
    return int(cursor.fetchone()[0])


def search_log_entries(
    q: str | None,
    threat_level: str | None,
    status: str | None,
    from_date: str | None,
    to_date: str | None,
    sort: str,
    order: str,
    page: int,
    limit: int,
    server_id: int | None = None,
) -> tuple[list[LogEntry], int]:
    conditions: list[str] = []
    params: list[object] = []

    if server_id is not None:
        conditions.append("server_id = ?")
        params.append(server_id)
    if q:
        conditions.append("(ip LIKE ? OR path LIKE ?)")
        params.extend([f"%{q}%", f"%{q}%"])
    if threat_level:
        conditions.append("threat_level = ?")
        params.append(threat_level)
    if status:
        ranges = {"2xx": (200, 299), "3xx": (300, 399), "4xx": (400, 499), "5xx": (500, 599)}
        if status in ranges:
            lo, hi = ranges[status]
            conditions.append("status_code BETWEEN ? AND ?")
            params.extend([lo, hi])
    if from_date:
        conditions.append("date(timestamp) >= ?")
        params.append(from_date)
    if to_date:
        conditions.append("date(timestamp) <= ?")
        params.append(to_date)

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    col = {"timestamp": "timestamp", "threat_score": "threat_score", "status_code": "status_code"}.get(sort, "timestamp")
    direction = "ASC" if order == "asc" else "DESC"
    conn = get_connection()

    total = int(conn.execute(f"SELECT COUNT(*) FROM log_entries {where}", params).fetchone()[0])
    rows = conn.execute(
        f"""
        SELECT id, timestamp, ip, country, lat, lon, method, path,
               status_code, response_time_ms, threat_level, threat_score, threat_type, scored_by
        FROM log_entries {where}
        ORDER BY {col} {direction}
        LIMIT ? OFFSET ?
        """,
        [*params, limit, (page - 1) * limit],
    ).fetchall()
    return [LogEntry(**dict(r)) for r in rows], total


def get_ip_profile(ip: str) -> dict | None:
    conn = get_connection()
    row = conn.execute(
        """
        SELECT ip, country,
               COUNT(*) AS total_requests,
               MIN(timestamp) AS first_seen,
               MAX(timestamp) AS last_seen,
               AVG(threat_score) AS avg_score,
               MAX(threat_score) AS max_score
        FROM log_entries
        WHERE ip = ?
        GROUP BY ip
        """,
        (ip,),
    ).fetchone()
    if row is None:
        return None
    profile = dict(row)
    profile["threat_types"] = [
        r[0] for r in conn.execute(
            "SELECT DISTINCT threat_type FROM log_entries WHERE ip = ? AND threat_type IS NOT NULL",
            (ip,),
        ).fetchall()
    ]
    profile["requests"] = [
        LogEntry(**dict(r)) for r in conn.execute(
            """
            SELECT id, timestamp, ip, country, lat, lon, method, path,
                   status_code, response_time_ms, threat_level, threat_score, threat_type, scored_by
            FROM log_entries WHERE ip = ? ORDER BY timestamp DESC LIMIT 100
            """,
            (ip,),
        ).fetchall()
    ]
    return profile


def get_analytics_rows(since: str, label_fmt: str, group_fmt: str, server_id: int | None = None) -> list[dict]:
    conn = get_connection()
    clause, params = _server_filter(server_id)
    extra = f" AND {clause}" if clause else ""
    cursor = conn.execute(
        f"""
        SELECT
            strftime('{label_fmt}', timestamp) AS label,
            SUM(CASE WHEN threat_level = 'normal' THEN 1 ELSE 0 END) AS normal,
            SUM(CASE WHEN threat_level IN ('suspicious', 'warning') THEN 1 ELSE 0 END) AS anomaly,
            SUM(CASE WHEN threat_level = 'critical' THEN 1 ELSE 0 END) AS critical
        FROM log_entries
        WHERE timestamp >= datetime('now', ?){extra}
        GROUP BY strftime('{group_fmt}', timestamp)
        ORDER BY strftime('{group_fmt}', timestamp)
        """,
        [since, *params],
    )
    return [dict(row) for row in cursor.fetchall()]


def get_peak_per_minute(since: str, server_id: int | None = None) -> int:
    conn = get_connection()
    clause, params = _server_filter(server_id)
    extra = f" AND {clause}" if clause else ""
    cursor = conn.execute(
        f"""
        SELECT COUNT(*) AS cnt
        FROM log_entries
        WHERE timestamp >= datetime('now', ?){extra}
        GROUP BY strftime('%Y-%m-%d %H:%M', timestamp)
        ORDER BY cnt DESC
        LIMIT 1
        """,
        [since, *params],
    )
    row = cursor.fetchone()
    return int(row[0]) if row else 0


def get_effective_settings() -> dict:
    from config import get_config
    conn = get_connection()
    row = conn.execute("SELECT * FROM settings WHERE id = 1").fetchone()
    cfg = get_config()
    if row:
        return {
            "critical_threshold": float(row["critical_threshold"]),
            "warning_threshold": float(row["warning_threshold"]),
            "cooldown_minutes": int(row["cooldown_minutes"]),
            "email_enabled": bool(row["email_enabled"]),
            "email_recipient": row["email_recipient"] or cfg.alert_email_to,
        }
    return {
        "critical_threshold": float(cfg.redline_threshold),
        "warning_threshold": 70.0,
        "cooldown_minutes": int(cfg.alert_cooldown_minutes),
        "email_enabled": True,
        "email_recipient": cfg.alert_email_to,
    }


def upsert_settings(s: dict) -> None:
    conn = get_connection()
    conn.execute(
        """
        INSERT INTO settings (id, critical_threshold, warning_threshold, cooldown_minutes, email_enabled, email_recipient)
        VALUES (1, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            critical_threshold = excluded.critical_threshold,
            warning_threshold  = excluded.warning_threshold,
            cooldown_minutes   = excluded.cooldown_minutes,
            email_enabled      = excluded.email_enabled,
            email_recipient    = excluded.email_recipient
        """,
        (s["critical_threshold"], s["warning_threshold"],
         s["cooldown_minutes"], int(s["email_enabled"]), s["email_recipient"]),
    )
    conn.commit()


def get_threat_breakdown_data(since: str, server_id: int | None = None) -> dict:
    conn = get_connection()
    clause, params = _server_filter(server_id)
    extra = f" AND {clause}" if clause else ""
    rows = conn.execute(
        f"""
        SELECT COALESCE(threat_type, 'NORMAL') AS threat_type, COUNT(*) AS count
        FROM log_entries
        WHERE timestamp >= datetime('now', ?){extra}
        GROUP BY threat_type
        ORDER BY count DESC
        """,
        [since, *params],
    ).fetchall()
    total = sum(r[1] for r in rows)
    breakdown = [
        {
            "threat_type": r[0],
            "count": r[1],
            "percent": round(r[1] / total * 100, 1) if total else 0.0,
        }
        for r in rows
    ]
    top_path = conn.execute(
        f"""
        SELECT path FROM log_entries
        WHERE timestamp >= datetime('now', ?) AND threat_level != 'normal'{extra}
        GROUP BY path ORDER BY COUNT(*) DESC LIMIT 1
        """,
        [since, *params],
    ).fetchone()
    top_ip = conn.execute(
        f"""
        SELECT ip FROM log_entries
        WHERE timestamp >= datetime('now', ?) AND threat_level != 'normal'{extra}
        GROUP BY ip ORDER BY COUNT(*) DESC LIMIT 1
        """,
        [since, *params],
    ).fetchone()
    busiest = conn.execute(
        f"""
        SELECT CAST(strftime('%H', timestamp) AS INTEGER) AS hour
        FROM log_entries
        WHERE timestamp >= datetime('now', ?){extra}
        GROUP BY hour ORDER BY COUNT(*) DESC LIMIT 1
        """,
        [since, *params],
    ).fetchone()
    return {
        "breakdown": breakdown,
        "top_path": top_path[0] if top_path else None,
        "top_ip": top_ip[0] if top_ip else None,
        "busiest_hour": int(busiest[0]) if busiest else None,
    }


def check_alert_cooldown(ip: str, cooldown_minutes: int) -> bool:
    conn = get_connection()
    cursor = conn.execute(
        "SELECT COUNT(*) FROM alerts WHERE ip = ? AND email_sent = 1 AND created_at > datetime('now', ?)",
        (ip, f"-{cooldown_minutes} minutes"),
    )
    count: int = cursor.fetchone()[0]
    return count > 0


# ---------------------------------------------------------------------------
# Connectors
# ---------------------------------------------------------------------------

import json as _json
from datetime import datetime as _dt, timezone as _tz


def list_connectors() -> list[dict]:
    conn = get_connection()
    rows = conn.execute("SELECT * FROM connectors ORDER BY id").fetchall()
    return [_connector_row(r) for r in rows]


def get_connector(connector_id: int) -> dict | None:
    conn = get_connection()
    row = conn.execute("SELECT * FROM connectors WHERE id = ?", (connector_id,)).fetchone()
    return _connector_row(row) if row else None


def insert_connector(name: str, type_: str, config: dict, enabled: bool = True) -> dict:
    conn = get_connection()
    now = _dt.now(_tz.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    cur = conn.execute(
        "INSERT INTO connectors (name, type, config, enabled, created_at) VALUES (?, ?, ?, ?, ?)",
        (name, type_, _json.dumps(config), int(enabled), now),
    )
    conn.commit()
    return get_connector(cur.lastrowid)  # type: ignore[arg-type]


def update_connector(connector_id: int, name: str, type_: str, config: dict, enabled: bool) -> dict | None:
    conn = get_connection()
    conn.execute(
        "UPDATE connectors SET name=?, type=?, config=?, enabled=? WHERE id=?",
        (name, type_, _json.dumps(config), int(enabled), connector_id),
    )
    conn.commit()
    return get_connector(connector_id)


def delete_connector(connector_id: int) -> bool:
    conn = get_connection()
    rows = conn.execute("DELETE FROM connectors WHERE id = ?", (connector_id,)).rowcount
    conn.commit()
    return rows > 0


def _connector_row(row: sqlite3.Row) -> dict:  # type: ignore[name-defined]
    return {
        "id": row["id"],
        "name": row["name"],
        "type": row["type"],
        "config": _json.loads(row["config"]),
        "enabled": bool(row["enabled"]),
        "created_at": row["created_at"],
    }
