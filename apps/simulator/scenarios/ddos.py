import asyncio
import random
from typing import Callable

import httpx

from data.ip_profiles import IP_PROFILES
from scenarios import SimEvent, make_raw, send_entry

_PROFILES = [p for p in IP_PROFILES if p["behavior"] in ("ddos", "brute_force", "scanner")]
_PATHS = ["/", "/products", "/api/v1/products", "/search?q=shirt", "/cart", "/checkout"]


async def run(api_url: str, token: str, on_event: Callable[[SimEvent], None]) -> None:
    headers = {"Authorization": f"Bearer {token}"}

    async with httpx.AsyncClient(base_url=api_url, headers=headers) as client:
        for batch_start in range(0, 160, 20):
            tasks = []
            for _ in range(min(20, 160 - batch_start)):
                profile = random.choice(_PROFILES)
                raw = make_raw(
                    ip=profile["ip"], country=profile["country"],
                    lat=profile["lat"], lon=profile["lon"],
                    method="GET", path=random.choice(_PATHS),
                    status_code=200,
                    response_time_ms=random.uniform(10, 80),
                    user_agent=profile["user_agent"],
                )
                tasks.append(send_entry(client, raw, on_event))
            await asyncio.gather(*tasks)
            await asyncio.sleep(0.1)
