import sqlite3
from pathlib import Path
from config import get_config

_connection: sqlite3.Connection | None = None


def get_connection() -> sqlite3.Connection:
    global _connection
    if _connection is None:
        cfg = get_config()
        db_path = Path(cfg.sqlite_path)
        db_path.parent.mkdir(parents=True, exist_ok=True)
        _connection = sqlite3.connect(str(db_path), check_same_thread=False)
        _connection.row_factory = sqlite3.Row
        _connection.execute("PRAGMA journal_mode=WAL")
        _connection.execute("PRAGMA foreign_keys=ON")
        _init_schema(_connection)
        _migrate(_connection)
    return _connection


def _init_schema(conn: sqlite3.Connection) -> None:
    schema = (Path(__file__).parent / "schema.sql").read_text()
    conn.executescript(schema)
    conn.commit()


def _migrate(conn: sqlite3.Connection) -> None:
    existing_cols = {
        row[1]
        for row in conn.execute("PRAGMA table_info(log_entries)").fetchall()
    }
    if "server_id" not in existing_cols:
        conn.execute("ALTER TABLE log_entries ADD COLUMN server_id INTEGER")

    alert_cols = {
        row[1]
        for row in conn.execute("PRAGMA table_info(alerts)").fetchall()
    }
    for col, defn in [
        ("server_id", "INTEGER"),
        ("acked_at",  "TEXT"),
        ("acked_by",  "TEXT"),
        ("ack_note",  "TEXT"),
    ]:
        if col not in alert_cols:
            conn.execute(f"ALTER TABLE alerts ADD COLUMN {col} {defn}")

    cf_tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()}
    if "cf_zones" not in cf_tables:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS cf_zones (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                server_id    INTEGER NOT NULL,
                zone_id      TEXT NOT NULL UNIQUE,
                zone_name    TEXT NOT NULL,
                api_token    TEXT NOT NULL,
                last_poll    TEXT,
                total_pulled INTEGER NOT NULL DEFAULT 0,
                enabled      INTEGER NOT NULL DEFAULT 1,
                created_at   TEXT NOT NULL
            )
        """)

    conn.execute("CREATE INDEX IF NOT EXISTS idx_log_server ON log_entries(server_id, timestamp DESC)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_alerts_server ON alerts(server_id, created_at DESC)")

    log_cols = {row[1] for row in conn.execute("PRAGMA table_info(log_entries)").fetchall()}
    if "scored_by" not in log_cols:
        conn.execute("ALTER TABLE log_entries ADD COLUMN scored_by TEXT NOT NULL DEFAULT 'rules'")

    server_cols = {row[1] for row in conn.execute("PRAGMA table_info(servers)").fetchall()}
    if "public_ip" not in server_cols:
        conn.execute("ALTER TABLE servers ADD COLUMN public_ip TEXT")
    if "lat" not in server_cols:
        conn.execute("ALTER TABLE servers ADD COLUMN lat REAL")
    if "lon" not in server_cols:
        conn.execute("ALTER TABLE servers ADD COLUMN lon REAL")

    all_tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()}
    if "connectors" not in all_tables:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS connectors (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                name       TEXT NOT NULL,
                type       TEXT NOT NULL,
                config     TEXT NOT NULL DEFAULT '{}',
                enabled    INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL
            )
        """)

    conn.commit()
