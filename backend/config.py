"""
config.py
=========
Single source of truth for every tunable value in the backend.

Academic note: keeping thresholds here (instead of scattered inside modules)
is what lets you show a reviewer "here is every number that drives the
system's behaviour" in one place, and change behaviour without touching
detection/estimation logic.
"""

import os
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent          # project root
MODELS_DIR = BASE_DIR / "models"
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

# Your trained weights must be placed here (see README section "YOLO model
# placement"). You can override the path with the YOLO_MODEL_PATH env var
# without editing this file.
YOLO_MODEL_PATH = os.environ.get(
    "YOLO_MODEL_PATH", str(MODELS_DIR / "best.pt")
)

SQLITE_DB_PATH = str(DATA_DIR / "detections.db")

# ---------------------------------------------------------------------------
# YOLO / detection
# ---------------------------------------------------------------------------
# The class name(s) in your model that represent a speed breaker. Ultralytics
# models carry their own class-name map (model.names); this list is used to
# filter the raw results down to only the classes we care about for this
# project. Edit this if your dataset used a different label string.
TARGET_CLASSES = ["speed_breaker", "speed breaker", "speedbreaker", "bump"]

# Minimum confidence for a detection to be considered "real" and pushed to
# the risk engine / frontend at all.
CONFIDENCE_THRESHOLD = 0.45

# YOLO inference image size (must match / be compatible with training size).
INFERENCE_IMG_SIZE = 640

# Device selection is automatic (CUDA if available, else CPU) - see
# detection/yolo_detector.py. This flag lets you force CPU even if a GPU is
# present, useful for debugging.
FORCE_CPU = os.environ.get("FORCE_CPU", "0") == "1"

# ---------------------------------------------------------------------------
# Frame pipeline / performance
# ---------------------------------------------------------------------------
# The browser sends frames continuously; running YOLO on every single frame
# at full webcam FPS is unnecessary and can overload a CPU-only machine.
# We only run inference once every PROCESS_EVERY_N_FRAMES frames received,
# and skip a frame entirely if the previous inference hasn't finished yet.
PROCESS_EVERY_N_FRAMES = 2

# Frames are resized (preserving aspect ratio) to this max width before
# inference, to bound worst-case latency on modest hardware.
MAX_FRAME_WIDTH = 640

# ---------------------------------------------------------------------------
# Distance estimation (see services/distance_estimator.py for the method)
# ---------------------------------------------------------------------------
# Pinhole-camera approximation: distance = (KNOWN_WIDTH_M * FOCAL_LENGTH_PX) / bbox_width_px
# These are rough defaults for a typical laptop/webcam and an "average"
# speed breaker width, and are clearly documented as approximate. Replace
# with a calibrated focal length for your specific camera for better
# accuracy (see README "How distance estimation works").
ASSUMED_SPEED_BREAKER_WIDTH_M = 2.5     # average real-world width of a speed breaker
ASSUMED_FOCAL_LENGTH_PX = 700.0         # placeholder focal length, calibrate for real use

# Clamp distance estimates to a plausible range (metres) to avoid nonsensical
# values when a bounding box is tiny/noisy.
MIN_DISTANCE_M = 1.0
MAX_DISTANCE_M = 60.0

# ---------------------------------------------------------------------------
# TTC (time to collision)
# ---------------------------------------------------------------------------
# If vehicle speed is at/below this (km/h), we treat TTC as "not applicable"
# (infinite) instead of dividing by ~zero.
MIN_SPEED_FOR_TTC_KMH = 1.0

# ---------------------------------------------------------------------------
# Risk engine thresholds (all configurable, all in one place)
# ---------------------------------------------------------------------------
RISK_THRESHOLDS = {
    # TTC thresholds, in seconds. TTC below HIGH -> HIGH_RISK candidate,
    # between HIGH and CAUTION -> CAUTION candidate, above CAUTION -> SAFE.
    "ttc_high_risk_s": 3.0,
    "ttc_caution_s": 6.0,

    # Distance thresholds, in metres (used as a secondary signal alongside TTC).
    "distance_high_risk_m": 8.0,
    "distance_caution_m": 20.0,

    # Detection confidence required to allow a HIGH_RISK verdict at all.
    # A low-confidence detection is capped at CAUTION even if TTC looks bad,
    # to avoid crying wolf on noisy detections.
    "min_confidence_for_high_risk": 0.6,
}

# ---------------------------------------------------------------------------
# Warning system
# ---------------------------------------------------------------------------
# Minimum seconds between two consecutive HIGH_RISK warnings being (re)armed,
# so the UI/audio doesn't fire on every single processed frame.
WARNING_COOLDOWN_S = 5.0

# ---------------------------------------------------------------------------
# Detection history
# ---------------------------------------------------------------------------
HISTORY_MAX_ROWS_RETURNED = 50
