"""
services/risk_engine.py
=========================
Turns (detection confidence, estimated distance, vehicle speed, TTC) into
one of three risk states: SAFE, CAUTION, HIGH_RISK.

Kept completely separate from detection/distance/TTC modules so the
decision logic can be explained, tested and tuned on its own (see
backend/tests/test_risk_engine.py) - this is the "risk assessment" module
required to be modular by the project brief.

All thresholds live in config.RISK_THRESHOLDS, not hardcoded here.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Optional

from backend import config


class RiskLevel(str, Enum):
    SAFE = "SAFE"
    CAUTION = "CAUTION"
    HIGH_RISK = "HIGH_RISK"


@dataclass
class RiskAssessment:
    level: RiskLevel
    reason: str


def assess_risk(
    confidence: float,
    distance_m: float,
    speed_kmh: float,
    ttc_s: Optional[float],
) -> RiskAssessment:
    """
    Decision logic (in priority order):

    1. No detection at all is handled by the caller (websocket_manager),
       which simply doesn't call this function - "no speed breaker in
       view" is always SAFE.

    2. If TTC is None, the vehicle is (near) stationary or reversing away
       from the hazard - use DISTANCE alone as the signal.

    3. If TTC is available:
         TTC <= ttc_high_risk_s               -> candidate HIGH_RISK
         ttc_high_risk_s < TTC <= ttc_caution_s -> candidate CAUTION
         TTC > ttc_caution_s                   -> candidate SAFE

    4. Distance is checked as a secondary/backup signal using the same
       structure, and the MORE severe of the TTC-based and distance-based
       verdicts wins (better to over-warn slightly than under-warn).

    5. A HIGH_RISK verdict additionally requires the detection confidence
       to be >= min_confidence_for_high_risk; otherwise it is downgraded
       to CAUTION. This avoids a jittery, low-confidence detection
       triggering the most severe (audio) warning.
    """
    t = config.RISK_THRESHOLDS

    # --- TTC-based verdict --------------------------------------------
    if ttc_s is None:
        ttc_level = RiskLevel.SAFE
    elif ttc_s <= t["ttc_high_risk_s"]:
        ttc_level = RiskLevel.HIGH_RISK
    elif ttc_s <= t["ttc_caution_s"]:
        ttc_level = RiskLevel.CAUTION
    else:
        ttc_level = RiskLevel.SAFE

    # --- Distance-based verdict (secondary signal) ---------------------
    if distance_m <= t["distance_high_risk_m"]:
        distance_level = RiskLevel.HIGH_RISK
    elif distance_m <= t["distance_caution_m"]:
        distance_level = RiskLevel.CAUTION
    else:
        distance_level = RiskLevel.SAFE

    # --- Combine: take the more severe of the two ----------------------
    severity_order = {RiskLevel.SAFE: 0, RiskLevel.CAUTION: 1, RiskLevel.HIGH_RISK: 2}
    combined = max([ttc_level, distance_level], key=lambda lvl: severity_order[lvl])

    reason_parts = [f"TTC={ttc_s if ttc_s is not None else 'N/A'}s", f"distance={distance_m}m"]

    # --- Confidence gate on HIGH_RISK -----------------------------------
    if combined == RiskLevel.HIGH_RISK and confidence < t["min_confidence_for_high_risk"]:
        combined = RiskLevel.CAUTION
        reason_parts.append(f"downgraded: confidence {confidence:.2f} below high-risk threshold")

    reason = ", ".join(reason_parts)
    return RiskAssessment(level=combined, reason=reason)
