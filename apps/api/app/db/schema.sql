-- Servers must be created before log_entries / alerts reference it
CREATE TABLE IF NOT EXISTS servers (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    env         TEXT NOT NULL DEFAULT 'production',
    source_type TEXT NOT NULL,
    api_key     TEXT NOT NULL UNIQUE,
    status      TEXT NOT NULL DEFAULT 'unconfigured',
    last_seen   TEXT,
    created_at  TEXT NOT NULL
);

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
    raw              TEXT NOT NULL,
    server_id        INTEGER
);

CREATE TABLE IF NOT EXISTS alerts (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at   TEXT NOT NULL,
    ip           TEXT NOT NULL,
    country      TEXT,
    threat_type  TEXT NOT NULL,
    score        REAL NOT NULL,
    path         TEXT NOT NULL,
    email_sent   INTEGER NOT NULL DEFAULT 0,
    server_id    INTEGER,
    acked_at     TEXT,
    acked_by     TEXT,
    ack_note     TEXT
);

CREATE TABLE IF NOT EXISTS settings (
    id                  INTEGER PRIMARY KEY DEFAULT 1,
    critical_threshold  REAL    NOT NULL DEFAULT 85.0,
    warning_threshold   REAL    NOT NULL DEFAULT 70.0,
    cooldown_minutes    INTEGER NOT NULL DEFAULT 15,
    email_enabled       INTEGER NOT NULL DEFAULT 1,
    email_recipient     TEXT    NOT NULL DEFAULT ''
);

-- Users: multiple admin accounts
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'viewer',  -- admin | viewer
    created_at    TEXT NOT NULL,
    last_login    TEXT
);

-- Geo-blocking rules: block a country on a server (NULL server_id = all servers)
CREATE TABLE IF NOT EXISTS geo_block_rules (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id    INTEGER REFERENCES servers(id) ON DELETE CASCADE,
    country_code TEXT NOT NULL,
    created_at   TEXT NOT NULL,
    created_by   TEXT NOT NULL DEFAULT 'admin',
    UNIQUE(server_id, country_code)
);

-- Rate-limit blocks: IPs auto-blocked after threshold exceeded
CREATE TABLE IF NOT EXISTS rate_limit_blocks (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    ip         TEXT NOT NULL,
    server_id  INTEGER REFERENCES servers(id) ON DELETE CASCADE,
    blocked_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    reason     TEXT NOT NULL DEFAULT 'rate_limit',
    UNIQUE(ip, server_id)
);

-- Cloudflare zone configurations (one per Cloudflare zone/domain)
CREATE TABLE IF NOT EXISTS cf_zones (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id   INTEGER NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    zone_id     TEXT NOT NULL UNIQUE,
    zone_name   TEXT NOT NULL,
    api_token   TEXT NOT NULL,
    last_poll   TEXT,
    total_pulled INTEGER NOT NULL DEFAULT 0,
    enabled     INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_log_timestamp  ON log_entries(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_ip      ON alerts(ip, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_servers_key    ON servers(api_key);
CREATE INDEX IF NOT EXISTS idx_blocks_ip      ON rate_limit_blocks(ip, expires_at);
