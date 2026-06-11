import os
from dataclasses import dataclass
from functools import lru_cache
from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class AppConfig:
    admin_username: str
    admin_password_hash: str
    jwt_secret: str
    jwt_expires_hours: int
    sqlite_path: str
    ml_artifacts_path: str
    smtp_host: str
    smtp_port: int
    smtp_user: str
    smtp_app_password: str
    alert_email_to: str
    api_port: int
    api_host: str
    frontend_url: str
    redline_threshold: float
    alert_cooldown_minutes: int
    log_retention_days: int


@lru_cache(maxsize=1)
def get_config() -> AppConfig:
    return AppConfig(
        admin_username=os.environ["ADMIN_USERNAME"],
        admin_password_hash=os.environ["ADMIN_PASSWORD_HASH"],
        jwt_secret=os.environ["JWT_SECRET"],
        jwt_expires_hours=int(os.environ.get("JWT_EXPIRES_HOURS", "8")),
        sqlite_path=os.environ.get("SQLITE_PATH", "./data/redline.db"),
        ml_artifacts_path=os.environ.get("ML_ARTIFACTS_PATH", "./ml/artifacts"),
        smtp_host=os.environ.get("SMTP_HOST", "smtp.gmail.com"),
        smtp_port=int(os.environ.get("SMTP_PORT", "587")),
        smtp_user=os.environ.get("SMTP_USER", ""),
        smtp_app_password=os.environ.get("SMTP_APP_PASSWORD", ""),
        alert_email_to=os.environ.get("ALERT_EMAIL_TO", ""),
        api_port=int(os.environ.get("API_PORT", "8000")),
        api_host=os.environ.get("API_HOST", "0.0.0.0"),
        frontend_url=os.environ.get("FRONTEND_URL", "http://localhost:5173"),
        redline_threshold=float(os.environ.get("REDLINE_THRESHOLD", "85")),
        alert_cooldown_minutes=int(os.environ.get("ALERT_COOLDOWN_MINUTES", "15")),
        log_retention_days=int(os.environ.get("LOG_RETENTION_DAYS", "30")),
    )
