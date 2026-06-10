from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

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
    if not verify_credentials(body.username, body.password, cfg):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    return LoginResponse(token=create_token(body.username, cfg))
