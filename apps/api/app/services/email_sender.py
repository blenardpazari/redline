import smtplib
from email.mime.text import MIMEText

from config import AppConfig


def send_critical_alert(
    cfg: AppConfig,
    ip: str,
    country: str | None,
    threat_type: str,
    score: float,
    path: str,
    timestamp: str,
    recipient: str | None = None,
) -> None:
    body = (
        f"IP:       {ip}\n"
        f"Country:  {country or 'Unknown'}\n"
        f"Type:     {threat_type}\n"
        f"Score:    {score:.1f}/100\n"
        f"Path:     {path}\n"
        f"Time:     {timestamp}\n"
        "\n—\nRedline"
    )
    msg = MIMEText(body)
    msg["Subject"] = f"[Redline] CRITICAL — {threat_type}"
    msg["From"] = cfg.smtp_user
    msg["To"] = recipient or cfg.alert_email_to
    _send(cfg, msg)


def send_test_alert(cfg: AppConfig, recipient: str) -> None:
    body = "This is a test alert from Redline. Your email notifications are configured correctly.\n\n—\nRedline"
    msg = MIMEText(body)
    msg["Subject"] = "[Redline] Test Alert"
    msg["From"] = cfg.smtp_user
    msg["To"] = recipient
    _send(cfg, msg)


def _send(cfg: AppConfig, msg: MIMEText) -> None:
    with smtplib.SMTP(cfg.smtp_host, cfg.smtp_port) as server:
        server.ehlo()
        server.starttls()
        server.login(cfg.smtp_user, cfg.smtp_app_password)
        server.send_message(msg)
