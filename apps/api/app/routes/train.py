from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from app.db.connection import get_connection
from app.services.scorer import load_models, train_models
from auth.jwt_handler import require_auth
from config import get_config

router = APIRouter(prefix="/admin", tags=["admin"])


class TrainResponse(BaseModel):
    samples: int
    trained_at: str


@router.post("/train", response_model=TrainResponse)
def trigger_training(
    request: Request,
    _: str = Depends(require_auth),
) -> TrainResponse:
    cfg = get_config()
    conn = get_connection()

    rows = conn.execute(
        """
        SELECT
            path,
            response_time_ms,
            status_code,
            CAST(strftime('%H', timestamp) AS INTEGER) AS hour_of_day,
            threat_type,
            (SELECT COUNT(*) FROM log_entries l2
             WHERE l2.ip = l1.ip
               AND l2.timestamp BETWEEN datetime(l1.timestamp, '-5 minutes') AND l1.timestamp
            ) AS requests_per_minute
        FROM log_entries l1
        ORDER BY timestamp DESC
        LIMIT 50000
        """
    ).fetchall()

    if not rows:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No log data available for training",
        )

    _KNOWN_ATTACK_PATHS = frozenset({
        "/.env", "/.git/config", "/wp-admin", "/phpmyadmin", "/phpinfo.php",
        "/admin", "/.htaccess", "/config.php", "/../../../etc/passwd",
        "/wp-login.php", "/auth/login", "/admin/login",
    })

    data = [
        {
            "path": r["path"],
            "response_time_ms": float(r["response_time_ms"]),
            "status_code": int(r["status_code"]),
            "hour_of_day": int(r["hour_of_day"]),
            "is_known_attack_path": r["path"].split("?")[0] in _KNOWN_ATTACK_PATHS,
            "threat_type": r["threat_type"],
            "requests_per_minute": float(r["requests_per_minute"]) / 5.0,
        }
        for r in rows
    ]

    try:
        samples = train_models(cfg.ml_artifacts_path, data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    request.app.state.models = load_models(cfg.ml_artifacts_path)

    return TrainResponse(samples=samples, trained_at=datetime.utcnow().isoformat())
