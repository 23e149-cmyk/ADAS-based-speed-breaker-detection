import React from "react";

function StatusCard({ label, value, accent, icon, subtext }) {
  return (
    <div className="group relative overflow-hidden bg-[#0b1119] border border-panelborder rounded-xl p-3 transition-all duration-200 hover:border-info/30">

      <div
        className="absolute left-0 top-0 bottom-0 w-[2px]"
        style={{ backgroundColor: accent }}
      />

      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[9px] font-mono tracking-[0.15em] text-steel-500">
            {label}
          </p>

          <p
            className="font-mono text-sm font-bold mt-1"
            style={{ color: accent }}
          >
            {value}
          </p>

          {subtext && (
            <p className="text-[8px] font-mono text-steel-600 mt-1">
              {subtext}
            </p>
          )}
        </div>

        <div
          className="flex items-center justify-center w-7 h-7 rounded-lg text-xs"
          style={{
            color: accent,
            backgroundColor: `${accent}12`,
            border: `1px solid ${accent}25`,
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

const CAMERA_STATUS = {
  idle: {
    label: "NOT STARTED",
    color: "#64748b",
  },
  pending: {
    label: "INITIALIZING",
    color: "#f59e0b",
  },
  granted: {
    label: "ONLINE",
    color: "#10b981",
  },
  denied: {
    label: "DENIED",
    color: "#ef4444",
  },
  unavailable: {
    label: "UNAVAILABLE",
    color: "#ef4444",
  },
  disconnected: {
    label: "DISCONNECTED",
    color: "#ef4444",
  },
};

export default function StatusPanel({
  cameraStatus,
  connectionStatus,
  backendStatus,
  latestResult,
}) {
  const camera =
    CAMERA_STATUS[cameraStatus] || CAMERA_STATUS.idle;

  const backendOnline =
    connectionStatus === "connected";

  const yoloLoaded =
    backendStatus?.yolo_loaded === true;

  const confidence =
    latestResult?.confidence != null
      ? `${(latestResult.confidence * 100).toFixed(0)}%`
      : "--";

  const fps =
    latestResult?.fps != null
      ? latestResult.fps.toFixed(1)
      : "--";

  const inferenceTime =
    latestResult?.inference_time_ms != null
      ? `${latestResult.inference_time_ms.toFixed(0)} ms`
      : "--";

  return (
    <div className="space-y-3">

      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-mono tracking-[0.2em] text-steel-500">
            SYSTEM TELEMETRY
          </p>

          <p className="text-sm font-semibold text-steel-100 mt-1">
            Sensor & AI Status
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              backendOnline && yoloLoaded
                ? "bg-safe animate-pulse"
                : "bg-danger"
            }`}
          />

          <span className="text-[9px] font-mono text-steel-500">
            {backendOnline && yoloLoaded
              ? "READY"
              : "CHECK SYSTEM"}
          </span>
        </div>
      </div>

      {/* Core systems */}
      <div className="grid grid-cols-2 gap-2">

        <StatusCard
          label="CAMERA"
          value={camera.label}
          accent={camera.color}
          icon="◉"
          subtext="VIDEO INPUT"
        />

        <StatusCard
          label="YOLO ENGINE"
          value={yoloLoaded ? "READY" : "OFFLINE"}
          accent={yoloLoaded ? "#10b981" : "#ef4444"}
          icon="AI"
          subtext={
            backendStatus?.device
              ? backendStatus.device.toUpperCase()
              : "MODEL"
          }
        />

        <StatusCard
          label="BACKEND LINK"
          value={backendOnline ? "CONNECTED" : "OFFLINE"}
          accent={backendOnline ? "#10b981" : "#ef4444"}
          icon="↕"
          subtext="WEBSOCKET"
        />

        <StatusCard
          label="PROCESSING"
          value={`${fps} FPS`}
          accent="#22d3ee"
          icon="◌"
          subtext="LIVE INFERENCE"
        />
      </div>

      {/* AI performance */}
      <div className="bg-[#0b1119] border border-panelborder rounded-xl p-3">

        <div className="flex items-center justify-between mb-3">
          <p className="text-[9px] font-mono tracking-[0.15em] text-steel-500">
            AI PERFORMANCE
          </p>

          <span className="text-[8px] font-mono text-info">
            REAL-TIME
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">

          <div>
            <p className="text-[8px] font-mono text-steel-600">
              CONFIDENCE
            </p>

            <p className="text-lg font-mono font-bold text-info mt-1">
              {confidence}
            </p>

            <div className="mt-2 h-1 bg-steel-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-info transition-all duration-300"
                style={{
                  width:
                    confidence === "--"
                      ? "0%"
                      : confidence,
                }}
              />
            </div>
          </div>

          <div>
            <p className="text-[8px] font-mono text-steel-600">
              INFERENCE
            </p>

            <p className="text-lg font-mono font-bold text-info mt-1">
              {inferenceTime}
            </p>

            <p className="text-[8px] font-mono text-steel-600 mt-2">
              YOLO PROCESSING
            </p>
          </div>

        </div>
      </div>

      {/* Architecture indicator */}
      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-info/5 border border-info/10">
        <span className="text-[8px] font-mono text-steel-500">
          ADAS PIPELINE
        </span>

        <span className="text-[8px] font-mono text-info">
          CAMERA → YOLO → RISK
        </span>
      </div>

    </div>
  );
}