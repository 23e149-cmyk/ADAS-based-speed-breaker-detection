"""
services/distance_estimator.py
================================
Estimates the distance from the camera to a detected speed breaker.

IMPORTANT ACADEMIC / ENGINEERING NOTE
--------------------------------------
A single 2D camera CANNOT measure true real-world distance from a bounding
box alone with high accuracy. What this module implements is the standard
"pinhole camera" approximation:

    distance = (known_real_world_width * focal_length_px) / bbox_width_px

This is a *reasonable, documented, order-of-magnitude estimate* used widely
in monocular-vision prototypes, but it assumes:
  - the real-world width of a speed breaker is roughly constant
    (config.ASSUMED_SPEED_BREAKER_WIDTH_M), which varies in reality,
  - the camera's focal length in pixels is known/calibrated
    (config.ASSUMED_FOCAL_LENGTH_PX), which is a placeholder here,
  - the speed breaker is roughly facing the camera (minimal perspective
    skew).

Because of this, do NOT present this number as survey-grade accurate.
The frontend must always label it "estimated distance".

This class is intentionally the ONLY place that knows how distance is
computed, so it can be swapped later for:
  - a properly calibrated monocular estimator (calibrate focal length with
    a checkerboard pattern),
  - a stereo camera pair (triangulation),
  - a depth camera (e.g. Intel RealSense) that reports metric depth
    directly.
Any replacement just needs to implement `estimate(detection) -> float`.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from backend import config
from backend.detection.yolo_detector import Detection


class BaseDistanceEstimator(ABC):
    """Interface every distance-estimation strategy must implement."""

    @abstractmethod
    def estimate(self, detection: Detection) -> float:
        """Returns estimated distance in metres."""
        raise NotImplementedError


class PinholeApproximateDistanceEstimator(BaseDistanceEstimator):
    """
    Prototype-grade monocular distance estimator using the pinhole-camera
    approximation described in this module's docstring.
    """

    def __init__(
        self,
        known_width_m: float = config.ASSUMED_SPEED_BREAKER_WIDTH_M,
        focal_length_px: float = config.ASSUMED_FOCAL_LENGTH_PX,
    ):
        self.known_width_m = known_width_m
        self.focal_length_px = focal_length_px

    def estimate(self, detection: Detection) -> float:
        x1, y1, x2, y2 = detection.bbox
        bbox_width_px = max(1.0, x2 - x1)  # avoid divide-by-zero

        distance_m = (self.known_width_m * self.focal_length_px) / bbox_width_px

        # Clamp to a plausible range - a near-zero-width box (bad detection)
        # would otherwise produce an absurd distance.
        distance_m = max(config.MIN_DISTANCE_M, min(config.MAX_DISTANCE_M, distance_m))
        return round(distance_m, 2)


# Default strategy used by the app. Swap this instance for another
# BaseDistanceEstimator implementation to change estimation method
# project-wide without touching any other module.
distance_estimator: BaseDistanceEstimator = PinholeApproximateDistanceEstimator()
