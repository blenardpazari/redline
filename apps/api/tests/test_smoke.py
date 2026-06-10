from app.types.models import Alert, LogEntry, Stats, ThreatScore


def test_models_importable() -> None:
    assert LogEntry.__name__ == "LogEntry"
    assert Alert.__name__ == "Alert"
    assert ThreatScore.__name__ == "ThreatScore"
    assert Stats.__name__ == "Stats"


def test_threat_level_literals() -> None:
    entry = LogEntry(
        id=1, timestamp="2024-01-15T14:23:01Z",
        ip="1.2.3.4", country="US", lat=37.09, lon=-95.71,
        method="GET", path="/", status_code=200,
        response_time_ms=120.0, threat_level="normal",
        threat_score=5.2, threat_type=None,
    )
    assert entry.threat_level == "normal"
