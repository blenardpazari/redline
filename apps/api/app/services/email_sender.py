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
    msg["To"] = cfg.alert_email_to

    with smtplib.SMTP(cfg.smtp_host, cfg.smtp_port) as server:
        server.ehlo()
        server.starttls()
        server.login(cfg.smtp_user, cfg.smtp_app_password)
        server.send_message(msg)
