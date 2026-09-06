"""
Unit tests for services/distance_estimator.py and services/ttc_calculator.py
"""

import pytest

from backend.detection.yolo_detector import Detection
from backend.services.distance_estimator import PinholeApproximateDistanceEstimator
from backend.services.ttc_calculator import calculate_ttc, kmh_to_ms


def make_detection(bbox_width_px: float) -> Detection:
    return Detection(
        class_name="speed_breaker",
        confidence=0.9,
        bbox=[100, 100, 100 + bbox_width_px, 160],
        frame_width=640,
        frame_height=480,
    )


def test_wider_bbox_means_closer_distance():
    estimator = PinholeApproximateDistanceEstimator(known_width_m=2.5, focal_length_px=700.0)
    near = estimator.estimate(make_detection(bbox_width_px=300))
    far = estimator.estimate(make_detection(bbox_width_px=50))
    assert near < far


def test_distance_is_clamped_to_configured_range():
    estimator = PinholeApproximateDistanceEstimator(known_width_m=2.5, focal_length_px=700.0)
    # An absurdly wide box should clamp to the minimum distance, not go to ~0.
    result = estimator.estimate(make_detection(bbox_width_px=5000))
    assert result >= 1.0


def test_kmh_to_ms_conversion():
    assert kmh_to_ms(36) == pytest.approx(10.0)


def test_ttc_basic_calculation():
    # 100 m away at 36 km/h (10 m/s) -> 10 seconds to collision.
    ttc = calculate_ttc(distance_m=100.0, speed_kmh=36.0)
    assert ttc == pytest.approx(10.0)


def test_ttc_none_when_stationary():
    assert calculate_ttc(distance_m=50.0, speed_kmh=0.0) is None


def test_ttc_none_below_min_speed_threshold():
    assert calculate_ttc(distance_m=50.0, speed_kmh=0.5) is None
