import { useCallback, useEffect, useRef, useState } from "react";
import { WS_URL, FRAME_SEND_INTERVAL_MS, FRAME_JPEG_QUALITY } from "../config.js";

const RECONNECT_DELAY_MS = 2000;

/**
 * useWebSocket
 * =============
 * Owns the single WebSocket connection to the backend's /ws/detection
 * endpoint and implements the frontend half of the pipeline described in
 * the README:
 *
 *   <video> frame --(canvas.toDataURL JPEG)--> WebSocket --> backend
 *   backend --(JSON detection_result)--> WebSocket --> React state
 *
 * `videoRef` should point at a <video> element that is actively playing
 * the webcam stream; `cameraActive` gates whether frames are captured at
 * all (no point sending frames before the camera is ready).
 */
export function useWebSocket({ videoRef, cameraActive, speedKmh }) {
  const socketRef = useRef(null);
  const canvasRef = useRef(document.createElement("canvas"));
  const frameIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const mountedRef = useRef(true);

  const [connectionStatus, setConnectionStatus] = useState("connecting"); // connecting | connected | disconnected | error
  const [backendStatus, setBackendStatus] = useState({ yolo_loaded: false, yolo_error: null, device: null });
  const [latestResult, setLatestResult] = useState(null);
  const [lastError, setLastError] = useState(null);
  const [warningEvent, setWarningEvent] = useState(0); // incrementing counter -> triggers effects on each new warning

  const captureAndSendFrame = useCallback(() => {
    const video = videoRef.current;
    const socket = socketRef.current;
    if (!video || !socket || socket.readyState !== WebSocket.OPEN) return;
    if (video.readyState < 2 || video.videoWidth === 0) return; // not enough data yet

    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", FRAME_JPEG_QUALITY);
    socket.send(JSON.stringify({ type: "frame", data: dataUrl }));
  }, [videoRef]);

  const connect = useCallback(() => {
    setConnectionStatus("connecting");
    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;

    socket.onopen = () => {
      if (!mountedRef.current) return;
      setConnectionStatus("connected");
      setLastError(null);
    };

    socket.onmessage = (event) => {
      if (!mountedRef.current) return;
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }

      if (message.type === "status") {
        setBackendStatus({
          yolo_loaded: message.yolo_loaded,
          yolo_error: message.yolo_error,
          device: message.device,
        });
      } else if (message.type === "detection_result") {
        setLatestResult(message);
        if (message.trigger_warning) {
          setWarningEvent((n) => n + 1);
        }
      } else if (message.type === "error") {
        setLastError(message.message);
      }
    };

    socket.onerror = () => {
      if (!mountedRef.current) return;
      setConnectionStatus("error");
    };

    socket.onclose = () => {
      if (!mountedRef.current) return;
      setConnectionStatus("disconnected");
      reconnectTimeoutRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
    };
  }, []);

  // Establish connection on mount, clean up on unmount.
  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectTimeoutRef.current);
      socketRef.current?.close();
    };
  }, [connect]);

  // Start/stop the frame-capture loop based on camera + connection readiness.
  useEffect(() => {
    clearInterval(frameIntervalRef.current);
    if (cameraActive && connectionStatus === "connected") {
      frameIntervalRef.current = setInterval(captureAndSendFrame, FRAME_SEND_INTERVAL_MS);
    }
    return () => clearInterval(frameIntervalRef.current);
  }, [cameraActive, connectionStatus, captureAndSendFrame]);

  // Push vehicle speed changes to the backend as they happen.
  useEffect(() => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "speed_update", speed_kmh: speedKmh }));
    }
  }, [speedKmh, connectionStatus]);

  return { connectionStatus, backendStatus, latestResult, lastError, warningEvent };
}
