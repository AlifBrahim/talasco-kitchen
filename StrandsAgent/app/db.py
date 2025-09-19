"""Database utilities for Kitchen agents."""

from __future__ import annotations

import logging
from contextlib import contextmanager
from typing import Any, Iterable, Iterator, Sequence

from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from .config import DatabaseSettings

LOGGER = logging.getLogger(__name__)


class Database:
    """Lightweight wrapper around a psycopg connection pool."""

    def __init__(self, settings: DatabaseSettings) -> None:
        self._pool = ConnectionPool(
            settings.dsn,
            min_size=settings.min_size,
            max_size=settings.max_size,
            kwargs={"autocommit": False, "row_factory": dict_row},
        )
        LOGGER.debug("Initialized database pool with dsn=%s", settings.dsn)

    @contextmanager
    def connection(self) -> Iterator[Any]:
        """Yield a raw psycopg connection from the pool."""
        with self._pool.connection() as conn:
            yield conn

    def fetch_one(self, sql: str, params: Sequence[Any] | None = None) -> dict | None:
        with self.connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(sql, params)
                return cur.fetchone()

    def fetch_all(self, sql: str, params: Sequence[Any] | None = None) -> list[dict]:
        with self.connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(sql, params)
                return list(cur.fetchall())

    def execute(self, sql: str, params: Sequence[Any] | None = None) -> int:
        with self.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                affected = cur.rowcount
            conn.commit()
            return affected

    def execute_many(self, sql: str, param_list: Iterable[Sequence[Any]]) -> None:
        with self.connection() as conn:
            with conn.cursor() as cur:
                cur.executemany(sql, param_list)
            conn.commit()

    @contextmanager
    def transaction(self) -> Iterator[Any]:
        """Provide a cursor inside an explicit transaction."""
        with self.connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                try:
                    yield cur
                    conn.commit()
                except Exception:
                    conn.rollback()
                    raise

    def close(self) -> None:
        self._pool.close()
        LOGGER.debug("Database pool closed")
