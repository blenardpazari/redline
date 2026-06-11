import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.db.connection import get_connection
from app.services.ingestion import _KNOWN_ATTACK_PATHS, _path_base
from app.services.scorer import ScorerInput, score
from auth.jwt_handler import require_auth

router = APIRouter(tags=["explain"])

_FEATURE_LABELS = {
    "requests_per_minute": "Request rate (req/min)",
    "response_time_ms":    "Response time (ms)",
    "status_code":         "HTTP status code",
    "hour_of_day":         "Hour of day",
    "is_known_attack_path": "Known attack path",
}

_FEATURE_EXPLANATIONS = {
    "requests_per_minute": {
        "high":   "Very high request rate — typical of brute-force or scanning attacks.",
        "medium": "Elevated request rate — slightly above normal traffic patterns.",
        "low":    "Normal request rate.",
    },
    "response_time_ms": {
        "high":   "Unusually high response time — may indicate server stress or exploitation attempt.",
        "medium": "Slightly elevated response time.",
        "low":    "Normal response time.",
    },
    "status_code": {
        "high":   "Error status code (4xx/5xx) — commonly seen in scanning or attack traffic.",
        "medium": "Redirect status code.",
        "low":    "Successful response.",
    },
    "hour_of_day": {
        "high":   "Request arrived at an unusual hour (late night) — less common for legitimate traffic.",
        "medium": "Request arrived in off-peak hours.",
        "low":    "Request arrived during normal business hours.",
    },
    "is_known_attack_path": {
        "high":   "Path matches a known attack vector (e.g. /.env, /wp-admin, /phpmyadmin).",
        "medium": "Path resembles known attack patterns.",
        "low":    "Path does not match known attack vectors.",
    },
}


def _feature_level(name: str, value: float) -> str:
    if name == "requests_per_minute":
        return "high" if value > 10 else "medium" if value > 3 else "low"
    if name == "response_time_ms":
        return "high" if value > 2000 else "medium" if value > 800 else "low"
    if name == "status_code":
        return "high" if value >= 400 else "medium" if value >= 300 else "low"
    if name == "hour_of_day":
        return "high" if value < 6 or value > 22 else "medium" if value < 8 or value > 20 else "low"
    if name == "is_known_attack_path":
        return "high" if value >= 1 else "low"
    return "low"


def _contribution_score(name: str, value: float) -> float:
    """0–100 contribution score for this feature."""
    level = _feature_level(name, value)
    weights = {"requests_per_minute": 30, "is_known_attack_path": 25,
               "status_code": 20, "response_time_ms": 15, "hour_of_day": 10}
    w = weights.get(name, 10)
    multiplier = {"high": 1.0, "medium": 0.5, "low": 0.05}[level]
    return round(w * multiplier, 1)


class FeatureContribution(BaseModel):
    name: str
    label: str
    value: float
    contribution: float
    level: str
    explanation: str


class ExplainResponse(BaseModel):
    log_id: int
    final_score: float
    threat_level: str
    threat_type: str
    anomaly_score: float
    classifier_confidence: float
    classifier_probs: dict[str, float]
    features: list[FeatureContribution]
    summary: str


@router.get("/explain/{log_id}", response_model=ExplainResponse)
async def explain(log_id: int, request: Request, _=Depends(require_auth)):
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM log_entries WHERE id = ?", (log_id,)
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Log entry not found")

    raw = json.loads(row["raw"])
    path: str = row["path"]
    dt = datetime.fromisoformat(row["timestamp"].replace("Z", "+00:00"))

    recent = conn.execute(
        "SELECT COUNT(*) FROM log_entries WHERE ip = ? AND timestamp >= datetime(?, '-5 minutes')",
        (row["ip"], row["timestamp"]),
    ).fetchone()[0]

    scorer_input = ScorerInput(
        path=path,
        response_time_ms=float(row["response_time_ms"]),
        status_code=int(row["status_code"]),
        hour_of_day=dt.hour,
        is_known_attack_path=_path_base(path) in _KNOWN_ATTACK_PATHS,
        requests_per_minute=recent / 5.0,
    )

    models = request.app.state.models
    threat = score(models, scorer_input)

    # Per-class probabilities from classifier
    clf = models["classifier"]
    probs_arr = clf["pipeline"].predict_proba([path])[0]
    classifier_probs = {
        cls: round(float(p) * 100, 1)
        for cls, p in zip(clf["classes"], probs_arr)
    }

    feature_values = {
        "requests_per_minute": scorer_input["requests_per_minute"],
        "response_time_ms":    scorer_input["response_time_ms"],
        "status_code":         float(scorer_input["status_code"]),
        "hour_of_day":         float(scorer_input["hour_of_day"]),
        "is_known_attack_path": float(scorer_input["is_known_attack_path"]),
    }

    features = []
    for name, value in feature_values.items():
        level = _feature_level(name, value)
        features.append(FeatureContribution(
            name=name,
            label=_FEATURE_LABELS[name],
            value=value,
            contribution=_contribution_score(name, value),
            level=level,
            explanation=_FEATURE_EXPLANATIONS[name][level],
        ))

    features.sort(key=lambda f: -f.contribution)

    # Human-readable summary
    top = [f for f in features if f.level == "high"]
    if top:
        reasons = " and ".join(f.label.lower() for f in top[:2])
        summary = f"Flagged as {threat.threat_type.replace('_', ' ').lower()} primarily due to {reasons}."
    elif threat.threat_level == "normal":
        summary = "No significant threat indicators detected — request appears normal."
    else:
        summary = f"Mild anomaly detected. Score driven by {features[0].label.lower()}."

    return ExplainResponse(
        log_id=log_id,
        final_score=threat.final_score,
        threat_level=threat.threat_level,
        threat_type=threat.threat_type,
        anomaly_score=threat.anomaly_score,
        classifier_confidence=threat.classifier_confidence,
        classifier_probs=classifier_probs,
        features=features,
        summary=summary,
    )
