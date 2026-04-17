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
    products: Mapped[list["Product"]] = relationship(back_populates="company")


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (UniqueConstraint("code", name="uq_products_code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), index=True)

    sku: Mapped[str] = mapped_column(String(120))
    code: Mapped[str] = mapped_column(String(220), unique=True, index=True)

    description: Mapped[str] = mapped_column(String(4000))
    short_description: Mapped[str] = mapped_column(String(600))
    category: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(32), index=True)

    weight: Mapped[float | None] = mapped_column(nullable=True)
    length: Mapped[float | None] = mapped_column(nullable=True)
    width: Mapped[float | None] = mapped_column(nullable=True)
    height: Mapped[float | None] = mapped_column(nullable=True)
    volume: Mapped[float | None] = mapped_column(nullable=True)

    customer_field: Mapped[str] = mapped_column(String(2000))
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: dt.datetime.now(dt.timezone.utc),
    )

    company: Mapped[Company] = relationship(back_populates="products")
