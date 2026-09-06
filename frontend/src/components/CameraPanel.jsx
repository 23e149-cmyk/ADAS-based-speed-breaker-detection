import React, { useEffect, useRef } from "react";
import { RISK_COLORS } from "../config.js";

function OverlayCanvas({ videoRef, detections, riskLevel }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const draw = () => {
      const displayWidth = video.clientWidth;
      const displayHeight = video.clientHeight;

      if (!displayWidth || !displayHeight) return;

      canvas.width = displayWidth;
      canvas.height = displayHeight;

      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, displayWidth, displayHeight);

      if (!detections?.length) return;

      const color = RISK_COLORS[riskLevel] || RISK_COLORS.SAFE;

      detections.forEach((det) => {
        const scaleX = displayWidth / det.frame_width;
        const scaleY = displayHeight / det.frame_height;

        const [x1, y1, x2, y2] = det.bbox;

        const rx = x1 * scaleX;
        const ry = y1 * scaleY;
        const rw = (x2 - x1) * scaleX;
        const rh = (y2 - y1) * scaleY;

        // Bounding box
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(rx, ry, rw, rh);

        // Corner markers
        const corner = 12;
        ctx.lineWidth = 4;

        ctx.beginPath();
        ctx.moveTo(rx, ry + corner);
        ctx.lineTo(rx, ry);
        ctx.lineTo(rx + corner, ry);

        ctx.moveTo(rx + rw - corner, ry);
        ctx.lineTo(rx + rw, ry);
        ctx.lineTo(rx + rw, ry + corner);

        ctx.moveTo(rx, ry + rh - corner);
        ctx.lineTo(rx, ry + rh);
        ctx.lineTo(rx + corner, ry + rh);

        ctx.moveTo(rx + rw - corner, ry + rh);
        ctx.lineTo(rx + rw, ry + rh);
        ctx.lineTo(rx + rw, ry + rh - corner);

        ctx.stroke();

        // Detection label
        const label = `SPEED BREAKER  ${(det.confidence * 100).toFixed(0)}%`;

        ctx.font = "700 12px monospace";
        const textWidth = ctx.measureText(label).width;

        const labelY = Math.max(24, ry);

        ctx.fillStyle = color;
        ctx.fillRect(rx, labelY - 24, textWidth + 18, 24);

        ctx.fillStyle = "#071018";
        ctx.fillText(label, rx + 9, labelY - 8);
      });
    };

    draw();

    const observer = new ResizeObserver(draw);
    observer.observe(video);

    return () => observer.disconnect();
  }, [videoRef, detections, riskLevel]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}

function Corner({ position }) {
  const styles = {
    tl: "top-4 left-4 border-t-2 border-l-2",
    tr: "top-4 right-4 border-t-2 border-r-2",
    bl: "bottom-4 left-4 border-b-2 border-l-2",
    br: "bottom-4 right-4 border-b-2 border-r-2",
  };

  return (
    <div
      className={`absolute w-7 h-7 border-info ${styles[position]}`}
    />
  );
}

export default function CameraPanel({
  videoRef,
  cameraStatus,
  cameraError,
  onRetry,
  latestResult,
}) {
  const showVideo = cameraStatus === "granted";

  const detectionCount = latestResult?.detections?.length || 0;
  const confidence = latestResult?.confidence;

  return (
    <div className="relative w-full aspect-video bg-[#05080d] rounded-xl overflow-hidden border border-panelborder shadow-2xl">

      {/* Camera */}
      <video
        ref={videoRef}
        className={`w-full h-full object-cover ${
          showVideo ? "" : "hidden"
        }`}
        muted
        playsInline
      />

      {showVideo && (
        <>
          {/* YOLO overlay */}
          <OverlayCanvas
            videoRef={videoRef}
            detections={latestResult?.detections}
            riskLevel={latestResult?.risk_level}
          />

          {/* HUD corners */}
          <Corner position="tl" />
          <Corner position="tr" />
          <Corner position="bl" />
          <Corner position="br" />

          {/* Top status */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/65 backdrop-blur border border-white/10">
            <span className="h-2 w-2 rounded-full bg-danger animate-pulse" />
            <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-white">
              LIVE • AI VISION
            </span>
          </div>

          {/* Bottom telemetry */}
          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">

            <div className="bg-black/70 backdrop-blur-md rounded-lg px-4 py-3 border border-white/10">
              <p className="text-[9px] font-mono text-steel-400 tracking-widest">
                DETECTIONS
              </p>

              <p className="text-xl font-bold text-white mt-1">
                {detectionCount.toString().padStart(2, "0")}
              </p>
            </div>

            {confidence != null && (
              <div className="bg-black/70 backdrop-blur-md rounded-lg px-4 py-3 border border-white/10 text-right">
                <p className="text-[9px] font-mono text-steel-400 tracking-widest">
                  CONFIDENCE
                </p>

                <p className="text-xl font-bold text-info mt-1">
                  {(confidence * 100).toFixed(0)}%
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Camera unavailable */}
      {!showVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center bg-[#080d14]">

          {cameraStatus === "idle" && (
            <>
              <div className="text-4xl text-info">◉</div>

              <div>
                <p className="text-white font-semibold">
                  Camera Access Required
                </p>

                <p className="text-steel-400 text-xs mt-2 max-w-sm">
                  Enable your camera to start real-time ADAS hazard detection.
                </p>
              </div>

              <button
                onClick={onRetry}
                className="px-6 py-2.5 rounded-lg bg-info/10 border border-info text-info font-mono text-xs font-bold tracking-wider hover:bg-info/20 transition"
              >
                ENABLE CAMERA
              </button>
            </>
          )}

          {cameraStatus === "pending" && (
            <p className="text-info font-mono text-sm animate-pulse">
              INITIALIZING CAMERA...
            </p>
          )}

          {(cameraStatus === "denied" ||
            cameraStatus === "unavailable" ||
            cameraStatus === "disconnected") && (
            <>
              <p className="text-danger font-mono font-bold tracking-wider">
                {cameraStatus === "denied" && "CAMERA PERMISSION DENIED"}
                {cameraStatus === "unavailable" && "CAMERA UNAVAILABLE"}
                {cameraStatus === "disconnected" && "CAMERA DISCONNECTED"}
              </p>

              <p className="text-steel-400 text-xs max-w-sm">
                {cameraError}
              </p>

              <button
                onClick={onRetry}
                className="px-6 py-2.5 rounded-lg bg-panel border border-panelborder text-white font-mono text-xs font-bold tracking-wider hover:border-info transition"
              >
                RETRY CONNECTION
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}