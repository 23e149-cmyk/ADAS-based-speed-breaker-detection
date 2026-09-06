# ADAS Speed Breaker Detection System

A real-time, webcam-based Advanced Driver Assistance System (ADAS) prototype
that detects speed breakers using YOLO object detection, estimates distance
and time-to-collision (TTC), assesses risk, and warns the driver through a
live dashboard.

**Academic prototype** built for a final-year EEE project. It is a genuine,
runnable local application — not a mockup — but every estimation method
(distance in particular) is clearly labeled as an approximation, as is
appropriate for a monocular-camera student project.

---

## 1. Project Overview

The system watches a live webcam feed, runs a YOLO model on the video to
detect speed breakers, estimates how far away the breaker is and how many
seconds until the vehicle reaches it (TTC), classifies the situation as
`SAFE` / `CAUTION` / `HIGH_RISK`, and warns the driver visually and audibly
when risk is high — all in real time, streamed over a WebSocket to a React
dashboard styled like an in-vehicle ADAS display.

Vehicle speed is entered manually (slider/number input) since this
prototype has no OBD-II or GPS speed sensor — this is clearly labeled in
the UI.

---

## 2. Architecture

```
Browser Webcam
     │  getUserMedia()
     ▼
<video> element  ──(canvas.toDataURL JPEG, every ~200ms)──►  WebSocket
                                                                  │
                                                                  ▼
                                                        FastAPI /ws/detection
                                                                  │
                                                                  ▼
                                              decode frame (OpenCV, utils/frame_utils.py)
                                                                  │
                                                                  ▼
                                        YOLO inference (detection/yolo_detector.py)
                                        model loaded ONCE at startup, reused every frame
                                                                  │
                                                                  ▼
                              distance estimate (services/distance_estimator.py)
                                                                  │
                                                                  ▼
                                    TTC = distance / speed (services/ttc_calculator.py)
                                                                  │
                                                                  ▼
                                  risk assessment SAFE/CAUTION/HIGH_RISK
                                              (services/risk_engine.py)
                                                                  │
                                                                  ▼
                                warning cooldown gate (services/warning_service.py)
                                          + history logged to SQLite
                                                                  │
                                                                  ▼
                                                   JSON result ──► WebSocket
                                                                  │
                                                                  ▼
                                     React dashboard: bounding-box overlay,
                                  risk gauge, status panel, warning banner,
                                          detection history, trend chart
```

Every stage above is its own module (see "Academic requirement" section
below) so it can be explained, tested, and swapped independently.

---

## 3. Technologies

