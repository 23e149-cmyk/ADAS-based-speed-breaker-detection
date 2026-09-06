"""
websocket_manager.py
======================
Orchestrates ONE browser <-> backend WebSocket session:

    Browser Camera --(base64 JPEG frame)--> WebSocket
        -> decode frame (utils.frame_utils)
        -> YOLO inference (detection.yolo_detector)
        -> distance estimation (services.distance_estimator)
        -> TTC calculation (services.ttc_calculator)
        -> risk assessment (services.risk_engine)
        -> warning cooldown (services.warning_service)
        -> history logging (services.history_service)
    WebSocket <--(JSON result)-- Backend

This module is deliberately the only "glue" file that talks to all the
other modules - detection, distance, TTC, risk and warnings each stay
independently testable/explainable (see project README, section 16).
"""

from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass, field

from fastapi import WebSocket, WebSocketDisconnect

from backend import config
from backend.detection.yolo_detector import detector
from backend.services.distance_estimator import distance_estimator
from backend.services.ttc_calculator import calculate_ttc
from backend.services.risk_engine import assess_risk, RiskLevel
from backend.services.warning_service import WarningCooldown
from backend.services.history_service import record_detection
from backend.utils.frame_utils import decode_base64_frame, resize_for_inference, InvalidFrameError

logger = logging.getLogger("adas.websocket_manager")


@dataclass
class SessionState:
    """Per-connection mutable state - each browser tab gets its own."""
    vehicle_speed_kmh: float = 0.0
    frame_counter: int = 0
    processing: bool = False
    warning_cooldown: WarningCooldown = field(default_factory=WarningCooldown)
    fps_window: list = field(default_factory=list)  # timestamps of processed frames


def _update_fps(state: SessionState) -> float:
    """Rolling FPS over the last 2 seconds of *processed* (not raw) frames."""
    now = time.monotonic()
    state.fps_window.append(now)
    cutoff = now - 2.0
    state.fps_window = [t for t in state.fps_window if t >= cutoff]
    if len(state.fps_window) < 2:
        return 0.0
    span = state.fps_window[-1] - state.fps_window[0]
    if span <= 0:
        return 0.0
    return round((len(state.fps_window) - 1) / span, 1)


async def _send_json(websocket: WebSocket, payload: dict) -> None:
    await websocket.send_text(json.dumps(payload))


async def _handle_frame_message(websocket: WebSocket, state: SessionState, raw_frame_data: str) -> None:
    state.frame_counter += 1

    # Frame throttling: only run YOLO every Nth frame, and never run a
    # second inference while one is already in flight for this session.
    if state.processing or (state.frame_counter % config.PROCESS_EVERY_N_FRAMES != 0):
        return

    state.processing = True
    try:
        try:
            frame = decode_base64_frame(raw_frame_data)
        except InvalidFrameError as exc:
            await _send_json(websocket, {"type": "error", "message": str(exc)})
            return

        frame = resize_for_inference(frame)

        result = detector.infer(frame)
        if result.model_error:
            await _send_json(websocket, {"type": "error", "message": result.model_error})
            return

        fps = _update_fps(state)

        if not result.detections:
            await _send_json(websocket, {
                "type": "detection_result",
                "detections": [],
                "risk_level": RiskLevel.SAFE.value,
                "confidence": None,
                "distance_m": None,
                "ttc_s": None,
                "inference_time_ms": round(result.inference_time_ms, 1),
                "fps": fps,
                "vehicle_speed_kmh": state.vehicle_speed_kmh,
                "trigger_warning": False,
                "timestamp": time.time(),
            })
            return

        # Multiple boxes can be detected; use the highest-confidence one
        # (closest/most-certain hazard) to drive distance/TTC/risk, but
        # return every box so the frontend can still draw all overlays.
        best = max(result.detections, key=lambda d: d.confidence)

        distance_m = distance_estimator.estimate(best)
        ttc_s = calculate_ttc(distance_m, state.vehicle_speed_kmh)
        risk = assess_risk(
            confidence=best.confidence,
            distance_m=distance_m,
            speed_kmh=state.vehicle_speed_kmh,
            ttc_s=ttc_s,
        )
        trigger_warning = state.warning_cooldown.should_trigger(risk.level)

        record_detection(
            confidence=best.confidence,
            distance_m=distance_m,
            speed_kmh=state.vehicle_speed_kmh,
            ttc_s=ttc_s,
            risk_level=risk.level,
        )

        await _send_json(websocket, {
            "type": "detection_result",
            "detections": [
                {
                    "class_name": d.class_name,
                    "confidence": round(d.confidence, 3),
                    "bbox": d.bbox,
                    "frame_width": d.frame_width,
                    "frame_height": d.frame_height,
                }
                for d in result.detections
            ],
            "risk_level": risk.level.value,
            "risk_reason": risk.reason,
            "confidence": round(best.confidence, 3),
            "distance_m": distance_m,
            "ttc_s": ttc_s,
            "inference_time_ms": round(result.inference_time_ms, 1),
            "fps": fps,
            "vehicle_speed_kmh": state.vehicle_speed_kmh,
            "trigger_warning": trigger_warning,
            "timestamp": time.time(),
        })
    finally:
        state.processing = False


async def _handle_speed_update(websocket: WebSocket, state: SessionState, speed_value) -> None:
    try:
        speed = float(speed_value)
        if speed < 0 or speed > 300:
            raise ValueError("speed out of plausible range 0-300 km/h")
        state.vehicle_speed_kmh = speed
    except (TypeError, ValueError) as exc:
        await _send_json(websocket, {"type": "error", "message": f"Invalid speed value: {exc}"})


async def handle_connection(websocket: WebSocket) -> None:
    """Main WebSocket loop for one client connection. Wired up in main.py."""
    await websocket.accept()
    state = SessionState()
    logger.info("WebSocket client connected")

    await _send_json(websocket, {
        "type": "status",
        "yolo_loaded": detector.is_loaded,
        "yolo_error": detector.load_error,
        "device": detector.device,
    })

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                message = json.loads(raw)
            except json.JSONDecodeError:
                await _send_json(websocket, {"type": "error", "message": "Malformed JSON message"})
                continue

            msg_type = message.get("type")

            if msg_type == "frame":
                await _handle_frame_message(websocket, state, message.get("data", ""))
            elif msg_type == "speed_update":
                await _handle_speed_update(websocket, state, message.get("speed_kmh"))
            else:
                await _send_json(websocket, {"type": "error", "message": f"Unknown message type: {msg_type}"})

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception:  # noqa: BLE001 - keep the server alive, log unexpected issues
        logger.exception("Unexpected error in WebSocket session")
