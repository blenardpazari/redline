from pathlib import Path
from typing import TypedDict

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import MinMaxScaler

FEATURE_COLS = [
    "requests_per_minute",
    "response_time_ms",
    "status_code",
    "hour_of_day",
    "is_known_attack_path",
]

_ARTIFACT = "anomaly_detector.joblib"


class AnomalyArtifact(TypedDict):
    model: IsolationForest
    scaler: MinMaxScaler


def train(df: pd.DataFrame, artifacts_path: str) -> None:
    X = df[FEATURE_COLS].astype(float).values

    model = IsolationForest(
        n_estimators=200,
        contamination=0.20,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X)

    raw_scores = -model.decision_function(X)
    scaler = MinMaxScaler(feature_range=(0, 100))
    scaler.fit(raw_scores.reshape(-1, 1))

    joblib.dump(AnomalyArtifact(model=model, scaler=scaler), Path(artifacts_path) / _ARTIFACT)


def load(artifacts_path: str) -> AnomalyArtifact:
    path = Path(artifacts_path) / _ARTIFACT
    if not path.exists():
        raise FileNotFoundError(f"Anomaly detector artifact not found: {path}")
    return joblib.load(path)  # type: ignore[no-any-return]


def predict(artifact: AnomalyArtifact, features: dict[str, float]) -> float:
    X = np.array([[features[col] for col in FEATURE_COLS]])
    raw = -artifact["model"].decision_function(X)
    score = artifact["scaler"].transform(raw.reshape(-1, 1))[0][0]
    return float(np.clip(score, 0.0, 100.0))
