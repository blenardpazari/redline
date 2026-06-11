from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.db.server_queries import touch_user_login, verify_user
from auth.jwt_handler import create_token, verify_credentials
from config import get_config

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest) -> LoginResponse:
    cfg = get_config()

    if verify_credentials(body.username, body.password, cfg):
        return LoginResponse(token=create_token(body.username, cfg, role="admin"))

    user = verify_user(body.username, body.password)
    if user:
        touch_user_login(body.username)
        return LoginResponse(token=create_token(body.username, cfg, role=user["role"]))

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials",
    )
