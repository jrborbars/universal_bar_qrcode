from __future__ import annotations

import uuid

from s2sphere import CellId, LatLng

from app.settings import settings


def s2_token_for_location(*, latitude: float, longitude: float) -> str:
    latlng = LatLng.from_degrees(latitude, longitude)
    cell = CellId.from_lat_lng(latlng).parent(settings.s2_level_100m)
    return cell.to_token().upper()


def make_company_code(*, latitude: float, longitude: float) -> str:
    token = s2_token_for_location(latitude=latitude, longitude=longitude)
    uuid7 = getattr(uuid, "uuid7", None)
    if not callable(uuid7):
        raise RuntimeError("uuid.uuid7 unavailable; require Python 3.14+")
    return f"{token}|{uuid7().hex.upper()}"


def make_product_code() -> str:
    return uuid.uuid4().hex.upper()


def make_product_public_code(*, company_code: str, product_code: str) -> str:
    return f"{company_code}|{product_code}"


def split_product_public_code(code: str) -> tuple[str, str]:
    parts = [part.strip() for part in code.split("|") if part.strip()]
    if len(parts) != 3:
        raise ValueError("invalid_product_code")
    return f"{parts[0]}|{parts[1]}", parts[2]
