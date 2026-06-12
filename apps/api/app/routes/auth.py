from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel

from app.db.server_queries import touch_user_login, verify_user
from auth.jwt_handler import create_token, verify_credentials
from config import get_config

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str
    client_ip: str | None = None


class LoginResponse(BaseModel):
    token: str


_PRIVATE = ("127.", "10.", "192.168.", "172.16.", "172.17.", "172.18.", "172.19.",
            "172.20.", "172.21.", "172.22.", "172.23.", "172.24.", "172.25.",
            "172.26.", "172.27.", "172.28.", "172.29.", "172.30.", "172.31.", "::1")


def _real_ip(request: Request) -> str | None:
    for candidate in request.headers.get("X-Forwarded-For", "").split(","):
        ip = candidate.strip()
        if ip and not any(ip.startswith(p) for p in _PRIVATE):
            return ip
    real = request.headers.get("X-Real-IP", "")
    if real and not any(real.startswith(p) for p in _PRIVATE):
        return real
    return request.client.host if request.client else None


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, request: Request) -> LoginResponse:
    cfg = get_config()
    client_ip = body.client_ip or _real_ip(request)

    if verify_credentials(body.username, body.password, cfg):
        return LoginResponse(token=create_token(body.username, cfg, role="admin", login_ip=client_ip))

    user = verify_user(body.username, body.password)
    if user:
        touch_user_login(body.username)
        return LoginResponse(token=create_token(body.username, cfg, role=user["role"], login_ip=client_ip))

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials",
    )
