from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from config import AppConfig, get_config

_bearer = HTTPBearer()


def create_token(username: str, cfg: AppConfig, role: str = "admin") -> str:
    expiry = datetime.now(timezone.utc) + timedelta(hours=cfg.jwt_expires_hours)
    return jwt.encode({"sub": username, "role": role, "exp": expiry}, cfg.jwt_secret, algorithm="HS256")


def verify_token(token: str, cfg: AppConfig) -> dict:
    try:
        payload = jwt.decode(token, cfg.jwt_secret, algorithms=["HS256"])
        sub = payload.get("sub")
        if not isinstance(sub, str):
            raise ValueError("Invalid token subject")
        return {"username": sub, "role": payload.get("role", "admin")}
    except JWTError as exc:
        raise ValueError("Invalid or expired token") from exc


def verify_credentials(username: str, password: str, cfg: AppConfig) -> bool:
    if username != cfg.admin_username:
        return False
    return bcrypt.checkpw(password.encode(), cfg.admin_password_hash.encode())


def require_auth(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> str:
    try:
        return verify_token(credentials.credentials, get_config())["username"]
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


def require_admin(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> str:
    try:
        info = verify_token(credentials.credentials, get_config())
        if info["role"] != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
        return info["username"]
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
