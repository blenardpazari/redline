"""DB queries for Cloudflare zone configurations."""
from datetime import datetime, timezone

from app.db.connection import get_connection


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def list_cf_zones() -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT z.id, z.server_id, z.zone_id, z.zone_name, z.api_token,
               z.last_poll, z.total_pulled, z.enabled, z.created_at,
               s.name AS server_name
        FROM cf_zones z
        LEFT JOIN servers s ON s.id = z.server_id
        ORDER BY z.created_at DESC
        """
    ).fetchall()
    return [dict(r) for r in rows]


def get_cf_zone(zone_id: str) -> dict | None:
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM cf_zones WHERE zone_id = ?", (zone_id,)
    ).fetchone()
    return dict(row) if row else None


def get_cf_zones_enabled() -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM cf_zones WHERE enabled = 1"
    ).fetchall()
    return [dict(r) for r in rows]


def create_cf_zone(server_id: int, zone_id: str, zone_name: str, api_token: str) -> dict:
    conn = get_connection()
    now = _now()
    conn.execute(
        """
        INSERT INTO cf_zones (server_id, zone_id, zone_name, api_token, created_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(zone_id) DO UPDATE SET
            server_id  = excluded.server_id,
            zone_name  = excluded.zone_name,
            api_token  = excluded.api_token,
            enabled    = 1
        """,
        (server_id, zone_id, zone_name, api_token, now),
    )
    conn.commit()
    return get_cf_zone(zone_id) or {}


def delete_cf_zone(zone_db_id: int) -> bool:
    conn = get_connection()
    cursor = conn.execute("DELETE FROM cf_zones WHERE id = ?", (zone_db_id,))
    conn.commit()
    return cursor.rowcount > 0


def update_cf_zone_poll(zone_db_id: int, last_poll: str, pulled: int) -> None:
    conn = get_connection()
    conn.execute(
        "UPDATE cf_zones SET last_poll = ?, total_pulled = total_pulled + ? WHERE id = ?",
        (last_poll, pulled, zone_db_id),
    )
    conn.commit()


def set_cf_zone_enabled(zone_db_id: int, enabled: bool) -> None:
    conn = get_connection()
    conn.execute("UPDATE cf_zones SET enabled = ? WHERE id = ?", (int(enabled), zone_db_id))
    conn.commit()


def update_cf_zone_token(zone_db_id: int, api_token: str) -> None:
    conn = get_connection()
    conn.execute("UPDATE cf_zones SET api_token = ? WHERE id = ?", (api_token, zone_db_id))
    conn.commit()
