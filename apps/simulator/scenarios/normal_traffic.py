import asyncio
import random
from typing import Callable

import httpx

from data.ip_profiles import IP_PROFILES
from scenarios import SimEvent, make_raw, send_entry

_PROFILES = [p for p in IP_PROFILES if p["behavior"] == "normal"]

_REQUESTS: list[tuple[str, str, int]] = [
    ("GET",  "/",                200),
    ("GET",  "/products",        200),
    ("GET",  "/products/123",    200),
    ("GET",  "/about",           200),
    ("POST", "/cart",            200),
    ("GET",  "/search?q=shoes",  200),
    ("GET",  "/account",         200),
    ("GET",  "/search?q=laptop", 200),
    ("GET",  "/products/456",    200),
    ("GET",  "/favicon.ico",     200),
]


async def run(api_url: str, token: str, on_event: Callable[[SimEvent], None]) -> None:
    headers = {"Authorization": f"Bearer {token}"}

    async with httpx.AsyncClient(base_url=api_url, headers=headers) as client:
        for _ in range(60):
            profile = random.choice(_PROFILES)
            method, path, status = random.choice(_REQUESTS)
            raw = make_raw(
                ip=profile["ip"], country=profile["country"],
                lat=profile["lat"], lon=profile["lon"],
                method=method, path=path, status_code=status,
                response_time_ms=max(10.0, random.gauss(120, 40)),
                user_agent=profile["user_agent"],
            )
            await send_entry(client, raw, on_event)
            await asyncio.sleep(0.3)
