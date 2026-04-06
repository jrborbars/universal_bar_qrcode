from __future__ import annotations

import datetime as dt

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.cnpj import is_valid_cnpj, normalize_cnpj


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=200)
    phone: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8, max_length=200)
    confirm_password: str = Field(min_length=8, max_length=200)

    @field_validator("confirm_password")
    @classmethod
    def _confirm(cls, confirm_password: str, info):  # type: ignore[no-untyped-def]
        password = info.data.get("password")
        if password != confirm_password:
            raise ValueError("passwords_do_not_match")
        return confirm_password


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class UserPublic(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    phone: str
    created_at: dt.datetime


class CompanyCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    address: str = Field(min_length=5, max_length=500)
    country: str = Field(min_length=2, max_length=2)
    tax_id: str = Field(min_length=5, max_length=64)
    geocode_osm_ref: str = Field(min_length=2, max_length=32)

    @field_validator("country")
    @classmethod
    def _country_upper(cls, v: str) -> str:
        return v.upper()

    @field_validator("tax_id")
    @classmethod
    def _validate_tax_id(cls, v: str, info):  # type: ignore[no-untyped-def]
        country = (info.data.get("country") or "").upper()
        if country == "BR":
            if not is_valid_cnpj(v):
                raise ValueError("invalid_cnpj")
            return normalize_cnpj(v)
        return v.strip()

    @field_validator("geocode_osm_ref")
    @classmethod
    def _validate_geocode_ref(cls, v: str) -> str:
        ref = (v or "").strip().upper()
        if len(ref) < 2 or ref[0] not in {"N", "W", "R"}:
            raise ValueError("invalid_osm_ref")
        if not ref[1:].isdigit():
            raise ValueError("invalid_osm_ref")
        return ref


class CompanyPublic(BaseModel):
    id: int
    name: str
    address: str
    geocoded_address: str
    country: str
    tax_id: str
    latitude: float
    longitude: float
    code: str
    public_url: str
    created_at: dt.datetime


class CompanyListResponse(BaseModel):
    items: list[CompanyPublic]


class CompanyAddressUpdateRequest(BaseModel):
    address: str = Field(min_length=5, max_length=500)
    geocode_osm_ref: str = Field(min_length=2, max_length=32)

    @field_validator("geocode_osm_ref")
    @classmethod
    def _validate_geocode_ref(cls, v: str) -> str:
        ref = (v or "").strip().upper()
        if len(ref) < 2 or ref[0] not in {"N", "W", "R"}:
            raise ValueError("invalid_osm_ref")
        if not ref[1:].isdigit():
            raise ValueError("invalid_osm_ref")
        return ref


class GeocodeSearchRequest(BaseModel):
    address: str = Field(min_length=3, max_length=500)
    country: str = Field(min_length=2, max_length=2)

    @field_validator("country")
    @classmethod
    def _country_upper(cls, v: str) -> str:
        return v.upper()


class GeocodeCandidate(BaseModel):
    osm_ref: str
    display_name: str
    latitude: float | None = None
    longitude: float | None = None
    category: str | None = None
    type: str | None = None


class GeocodeSearchResponse(BaseModel):
    items: list[GeocodeCandidate]
