import asyncio
import os
import sys
from datetime import datetime

import httpx
from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel

from scenarios import SimEvent
from scenarios import brute_force, ddos, normal_traffic, sql_injection

load_dotenv()

console = Console()

_MENU = """
  [1]  Brute Force          RU → /login
  [2]  SQL Injection         CN → /search
  [3]  DDoS Spike            Multi-country
  [4]  Full Demo Sequence    All scenarios, 3 min
  [5]  Normal Traffic        Baseline only
"""

_LEVEL_ICON = {
    "normal": "🟢", "suspicious": "🟡", "warning": "🟠", "critical": "🔴",
}


def _mask_ip(ip: str) -> str:
    parts = ip.split(".")
    return f"{parts[0]}.{parts[1]}.x.x" if len(parts) == 4 else ip


def _on_event(event: SimEvent) -> None:
    ts = datetime.now().strftime("%H:%M:%S")
    icon = _LEVEL_ICON.get(event["threat_level"], "⚪")
    ip = _mask_ip(event["ip"])
    score = f"{event['threat_score']:.0f}"
    console.print(
        f"[dim]{ts}[/dim] {icon} [dim]{(event['country'] or '--'):3}[/dim] "
        f"[cyan]{ip:15}[/cyan] [dim]{event['method']:5}[/dim] "
        f"[white]{event['path']:25}[/white] [dim]{event['status_code']}[/dim]"
        f"  [dim]{event['threat_level']:11}[/dim] [bold]{score}[/bold]"
    )
    if event["alert_fired"]:
        console.print("  [bold red]⚠  Redline crossed — email dispatched[/bold red]")


async def _get_token(api_url: str, username: str, password: str) -> str:
    async with httpx.AsyncClient(base_url=api_url) as client:
        resp = await client.post(
            "/auth/login",
            json={"username": username, "password": password},
            timeout=10.0,
        )
        resp.raise_for_status()
        return str(resp.json()["token"])


async def _dispatch(choice: str, api_url: str, token: str) -> None:
    runners = {
        "1": brute_force.run,
        "2": sql_injection.run,
        "3": ddos.run,
        "5": normal_traffic.run,
    }
    if choice == "4":
        for runner in [normal_traffic.run, brute_force.run, sql_injection.run, ddos.run]:
            await runner(api_url, token, _on_event)
    elif choice in runners:
        await runners[choice](api_url, token, _on_event)
    else:
        console.print("[red]Invalid choice.[/red]")


def main() -> None:
    api_url = os.environ.get("VITE_API_URL", "http://localhost:8000")
    username = os.environ.get("ADMIN_USERNAME", "admin")
    password = os.environ.get("ADMIN_PASSWORD", "")

    if not password:
        console.print("[red]ADMIN_PASSWORD not set in .env[/red]")
        sys.exit(1)

    console.print(Panel("Redline — Attack Simulator  v1.0", style="bold white"))
    console.print(_MENU)

    choice = console.input("[bold]→ [/bold]").strip()

    console.print("\n[dim]Authenticating...[/dim]")
    try:
        token = asyncio.run(_get_token(api_url, username, password))
    except Exception as exc:
        console.print(f"[red]Auth failed: {exc}[/red]")
        sys.exit(1)

    console.print("[dim]Connected. Sending events...[/dim]\n")
    asyncio.run(_dispatch(choice, api_url, token))
    console.print("\n[dim]Done.[/dim]")


if __name__ == "__main__":
    main()
