import random
from datetime import datetime, timedelta

import numpy as np
import pandas as pd

_NORMAL_PATHS = [
    "/", "/home", "/about", "/products", "/products/123", "/products/456",
    "/cart", "/checkout", "/account", "/search?q=shoes", "/search?q=shirt",
    "/api/v1/products", "/api/v1/cart", "/favicon.ico", "/static/main.js",
]

_ATTACK_PATHS: dict[str, list[str]] = {
    "SQL_INJECTION": [
        "/search?q=1' OR '1'='1", "/search?q=' UNION SELECT * FROM users--",
        "/api/v1/products?id=1; DROP TABLE log_entries--",
        "/login?user=admin'--", "/search?q=1) OR (1=1",
    ],
    "PATH_TRAVERSAL": [
        "/../../../etc/passwd", "/../../etc/shadow",
        "/static/../../../etc/passwd", "/api/v1/../../config.py",
        "/%2e%2e/%2e%2e/etc/passwd",
    ],
    "BRUTE_FORCE": ["/login", "/admin/login", "/wp-login.php", "/auth/login"],
    "SCANNER": [
        "/.env", "/.git/config", "/wp-admin", "/phpmyadmin",
        "/phpinfo.php", "/admin", "/.htaccess", "/config.php",
    ],
    "BOT": [
        "/products", "/products/123", "/search?q=laptop",
        "/api/v1/products", "/sitemap.xml",
    ],
}

_COUNTRY_POOL = {
    "normal": [("US", 37.09, -95.71), ("DE", 51.16, 10.45), ("GB", 55.37, -3.43)],
    "attack": [
        ("RU", 55.75, 37.61), ("CN", 35.86, 104.19),
        ("KP", 40.33, 127.51), ("IR", 32.42, 53.68), ("BR", -14.23, -51.92),
    ],
}

_USER_AGENTS = {
    "normal": [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/537.36",
    ],
    "attack": [
        "sqlmap/1.7.8#stable", "python-requests/2.31.0",
        "Mozilla/4.0 (compatible; MSIE 6.0)", "curl/7.81.0", "Nikto/2.1.6",
    ],
}

_KNOWN_ATTACK_PATHS = {p for paths in _ATTACK_PATHS.values() for p in paths}

_THREAT_WEIGHTS = {
    "NORMAL": 0.60, "BRUTE_FORCE": 0.10, "SQL_INJECTION": 0.08,
    "SCANNER": 0.10, "PATH_TRAVERSAL": 0.07, "BOT": 0.05,
}

_RPM_BY_THREAT: dict[str, tuple[float, float]] = {
    "NORMAL": (3.0, 2.0), "BRUTE_FORCE": (150.0, 30.0),
    "SQL_INJECTION": (20.0, 10.0), "SCANNER": (60.0, 20.0),
    "PATH_TRAVERSAL": (20.0, 10.0), "BOT": (60.0, 20.0),
}


def _build_entry(threat_type: str, ts: datetime, ip: str, rng: random.Random) -> dict:
    is_attack = threat_type != "NORMAL"
    country, lat, lon = rng.choice(_COUNTRY_POOL["attack" if is_attack else "normal"])

    if threat_type == "NORMAL":
        path = rng.choice(_NORMAL_PATHS)
        method = rng.choices(["GET", "POST"], weights=[80, 20])[0]
        status = rng.choices([200, 301, 404], weights=[85, 5, 10])[0]
        rt = rng.gauss(120, 40)
        ua = rng.choice(_USER_AGENTS["normal"])
    else:
        path = rng.choice(_ATTACK_PATHS.get(threat_type, _NORMAL_PATHS))
        method = "POST" if threat_type == "BRUTE_FORCE" else "GET"
        status = rng.choices([200, 401, 403, 500], weights=[20, 40, 30, 10])[0]
        rt = rng.gauss(200, 80)
        ua = rng.choice(_USER_AGENTS["attack"])

    mu, sigma = _RPM_BY_THREAT[threat_type]
    rpm = max(0.5, rng.gauss(mu, sigma))

    return {
        "timestamp": ts.isoformat() + "Z",
        "ip": ip,
        "country": country,
        "lat": lat,
        "lon": lon,
        "method": method,
        "path": path,
        "status_code": status,
        "response_time_ms": max(10.0, rt),
        "user_agent": ua,
        "threat_type": threat_type,
        "hour_of_day": ts.hour,
        "is_known_attack_path": path in _KNOWN_ATTACK_PATHS,
        "requests_per_minute": rpm,
    }


def generate_dataset(n_samples: int = 5000, seed: int = 42) -> pd.DataFrame:
    rng = random.Random(seed)
    threat_types = list(_THREAT_WEIGHTS.keys())
    weights = list(_THREAT_WEIGHTS.values())

    normal_ips = [f"10{rng.randint(1,9)}.{rng.randint(1,255)}.{rng.randint(1,255)}.{rng.randint(1,255)}" for _ in range(200)]
    attack_ips = [f"45.33.{rng.randint(1,255)}.{rng.randint(1,255)}" for _ in range(10)]

    base_time = datetime(2024, 1, 15, 0, 0, 0)
    rows = []
    for i in range(n_samples):
        threat = rng.choices(threat_types, weights=weights)[0]
        ts = base_time + timedelta(seconds=i * 0.5 + rng.gauss(0, 2))
        ip = rng.choice(attack_ips if threat != "NORMAL" else normal_ips)
        rows.append(_build_entry(threat, ts, ip, rng))

    return pd.DataFrame(rows).sort_values("timestamp").reset_index(drop=True)
