import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useCamera
 * ==========
 * Requests webcam access and attaches the resulting MediaStream to a
 * <video> element ref. Exposes a `status` string the UI can render
 * distinct states for, per the project brief's requirement to handle:
 *   - permission not yet requested / pending
 *   - permission denied
 *   - camera unavailable (no device / hardware error)
 *   - connected + streaming
 *   - camera disconnected mid-session (device unplugged, tab loses track)
 */
export function useCamera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | pending | granted | denied | unavailable | disconnected
  const [errorMessage, setErrorMessage] = useState(null);

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    setStatus("pending");
    setErrorMessage(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus("unavailable");
      setErrorMessage("This browser does not support camera access (getUserMedia unavailable).");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "environment" },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {
          /* autoplay restrictions - user gesture already triggered this call, ignore */
        });
      }
      setStatus("granted");

      // Detect camera disconnection (device unplugged / OS revokes access)
      const [track] = stream.getVideoTracks();
      if (track) {
        track.addEventListener("ended", () => {
          setStatus("disconnected");
          setErrorMessage("Camera feed ended unexpectedly (device disconnected or revoked).");
        });
      }
    } catch (err) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setStatus("denied");
        setErrorMessage("Camera permission was denied. Allow camera access in your browser settings and retry.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setStatus("unavailable");
        setErrorMessage("No camera device was found on this system.");
      } else {
        setStatus("unavailable");
        setErrorMessage(`Could not access camera: ${err.message}`);
      }
    }
  }, []);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { videoRef, status, errorMessage, start, stop };
}
