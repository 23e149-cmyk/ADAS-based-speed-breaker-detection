"""
detection/yolo_detector.py
===========================
Wraps an Ultralytics YOLO model.

Responsibilities (and ONLY these - keep AI concerns separate from
risk/distance/TTC concerns per the project's modular design):
  1. Load the model exactly once (at server startup).
  2. Run inference on a single BGR (OpenCV) frame.
  3. Filter raw YOLO results down to the speed-breaker class(es).
  4. Return a small, plain-Python-object detection result.

This module does NOT know about distance, TTC, risk, or WebSockets.
"""

from __future__ import annotations

import time
import logging
from dataclasses import dataclass, field
from typing import List, Optional

import numpy as np

from backend import config

logger = logging.getLogger("adas.yolo_detector")


@dataclass
class Detection:
    """A single speed-breaker detection in one frame."""
    class_name: str
    confidence: float
    # Bounding box in pixel coordinates of the (possibly resized) frame
    # that was actually fed to the model: [x1, y1, x2, y2]
    bbox: List[float]
    frame_width: int
    frame_height: int


@dataclass
class InferenceResult:
    """Everything the rest of the pipeline needs from one inference call."""
    detections: List[Detection] = field(default_factory=list)
    inference_time_ms: float = 0.0
    model_error: Optional[str] = None


class YOLODetector:
    """
    Loads a YOLO .pt model once and exposes a simple `.infer(frame)` method.

    Usage:
        detector = YOLODetector(config.YOLO_MODEL_PATH)
        detector.load()                 # call once at startup
        result = detector.infer(frame)  # call per processed frame
    """

    def __init__(self, model_path: str):
        self.model_path = model_path
        self.model = None
        self.device = "cpu"
        self.is_loaded = False
        self.load_error: Optional[str] = None
        self.class_names: dict = {}

    def load(self) -> None:
        """
        Loads the YOLO model into memory. Safe to call once; the FastAPI
        startup event calls this exactly once so we never reload per-frame
        (that would be extremely slow and defeats the purpose of a
        "load once" ADAS pipeline).
        """
        import os

        if not os.path.exists(self.model_path):
            self.load_error = (
                f"YOLO model file not found at '{self.model_path}'. "
                "Place your trained weights at models/best.pt "
                "(see README section 'YOLO model placement')."
            )
            logger.error(self.load_error)
            self.is_loaded = False
            return

        try:
            # Imported lazily so the rest of the backend can start up and
            # report a clean error even if ultralytics/torch aren't
            # installed yet.
            from ultralytics import YOLO
            import torch

            self.device = "cuda" if (torch.cuda.is_available() and not config.FORCE_CPU) else "cpu"

            self.model = YOLO(self.model_path)
            self.model.to(self.device)

            # model.names maps class index -> class name string, as defined
            # by whatever dataset the model was trained on.
            self.class_names = self.model.names

            self.is_loaded = True
            self.load_error = None
            logger.info(
                "YOLO model loaded from %s on device=%s, classes=%s",
                self.model_path, self.device, self.class_names,
            )
        except Exception as exc:  # noqa: BLE001 - surfaced to API/health check
            self.load_error = f"Failed to load YOLO model: {exc}"
            logger.exception(self.load_error)
            self.is_loaded = False

    def infer(self, frame: np.ndarray) -> InferenceResult:
        """
        Runs YOLO inference on a single frame and returns only the
        speed-breaker detections above the configured confidence threshold.

        `frame` is expected to be a BGR numpy array (as produced by
        OpenCV / decoded from the browser's JPEG frame).
        """
        if not self.is_loaded or self.model is None:
            return InferenceResult(model_error=self.load_error or "Model not loaded")

        h, w = frame.shape[:2]
        start = time.perf_counter()

        try:
            results = self.model.predict(
                source=frame,
                imgsz=config.INFERENCE_IMG_SIZE,
                conf=config.CONFIDENCE_THRESHOLD,
                device=self.device,
                verbose=False,
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception("YOLO inference failed")
            return InferenceResult(model_error=f"Inference error: {exc}")

        inference_time_ms = (time.perf_counter() - start) * 1000.0

        detections: List[Detection] = []
        target_classes_lower = {c.lower() for c in config.TARGET_CLASSES}

        if results:
            r = results[0]
            boxes = getattr(r, "boxes", None)
            if boxes is not None:
                for box in boxes:
                    cls_idx = int(box.cls[0].item())
                    class_name = self.class_names.get(cls_idx, str(cls_idx))
                    confidence = float(box.conf[0].item())

                    if class_name.lower() not in target_classes_lower:
                        # Not a speed breaker - this project only cares
                        # about that class, even if the model can detect
                        # other things.
                        continue

                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    detections.append(
                        Detection(
                            class_name=class_name,
                            confidence=confidence,
                            bbox=[x1, y1, x2, y2],
                            frame_width=w,
                            frame_height=h,
                        )
                    )

        return InferenceResult(
            detections=detections,
            inference_time_ms=inference_time_ms,
        )


# A single shared instance, created here but `.load()`-ed from main.py's
# FastAPI startup event so the loading (and any error) happens at a
# predictable point in the app lifecycle.
detector = YOLODetector(config.YOLO_MODEL_PATH)
