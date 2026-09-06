"""
services/warning_service.py
=============================
Decides WHEN a HIGH_RISK state should actually trigger a fresh warning
(visual banner + audio cue) on the frontend, applying a cooldown so the
warning doesn't re-fire on every single processed frame while the vehicle
is still approaching the same speed breaker.

This module is intentionally tiny and stateful per-connection: each
WebSocket connection (i.e. each browser tab/session) gets its own
WarningCooldown instance, created in websocket_manager.py.
"""

from __future__ import annotations

import time

from backend import config
from backend.services.risk_engine import RiskLevel


class WarningCooldown:
    """Tracks the last time a HIGH_RISK warning was armed for one session."""

    def __init__(self, cooldown_s: float = config.WARNING_COOLDOWN_S):
        self.cooldown_s = cooldown_s
        self._last_triggered_at: float = 0.0

    def should_trigger(self, risk_level: RiskLevel) -> bool:
        """
        Returns True if a new warning should be sent to the client right now.

        Only HIGH_RISK triggers the prominent audio+visual warning. CAUTION
        is shown as a passive status change (handled directly by the
        frontend from the risk_level field) without the cooldown-gated
        alert.
        """
        if risk_level != RiskLevel.HIGH_RISK:
            return False

        now = time.monotonic()
        if (now - self._last_triggered_at) >= self.cooldown_s:
            self._last_triggered_at = now
            return True
        return False
