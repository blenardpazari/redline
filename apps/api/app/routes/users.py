from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator

from app.db.server_queries import create_user, delete_user, list_users, update_user
from auth.jwt_handler import require_admin, require_auth

router = APIRouter(prefix="/users", tags=["users"])


class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "viewer"

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in ("admin", "viewer"):
            raise ValueError("role must be admin or viewer")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("password must be at least 8 characters")
        return v


class UserUpdate(BaseModel):
    role: str | None = None
    password: str | None = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str | None) -> str | None:
        if v is not None and v not in ("admin", "viewer"):
            raise ValueError("role must be admin or viewer")
        return v


@router.get("", response_model=list[dict])
def get_users(_: str = Depends(require_admin)) -> list[dict]:
    return list_users()


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
def create(body: UserCreate, _: str = Depends(require_admin)) -> dict:
    try:
        return create_user(body.username, body.password, body.role)
    except Exception as exc:
        if "UNIQUE" in str(exc):
            raise HTTPException(status_code=409, detail="Username already exists") from exc
        raise


@router.patch("/{user_id}", response_model=dict)
def update(user_id: int, body: UserUpdate, _: str = Depends(require_admin)) -> dict:
    result = update_user(user_id, body.model_dump(exclude_none=True))
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    return result


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove(user_id: int, _: str = Depends(require_admin)) -> None:
    if not delete_user(user_id):
        raise HTTPException(status_code=404, detail="User not found")
