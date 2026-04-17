from __future__ import annotations

from sqlalchemy import Engine, text


def _normalize_company_code(code: str | None) -> str | None:
    if not code:
        return code
    parts = [part.strip() for part in code.split("|") if part.strip()]
    if len(parts) >= 2:
        return f"{parts[0]}|{parts[1]}"
    return code


def _normalize_product_code(code: str | None) -> str | None:
    if not code:
        return code
    parts = [part.strip() for part in code.split("|") if part.strip()]
    if parts:
        return parts[-1]
    return code


def _has_column(engine: Engine, *, table: str, column: str) -> bool:
    with engine.connect() as conn:
        rows = conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
    for row in rows:
        if len(row) >= 2 and row[1] == column:
            return True
    return False


def run_migrations(engine: Engine) -> None:
    if not _has_column(engine, table="companies", column="geocoded_address"):
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE companies ADD COLUMN geocoded_address VARCHAR(800)"))
            conn.execute(
                text(
                    "UPDATE companies SET geocoded_address = address "
                    "WHERE geocoded_address IS NULL OR geocoded_address = ''"
                )
            )

    with engine.begin() as conn:
        company_rows = conn.execute(text("SELECT id, code FROM companies")).fetchall()
        for row in company_rows:
            company_id = row[0]
            code = row[1]
            normalized = _normalize_company_code(code)
            if normalized and normalized != code:
                conn.execute(
                    text("UPDATE companies SET code = :code WHERE id = :id"),
                    {"id": company_id, "code": normalized},
                )

        product_rows = conn.execute(text("SELECT id, code FROM products")).fetchall()
        for row in product_rows:
            product_id = row[0]
            code = row[1]
            normalized = _normalize_product_code(code)
            if normalized and normalized != code:
                conn.execute(
                    text("UPDATE products SET code = :code WHERE id = :id"),
                    {"id": product_id, "code": normalized},
                )
