"""Application configuration helpers for Kitchen agents."""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from functools import lru_cache
from typing import Optional
from urllib.parse import quote_plus

from dotenv import load_dotenv

# Load default .env first, then allow overrides from malice.env if present
load_dotenv()
load_dotenv(dotenv_path="malice.env", override=True)

LOGGER = logging.getLogger(__name__)


@dataclass(frozen=True)
class AWSSettings:
    """Runtime configuration for AWS Bedrock access."""

    access_key_id: Optional[str]
    secret_access_key: Optional[str]
    region: Optional[str]
    bedrock_model_id: Optional[str]


@dataclass(frozen=True)
class DatabaseSettings:
    """PostgreSQL connection information."""

    dsn: str
    min_size: int = 1
    max_size: int = 5


@dataclass(frozen=True)
class Settings:
    """Aggregate application settings."""

    aws: AWSSettings
    database: DatabaseSettings
    log_level: str = "INFO"


def _resolve_database_dsn() -> str:
    """Create a PostgreSQL DSN string from environment variables.

    The helper prefers `DATABASE_URL` when available, but also supports individual
    parameters (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`).
    """

    if database_url := os.getenv("DATABASE_URL"):
        LOGGER.debug("Using DATABASE_URL environment variable for connection")
        return database_url

    host = os.getenv("DB_HOST")
    name = os.getenv("DB_NAME")
    user = os.getenv("DB_USER")
    password = os.getenv("DB_PASSWORD")
    port = os.getenv("DB_PORT", "5432")

    missing = [key for key, value in {
        "DB_HOST": host,
        "DB_NAME": name,
        "DB_USER": user,
        "DB_PASSWORD": password,
    }.items() if not value]

    if missing:
        joined = ", ".join(missing)
        raise RuntimeError(
            "Database configuration is incomplete. Provide DATABASE_URL or set: "
            f"{joined}."
        )

    safe_password = quote_plus(password or "")
    return f"postgresql://{user}:{safe_password}@{host}:{port}/{name}"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return memoized project settings."""

    log_level = os.getenv("LOG_LEVEL", "INFO").upper()

    aws_settings = AWSSettings(
        access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region=os.getenv("AWS_REGION"),
        bedrock_model_id=os.getenv("BEDROCK_MODEL_ID"),
    )

    database_settings = DatabaseSettings(dsn=_resolve_database_dsn())

    return Settings(aws=aws_settings, database=database_settings, log_level=log_level)
