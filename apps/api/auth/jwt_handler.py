from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from config import AppConfig, get_config

_bearer = HTTPBearer()


def create_token(username: str, cfg: AppConfig) -> str:
    expiry = datetime.now(timezone.utc) + timedelta(hours=cfg.jwt_expires_hours)
    return jwt.encode({"sub": username, "exp": expiry}, cfg.jwt_secret, algorithm="HS256")


def verify_token(token: str, cfg: AppConfig) -> str:
    try:
        payload = jwt.decode(token, cfg.jwt_secret, algorithms=["HS256"])
        sub = payload.get("sub")
        if not isinstance(sub, str):
            raise ValueError("Invalid token subject")
        return sub
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
        return verify_token(credentials.credentials, get_config())
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
