"""
Unit tests for services/risk_engine.py

Run from the project root with:
    pytest backend/tests -v
"""

from backend.services.risk_engine import assess_risk, RiskLevel


def test_far_away_low_speed_is_safe():
    result = assess_risk(confidence=0.9, distance_m=40.0, speed_kmh=20.0, ttc_s=7.2)
    assert result.level == RiskLevel.SAFE


def test_close_and_fast_is_high_risk():
    result = assess_risk(confidence=0.85, distance_m=5.0, speed_kmh=60.0, ttc_s=1.0)
    assert result.level == RiskLevel.HIGH_RISK


def test_medium_distance_is_caution():
    result = assess_risk(confidence=0.8, distance_m=15.0, speed_kmh=40.0, ttc_s=4.5)
    assert result.level == RiskLevel.CAUTION


def test_low_confidence_downgrades_high_risk_to_caution():
    # Distance/TTC alone say HIGH_RISK, but confidence is too low to trust it.
    result = assess_risk(confidence=0.3, distance_m=4.0, speed_kmh=50.0, ttc_s=0.9)
    assert result.level == RiskLevel.CAUTION


def test_stationary_vehicle_uses_distance_only():
    # TTC is None (vehicle stationary) -> distance decides risk.
    result = assess_risk(confidence=0.9, distance_m=3.0, speed_kmh=0.0, ttc_s=None)
    assert result.level == RiskLevel.HIGH_RISK

    result_far = assess_risk(confidence=0.9, distance_m=30.0, speed_kmh=0.0, ttc_s=None)
    assert result_far.level == RiskLevel.SAFE
