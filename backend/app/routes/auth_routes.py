from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import auth
from app.deps import db_session, get_current_user
from app.models import User
from app.schemas import LoginRequest, RegisterRequest, TokenResponse, UserPublic


router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserPublic)
def register(payload: RegisterRequest, db: Session = Depends(db_session)) -> UserPublic:
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing:
        raise HTTPException(status_code=409, detail="email_already_registered")

    user = User(
        email=str(payload.email).lower(),
        full_name=payload.full_name.strip(),
        phone=payload.phone.strip(),
        password_hash=auth.hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserPublic(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        created_at=user.created_at,
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(db_session)) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == str(payload.email).lower()))
    if not user or not auth.verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="invalid_credentials")
    token = auth.create_access_token(subject=str(user.id))
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserPublic)
def me(current_user: User = Depends(get_current_user)) -> UserPublic:
    return UserPublic(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        phone=current_user.phone,
        created_at=current_user.created_at,
    )
