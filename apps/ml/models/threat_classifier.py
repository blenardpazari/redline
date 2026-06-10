from pathlib import Path
from typing import TypedDict

import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

_ARTIFACT = "threat_classifier.joblib"


class ClassifierArtifact(TypedDict):
    pipeline: Pipeline
    classes: list[str]


def train(df: pd.DataFrame, artifacts_path: str) -> None:
    X = df["path"].astype(str)
    y = df["threat_type"].astype(str)

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            analyzer="char_wb",
            ngram_range=(2, 4),
            max_features=10000,
            sublinear_tf=True,
        )),
        ("clf", LogisticRegression(
            max_iter=1000,
            random_state=42,
            C=1.0,
        )),
    ])
    pipeline.fit(X, y)

    classes = list(pipeline.named_steps["clf"].classes_)
    joblib.dump(
        ClassifierArtifact(pipeline=pipeline, classes=classes),
        Path(artifacts_path) / _ARTIFACT,
    )


def load(artifacts_path: str) -> ClassifierArtifact:
    path = Path(artifacts_path) / _ARTIFACT
    if not path.exists():
        raise FileNotFoundError(f"Threat classifier artifact not found: {path}")
    return joblib.load(path)  # type: ignore[no-any-return]


def predict(artifact: ClassifierArtifact, path: str) -> tuple[str, float]:
    probs = artifact["pipeline"].predict_proba([path])[0]
    idx = int(np.argmax(probs))
    threat_type = artifact["classes"][idx]
    confidence = float(probs[idx] * 100)
    return threat_type, confidence
