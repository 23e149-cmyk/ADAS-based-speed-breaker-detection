# Models Folder

Place your trained Ultralytics YOLO weights file here, named exactly:

```
models/best.pt
```

The backend (`backend/config.py`) points at this path by default:

```python
YOLO_MODEL_PATH = os.environ.get("YOLO_MODEL_PATH", str(MODELS_DIR / "best.pt"))
```

## Using a different filename or location

Either:
1. Rename your weights file to `best.pt` and put it in this folder, **or**
2. Set the `YOLO_MODEL_PATH` environment variable before starting the
   backend, e.g. on Windows PowerShell:
   ```powershell
   $env:YOLO_MODEL_PATH = "D:\models\speed_breaker_v2.pt"
   uvicorn backend.main:app --reload
   ```

## Class name

Your model's training data must include a class labeled one of:
`speed_breaker`, `speed breaker`, `speedbreaker`, or `bump`
(case-insensitive - see `TARGET_CLASSES` in `backend/config.py`). If your
dataset used a different label string, add it to that list.

## No model yet?

The backend will still start without a model present - `/api/health` and
the WebSocket `status` message will report `yolo_loaded: false` with a
clear error message instead of crashing, so you can develop/test the rest
of the dashboard first and drop in weights later.
