"""
main.py
========
FastAPI application entrypoint for the ADAS Speed Breaker Detection System
backend.

Run from the PROJECT ROOT (the folder containing backend/, frontend/,
models/) with:

    uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

Endpoints:
    GET  /api/health    -> server + model + camera-pipeline status
    GET  /api/history    -> recent detection history (for the dashboard's
                            history table, in case the frontend reloads)
    WS   /ws/detection    -> the real-time detection stream (see
                            websocket_manager.py)
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from backend import config, database
from backend.detection.yolo_detector import detector
from backend.services.history_service import get_recent_detections
from backend.utils.logger import setup_logging
from backend.websocket_manager import handle_connection

setup_logging()
logger = logging.getLogger("adas.main")

app = FastAPI(
    title="ADAS Speed Breaker Detection System",
    description="Real-time speed breaker detection, distance/TTC estimation and risk assessment.",
    version="1.0.0",
)

# Allow the Vite dev server (default http://localhost:5173) to connect.
# For a LAN/production deployment, replace "*" with your actual frontend
# origin(s).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    """
    Runs exactly once when the server process starts:
      - initialise the SQLite database/table
      - load the YOLO model into memory ONCE (never reloaded per-frame)
    A missing/broken model does NOT crash the server - it's reported via
    /api/health and over the WebSocket `status` message instead, so the
    frontend can show a clear error instead of the app failing to start.
    """
    database.init_db()
    logger.info("Loading YOLO model from %s ...", config.YOLO_MODEL_PATH)
    detector.load()
    if detector.is_loaded:
        logger.info("YOLO model ready on device=%s", detector.device)
    else:
        logger.warning("YOLO model NOT loaded: %s", detector.load_error)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "yolo_loaded": detector.is_loaded,
        "yolo_error": detector.load_error,
        "device": detector.device,
        "model_path": config.YOLO_MODEL_PATH,
    }


@app.get("/api/history")
def history(limit: int = config.HISTORY_MAX_ROWS_RETURNED):
    return {"detections": get_recent_detections(limit=limit)}


@app.websocket("/ws/detection")
async def detection_ws(websocket: WebSocket):
    await handle_connection(websocket)
