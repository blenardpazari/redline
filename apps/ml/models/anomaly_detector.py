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
        contamination=0.05,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X)

    # Calibrate scaler on normal-only scores so clean traffic anchors low (~10-25)
    # and attack traffic pushes into the upper range (60+).
    X_normal = df.loc[df["threat_type"] == "NORMAL", FEATURE_COLS].astype(float).values
    X_attack = df.loc[df["threat_type"] != "NORMAL", FEATURE_COLS].astype(float).values
    normal_scores = -model.decision_function(X_normal)
    attack_scores = -model.decision_function(X_attack)
    scaler = MinMaxScaler(feature_range=(0, 100))
    scaler.fit(np.concatenate([normal_scores, attack_scores]).reshape(-1, 1))

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
