import json
from pathlib import Path

import numpy as np
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    accuracy_score,
)
from sklearn.model_selection import GridSearchCV, StratifiedKFold, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import MinMaxScaler
from sklearn.feature_extraction.text import TfidfVectorizer

from data.generator import generate_dataset
from models.anomaly_detector import train as train_anomaly, FEATURE_COLS
from models.threat_classifier import train as train_classifier

ARTIFACTS = Path(__file__).parent / "artifacts"


# ── Threat Classifier Evaluation ──────────────────────────────────────────────

def evaluate_classifier(df):
    """Train/test split + GridSearch + Random Forest comparison."""
    X = df["path"].astype(str)
    y = df["threat_type"].astype(str)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    classes = sorted(y.unique().tolist())

    # ── Model 1: Logistic Regression with GridSearch ──
    print("  GridSearchCV for Logistic Regression...")
    lr_pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4),
                                   max_features=10000, sublinear_tf=True)),
        ("clf", LogisticRegression(max_iter=1000, random_state=42)),
    ])
    param_grid = {"clf__C": [0.1, 1.0, 10.0], "clf__solver": ["lbfgs", "saga"]}
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    gs = GridSearchCV(lr_pipeline, param_grid, cv=cv, scoring="f1_weighted", n_jobs=-1)
    gs.fit(X_train, y_train)
    best_lr = gs.best_estimator_
    y_pred_lr = best_lr.predict(X_test)

    lr_metrics = {
        "name": "Logistic Regression (TF-IDF)",
        "best_params": gs.best_params_,
        "accuracy": round(accuracy_score(y_test, y_pred_lr), 4),
        "precision": round(precision_score(y_test, y_pred_lr, average="weighted", zero_division=0), 4),
        "recall": round(recall_score(y_test, y_pred_lr, average="weighted", zero_division=0), 4),
        "f1": round(f1_score(y_test, y_pred_lr, average="weighted", zero_division=0), 4),
        "confusion_matrix": confusion_matrix(y_test, y_pred_lr, labels=classes).tolist(),
        "classes": classes,
        "per_class": _per_class(y_test, y_pred_lr, classes),
        "cv_f1_mean": round(gs.best_score_, 4),
    }
    print(f"    LR best params: {gs.best_params_} | F1={lr_metrics['f1']}")

    # ── Model 2: Random Forest ──
    print("  Training Random Forest classifier...")
    from sklearn.feature_extraction.text import TfidfVectorizer as TV
    tfidf = TV(analyzer="char_wb", ngram_range=(2, 4), max_features=10000, sublinear_tf=True)
    X_train_tfidf = tfidf.fit_transform(X_train)
    X_test_tfidf  = tfidf.transform(X_test)

    rf_param_grid = {"n_estimators": [100, 200], "max_depth": [None, 20]}
    rf_gs = GridSearchCV(
        RandomForestClassifier(random_state=42),
        rf_param_grid, cv=cv, scoring="f1_weighted", n_jobs=-1
    )
    rf_gs.fit(X_train_tfidf, y_train)
    best_rf = rf_gs.best_estimator_
    y_pred_rf = best_rf.predict(X_test_tfidf)

    rf_metrics = {
        "name": "Random Forest",
        "best_params": rf_gs.best_params_,
        "accuracy": round(accuracy_score(y_test, y_pred_rf), 4),
        "precision": round(precision_score(y_test, y_pred_rf, average="weighted", zero_division=0), 4),
        "recall": round(recall_score(y_test, y_pred_rf, average="weighted", zero_division=0), 4),
        "f1": round(f1_score(y_test, y_pred_rf, average="weighted", zero_division=0), 4),
        "confusion_matrix": confusion_matrix(y_test, y_pred_rf, labels=classes).tolist(),
        "classes": classes,
        "per_class": _per_class(y_test, y_pred_rf, classes),
        "cv_f1_mean": round(rf_gs.best_score_, 4),
        "feature_importances": best_rf.feature_importances_.tolist(),
    }
    print(f"    RF best params: {rf_gs.best_params_} | F1={rf_metrics['f1']}")

    return lr_metrics, rf_metrics, best_lr


# ── Anomaly Detector Evaluation ───────────────────────────────────────────────

