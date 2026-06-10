import asyncio
import random
from typing import Callable

import httpx

from data.ip_profiles import IP_PROFILES
from scenarios import SimEvent, make_raw, send_entry

_PROFILES = [p for p in IP_PROFILES if p["behavior"] == "sql_injection"]

_PAYLOADS = [
    "/search?q=1' OR '1'='1",
    "/search?q=' UNION SELECT username,password FROM users--",
    "/api/v1/products?id=1; DROP TABLE log_entries--",
    "/login?user=admin'--&pass=x",
    "/search?q=1) OR (1=1",
    "/api/v1/users?id=1 AND SLEEP(5)--",
]


async def run(api_url: str, token: str, on_event: Callable[[SimEvent], None]) -> None:
    headers = {"Authorization": f"Bearer {token}"}

    async with httpx.AsyncClient(base_url=api_url, headers=headers) as client:
        for _ in range(60):
            profile = random.choice(_PROFILES)
            raw = make_raw(
                ip=profile["ip"], country=profile["country"],
                lat=profile["lat"], lon=profile["lon"],
                method="GET", path=random.choice(_PAYLOADS),
                status_code=random.choice([200, 500]),
                response_time_ms=random.uniform(80, 400),
                user_agent=profile["user_agent"],
            )
            await send_entry(client, raw, on_event)
            await asyncio.sleep(0.1)
