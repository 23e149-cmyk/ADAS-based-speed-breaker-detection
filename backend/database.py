"""
database.py
=============
Minimal SQLite setup for persisting detection history. Uses the Python
standard library `sqlite3` module directly (no ORM) to keep the academic
project easy to explain end-to-end.
"""

from __future__ import annotations

import sqlite3
from contextlib import contextmanager

from backend import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS detections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    confidence REAL NOT NULL,
    distance_m REAL NOT NULL,
    speed_kmh REAL NOT NULL,
    ttc_s REAL,
    risk_level TEXT NOT NULL
);
"""


def init_db() -> None:
    """Creates the detections table if it doesn't already exist."""
    with get_connection() as conn:
        conn.execute(SCHEMA)
        conn.commit()


@contextmanager
def get_connection():
    conn = sqlite3.connect(config.SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()
