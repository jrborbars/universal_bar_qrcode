from __future__ import annotations

import datetime as dt

from sqlalchemy import DateTime, ForeignKey, Integer, LargeBinary, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(200))
    phone: Mapped[str] = mapped_column(String(50))
    password_hash: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: dt.datetime.now(dt.timezone.utc),
    )

    companies: Mapped[list["Company"]] = relationship(back_populates="owner")


class Company(Base):
    __tablename__ = "companies"
    __table_args__ = (UniqueConstraint("code", name="uq_companies_code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    owner_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)

    name: Mapped[str] = mapped_column(String(200))
    address: Mapped[str] = mapped_column(String(500))
    geocoded_address: Mapped[str | None] = mapped_column(String(800), default="", nullable=True)
    country: Mapped[str] = mapped_column(String(2))
    tax_id: Mapped[str] = mapped_column(String(64))
    latitude: Mapped[float] = mapped_column()
    longitude: Mapped[float] = mapped_column()

    code: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    qr_png: Mapped[bytes] = mapped_column(LargeBinary)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: dt.datetime.now(dt.timezone.utc),
    )

    owner: Mapped[User] = relationship(back_populates="companies")