def evaluate_anomaly(df):
    """Evaluate Isolation Forest as binary anomaly detector."""
    X = df[FEATURE_COLS].astype(float).values
    y_binary = (df["threat_type"] != "NORMAL").astype(int).values  # 1=attack, 0=normal

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_binary, test_size=0.2, random_state=42, stratify=y_binary
    )

    # ── Model 1: Isolation Forest (current) ──
    print("  Evaluating Isolation Forest...")
    iforest = IsolationForest(n_estimators=200, contamination=0.05,
                              random_state=42, n_jobs=-1)
    iforest.fit(X_train)
    # -1 = anomaly → 1 (attack), 1 = normal → 0
    y_pred_if = (iforest.predict(X_test) == -1).astype(int)

    if_metrics = {
        "name": "Isolation Forest",
        "accuracy": round(accuracy_score(y_test, y_pred_if), 4),
        "precision": round(precision_score(y_test, y_pred_if, zero_division=0), 4),
        "recall": round(recall_score(y_test, y_pred_if, zero_division=0), 4),
        "f1": round(f1_score(y_test, y_pred_if, zero_division=0), 4),
        "confusion_matrix": confusion_matrix(y_test, y_pred_if).tolist(),
        "classes": ["normal", "attack"],
    }
    print(f"    IF: Precision={if_metrics['precision']} Recall={if_metrics['recall']} F1={if_metrics['f1']}")

    # ── Model 2: Isolation Forest with tuned contamination ──
    print("  Isolation Forest with tuned contamination=0.40...")
    iforest2 = IsolationForest(n_estimators=300, contamination=0.40,
                               random_state=42, n_jobs=-1)
    iforest2.fit(X_train)
    y_pred_if2 = (iforest2.predict(X_test) == -1).astype(int)

    if2_metrics = {
        "name": "Isolation Forest (tuned)",
        "accuracy": round(accuracy_score(y_test, y_pred_if2), 4),
        "precision": round(precision_score(y_test, y_pred_if2, zero_division=0), 4),
        "recall": round(recall_score(y_test, y_pred_if2, zero_division=0), 4),
        "f1": round(f1_score(y_test, y_pred_if2, zero_division=0), 4),
        "confusion_matrix": confusion_matrix(y_test, y_pred_if2).tolist(),
        "classes": ["normal", "attack"],
    }
    print(f"    IF-tuned: Precision={if2_metrics['precision']} Recall={if2_metrics['recall']} F1={if2_metrics['f1']}")

    return if_metrics, if2_metrics


# ── Score distribution ─────────────────────────────────────────────────────────

def score_distribution(df):
    """Returns histogram buckets of threat scores per threat_type."""
    X = df[FEATURE_COLS].astype(float).values
    scaler = MinMaxScaler(feature_range=(0, 100))
    model = IsolationForest(n_estimators=200, contamination=0.05, random_state=42)
    model.fit(X)
    raw = -model.decision_function(X)
    scores = scaler.fit_transform(raw.reshape(-1, 1)).flatten()

    buckets = list(range(0, 101, 10))
    distribution = {}
    for threat in df["threat_type"].unique():
        mask = df["threat_type"] == threat
        hist, _ = np.histogram(scores[mask], bins=buckets)
        distribution[threat] = hist.tolist()

    return {"buckets": [f"{b}-{b+10}" for b in buckets[:-1]], "distribution": distribution}


# ── Helpers ────────────────────────────────────────────────────────────────────

def _per_class(y_true, y_pred, classes):
    report = classification_report(y_true, y_pred, labels=classes,
                                   output_dict=True, zero_division=0)
    return {
        cls: {
            "precision": round(report[cls]["precision"], 4),
            "recall": round(report[cls]["recall"], 4),
            "f1": round(report[cls]["f1-score"], 4),
            "support": int(report[cls]["support"]),
        }
        for cls in classes if cls in report
    }


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    ARTIFACTS.mkdir(exist_ok=True)

    print("Generating dataset...")
    df = generate_dataset(n_samples=5000, seed=42)
    print(f"  {len(df)} rows, classes: {df['threat_type'].value_counts().to_dict()}")

    print("Training & evaluating threat classifier...")
    lr_metrics, rf_metrics, best_lr = evaluate_classifier(df)

    print("Training & evaluating anomaly detector...")
    if_metrics, if2_metrics = evaluate_anomaly(df)

    print("Computing score distribution...")
    dist = score_distribution(df)

    # Save final artifacts using the best models
    print("Saving final model artifacts...")
    train_anomaly(df, str(ARTIFACTS))
    train_classifier(df, str(ARTIFACTS))

    # Save evaluation.json — consumed by API /insights endpoint
    evaluation = {
        "classifier": {
            "models": [lr_metrics, rf_metrics],
            "winner": "Logistic Regression (TF-IDF)" if lr_metrics["f1"] >= rf_metrics["f1"] else "Random Forest",
        },
        "anomaly": {
            "models": [if_metrics, if2_metrics],
            "winner": "Isolation Forest (tuned)" if if2_metrics["f1"] >= if_metrics["f1"] else "Isolation Forest",
        },
        "score_distribution": dist,
        "dataset": {
            "total": len(df),
            "class_counts": df["threat_type"].value_counts().to_dict(),
            "test_size": 0.2,
        },
        "trained_at": __import__("datetime").datetime.utcnow().isoformat() + "Z",
    }

    eval_path = ARTIFACTS / "evaluation.json"
    with open(eval_path, "w") as f:
        json.dump(evaluation, f, indent=2)
    print(f"  Saved evaluation.json")

    # Print summary
    print("\n── Classifier Results ──")
    for m in [lr_metrics, rf_metrics]:
        print(f"  {m['name']}: Acc={m['accuracy']} P={m['precision']} R={m['recall']} F1={m['f1']}")

    print("\n── Anomaly Results ──")
    for m in [if_metrics, if2_metrics]:
        print(f"  {m['name']}: Acc={m['accuracy']} P={m['precision']} R={m['recall']} F1={m['f1']}")

    print("\nDone.")


if __name__ == "__main__":
    main()
