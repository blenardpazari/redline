import hashlib
import secrets
from datetime import datetime, timezone
from typing import TypedDict

from app.db.connection import get_connection


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def generate_api_key() -> str:
    return "rl_" + secrets.token_hex(24)


class ServerInsert(TypedDict):
    name: str
    env: str
    source_type: str


def create_server(data: ServerInsert) -> dict:
    conn = get_connection()
    key = generate_api_key()
    now = _now()
    cursor = conn.execute(
        """
        INSERT INTO servers (name, env, source_type, api_key, status, created_at)
        VALUES (?, ?, ?, ?, 'unconfigured', ?)
        """,
        (data["name"], data["env"], data["source_type"], key, now),
    )
    conn.commit()
    return get_server_by_id(cursor.lastrowid)  # type: ignore[arg-type]


def list_servers() -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT id, name, env, source_type, api_key, status, last_seen, created_at FROM servers ORDER BY created_at DESC"
    ).fetchall()
    servers = [dict(r) for r in rows]
    for s in servers:
        row = conn.execute(
            "SELECT COUNT(*) AS cnt, MAX(timestamp) AS last_event FROM log_entries WHERE server_id = ?",
            (s["id"],),
        ).fetchone()
        s["total_events"] = int(row["cnt"] or 0)
        s["last_event"] = row["last_event"]
    return servers


def get_server_by_id(server_id: int) -> dict | None:
    conn = get_connection()
    row = conn.execute(
        "SELECT id, name, env, source_type, api_key, status, last_seen, created_at FROM servers WHERE id = ?",
        (server_id,),
    ).fetchone()
    if row is None:
        return None
    s = dict(row)
    erow = conn.execute(
        "SELECT COUNT(*) AS cnt, MAX(timestamp) AS last_event FROM log_entries WHERE server_id = ?",
        (server_id,),
    ).fetchone()
    s["total_events"] = int(erow["cnt"] or 0)
    s["last_event"] = erow["last_event"]
    return s


def get_server_by_api_key(api_key: str) -> dict | None:
    conn = get_connection()
    row = conn.execute(
        "SELECT id, name, env, source_type, api_key, status, last_seen, created_at FROM servers WHERE api_key = ?",
        (api_key,),
    ).fetchone()
    return dict(row) if row else None


def update_server(server_id: int, data: dict) -> dict | None:
    conn = get_connection()
    allowed = {"name", "env", "source_type"}
    fields = {k: v for k, v in data.items() if k in allowed}
    if not fields:
        return get_server_by_id(server_id)
    set_clause = ", ".join(f"{k} = ?" for k in fields)
    conn.execute(
        f"UPDATE servers SET {set_clause} WHERE id = ?",
        [*fields.values(), server_id],
    )
    conn.commit()
    return get_server_by_id(server_id)


def delete_server(server_id: int) -> bool:
    conn = get_connection()
    cursor = conn.execute("DELETE FROM servers WHERE id = ?", (server_id,))
    conn.commit()
    return cursor.rowcount > 0


def rotate_server_key(server_id: int) -> str | None:
    conn = get_connection()
    new_key = generate_api_key()
    cursor = conn.execute(
        "UPDATE servers SET api_key = ? WHERE id = ?", (new_key, server_id)
    )
    conn.commit()
    return new_key if cursor.rowcount > 0 else None


def touch_server_last_seen(server_id: int) -> None:
    conn = get_connection()
    conn.execute(
        "UPDATE servers SET status = 'online', last_seen = ? WHERE id = ?",
        (_now(), server_id),
    )
    conn.commit()


