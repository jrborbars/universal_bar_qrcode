from __future__ import annotations

import base64
import datetime as dt
import hashlib
import hmac
import json
from typing import Any

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.settings import settings


_ph = PasswordHasher()


def hash_password(password: str) -> str:
    return _ph.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _ph.verify(password_hash, password)
    except VerifyMismatchError:
        return False


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")


def _b64url_decode(data: str) -> bytes:
    pad = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode((data + pad).encode("utf-8"))


def create_access_token(*, subject: str) -> str:
    now = dt.datetime.now(dt.timezone.utc)
    exp = now + dt.timedelta(seconds=settings.jwt_exp_seconds)

    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }

    signing_input = ".".join(
        [
            _b64url_encode(json.dumps(header, separators=(",", ":"), sort_keys=True).encode()),
            _b64url_encode(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode()),
        ]
    )
    signature = hmac.new(
        settings.jwt_secret.encode("utf-8"),
        signing_input.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    return f"{signing_input}.{_b64url_encode(signature)}"


class TokenError(Exception):
    pass


def decode_access_token(token: str) -> dict[str, Any]:
    parts = token.split(".")
    if len(parts) != 3:
        raise TokenError("invalid_token_format")

    header_b64, payload_b64, signature_b64 = parts
    signing_input = f"{header_b64}.{payload_b64}"
    expected_sig = hmac.new(
        settings.jwt_secret.encode("utf-8"),
        signing_input.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    given_sig = _b64url_decode(signature_b64)
    if not hmac.compare_digest(expected_sig, given_sig):
        raise TokenError("invalid_signature")

    try:
        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
    except json.JSONDecodeError as e:
        raise TokenError("invalid_payload") from e

    now_ts = int(dt.datetime.now(dt.timezone.utc).timestamp())
    if int(payload.get("exp", 0)) < now_ts:
        raise TokenError("token_expired")
    if payload.get("iss") != settings.jwt_issuer:
        raise TokenError("invalid_issuer")
    if payload.get("aud") != settings.jwt_audience:
        raise TokenError("invalid_audience")
    if not payload.get("sub"):
        raise TokenError("missing_subject")

    return payload
