from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import Base, engine
from app.migrate import run_migrations
from app.routes.auth_routes import router as auth_router
from app.routes.company_routes import router as company_router
from app.routes.public_routes import router as public_router
from app.settings import settings


def create_app() -> FastAPI:
    app = FastAPI(title="BetterDays QR Backend")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    def _startup() -> None:
        Base.metadata.create_all(bind=engine)
        run_migrations(engine)

    app.include_router(auth_router)
    app.include_router(company_router)
    app.include_router(public_router)

    return app


app = create_app()
