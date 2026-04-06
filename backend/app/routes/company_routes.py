from __future__ import annotations

import urllib.parse

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.codegen import make_company_code
from app.deps import db_session, get_current_user
from app.geocode import GeocodeError, lookup_osm_ref, search_candidates
from app.models import Company, User
from app.qrcode_utils import make_qr_png
from app.schemas import (
    CompanyAddressUpdateRequest,
    CompanyCreateRequest,
    CompanyListResponse,
    CompanyPublic,
    GeocodeSearchRequest,
    GeocodeSearchResponse,
)
from app.url_utils import public_base_url


router = APIRouter(prefix="/api/companies", tags=["companies"])


def _company_public(*, company: Company, base_url: str) -> CompanyPublic:
    code_path = urllib.parse.quote(company.code, safe="")
    public_url = f"{base_url.rstrip('/')}/c/{code_path}"
    return CompanyPublic(
        id=company.id,
        name=company.name,
        address=company.address,
        geocoded_address=company.geocoded_address or "",
        country=company.country,
        tax_id=company.tax_id,
        latitude=company.latitude,
        longitude=company.longitude,
        code=company.code,
        public_url=public_url,
        created_at=company.created_at,
    )


@router.get("", response_model=CompanyListResponse)
def list_companies(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(db_session),
) -> CompanyListResponse:
    items = db.scalars(
        select(Company).where(Company.owner_user_id == current_user.id).order_by(Company.id.desc())
    ).all()
    base_url = public_base_url(request)
    return CompanyListResponse(items=[_company_public(company=c, base_url=base_url) for c in items])


@router.post("/geocode/search", response_model=GeocodeSearchResponse)
def geocode_search(
    payload: GeocodeSearchRequest,
    current_user: User = Depends(get_current_user),
) -> GeocodeSearchResponse:
    _ = current_user
    try:
        items = search_candidates(address=payload.address, country=payload.country, limit=10)
    except GeocodeError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return GeocodeSearchResponse.model_validate({"items": items})


@router.post("", response_model=CompanyPublic, status_code=201)
def create_company(
    request: Request,
    payload: CompanyCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(db_session),
) -> CompanyPublic:
    try:
        latitude, longitude, resolved_address = lookup_osm_ref(osm_ref=payload.geocode_osm_ref)
    except GeocodeError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    code = make_company_code(latitude=latitude, longitude=longitude)
    code_path = urllib.parse.quote(code, safe="")
    base_url = public_base_url(request)
    public_url = f"{base_url.rstrip('/')}/c/{code_path}"
    qr_png = make_qr_png(public_url)

    company = Company(
        owner_user_id=current_user.id,
        name=payload.name.strip(),
        address=payload.address.strip(),
        geocoded_address=resolved_address.strip(),
        country=payload.country.upper(),
        tax_id=payload.tax_id,
        latitude=latitude,
        longitude=longitude,
        code=code,
        qr_png=qr_png,
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return _company_public(company=company, base_url=base_url)


@router.get("/{company_id}", response_model=CompanyPublic)
def get_company(
    request: Request,
    company_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(db_session),
) -> CompanyPublic:
    company = db.get(Company, company_id)
    if not company or company.owner_user_id != current_user.id:
        raise HTTPException(status_code=404, detail="company_not_found")
    return _company_public(company=company, base_url=public_base_url(request))


@router.patch("/{company_id}/address", response_model=CompanyPublic)
def update_company_address(
    request: Request,
    company_id: int,
    payload: CompanyAddressUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(db_session),
) -> CompanyPublic:
    company = db.get(Company, company_id)
    if not company or company.owner_user_id != current_user.id:
        raise HTTPException(status_code=404, detail="company_not_found")
    try:
        latitude, longitude, resolved_address = lookup_osm_ref(osm_ref=payload.geocode_osm_ref)
    except GeocodeError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    company.address = payload.address.strip()
    company.geocoded_address = resolved_address.strip()
    company.latitude = latitude
    company.longitude = longitude
    db.add(company)
    db.commit()
    db.refresh(company)
    return _company_public(company=company, base_url=public_base_url(request))


@router.get("/{company_id}/qr.png")
def get_company_qr_png(
    request: Request,
    company_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(db_session),
) -> Response:
    company = db.get(Company, company_id)
    if not company or company.owner_user_id != current_user.id:
        raise HTTPException(status_code=404, detail="company_not_found")
    code_path = urllib.parse.quote(company.code, safe="")
    public_url = f"{public_base_url(request).rstrip('/')}/c/{code_path}"
    png = make_qr_png(public_url)
    return Response(content=png, media_type="image/png")
