"""
services/history_service.py
=============================
Persists each notable detection event to SQLite and provides read-back for
the dashboard's "Detection History" panel.

Kept separate from websocket_manager.py so storage concerns (schema,
queries) don't get tangled with real-time streaming concerns.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from backend import config
from backend.database import get_connection
from backend.services.risk_engine import RiskLevel


def record_detection(
    confidence: float,
    distance_m: float,
    speed_kmh: float,
    ttc_s: Optional[float],
    risk_level: RiskLevel,
) -> None:
    """Inserts one detection event as a row in the `detections` table."""
    timestamp = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO detections (timestamp, confidence, distance_m, speed_kmh, ttc_s, risk_level)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (timestamp, confidence, distance_m, speed_kmh, ttc_s, risk_level.value),
        )
        conn.commit()


def get_recent_detections(limit: int = config.HISTORY_MAX_ROWS_RETURNED) -> List[dict]:
    """Returns the most recent detections, newest first, as plain dicts."""
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, timestamp, confidence, distance_m, speed_kmh, ttc_s, risk_level
            FROM detections
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
        return [dict(row) for row in rows]
