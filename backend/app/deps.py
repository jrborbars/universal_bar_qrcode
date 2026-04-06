from __future__ import annotations

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app import auth
from app.db import get_db
from app.models import User


def db_session(db: Session = Depends(get_db)) -> Session:
    return db


def get_current_user(request: Request, db: Session = Depends(db_session)) -> User:
    header = request.headers.get("authorization") or request.headers.get("Authorization")
    if not header or not header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="missing_bearer_token")

    token = header.split(" ", 1)[1].strip()
    try:
        payload = auth.decode_access_token(token)
    except auth.TokenError as e:
        raise HTTPException(status_code=401, detail=str(e)) from e

    user_id_raw = payload.get("sub")
    if not isinstance(user_id_raw, str):
        raise HTTPException(status_code=401, detail="invalid_subject")
    try:
        user_id = int(user_id_raw)
    except ValueError as e:
        raise HTTPException(status_code=401, detail="invalid_subject") from e

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="user_not_found")
    return user
