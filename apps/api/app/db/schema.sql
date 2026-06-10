CREATE TABLE IF NOT EXISTS log_entries (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp        TEXT NOT NULL,
    ip               TEXT NOT NULL,
    country          TEXT,
    lat              REAL,
    lon              REAL,
    method           TEXT NOT NULL,
    path             TEXT NOT NULL,
    status_code      INTEGER NOT NULL,
    response_time_ms REAL NOT NULL,
    threat_level     TEXT NOT NULL,
    threat_score     REAL NOT NULL,
    threat_type      TEXT,
    raw              TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS alerts (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at   TEXT NOT NULL,
    ip           TEXT NOT NULL,
    country      TEXT,
    threat_type  TEXT NOT NULL,
    score        REAL NOT NULL,
    path         TEXT NOT NULL,
    email_sent   INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_log_timestamp ON log_entries(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_ip ON alerts(ip, created_at DESC);
