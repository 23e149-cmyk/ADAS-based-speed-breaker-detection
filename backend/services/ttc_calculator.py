"""
services/ttc_calculator.py
============================
Computes Time To Collision (TTC) - the estimated number of seconds until
the vehicle would reach the detected speed breaker, assuming constant speed.

Formula:
    TTC (seconds) = distance (m) / speed (m/s)

Vehicle speed from the dashboard is entered in km/h (common for drivers),
so it's converted to m/s before the division:
    speed_m_s = speed_kmh / 3.6

Edge cases handled:
  - speed == 0 (car stationary): TTC is mathematically infinite. We return
    `None` to represent "not applicable" rather than raising a
    ZeroDivisionError or returning a fake huge number.
  - very low speed (below config.MIN_SPEED_FOR_TTC_KMH): treated the same
    as stationary, since TTC at near-zero speed is not a meaningful
    collision-risk signal.
"""

from __future__ import annotations

from typing import Optional

from backend import config


def kmh_to_ms(speed_kmh: float) -> float:
    """Converts km/h to m/s."""
    return speed_kmh / 3.6


def calculate_ttc(distance_m: float, speed_kmh: float) -> Optional[float]:
    """
    Returns TTC in seconds, or None if not applicable (vehicle effectively
    stationary).
    """
    if speed_kmh is None or speed_kmh <= config.MIN_SPEED_FOR_TTC_KMH:
        return None

    speed_ms = kmh_to_ms(speed_kmh)
    if speed_ms <= 0:
        return None

    ttc_s = distance_m / speed_ms
    return round(ttc_s, 2)
