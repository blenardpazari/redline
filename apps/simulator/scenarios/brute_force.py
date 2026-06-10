import asyncio
import random
from typing import Callable

import httpx

from data.ip_profiles import IP_PROFILES
from scenarios import SimEvent, make_raw, send_entry

_PROFILES = [p for p in IP_PROFILES if p["behavior"] == "brute_force"]


async def run(api_url: str, token: str, on_event: Callable[[SimEvent], None]) -> None:
    profile = random.choice(_PROFILES)
    headers = {"Authorization": f"Bearer {token}"}

    async with httpx.AsyncClient(base_url=api_url, headers=headers) as client:
        for _ in range(300):
            raw = make_raw(
                ip=profile["ip"], country=profile["country"],
                lat=profile["lat"], lon=profile["lon"],
                method="POST", path="/login",
                status_code=401,
                response_time_ms=random.uniform(120, 200),
                user_agent=profile["user_agent"],
            )
            await send_entry(client, raw, on_event)
            await asyncio.sleep(0.05)
