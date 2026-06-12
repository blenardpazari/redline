#!/usr/bin/env bash
# Redline CloudPanel Log Agent -- single-file installer + runner
#
# USAGE (two modes):
#
#   Install as systemd service (run once as root on the VPS):
#     REDLINE_WEBHOOK_URL=https://api.example.com/ingest/webhook/<key> bash redline-agent.sh install
#
#   Run directly in the foreground (useful for testing):
#     REDLINE_WEBHOOK_URL=https://api.example.com/ingest/webhook/<key> bash redline-agent.sh run
#
# ENV VARS (all optional except REDLINE_WEBHOOK_URL):
#   REDLINE_WEBHOOK_URL      Full webhook URL including the API key  [required]
#   CLOUDPANEL_LOG_GLOB      Glob for site access logs               [/home/*/logs/nginx/access.log]
#   HTTP_TIMEOUT             Seconds before a POST times out         [10]
#   RETRY_DELAY              Seconds before retrying a failed POST   [5]
#   POLL_NEW_LOGS_SECONDS    How often to re-scan for new sites      [60]

set -euo pipefail

INSTALL_DIR="/opt/redline-agent"
SERVICE_NAME="redline-agent"
PYTHON_SCRIPT="$INSTALL_DIR/agent.py"
ENV_FILE="$INSTALL_DIR/.env"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

# ── helpers ───────────────────────────────────────────────────────────────────

require_root() {
    if [[ $EUID -ne 0 ]]; then
        echo "error: run as root" >&2
        exit 1
    fi
}

require_webhook() {
    if [[ -z "${REDLINE_WEBHOOK_URL:-}" ]]; then
        echo "error: REDLINE_WEBHOOK_URL is not set" >&2
        echo "  export REDLINE_WEBHOOK_URL=https://api.example.com/ingest/webhook/<api-key>" >&2
        exit 1
    fi
}

ensure_python() {
    if ! command -v python3 &>/dev/null; then
        echo "installing python3..."
        apt-get install -y python3 python3-pip python3-venv 2>/dev/null \
            || yum install -y python3 2>/dev/null \
            || { echo "error: cannot find or install python3" >&2; exit 1; }
    fi
}

write_agent() {
    local dest="$1"
    cat <<'PYEOF' > "$dest"
#!/usr/bin/env python3
import asyncio
import glob
import json
import logging
import os
import re
import signal
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import httpx
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "httpx"])
    import httpx

WEBHOOK_URL   = os.environ["REDLINE_WEBHOOK_URL"]
LOG_GLOB      = os.environ.get("CLOUDPANEL_LOG_GLOB", "/home/*/logs/nginx/access.log")
EXCLUDE_GLOB  = os.environ.get("EXCLUDE_LOG_GLOB", "")
HTTP_TIMEOUT  = float(os.environ.get("HTTP_TIMEOUT", "10"))
RETRY_DELAY   = float(os.environ.get("RETRY_DELAY", "5"))
POLL_INTERVAL = int(os.environ.get("POLL_NEW_LOGS_SECONDS", "60"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("redline-agent")

# CloudPanel nginx combined log + optional trailing real-IP field:
# 1.2.3.4 - - [12/Jun/2026:11:00:00 +0000] "GET /path HTTP/2.0" 200 1234 "ref" "ua" "real-ip"
_NGINX_RE = re.compile(
    r"(?P<proxy_ip>\S+) - \S+ \[(?P<time>[^\]]+)\] "
    r'"(?P<method>\S+) (?P<path>\S+) [^"]*" '
    r"(?P<status>\d{3}) (?P<bytes>\S+) "
    r'"[^"]*" "[^"]*"'
    r'(?:\s+"(?P<real_ip>[^"]+)")?'
)
_TIME_FMT = "%d/%b/%Y:%H:%M:%S %z"
_PRIVATE = ("127.", "10.", "192.168.", "::1", "172.16.", "172.17.", "172.18.",
            "172.19.", "172.20.", "172.21.", "172.22.", "172.23.", "172.24.",
            "172.25.", "172.26.", "172.27.", "172.28.", "172.29.", "172.30.",
            "172.31.")


def parse_nginx(line):
    m = _NGINX_RE.match(line)
    if not m:
        return None
    real_ip = m.group("real_ip") or m.group("proxy_ip")
    if real_ip.startswith(_PRIVATE):
        return None
    try:
        dt = datetime.strptime(m.group("time"), _TIME_FMT).astimezone(timezone.utc)
        timestamp = dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    except ValueError:
        return None
    return {
        "timestamp": timestamp,
        "ip": real_ip,
        "method": m.group("method"),
        "path": m.group("path"),
        "status_code": int(m.group("status")),
        "response_time_ms": 0.0,
    }


def discover_logs(pattern):
    excluded = {Path(p) for p in glob.glob(EXCLUDE_GLOB, recursive=True)} if EXCLUDE_GLOB else set()
    return {Path(p) for p in glob.glob(pattern, recursive=True) if Path(p).is_file()} - excluded


async def ship(client, raw):
    parsed = parse_nginx(raw)
    if parsed is None:
        return True
    payload = json.dumps(parsed)
    try:
        r = await client.post(WEBHOOK_URL, json={"raw": payload}, timeout=HTTP_TIMEOUT)
        if r.status_code == 200:
            return True
        log.warning("HTTP %s  %.120s", r.status_code, raw)
        return False
    except Exception as exc:
        log.error("send error: %s", exc)
        return False


async def tail(path, queue):
    log.info("watching  %s", path)
    try:
        with open(path, "r", errors="replace") as fh:
            fh.seek(0, 2)
            while True:
                line = fh.readline()
                if line:
                    s = line.rstrip("\n")
                    if s:
                        await queue.put(s)
                else:
                    await asyncio.sleep(0.1)
    except asyncio.CancelledError:
        raise
    except Exception as exc:
        log.error("tail %s: %s -- retrying in %.0fs", path, exc, RETRY_DELAY)
        await asyncio.sleep(RETRY_DELAY)


async def sender(queue):
    async with httpx.AsyncClient() as client:
        while True:
            try:
                raw = await asyncio.wait_for(queue.get(), timeout=1.0)
            except asyncio.TimeoutError:
                continue
            ok = await ship(client, raw)
            if not ok:
                await asyncio.sleep(RETRY_DELAY)
                await queue.put(raw)
            queue.task_done()


class Watcher:
    def __init__(self, queue):
        self._q = queue
        self._tasks = {}

    def _start(self, path):
        self._tasks[path] = asyncio.create_task(tail(path, self._q), name="tail:{}".format(path))

    async def sync(self, pattern):
        current = discover_logs(pattern)
        for p in current - set(self._tasks):
            self._start(p)
        for p in set(self._tasks) - current:
            log.info("stopped   %s", p)
            self._tasks.pop(p).cancel()

    async def cancel_all(self):
        for t in self._tasks.values():
            t.cancel()
        await asyncio.gather(*self._tasks.values(), return_exceptions=True)


async def main():
    log.info("Redline agent starting")
    log.info("webhook  -> %s", WEBHOOK_URL)
    log.info("log glob -> %s", LOG_GLOB)

    queue = asyncio.Queue(maxsize=10000)
    watcher = Watcher(queue)
    sender_task = asyncio.create_task(sender(queue), name="sender")

    await watcher.sync(LOG_GLOB)
    if not watcher._tasks:
        log.warning("no logs found matching %s -- will keep checking", LOG_GLOB)

    async def rescan():
        while True:
            await asyncio.sleep(POLL_INTERVAL)
            await watcher.sync(LOG_GLOB)

    rescan_task = asyncio.create_task(rescan(), name="rescan")

    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, stop.set)

    await stop.wait()
    log.info("shutting down")
    rescan_task.cancel()
    sender_task.cancel()
    await watcher.cancel_all()
    await asyncio.gather(rescan_task, sender_task, return_exceptions=True)
    log.info("done")


asyncio.run(main())
PYEOF
}

