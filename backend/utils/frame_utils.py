"""
utils/frame_utils.py
======================
Small, dependency-light helpers for turning a base64 JPEG string (as sent
by the browser over the WebSocket) into an OpenCV BGR numpy frame, and for
bounding a frame's size before it's fed to YOLO.
"""

from __future__ import annotations

import base64
import binascii
from typing import Optional

import cv2
import numpy as np

from backend import config


class InvalidFrameError(Exception):
    """Raised when a frame payload can't be decoded into a valid image."""


def decode_base64_frame(data_url: str) -> np.ndarray:
    """
    Decodes a base64-encoded JPEG (optionally prefixed with a
    `data:image/jpeg;base64,` header, as produced by <canvas>.toDataURL())
    into an OpenCV BGR numpy array.

    Raises InvalidFrameError with a human-readable message on any failure,
    rather than letting a raw exception escape to the WebSocket loop.
    """
    try:
        if "," in data_url:
            # Strip the "data:image/jpeg;base64," prefix if present.
            data_url = data_url.split(",", 1)[1]

        raw_bytes = base64.b64decode(data_url, validate=False)
        np_arr = np.frombuffer(raw_bytes, dtype=np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if frame is None:
            raise InvalidFrameError("cv2.imdecode returned None - not a valid JPEG frame")

        return frame
    except (binascii.Error, ValueError) as exc:
        raise InvalidFrameError(f"Could not base64-decode frame: {exc}") from exc


def resize_for_inference(frame: np.ndarray, max_width: int = config.MAX_FRAME_WIDTH) -> np.ndarray:
    """
    Resizes a frame down (never up) so its width is at most `max_width`,
    preserving aspect ratio. Keeps worst-case YOLO latency bounded on
    modest hardware without needing to touch the detector module.
    """
    h, w = frame.shape[:2]
    if w <= max_width:
        return frame

    scale = max_width / float(w)
    new_size = (max_width, int(h * scale))
    return cv2.resize(frame, new_size, interpolation=cv2.INTER_AREA)
