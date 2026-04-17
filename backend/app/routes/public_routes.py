from __future__ import annotations

import urllib.parse

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.codegen import make_product_public_code, split_product_public_code
from app.deps import db_session
from app.models import Company, Product
from app.qrcode_utils import make_qr_png
from app.schemas import CompanyPublic, ProductPublic
from app.url_utils import public_base_url


router = APIRouter(tags=["public"])


def _company_public(company: Company, base_url: str) -> CompanyPublic:
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


def _product_public(product: Product, company: Company, base_url: str) -> ProductPublic:
    public_code = make_product_public_code(company_code=company.code, product_code=product.code)
    code_path = urllib.parse.quote(public_code, safe="")
    public_url = f"{base_url.rstrip('/')}/p/{code_path}"
    return ProductPublic(
        id=product.id,
        company_id=company.id,
        company_name=company.name,
        sku=product.sku,
        code=product.code,
        public_url=public_url,
        description=product.description,
        short_description=product.short_description,
        category=product.category,
        status=product.status,
        weight=product.weight,
        length=product.length,
        width=product.width,
        height=product.height,
        volume=product.volume,
        customer_field=product.customer_field,
        created_at=product.created_at,
    )


@router.get("/api/public/company/{code}", response_model=CompanyPublic)
def get_company_by_code(code: str, request: Request, db: Session = Depends(db_session)) -> CompanyPublic:
    company = db.scalar(select(Company).where(Company.code == code))
    if not company:
        raise HTTPException(status_code=404, detail="code_not_found")
    return _company_public(company, public_base_url(request))


@router.get("/api/public/company/{code}/qr.png")
def get_public_company_qr_png(
    code: str, request: Request, db: Session = Depends(db_session)
) -> Response:
    company = db.scalar(select(Company).where(Company.code == code))
    if not company:
        raise HTTPException(status_code=404, detail="code_not_found")
    code_path = urllib.parse.quote(company.code, safe="")
    url = f"{public_base_url(request).rstrip('/')}/c/{code_path}"
    png = make_qr_png(url)
    return Response(content=png, media_type="image/png")


@router.get("/api/public/product/{code}", response_model=ProductPublic)
def get_product_by_code(code: str, request: Request, db: Session = Depends(db_session)) -> ProductPublic:
    try:
        company_code, product_code = split_product_public_code(code)
    except ValueError as e:
        raise HTTPException(status_code=404, detail="code_not_found") from e
    company = db.scalar(select(Company).where(Company.code == company_code))
    if not company:
        raise HTTPException(status_code=404, detail="code_not_found")
    product = db.scalar(
        select(Product).where(Product.company_id == company.id, Product.code == product_code)
    )
    if not product or product.status != "Active":
        raise HTTPException(status_code=404, detail="code_not_found")
    return _product_public(product, company, public_base_url(request))


@router.get("/api/public/product/{code}/qr.png")
def get_public_product_qr_png(code: str, request: Request, db: Session = Depends(db_session)) -> Response:
    try:
        company_code, product_code = split_product_public_code(code)
    except ValueError as e:
        raise HTTPException(status_code=404, detail="code_not_found") from e
    company = db.scalar(select(Company).where(Company.code == company_code))
    if not company:
        raise HTTPException(status_code=404, detail="code_not_found")
    product = db.scalar(
        select(Product).where(Product.company_id == company.id, Product.code == product_code)
    )
    if not product or product.status != "Active":
        raise HTTPException(status_code=404, detail="code_not_found")
    public_code = make_product_public_code(company_code=company.code, product_code=product.code)
    code_path = urllib.parse.quote(public_code, safe="")
    url = f"{public_base_url(request).rstrip('/')}/p/{code_path}"
    png = make_qr_png(url)
    return Response(content=png, media_type="image/png")


@router.get("/c/{code}", response_class=HTMLResponse)
def public_code_page(code: str) -> HTMLResponse:
    code_escaped = code.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    qr_src = f"/api/public/company/{urllib.parse.quote(code, safe='')}/qr.png"
    html = f"""<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>BetterDays</title>
  </head>
  <body>
    <div id="root">
      <h1>Code</h1>
      <p>{code_escaped}</p>
      <img alt="QR code" src="{qr_src}" style="width: 260px; height: 260px;" />
    </div>
  </body>
</html>"""
    return HTMLResponse(content=html)
