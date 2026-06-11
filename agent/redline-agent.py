#!/usr/bin/env python3
import json
import os
import re
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

REDLINE_URL  = os.getenv("REDLINE_URL",  "https://fd0c-80-90-84-234.ngrok-free.app")
REDLINE_KEY  = os.getenv("REDLINE_KEY",  "rl_1e579924eb000be9beb383da4c303939261cf92f545fc74b")
LOG_PATHS    = os.getenv("REDLINE_LOGS", "").split(",")
BATCH_SIZE   = int(os.getenv("REDLINE_BATCH", "10"))
RETRY_DELAY  = 5
STATE_FILE   = Path(os.getenv("REDLINE_STATE", "/tmp/redline-agent.state"))


def _discover_logs() -> list[str]:
    import glob
    found = []
    found += glob.glob("/home/*/logs/nginx/*_access.log")
    found += glob.glob("/home/*/logs/nginx/access.log")
    found += glob.glob("/var/log/nginx/access.log")
    found += glob.glob("/var/log/nginx/*_access.log")
    found += glob.glob("/var/log/apache2/access.log")
    found += glob.glob("/home/*/logs/apache2/*_access.log")
    return sorted(set(found))


if not any(LOG_PATHS):
    LOG_PATHS = _discover_logs()
    if not LOG_PATHS:
        print("[warn] No log files found. Set REDLINE_LOGS=/path/to/access.log")
    else:
        print(f"[info] Auto-discovered {len(LOG_PATHS)} log file(s)")

_NGINX_RE = re.compile(
    r'(?P<ip>\S+)'
    r' \S+ \S+ '
    r'\[(?P<time>[^\]]+)\]'
    r' "(?P<method>\S+)'
    r' (?P<path>\S+)'
    r' \S+" '
    r'(?P<status>\d{3})'
    r' (?P<bytes>\d+)'
    r' "(?P<referer>[^"]*)"'
    r' "(?P<ua>[^"]*)"'
    r'(?: "(?P<real_ip>[^"]*)")?'
    r'(?: (?P<rt>[\d.]+))?'
)

_TIME_FMT = "%d/%b/%Y:%H:%M:%S %z"


def parse_line(line: str) -> dict | None:
    m = _NGINX_RE.match(line.strip())
    if not m:
        return None

    try:
        dt = datetime.strptime(m.group("time"), _TIME_FMT)
    except ValueError:
        dt = datetime.now(timezone.utc)

    rt_raw = m.group("rt")
    if rt_raw:
        response_time_ms = float(rt_raw) * 1000
    else:
        status = int(m.group("status"))
        response_time_ms = 800.0 if status >= 500 else 10.0 if status in (301, 302) else 120.0

    real_ip = m.group("real_ip")
    ip = real_ip if real_ip and real_ip != "-" else m.group("ip")

    return {
        "timestamp": dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "ip":              ip,
        "method":          m.group("method"),
        "path":            m.group("path"),
        "status_code":     int(m.group("status")),
        "response_time_ms": response_time_ms,
        "country":         None,
    }


def send(entries: list[dict]) -> bool:
    url = f"{REDLINE_URL.rstrip('/')}/ingest/webhook/{REDLINE_KEY}"
    for entry in entries:
        payload = json.dumps({"raw": json.dumps(entry)}).encode()
        req = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=10):
                pass
        except urllib.error.HTTPError as e:
            print(f"[warn] HTTP {e.code} for {entry['ip']} {entry['path']}")
        except Exception as e:
            print(f"[error] Send failed: {e}")
            return False
    return True


def load_state() -> dict:
    try:
        return json.loads(STATE_FILE.read_text())
    except Exception:
        return {}


def save_state(state: dict) -> None:
    try:
        STATE_FILE.write_text(json.dumps(state))
    except Exception:
        pass


def read_new_lines(path: str, offsets: dict) -> list[str]:
    p = Path(path)
    if not p.exists():
        return []

    try:
        stat = p.stat()
        inode = stat.st_ino
        size = stat.st_size
    except OSError:
        return []

    saved = offsets.get(path, {})
    saved_inode = saved.get("inode")
    offset = saved.get("offset", 0)

    if saved_inode != inode:
        offset = 0

    if size <= offset:
        offsets[path] = {"inode": inode, "offset": offset}
        return []

    lines = []
    try:
        with open(path, "r", errors="replace") as f:
            f.seek(offset)
            for line in f:
                lines.append(line)
            offset = f.tell()
    except OSError:
        return []

    offsets[path] = {"inode": inode, "offset": offset}
    return lines


def main():
    print(f"[info] Redline agent starting")
    print(f"[info] Endpoint: {REDLINE_URL}")
    print(f"[info] Watching: {', '.join(LOG_PATHS)}")

    offsets: dict = {}
    for path in LOG_PATHS:
        p = Path(path)
        if p.exists():
            stat = p.stat()
            offsets[path] = {"inode": stat.st_ino, "offset": stat.st_size}

    buffer: list[dict] = []

    while True:
        got_any = False
        for path in LOG_PATHS:
            for line in read_new_lines(path, offsets):
                entry = parse_line(line)
                if entry:
                    buffer.append(entry)
                    got_any = True
                    if len(buffer) >= BATCH_SIZE:
                        if not send(buffer):
                            time.sleep(RETRY_DELAY)
                        else:
                            print(f"[info] Sent {len(buffer)} entries")
                        buffer.clear()

        save_state(offsets)

        if not got_any:
            if buffer:
                if send(buffer):
                    print(f"[info] Sent {len(buffer)} entries (flush)")
                    buffer.clear()
                else:
                    time.sleep(RETRY_DELAY)
            time.sleep(0.5)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n[info] Agent stopped")
