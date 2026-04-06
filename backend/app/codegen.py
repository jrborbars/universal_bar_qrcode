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
    return f"{token}|{uuid7().hex.upper()}|{uuid.uuid4().hex.upper()}"
