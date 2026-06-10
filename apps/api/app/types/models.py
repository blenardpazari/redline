from typing import Literal
from pydantic import BaseModel

ThreatLevel = Literal["normal", "suspicious", "warning", "critical"]


class LogEntry(BaseModel):
    id: int
    timestamp: str
    ip: str
    country: str | None
    lat: float | None
    lon: float | None
    method: str
    path: str
    status_code: int
    response_time_ms: float
    threat_level: ThreatLevel
    threat_score: float
    threat_type: str | None


class Alert(BaseModel):
    id: int
    created_at: str
    ip: str
    country: str | None
    threat_type: str
    score: float
    path: str
    email_sent: bool


class ThreatScore(BaseModel):
    anomaly_score: float
    classifier_confidence: float
    threat_type: str
    final_score: float
    threat_level: ThreatLevel


class Stats(BaseModel):
    requests_today: int
    anomalies_today: int
    redlines_today: int
