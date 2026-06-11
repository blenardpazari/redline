import os
import time
from pathlib import Path

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.db.connection import get_connection
from app.db.queries import purge_old_entries
from app.db.server_queries import list_servers
from auth.jwt_handler import require_auth, require_admin
from config import get_config

router = APIRouter(prefix="/health", tags=["health"])

_START_TIME = time.time()


class HealthResponse(BaseModel):
    status: str
    uptime_seconds: float
    db_size_bytes: int
    db_log_count: int
    db_alert_count: int
    ml_model_version: str
    servers_total: int
    servers_online: int
    api_version: str = "1.0.0"


@router.get("", response_model=HealthResponse)
def health(_: str = Depends(require_auth)) -> HealthResponse:
    cfg = get_config()
    conn = get_connection()

    db_path = Path(cfg.sqlite_path)
    db_size = db_path.stat().st_size if db_path.exists() else 0

    log_count = int(conn.execute("SELECT COUNT(*) FROM log_entries").fetchone()[0])
    alert_count = int(conn.execute("SELECT COUNT(*) FROM alerts").fetchone()[0])

    servers = list_servers()
    servers_online = sum(1 for s in servers if s["status"] == "online")

    artifacts = Path(cfg.ml_artifacts_path)
    anomaly_path = artifacts / "anomaly_detector.joblib"
    if anomaly_path.exists():
        mtime = int(anomaly_path.stat().st_mtime)
        ml_version = f"trained-{mtime}"
    else:
        ml_version = "unknown"

    return HealthResponse(
        status="ok",
        uptime_seconds=round(time.time() - _START_TIME, 1),
        db_size_bytes=db_size,
        db_log_count=log_count,
        db_alert_count=alert_count,
        ml_model_version=ml_version,
        servers_total=len(servers),
        servers_online=servers_online,
    )


@router.delete("/purge", dependencies=[Depends(require_admin)])
def purge_logs(days: int = 0) -> dict:
    cfg = get_config()
    retention = days if days > 0 else cfg.log_retention_days
    logs, alerts = purge_old_entries(retention)
    return {"deleted_logs": logs, "deleted_alerts": alerts, "retention_days": retention}


@router.delete("/purge/all", dependencies=[Depends(require_admin)])
def purge_all_logs() -> dict:
    conn = get_connection()
    logs = conn.execute("DELETE FROM log_entries").rowcount
    alerts = conn.execute("DELETE FROM alerts").rowcount
    conn.commit()
    return {"deleted_logs": logs, "deleted_alerts": alerts}