def get_server_stats(server_id: int) -> dict:
    conn = get_connection()
    row = conn.execute(
        """
        SELECT
            COUNT(*) AS requests_today,
            SUM(CASE WHEN threat_level IN ('suspicious','warning','critical') THEN 1 ELSE 0 END) AS anomalies_today,
            SUM(CASE WHEN threat_level = 'critical' THEN 1 ELSE 0 END) AS redlines_today
        FROM log_entries
        WHERE server_id = ? AND date(timestamp) = date('now')
        """,
        (server_id,),
    ).fetchone()
    return {
        "requests_today": int(row["requests_today"] or 0),
        "anomalies_today": int(row["anomalies_today"] or 0),
        "redlines_today": int(row["redlines_today"] or 0),
    }


def list_geo_blocks(server_id: int | None = None) -> list[dict]:
    conn = get_connection()
    if server_id is not None:
        rows = conn.execute(
            "SELECT id, server_id, country_code, created_at, created_by FROM geo_block_rules WHERE server_id = ? OR server_id IS NULL ORDER BY created_at DESC",
            (server_id,),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT id, server_id, country_code, created_at, created_by FROM geo_block_rules ORDER BY created_at DESC"
        ).fetchall()
    return [dict(r) for r in rows]


def add_geo_block(country_code: str, server_id: int | None, created_by: str = "admin") -> dict:
    conn = get_connection()
    now = _now()
    cursor = conn.execute(
        "INSERT OR IGNORE INTO geo_block_rules (server_id, country_code, created_at, created_by) VALUES (?, ?, ?, ?)",
        (server_id, country_code.upper(), now, created_by),
    )
    conn.commit()
    row = conn.execute(
        "SELECT id, server_id, country_code, created_at, created_by FROM geo_block_rules WHERE country_code = ? AND (server_id = ? OR (server_id IS NULL AND ? IS NULL))",
        (country_code.upper(), server_id, server_id),
    ).fetchone()
    return dict(row) if row else {}


def delete_geo_block(rule_id: int) -> bool:
    conn = get_connection()
    cursor = conn.execute("DELETE FROM geo_block_rules WHERE id = ?", (rule_id,))
    conn.commit()
    return cursor.rowcount > 0


def is_country_blocked(country_code: str | None, server_id: int | None) -> bool:
    if not country_code:
        return False
    conn = get_connection()
    row = conn.execute(
        """
        SELECT COUNT(*) FROM geo_block_rules
        WHERE country_code = ?
          AND (server_id IS NULL OR server_id = ?)
        """,
        (country_code.upper(), server_id),
    ).fetchone()
    return bool(row[0])


def list_rate_blocks(server_id: int | None = None) -> list[dict]:
    conn = get_connection()
    if server_id is not None:
        rows = conn.execute(
            """
            SELECT id, ip, server_id, blocked_at, expires_at, reason
            FROM rate_limit_blocks
            WHERE (server_id = ? OR server_id IS NULL) AND expires_at > datetime('now')
            ORDER BY blocked_at DESC
            """,
            (server_id,),
        ).fetchall()
    else:
        rows = conn.execute(
            """
            SELECT id, ip, server_id, blocked_at, expires_at, reason
            FROM rate_limit_blocks
            WHERE expires_at > datetime('now')
            ORDER BY blocked_at DESC
            """
        ).fetchall()
    return [dict(r) for r in rows]


def is_ip_blocked(ip: str, server_id: int | None) -> bool:
    conn = get_connection()
    row = conn.execute(
        """
        SELECT COUNT(*) FROM rate_limit_blocks
        WHERE ip = ?
          AND (server_id IS NULL OR server_id = ?)
          AND expires_at > datetime('now')
        """,
        (ip, server_id),
    ).fetchone()
    return bool(row[0])


def block_ip(ip: str, server_id: int | None, duration_minutes: int = 60, reason: str = "rate_limit") -> None:
    conn = get_connection()
    now = _now()
    expires = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    conn.execute(
        """
        INSERT INTO rate_limit_blocks (ip, server_id, blocked_at, expires_at, reason)
        VALUES (?, ?, ?, datetime('now', ?), ?)
        ON CONFLICT(ip, server_id) DO UPDATE SET
            blocked_at = excluded.blocked_at,
            expires_at = excluded.expires_at,
            reason     = excluded.reason
        """,
        (ip, server_id, now, f"+{duration_minutes} minutes", reason),
    )
    conn.commit()


