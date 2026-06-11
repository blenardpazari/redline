from typing import Annotated

from fastapi import APIRouter, Depends, Query
from app.db.connection import get_connection
from auth.jwt_handler import require_auth

router = APIRouter(prefix="/clustering", tags=["clustering"])


@router.get("")
def get_clusters(
    hours: Annotated[int, Query(ge=1, le=168)] = 24,
    server_id: Annotated[int | None, Query()] = None,
    _=Depends(require_auth),
):
    conn = get_connection()
    since = f"datetime('now', '-{hours} hours')"
    server_clause = "AND server_id = ?" if server_id else ""
    params: list = [f"-{hours} hours"]
    if server_id:
        params.append(server_id)

    rows = conn.execute(
        f"""
        SELECT ip, path, threat_type, threat_score, timestamp
        FROM log_entries
        WHERE timestamp >= datetime('now', ?)
          AND threat_level != 'normal'
          {server_clause}
        ORDER BY timestamp DESC
        LIMIT 5000
        """,
        params,
    ).fetchall()

    if not rows:
        return {"clusters": [], "noise": 0, "total": 0}

    try:
        import numpy as np
        from sklearn.cluster import DBSCAN
        from sklearn.preprocessing import StandardScaler
        from collections import Counter
    except ImportError:
        return {"error": "scikit-learn not installed on API server", "clusters": []}

    # Build feature matrix: [hour_of_day, path_length, threat_score]
    data = []
    for r in rows:
        try:
            from datetime import datetime
            ts = datetime.fromisoformat(r["timestamp"].replace("Z", "+00:00"))
            hour = ts.hour
        except Exception:
            hour = 0
        data.append({
            "ip": r["ip"],
            "path": r["path"],
            "threat_type": r["threat_type"],
            "threat_score": r["threat_score"],
            "hour": hour,
        })

    X = np.array([[d["hour"], len(d["path"]), d["threat_score"]] for d in data], dtype=float)
    X_scaled = StandardScaler().fit_transform(X)

    labels = DBSCAN(eps=0.6, min_samples=3, n_jobs=-1).fit_predict(X_scaled)

    clusters: dict[int, list] = {}
    for i, label in enumerate(labels):
        clusters.setdefault(int(label), []).append(data[i])

    noise_count = len(clusters.pop(-1, []))

    result = []
    for cluster_id, members in sorted(clusters.items(), key=lambda x: -len(x[1])):
        ip_counts = Counter(m["ip"] for m in members)
        type_counts = Counter(m["threat_type"] for m in members)
        avg_score = sum(m["threat_score"] for m in members) / len(members)
        top_paths = list({m["path"] for m in members})[:5]

        result.append({
            "id": cluster_id,
            "size": len(members),
            "top_ips": [{"ip": ip, "count": c} for ip, c in ip_counts.most_common(5)],
            "threat_types": dict(type_counts.most_common()),
            "avg_score": round(avg_score, 1),
            "top_paths": top_paths,
        })

    return {
        "clusters": result,
        "noise": noise_count,
        "total": len(rows),
        "hours": hours,
    }
