from __future__ import annotations

import json
import urllib.parse
import urllib.request

from app.settings import settings


class GeocodeError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)


def _request_json(url: str) -> object:
    provider = (settings.geocode_provider or "").lower()
    if provider != "nominatim":
        raise GeocodeError("unsupported_geocode_provider")

    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "betterdays.app.br/1.0 (contact: admin@betterdays.app.br)",
            "Accept": "application/json",
        },
        method="GET",
    )

    try:
        with urllib.request.urlopen(req, timeout=settings.geocode_timeout_seconds) as resp:
            raw = resp.read().decode("utf-8")
    except Exception as e:
        raise GeocodeError("geocode_request_failed") from e

    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        raise GeocodeError("geocode_bad_response") from e


def search_candidates(*, address: str, country: str, limit: int = 5) -> list[dict[str, object]]:
    q = address.strip()
    if not q:
        raise GeocodeError("empty_address")

    params: dict[str, str] = {
        "q": q,
        "format": "jsonv2",
        "limit": str(max(1, min(limit, 10))),
        "addressdetails": "1",
        "dedupe": "0",
    }
    cc = (country or "").strip().lower()
    if cc:
        params["countrycodes"] = cc

    url = f"{settings.nominatim_url.rstrip('/')}/search?{urllib.parse.urlencode(params)}"
    data = _request_json(url)
    if not isinstance(data, list) or not data:
        return []

    out: list[dict[str, object]] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        display_name = item.get("display_name")
        lat_s = item.get("lat")
        lon_s = item.get("lon")
        osm_type = item.get("osm_type")
        osm_id = item.get("osm_id")
        category = item.get("category")
        type_ = item.get("type")
        if not isinstance(display_name, str):
            continue
        if not isinstance(osm_type, str) or not isinstance(osm_id, (int, str)):
            continue

        prefix = {"node": "N", "way": "W", "relation": "R"}.get(osm_type.lower())
        if not prefix:
            continue
        try:
            osm_id_int = int(osm_id)
        except ValueError:
            continue
        if osm_id_int <= 0:
            continue

        lat: float | None = None
        lon: float | None = None
        if isinstance(lat_s, str) and isinstance(lon_s, str):
            try:
                lat = float(lat_s)
                lon = float(lon_s)
            except ValueError:
                lat = None
                lon = None
        out.append(
            {
                "osm_ref": f"{prefix}{osm_id_int}",
                "display_name": display_name,
                "latitude": lat,
                "longitude": lon,
                "category": category if isinstance(category, str) else None,
                "type": type_ if isinstance(type_, str) else None,
            }
        )
    return out


def lookup_osm_ref(*, osm_ref: str) -> tuple[float, float, str]:
    ref = (osm_ref or "").strip().upper()
    if len(ref) < 2 or ref[0] not in {"N", "W", "R"}:
        raise GeocodeError("invalid_osm_ref")
    if not ref[1:].isdigit():
        raise GeocodeError("invalid_osm_ref")

    params = {"osm_ids": ref, "format": "jsonv2", "addressdetails": "1"}
    url = f"{settings.nominatim_url.rstrip('/')}/lookup?{urllib.parse.urlencode(params)}"
    data = _request_json(url)
    if not isinstance(data, list) or not data or not isinstance(data[0], dict):
        raise GeocodeError("place_not_found")

    item = data[0]
    lat_s = item.get("lat")
    lon_s = item.get("lon")
    display_name = item.get("display_name")
    if not isinstance(lat_s, str) or not isinstance(lon_s, str) or not isinstance(display_name, str):
        raise GeocodeError("geocode_bad_response")
    try:
        return float(lat_s), float(lon_s), display_name
    except ValueError as e:
        raise GeocodeError("geocode_bad_response") from e
