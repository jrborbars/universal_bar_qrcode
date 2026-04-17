# Universal\_qrcode

High-level QR and public registry app for companies and products.

## What It Does

This project lets a user:

- register and log in
- create companies
- geocode and confirm the company address
- generate a unique company code and QR code
- create products linked to a company
- generate a unique product code and QR code
- expose public pages for companies and products

The goal is to have a URL-friendly identifier that can be shared directly or embedded in a QR code, without relying on traditional EAN-style product numbering.

## How It Works

Current main entities:

- `User`: account owner
- `Company`: owned by a user, includes address, geocoded location, tax id, code, and QR
- `Product`: belongs to a company, includes SKU, descriptions, category, status, dimensions, volume, customer-facing field, code, and QR

## Code Generation

Company and product codes are generated on the backend.

The identifier model is:

- an S2 token derived from latitude/longitude
- a UUIDv7 component
- a UUIDv4 component

Company ID:

- `S2 + UUIDv7`

Only these two parts define the company identity and company QR code.

Product ID:

- `UUIDv4`

The product identity is only the UUIDv4 part.

Full product QR / public code:

- `company ID + product ID`

So the product QR payload combines the company identifier with the product identifier.

The idea is to have a theoretically constant division of earth in areas of about `100m x 100m`, where multiple companies can exist in the same area and each company can own multiple products. The S2-derived part places the company geographically, the UUIDv7 distinguishes companies within that area, and the UUIDv4 distinguishes products within the company scope.

This way we have a URL-safe structure that can be used as a unique public reference and resolved by an endpoint.

This is a free proposal to substitute traditional EAN-style product numbering, and we welcome feedback on it.

## Public Pages

The application exposes public pages that can be opened directly from the generated code:

- company page: `/c/{code}`
- product page: `/p/{code}`

Product public pages are intended for customer-facing information. The dedicated customer field is shown there.

## Local Run

The simplest way to run the app locally is with Docker Compose:

```bash
docker compose up --build
```

Default local URL:

- frontend/public entry: `http://localhost:3175`

The frontend is exposed on port `3175`, and the backend runs behind it in the compose setup.

## Summary

This repository is a small full-stack registry system where authenticated users manage companies and products, and each record gets a unique code and QR-backed public page.

## History

- 05/2021: Initial version (v0.0)

  id\_local - id\_company or individual - id\_product
  - id\_local: geohash (30bits, 8chars, base32) (v0.0)
  - id\_company: UUIDv4 (128bits, 32chars \[+ 4hyphens], base16) (v0.0)
  - id\_product:   SHA512 (512bits, 88chars, base64) (v0.0) | SHA256 (256bits, 44chars, base64) (v0.1)
- 12/2025: Upgrade to S2 and UUIDv7 (v0.2)

  id\_local | id\_company | id\_product
  - id\_local: S2 hash (64bits, 10chars, base16), level 16 | (16chars at level 30\[max])
  - id\_company: UUIDv7 (128bits, 32chars \[+ 4hyphens], base16)
  - id\_product: UUIDv4 (128bits, 32chars \[+ 4hyphens], base16)