# ── install mode ──────────────────────────────────────────────────────────────

do_install() {
    require_root
    require_webhook
    ensure_python

    echo "creating $INSTALL_DIR"
    mkdir -p "$INSTALL_DIR"

    echo "writing agent"
    write_agent "$PYTHON_SCRIPT"
    chmod 600 "$PYTHON_SCRIPT"

    echo "creating venv and installing httpx"
    python3 -m venv "$INSTALL_DIR/venv"
    "$INSTALL_DIR/venv/bin/pip" install -q httpx

    echo "writing env file"
    cat > "$ENV_FILE" <<EOF
REDLINE_WEBHOOK_URL=${REDLINE_WEBHOOK_URL}
CLOUDPANEL_LOG_GLOB=${CLOUDPANEL_LOG_GLOB:-/home/*/logs/nginx/access.log}
EXCLUDE_LOG_GLOB=${EXCLUDE_LOG_GLOB:-}
HTTP_TIMEOUT=${HTTP_TIMEOUT:-10}
RETRY_DELAY=${RETRY_DELAY:-5}
POLL_NEW_LOGS_SECONDS=${POLL_NEW_LOGS_SECONDS:-60}
EOF
    chmod 600 "$ENV_FILE"

    echo "installing systemd service"
    cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=Redline CloudPanel Log Agent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
EnvironmentFile=$ENV_FILE
ExecStart=$INSTALL_DIR/venv/bin/python $PYTHON_SCRIPT
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable "$SERVICE_NAME"
    systemctl restart "$SERVICE_NAME"

    echo ""
    echo "Installed and started."
    echo "  logs:   journalctl -u $SERVICE_NAME -f"
    echo "  config: $ENV_FILE"
}

# ── run mode (foreground, no install) ─────────────────────────────────────────

do_run() {
    require_webhook
    ensure_python

    if ! python3 -c "import httpx" 2>/dev/null; then
        echo "installing httpx..."
        python3 -m pip install -q httpx
    fi

    TMPFILE=$(mktemp /tmp/redline-agent-XXXXXX.py)
    trap 'rm -f "$TMPFILE"' EXIT
    write_agent "$TMPFILE"
    exec python3 "$TMPFILE"
}

# ── dispatch ──────────────────────────────────────────────────────────────────

case "${1:-}" in
    install) do_install ;;
    run)     do_run ;;
    *)
        echo "Usage: REDLINE_WEBHOOK_URL=<url> bash $0 install|run" >&2
        exit 1
        ;;
esac
