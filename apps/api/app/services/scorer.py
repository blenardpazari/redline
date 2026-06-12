from pathlib import Path
from typing import TypedDict

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
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


def load_models(artifacts_path: str) -> ScorerModels | None:
    anomaly_path = Path(artifacts_path) / "anomaly_detector.joblib"
    classifier_path = Path(artifacts_path) / "threat_classifier.joblib"
    if not anomaly_path.exists() or not classifier_path.exists():
        print(f"[scorer] model artifacts not found in {artifacts_path}, scoring disabled until trained")
        return None
    return ScorerModels(
        anomaly=joblib.load(anomaly_path),
        classifier=joblib.load(classifier_path),
    )


def train_models(artifacts_path: str, rows: list[dict]) -> int:
    """Train models from log_entries rows and save artifacts. Returns number of samples used."""
    if len(rows) < 10:
        raise ValueError(f"Not enough data to train: {len(rows)} rows (need at least 10)")

    Path(artifacts_path).mkdir(parents=True, exist_ok=True)

    # --- anomaly detector (IsolationForest) ---
    X_anomaly = np.array([
        [
            r["requests_per_minute"],
            r["response_time_ms"],
            float(r["status_code"]),
            float(r["hour_of_day"]),
            float(r["is_known_attack_path"]),
        ]
        for r in rows
    ])
    iso = IsolationForest(n_estimators=100, contamination=0.1, random_state=42)
    iso.fit(X_anomaly)
    raw_scores = -iso.decision_function(X_anomaly).reshape(-1, 1)
    scaler = MinMaxScaler()
    scaler.fit(raw_scores)
    joblib.dump({"model": iso, "scaler": scaler}, Path(artifacts_path) / "anomaly_detector.joblib")

    # --- threat classifier (TF-IDF + LogisticRegression) ---
    paths = [r["path"] for r in rows]
    labels = [r["threat_type"] if r["threat_type"] else "NORMAL" for r in rows]
    classes = sorted(set(labels))
    vectorizer = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), max_features=5000)
    X_cls = vectorizer.fit_transform(paths)
    clf = LogisticRegression(max_iter=1000, C=1.0)
    clf.fit(X_cls, labels)
    pipeline = Pipeline([("tfidf", vectorizer), ("clf", clf)])
    joblib.dump({"pipeline": pipeline, "classes": classes}, Path(artifacts_path) / "threat_classifier.joblib")

    return len(rows)


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
    classes = artifact["classes"]
    idx = int(np.argmax(probs))
    threat_type = classes[idx]
    normal_idx = list(classes).index("NORMAL") if "NORMAL" in classes else -1
    attack_prob = 1.0 - (probs[normal_idx] if normal_idx >= 0 else 0.0)
    return threat_type, float(attack_prob * 100)


def _threat_level(final_score: float) -> ThreatLevel:
    if final_score >= 85:
        return "critical"
    if final_score >= 70:
        return "warning"
    if final_score >= 55:
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
