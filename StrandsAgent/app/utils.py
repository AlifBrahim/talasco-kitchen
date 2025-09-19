"""Shared utilities for the Strands kitchen agents."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any


def serialize_value(value: Any) -> Any:
    """Convert database values so they are JSON serialisable."""
    if isinstance(value, Decimal):
        return float(value)

    if isinstance(value, (datetime, date)):
        return value.isoformat()

    if isinstance(value, list):
        return [serialize_value(item) for item in value]

    if isinstance(value, dict):
        return {key: serialize_value(val) for key, val in value.items()}

    return value


def serialize_row(row: dict) -> dict:
    """Serialise a single database row."""
    return {column: serialize_value(val) for column, val in row.items()}


def serialize_rows(rows: list[dict]) -> list[dict]:
    """Serialise a list of database rows."""
    return [serialize_row(row) for row in rows]
