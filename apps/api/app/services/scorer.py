from pathlib import Path
from typing import TypedDict

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import MinMaxScaler

from app.types.models import ThreatLevel, ThreatScore


class ScorerInput(TypedDict):
    path: str
    response_time_ms: float
    status_code: int
    hour_of_day: int
    is_known_attack_path: bool
    requests_per_minute: float


class _AnomalyArtifact(TypedDict):
    model: IsolationForest
    scaler: MinMaxScaler


class _ClassifierArtifact(TypedDict):
    pipeline: Pipeline
    classes: list[str]


class ScorerModels(TypedDict):
    anomaly: _AnomalyArtifact
    classifier: _ClassifierArtifact


def load_models(artifacts_path: str) -> ScorerModels:
    anomaly_path = Path(artifacts_path) / "anomaly_detector.joblib"
    classifier_path = Path(artifacts_path) / "threat_classifier.joblib"
    if not anomaly_path.exists():
        raise FileNotFoundError(f"Anomaly artifact not found: {anomaly_path}")
    if not classifier_path.exists():
        raise FileNotFoundError(f"Classifier artifact not found: {classifier_path}")
    return ScorerModels(
        anomaly=joblib.load(anomaly_path),
        classifier=joblib.load(classifier_path),
    )


def _anomaly_score(artifact: _AnomalyArtifact, entry: ScorerInput) -> float:
    X = np.array([[
        entry["requests_per_minute"],
        entry["response_time_ms"],
        float(entry["status_code"]),
        float(entry["hour_of_day"]),
        float(entry["is_known_attack_path"]),
    ]])
    raw = -artifact["model"].decision_function(X)
    score = artifact["scaler"].transform(raw.reshape(-1, 1))[0][0]
    return float(np.clip(score, 0.0, 100.0))


def _classifier_score(artifact: _ClassifierArtifact, path: str) -> tuple[str, float]:
    probs = artifact["pipeline"].predict_proba([path])[0]
    idx = int(np.argmax(probs))
    return artifact["classes"][idx], float(probs[idx] * 100)


def _threat_level(final_score: float) -> ThreatLevel:
    if final_score >= 85:
        return "critical"
    if final_score >= 70:
        return "warning"
    if final_score >= 40:
        return "suspicious"
    return "normal"


def score(models: ScorerModels, entry: ScorerInput) -> ThreatScore:
    anomaly = _anomaly_score(models["anomaly"], entry)
    threat_type, classifier_confidence = _classifier_score(models["classifier"], entry["path"])
    final = float(np.clip((anomaly * 0.6) + (classifier_confidence * 0.4), 0.0, 100.0))
    return ThreatScore(
        anomaly_score=anomaly,
        classifier_confidence=classifier_confidence,
        threat_type=threat_type,
        final_score=final,
        threat_level=_threat_level(final),
    )