**Frontend:** React 18, Vite, Tailwind CSS, Recharts
**Backend:** Python, FastAPI, WebSockets, OpenCV, NumPy
**AI:** Ultralytics YOLO (your trained `.pt` weights), PyTorch (CPU or CUDA)
**Storage:** SQLite (via Python's built-in `sqlite3`)

---

## 4. Folder Structure

```
ADAS-SpeedBreaker/
│
├── frontend/                    React + Vite + Tailwind dashboard
│   ├── src/
│   │   ├── components/          Header, CameraPanel, RiskGauge, SpeedControl,
│   │   │                        StatusPanel, WarningBanner, DetectionHistory, TrendChart
│   │   ├── hooks/                useCamera, useWebSocket, useAudioWarning
│   │   ├── App.jsx
│   │   ├── config.js             WS/API URLs, frame-send interval, colors
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── main.py                   FastAPI app, startup (loads YOLO once), REST endpoints
│   ├── config.py                 EVERY tunable threshold/path in one place
│   ├── websocket_manager.py      Orchestrates one browser session's pipeline
│   ├── database.py               SQLite connection/schema
│   ├── detection/
│   │   └── yolo_detector.py      Loads model once, runs inference, filters to speed_breaker
│   ├── services/
│   │   ├── distance_estimator.py Pinhole-camera approximate distance (documented, swappable)
│   │   ├── ttc_calculator.py     TTC = distance / speed, handles zero-speed safely
│   │   ├── risk_engine.py        SAFE / CAUTION / HIGH_RISK decision logic
│   │   ├── warning_service.py    Cooldown so warnings don't fire every frame
│   │   └── history_service.py    Reads/writes detection history to SQLite
│   ├── utils/
│   │   ├── frame_utils.py        base64 → OpenCV frame decode, resize
│   │   └── logger.py
│   ├── tests/                    pytest unit tests for risk/distance/TTC logic
│   └── requirements.txt
│
├── models/
│   ├── best.pt                   ← place YOUR trained weights here (not included)
│   └── README.md                 Model placement instructions
│
├── data/                          SQLite database file lives here at runtime
├── README.md                      This file
└── .gitignore
```

---

## 5. Installation

### Prerequisites
- **Python 3.10–3.12** (3.12 recommended)
- **Node.js 18+** and npm
- A webcam
- (Optional) an NVIDIA GPU + CUDA-enabled PyTorch for faster inference

### 5.1 Python / backend setup (Windows PowerShell)

```powershell
cd ADAS-SpeedBreaker

# create and activate a virtual environment
python -m venv venv
venv\Scripts\activate

# install dependencies
pip install -r backend\requirements.txt
```

> **GPU users:** the default `torch` from `requirements.txt` is CPU-only.
> For CUDA acceleration, install PyTorch first using the command generated
> at https://pytorch.org/get-started/locally/ for your CUDA version, THEN
> run the `pip install -r backend\requirements.txt` above.

### 5.2 Node / frontend setup

```powershell
cd frontend
npm install
```

### 5.3 YOLO model placement

Copy your trained weights file to:

```
ADAS-SpeedBreaker\models\best.pt
```

See `models/README.md` for using a different filename/path or class name.

---

## 6. How to Start the Backend

From the **project root** (important — the backend uses `backend.` package
imports):

```powershell
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Verify it's running: open http://localhost:8000/api/health in a browser.
You should see JSON reporting `yolo_loaded` (true once your model is in
place), the compute `device` (`cpu` or `cuda`), and the model path.

## 7. How to Start the Frontend

In a **second terminal**:

```powershell
cd frontend
npm run dev
```

Open the printed URL (default **http://localhost:5173**). The browser will
ask for camera permission — allow it. The dashboard connects to the
backend automatically via WebSocket at `ws://localhost:8000/ws/detection`.

> If your backend runs on a different host/port, create `frontend/.env`
> with `VITE_BACKEND_HOST=your-host:port`.

### Running the tests

```powershell
pytest backend\tests -v
```

---

## 8. How Camera Processing Works

`useCamera.js` requests the webcam via `navigator.mediaDevices.getUserMedia`
and attaches the stream to a `<video>` element. It reports distinct states
(`idle`, `pending`, `granted`, `denied`, `unavailable`, `disconnected`) so
the UI can show the right message instead of a blank screen. Once granted,
`useWebSocket.js` grabs a frame from the `<video>` element onto a hidden
`<canvas>` every ~200ms, encodes it as a JPEG data URL, and sends it to the
backend over the WebSocket as `{"type": "frame", "data": "..."}`.

## 9. How YOLO Works

At server startup (`main.py`'s `on_startup` handler), `YOLODetector.load()`
loads your `.pt` weights into memory **exactly once**, choosing CUDA if
available (else CPU). For every processed frame, `.infer(frame)` runs
`model.predict(...)` and filters the raw results down to just the
`speed_breaker` class (see `TARGET_CLASSES` in `config.py`), above the
configured confidence threshold. The model is **never reloaded per frame**
— reloading a PyTorch model per frame would make real-time detection
impossible. To keep the backend responsive on modest hardware, the backend
only runs inference on every `PROCESS_EVERY_N_FRAMES`-th received frame
(default: every 2nd frame) and skips a frame outright if a previous
inference is still running.

## 10. How Distance Estimation Works

`services/distance_estimator.py` uses the standard **pinhole-camera
approximation**:

```
distance = (real_world_width_of_object × focal_length_in_pixels) / bbox_width_in_pixels
```

This is a well-known, reasonable order-of-magnitude estimate for a single
uncalibrated camera, **but it is not survey-grade accurate** — it assumes a
roughly constant real-world speed-breaker width and an approximate focal
length. The dashboard always labels this value "estimated distance". The
estimator is written behind a small interface (`BaseDistanceEstimator`) so
it can be swapped for a calibrated monocular estimate, a stereo camera
pair, or a depth camera without touching any other module.

## 11. How TTC Works

`services/ttc_calculator.py` computes:

```
TTC (seconds) = distance (m) / vehicle_speed (m/s)
```

Vehicle speed is entered in km/h on the dashboard and converted to m/s
(`÷ 3.6`) before dividing. If speed is at/below `MIN_SPEED_FOR_TTC_KMH`
(≈ stationary), TTC is undefined and reported as `None`/`--` rather than
dividing by zero or showing a misleading number.

## 12. How Risk Assessment Works

`services/risk_engine.py` combines TTC and distance (each checked against
configurable thresholds in `config.RISK_THRESHOLDS`) and takes the **more
severe** of the two verdicts. A `HIGH_RISK` verdict additionally requires
detection confidence to be above `min_confidence_for_high_risk`, otherwise
it's downgraded to `CAUTION` — this avoids a single jittery, low-confidence
detection triggering the most prominent (audio) warning. All thresholds
live in one place (`backend/config.py`) so they're easy to point to and
tune during a project review.

## 13. Warning System

When risk becomes `HIGH_RISK`, `services/warning_service.py` arms a fresh
warning only if at least `WARNING_COOLDOWN_S` seconds (default 5s) have
passed since the last one — so the banner/beep don't refire on every
processed frame while still approaching the same hazard. The frontend
reacts to a `trigger_warning: true` flag in the WebSocket message by
showing a bold red banner ("SPEED BREAKER AHEAD — SLOW DOWN") and playing a
two-tone beep via the Web Audio API (no external audio file needed).

---

## 14. Known Limitations

- **Distance is a monocular approximation**, not a calibrated/metric
  measurement — real-world accuracy depends heavily on the assumed
  speed-breaker width and an uncalibrated focal length constant.
- **Vehicle speed is manual input** — there is no real speed sensor
  integration (OBD-II, GPS) in this prototype.
- **Single-camera, single-class detection** — no stereo depth, no lane
  detection, no multi-hazard classification beyond "speed breaker".
- **Frame-rate bound by hardware** — CPU-only machines will see lower FPS
  and higher inference latency than GPU machines; `PROCESS_EVERY_N_FRAMES`
  and `MAX_FRAME_WIDTH` in `config.py` can be tuned to trade accuracy for
  speed.
- **No authentication/security hardening** — this is a local development
  prototype (CORS is wide-open); do not expose it directly to the internet
  as-is.
- **Detection quality depends entirely on your trained model** — this
  project does not include or train a model; you must supply `best.pt`
  trained on your own speed-breaker dataset.

## 15. Future Improvements

- Calibrate the monocular distance estimator with a checkerboard pattern,
  or swap in a stereo/depth camera via the existing `BaseDistanceEstimator`
  interface.
- Integrate real vehicle telemetry (OBD-II/GPS) instead of manual speed
  entry.
- Multi-class hazard detection (potholes, pedestrians, other vehicles) with
  per-class risk logic.
- Model quantization/TensorRT export for faster edge-device inference.
- Persist per-session analytics (e.g. average TTC, warnings per drive) for
  longer-term driver behaviour analysis.

---

## 16. Data Flow Summary (plain-language)

1. Your browser asks permission to use the webcam and shows the live feed.
2. About 5 times a second, the browser grabs a still image from that video
   and sends it to the Python backend over a WebSocket connection.
3. The backend decodes the image and feeds it to a YOLO model that was
   loaded into memory once when the server started — the model looks for
   speed breakers in the image.
4. If a speed breaker is found, the backend estimates how far away it is
   (using the size of the detected box in the image), calculates how many
   seconds until the car would reach it (using the distance and the speed
   you entered), and decides whether that's SAFE, CAUTION, or HIGH_RISK.
5. The backend sends all of this back to the browser, which draws a box
   around the speed breaker on the video, updates the risk gauge and status
   numbers, and — if risk is HIGH — flashes a warning and plays a beep
   (but not more than once every 5 seconds for the same hazard).
6. Every detection is also saved to a small local database so you can
   scroll back through recent detections in the history table.
