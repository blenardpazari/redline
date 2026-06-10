import json
from typing import Any

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status

from app.types.models import Alert, LogEntry
from auth.jwt_handler import verify_token
from config import get_config

router = APIRouter(tags=["ws"])

_clients: set[WebSocket] = set()


async def _broadcast(message: dict[str, Any]) -> None:
    dead: set[WebSocket] = set()
    for ws in _clients:
        try:
            await ws.send_text(json.dumps(message))
        except Exception:
            dead.add(ws)
    _clients.difference_update(dead)


async def broadcast_log(entry: LogEntry) -> None:
    await _broadcast({"type": "log_entry", "data": entry.model_dump()})


async def broadcast_alert(alert: Alert) -> None:
    await _broadcast({"type": "alert", "data": alert.model_dump()})


@router.websocket("/ws")
async def ws_endpoint(websocket: WebSocket, token: str = Query(...)) -> None:
    try:
        verify_token(token, get_config())
    except ValueError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()
    _clients.add(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        _clients.discard(websocket)
