from __future__ import annotations

import socket

from fastapi import Request

from app.settings import settings


def _detect_lan_ip() -> str | None:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        if ip and ip != "127.0.0.1":
            return ip
        return None
    except Exception:
        return None


def public_base_url(request: Request) -> str:
    if settings.public_domain:
        dom = settings.public_domain.rstrip("/")
        if not (
            dom.startswith("http://localhost")
            or dom.startswith("http://127.0.0.1")
            or dom.startswith("https://localhost")
            or dom.startswith("https://127.0.0.1")
        ):
            return dom

    proto = request.headers.get("x-forwarded-proto")
    host = request.headers.get("x-forwarded-host") or request.headers.get("host")

    if not host:
        return str(request.base_url).rstrip("/")

    scheme = (proto or request.url.scheme or "http").split(",")[0].strip()
    host = host.split(",")[0].strip()

    if host.startswith("localhost") or host.startswith("127.0.0.1"):
        ip = _detect_lan_ip()
        if ip:
            if ":" in host:
                _, port = host.rsplit(":", 1)
                host = f"{ip}:{port}"
            else:
                host = ip

    return f"{scheme}://{host}"
