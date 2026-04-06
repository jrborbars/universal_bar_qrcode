from __future__ import annotations

from sqlalchemy import Engine, text


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
