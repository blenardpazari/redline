import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, confusion_matrix
from sklearn.model_selection import train_test_split

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.db.connection import get_connection
from app.services.scorer import load_models, train_models
from auth.jwt_handler import require_auth
from config import get_config

router = APIRouter(prefix="/insights", tags=["insights"])


def _write_evaluation(artifacts_path: str, data: list[dict], trained_at: str) -> None:
    import joblib
    path = Path(artifacts_path)
    labels = [r["threat_type"] or "NORMAL" for r in data]
    paths = [r["path"] for r in data]

    train_idx, test_idx = train_test_split(range(len(data)), test_size=0.2, random_state=42, stratify=labels)
    test_labels = [labels[i] for i in test_idx]
    test_paths = [paths[i] for i in test_idx]

    clf_artifact = joblib.load(path / "threat_classifier.joblib")
    pipeline = clf_artifact["pipeline"]
    classes = clf_artifact["classes"]
    preds = pipeline.predict(test_paths)

    def _metrics(name: str, y_true: list, y_pred: list, feat_imp=None) -> dict:
        cm = confusion_matrix(y_true, y_pred, labels=classes).tolist()
        per_class = {}
        for i, cls in enumerate(classes):
            y_b = [1 if y == cls else 0 for y in y_true]
            p_b = [1 if p == cls else 0 for p in y_pred]
            per_class[cls] = {
                "precision": round(precision_score(y_b, p_b, zero_division=0), 4),
                "recall": round(recall_score(y_b, p_b, zero_division=0), 4),
                "f1": round(f1_score(y_b, p_b, zero_division=0), 4),
                "support": int(sum(y_b)),
            }
        m = {
            "name": name,
            "accuracy": round(accuracy_score(y_true, y_pred), 4),
            "precision": round(precision_score(y_true, y_pred, average="weighted", zero_division=0), 4),
            "recall": round(recall_score(y_true, y_pred, average="weighted", zero_division=0), 4),
            "f1": round(f1_score(y_true, y_pred, average="weighted", zero_division=0), 4),
            "confusion_matrix": cm,
            "classes": classes,
            "per_class": per_class,
        }
        if feat_imp is not None:
            m["feature_importances"] = [round(float(v), 4) for v in feat_imp]
        return m

    clf_metrics = _metrics("Threat Classifier (TF-IDF)", test_labels, preds)

    scores = [r["status_code"] for r in data]
    buckets = ["0-20", "20-40", "40-60", "60-80", "80-100"]
    distribution: dict = {cls: [0, 0, 0, 0, 0] for cls in classes}
    for r, lbl in zip(data, labels):
        score = min(int(r["status_code"] / 10), 4)
        distribution[lbl][score] += 1

    evaluation = {
        "classifier": {"models": [clf_metrics], "winner": clf_metrics["name"]},
        "anomaly": {"models": [clf_metrics], "winner": clf_metrics["name"]},
        "score_distribution": {"buckets": buckets, "distribution": distribution},
        "dataset": {
            "total": len(data),
            "class_counts": dict(Counter(labels)),
            "test_size": 0.2,
        },
        "trained_at": trained_at,
    }

    with open(path / "evaluation.json", "w") as f:
        json.dump(evaluation, f, indent=2)


@router.get("")
def get_insights():
    cfg = get_config()
    eval_path = Path(cfg.ml_artifacts_path) / "evaluation.json"
    if not eval_path.exists():
        raise HTTPException(status_code=404, detail="evaluation.json not found — run train.py to generate it")
    with open(eval_path) as f:
        return json.load(f)


class RetrainResponse(BaseModel):
    samples: int
    trained_at: str


@router.post("/retrain", response_model=RetrainResponse)
def retrain(request: Request, _: str = Depends(require_auth)):
    cfg = get_config()
    conn = get_connection()

    _KNOWN_ATTACK_PATHS = frozenset({
        "/.env", "/.git/config", "/wp-admin", "/phpmyadmin", "/phpinfo.php",
        "/admin", "/.htaccess", "/config.php", "/../../../etc/passwd",
        "/wp-login.php", "/auth/login", "/admin/login",
    })

    rows = conn.execute(
        """
        SELECT path, response_time_ms, status_code, threat_type,
               CAST(strftime('%H', timestamp) AS INTEGER) AS hour_of_day,
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
        raise HTTPException(status_code=422, detail="No log data available for training")

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
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    request.app.state.models = load_models(cfg.ml_artifacts_path)

    trained_at = datetime.now(timezone.utc).isoformat()
    _write_evaluation(cfg.ml_artifacts_path, data, trained_at)

    return RetrainResponse(samples=samples, trained_at=trained_at)


@router.get("/retrain/status")
def retrain_status():
    return {"running": False, "last_exit": 0, "last_output": ""}
