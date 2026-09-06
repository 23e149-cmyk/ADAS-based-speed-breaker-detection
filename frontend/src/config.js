/**
 * config.js
 * ==========
 * Frontend-side constants. Mirrors a few values from backend/config.py so
 * the UI can label things consistently (e.g. cooldown seconds shown in the
 * warning banner). If you change a threshold on the backend, consider
 * updating the matching value here for a consistent story during your
 * project review.
 */

// Backend WebSocket + REST endpoints. Override via a .env file
// (VITE_BACKEND_HOST) if the backend runs on a different host/port.
const BACKEND_HOST = import.meta.env.VITE_BACKEND_HOST || "localhost:8000";

export const WS_URL = `ws://${BACKEND_HOST}/ws/detection`;
export const API_BASE_URL = `http://${BACKEND_HOST}/api`;

// How often (ms) a frame is captured from the video element and sent to
// the backend. The backend additionally throttles actual YOLO inference
// via PROCESS_EVERY_N_FRAMES - this just bounds how much we send over the
// wire in the first place.
export const FRAME_SEND_INTERVAL_MS = 200;

// JPEG quality used when encoding captured frames (0-1).
export const FRAME_JPEG_QUALITY = 0.6;

// Mirrors backend config.WARNING_COOLDOWN_S - for display purposes only;
// the actual cooldown enforcement happens server-side.
export const WARNING_COOLDOWN_S = 5.0;

export const RISK_COLORS = {
  SAFE: "#00D97E",
  CAUTION: "#FFB020",
  HIGH_RISK: "#FF3B3B",
};
