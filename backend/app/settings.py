from __future__ import annotations

import os


class Settings:
    def __init__(self) -> None:
        self.database_url = os.environ.get("DATABASE_URL", "sqlite:///./app.db")
        self.jwt_secret = os.environ.get("JWT_SECRET", "dev-secret-change-me")
        self.jwt_issuer = os.environ.get("JWT_ISSUER", "betterdays.app.br")
        self.jwt_audience = os.environ.get("JWT_AUDIENCE", "betterdays.app.br")
        self.jwt_exp_seconds = int(os.environ.get("JWT_EXP_SECONDS", "86400"))
        self.cors_origins = [
            origin.strip()
            for origin in os.environ.get(
                "CORS_ORIGINS",
                "http://localhost:5173,http://127.0.0.1:5173",
            ).split(",")
            if origin.strip()
        ]
        self.s2_level_100m = int(os.environ.get("S2_LEVEL_100M", "18"))
        self.public_domain = os.environ.get("PUBLIC_DOMAIN", "https://betterdays.app.br")
        self.geocode_provider = os.environ.get("GEOCODE_PROVIDER", "nominatim")
        self.nominatim_url = os.environ.get("NOMINATIM_URL", "https://nominatim.openstreetmap.org")
        self.geocode_timeout_seconds = float(os.environ.get("GEOCODE_TIMEOUT_SECONDS", "8.0"))


settings = Settings()
