"""Send alert notifications to external connectors (Slack, Telegram, Discord, Webhook, Email)."""
import json
import smtplib
import urllib.request
from email.mime.text import MIMEText
from app.db.queries import list_connectors


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------

def _post_json(url: str, payload: dict, headers: dict | None = None) -> None:
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json", **(headers or {})},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=5):
        pass


# ---------------------------------------------------------------------------
# Per-type senders
# ---------------------------------------------------------------------------

def _slack(config: dict, message: str) -> None:
    _post_json(config["webhook_url"], {"text": message})


def _telegram(config: dict, message: str) -> None:
    url = f"https://api.telegram.org/bot{config['bot_token']}/sendMessage"
    _post_json(url, {"chat_id": config["chat_id"], "text": message, "parse_mode": "HTML"})


def _discord(config: dict, message: str) -> None:
    _post_json(config["webhook_url"], {"content": message})


def _webhook(config: dict, payload: dict) -> None:
    headers = {"X-Redline-Secret": config["secret"]} if config.get("secret") else {}
    _post_json(config["url"], payload, headers)


def _email(config: dict, message: str, subject: str = "[Redline] Alert") -> None:
    msg = MIMEText(message)
    msg["Subject"] = subject
    msg["From"] = config["smtp_user"]
    msg["To"] = config["recipient"]
    port = int(config.get("smtp_port", 587))
    with smtplib.SMTP(config["smtp_host"], port) as server:
        server.ehlo()
        server.starttls()
        server.login(config["smtp_user"], config["smtp_password"])
        server.send_message(msg)


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _format_message(ip: str, country: str | None, threat_type: str, score: float, path: str, timestamp: str) -> str:
    flag = f" ({country})" if country else ""
    return (
        f"🚨 Redline Alert\n"
        f"IP: {ip}{flag}\n"
        f"Threat: {threat_type} — score {score:.0f}\n"
        f"Path: {path}\n"
        f"Time: {timestamp}"
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def fire_connectors(
    ip: str,
    country: str | None,
    threat_type: str,
    score: float,
    path: str,
    timestamp: str,
) -> None:
    connectors = list_connectors()
    if not connectors:
        return

    message = _format_message(ip, country, threat_type, score, path, timestamp)
    raw_payload = {
        "ip": ip, "country": country, "threat_type": threat_type,
        "score": score, "path": path, "timestamp": timestamp,
    }

    for connector in connectors:
        if not connector["enabled"]:
            continue
        try:
            t = connector["type"]
            cfg = connector["config"]
            if t == "slack":
                _slack(cfg, message)
            elif t == "telegram":
                _telegram(cfg, message)
            elif t == "discord":
                _discord(cfg, message)
            elif t == "webhook":
                _webhook(cfg, raw_payload)
            elif t == "email":
                subject = f"[Redline] {threat_type} — score {score:.0f}"
                _email(cfg, message, subject)
        except Exception:
            pass


def test_connector(type_: str, config: dict) -> None:
    """Raises on failure so the caller can surface the error."""
    message = "🔔 Redline test notification — connector is working."
    if type_ == "slack":
        _slack(config, message)
    elif type_ == "telegram":
        _telegram(config, message)
    elif type_ == "discord":
        _discord(config, message)
    elif type_ == "webhook":
        _webhook(config, {"test": True, "message": message})
    elif type_ == "email":
        _email(config, message, "[Redline] Test Notification")
    else:
        raise ValueError(f"Unknown connector type: {type_}")