def unblock_ip(block_id: int) -> bool:
    conn = get_connection()
    cursor = conn.execute("DELETE FROM rate_limit_blocks WHERE id = ?", (block_id,))
    conn.commit()
    return cursor.rowcount > 0


def _hash_password(password: str) -> str:
    import bcrypt
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify_password(password: str, hashed: str) -> bool:
    import bcrypt
    return bcrypt.checkpw(password.encode(), hashed.encode())


def list_users() -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT id, username, role, created_at, last_login FROM users ORDER BY created_at"
    ).fetchall()
    return [dict(r) for r in rows]


def get_user_by_username(username: str) -> dict | None:
    conn = get_connection()
    row = conn.execute(
        "SELECT id, username, password_hash, role, created_at, last_login FROM users WHERE username = ?",
        (username,),
    ).fetchone()
    return dict(row) if row else None


def create_user(username: str, password: str, role: str = "viewer") -> dict:
    conn = get_connection()
    now = _now()
    password_hash = _hash_password(password)
    cursor = conn.execute(
        "INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, ?)",
        (username, password_hash, role, now),
    )
    conn.commit()
    return {"id": cursor.lastrowid, "username": username, "role": role, "created_at": now, "last_login": None}


def update_user(user_id: int, data: dict) -> dict | None:
    conn = get_connection()
    fields: dict = {}
    if "role" in data:
        fields["role"] = data["role"]
    if "password" in data:
        fields["password_hash"] = _hash_password(data["password"])
    if not fields:
        row = conn.execute("SELECT id, username, role, created_at, last_login FROM users WHERE id = ?", (user_id,)).fetchone()
        return dict(row) if row else None
    set_clause = ", ".join(f"{k} = ?" for k in fields)
    conn.execute(f"UPDATE users SET {set_clause} WHERE id = ?", [*fields.values(), user_id])
    conn.commit()
    row = conn.execute("SELECT id, username, role, created_at, last_login FROM users WHERE id = ?", (user_id,)).fetchone()
    return dict(row) if row else None


def delete_user(user_id: int) -> bool:
    conn = get_connection()
    cursor = conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    return cursor.rowcount > 0


def touch_user_login(username: str) -> None:
    conn = get_connection()
    conn.execute("UPDATE users SET last_login = ? WHERE username = ?", (_now(), username))
    conn.commit()


def verify_user(username: str, password: str) -> dict | None:
    user = get_user_by_username(username)
    if user and _verify_password(password, user["password_hash"]):
        return user
    return None


def acknowledge_alert(alert_id: int, acked_by: str, note: str = "") -> bool:
    conn = get_connection()
    cursor = conn.execute(
        "UPDATE alerts SET acked_at = ?, acked_by = ?, ack_note = ? WHERE id = ? AND acked_at IS NULL",
        (_now(), acked_by, note, alert_id),
    )
    conn.commit()
    return cursor.rowcount > 0


def get_alerts_full(limit: int, offset: int, server_id: int | None = None, unacked_only: bool = False) -> tuple[list[dict], int]:
    conn = get_connection()
    conditions: list[str] = []
    params: list[object] = []
    if server_id is not None:
        conditions.append("server_id = ?")
        params.append(server_id)
    if unacked_only:
        conditions.append("acked_at IS NULL")
    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    total = int(conn.execute(f"SELECT COUNT(*) FROM alerts {where}", params).fetchone()[0])
    rows = conn.execute(
        f"""
        SELECT id, created_at, ip, country, threat_type, score, path, email_sent,
               server_id, acked_at, acked_by, ack_note
        FROM alerts {where}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
        """,
        [*params, limit, offset],
    ).fetchall()
    return [dict(r) for r in rows], total
