import React, { useEffect, useRef, useState } from "react";
import Header from "./components/Header.jsx";
import CameraPanel from "./components/CameraPanel.jsx";
import RiskGauge from "./components/RiskGauge.jsx";
import SpeedControl from "./components/SpeedControl.jsx";
import StatusPanel from "./components/StatusPanel.jsx";
import WarningBanner from "./components/WarningBanner.jsx";
import DetectionHistory from "./components/DetectionHistory.jsx";
import TrendChart from "./components/TrendChart.jsx";

import { useCamera } from "./hooks/useCamera.js";
import { useWebSocket } from "./hooks/useWebSocket.js";
import { useAudioWarning } from "./hooks/useAudioWarning.js";
import { API_BASE_URL, WARNING_COOLDOWN_S } from "./config.js";

export default function App() {
  const {
    videoRef,
    status: cameraStatus,
    errorMessage: cameraError,
    start: startCamera,
  } = useCamera();

  const [speedKmh, setSpeedKmh] = useState(30);
  const [history, setHistory] = useState([]);
  const [showWarning, setShowWarning] = useState(false);

  const warningTimeoutRef = useRef(null);

  const { play: playWarningSound } = useAudioWarning();

  const {
    connectionStatus,
    backendStatus,
    latestResult,
    lastError,
    warningEvent,
  } = useWebSocket({
    videoRef,
    cameraActive: cameraStatus === "granted",
    speedKmh,
  });

  // Start camera
  useEffect(() => {
    startCamera();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load history
  useEffect(() => {
    fetch(`${API_BASE_URL}/history`)
      .then((res) => res.json())
      .then((data) => {
        setHistory(data.detections || []);
      })
      .catch(() => {});
  }, []);

  // Add live detections to history
  useEffect(() => {
    if (latestResult && latestResult.confidence != null) {
      setHistory((prev) => [
        {
          id: `${latestResult.timestamp}`,
          timestamp: latestResult.timestamp * 1000,
          confidence: latestResult.confidence,
          distance_m: latestResult.distance_m,
          speed_kmh: latestResult.vehicle_speed_kmh,
          ttc_s: latestResult.ttc_s,
          risk_level: latestResult.risk_level,
        },
        ...prev,
      ].slice(0, 50));
    }
  }, [latestResult]);

  // Warning
  useEffect(() => {
    if (warningEvent === 0) return;

    setShowWarning(true);
    playWarningSound();

    clearTimeout(warningTimeoutRef.current);

    warningTimeoutRef.current = setTimeout(() => {
      setShowWarning(false);
    }, 4000);

    return () => clearTimeout(warningTimeoutRef.current);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warningEvent]);

  const riskLevel = latestResult?.risk_level || "SAFE";

  const distance =
    latestResult?.distance_m != null
      ? `${latestResult.distance_m.toFixed(1)} m`
      : "--";

  const ttc =
    latestResult?.ttc_s != null
      ? `${latestResult.ttc_s.toFixed(1)} s`
      : "--";

  const confidence =
    latestResult?.confidence != null
      ? `${(latestResult.confidence * 100).toFixed(0)}%`
      : "--";

  return (
    <div className="min-h-screen bg-[#05080d] text-steel-100">

      {/* Emergency warning */}
      <WarningBanner visible={showWarning} />

      {/* Header */}
      <Header
        connectionStatus={connectionStatus}
        backendStatus={backendStatus}
      />

      <main className="max-w-[1700px] mx-auto p-4 sm:p-6 space-y-5">

        {/* ===================================================== */}
        {/* TOP TELEMETRY BAR */}
        {/* ===================================================== */}

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">

          <TelemetryCard
            label="CURRENT SPEED"
            value={speedKmh.toFixed(0)}
            unit="km/h"
            accent="#3DDAFF"
          />

          <TelemetryCard
            label="HAZARD DISTANCE"
            value={distance.replace(" m", "")}
            unit={distance !== "--" ? "m" : ""}
            accent="#3DDAFF"
          />

          <TelemetryCard
            label="TIME TO HAZARD"
            value={ttc.replace(" s", "")}
            unit={ttc !== "--" ? "s" : ""}
            accent={riskLevel === "HIGH_RISK" ? "#ef4444" : "#f59e0b"}
          />

          <TelemetryCard
            label="AI CONFIDENCE"
            value={confidence.replace("%", "")}
            unit={confidence !== "--" ? "%" : ""}
            accent="#10b981"
          />

        </section>

        {/* ===================================================== */}
        {/* MAIN ADAS VIEW */}
        {/* ===================================================== */}

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* CAMERA */}
          <div className="xl:col-span-2">

            <div className="mb-3 flex items-center justify-between">

              <div>
                <p className="text-[9px] font-mono tracking-[0.2em] text-steel-500">
                  PRIMARY SENSOR
                </p>

                <h2 className="text-base font-semibold text-white mt-1">
                  Forward Road Camera
                </h2>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-info/5 border border-info/15">
                <span className="w-2 h-2 rounded-full bg-info animate-pulse" />

                <span className="text-[9px] font-mono text-info tracking-wider">
                  AI VISION ACTIVE
                </span>
              </div>

            </div>

            <CameraPanel
              videoRef={videoRef}
              cameraStatus={cameraStatus}
              cameraError={cameraError}
              onRetry={startCamera}
              latestResult={latestResult}
            />

            {/* Error */}
            {lastError && (
              <div className="mt-3 px-4 py-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs font-mono">
                {lastError}
              </div>
            )}

            {backendStatus &&
              !backendStatus.yolo_loaded &&
              backendStatus.yolo_error && (
                <div className="mt-3 px-4 py-3 rounded-xl bg-caution/10 border border-caution/30 text-caution text-xs font-mono">
                  {backendStatus.yolo_error}
                </div>
              )}

          </div>

          {/* RIGHT CONTROL / RISK */}
          <aside className="flex flex-col gap-4">

            {/* Risk */}
            <div className="bg-[#0b1119] border border-panelborder rounded-xl p-4">

              <RiskGauge
                riskLevel={riskLevel}
                ttcS={latestResult?.ttc_s}
                distanceM={latestResult?.distance_m}
              />

              <div className="mt-3 pt-3 border-t border-panelborder text-center">
                <p className="text-[8px] font-mono text-steel-600 tracking-widest">
                  WARNING COOLDOWN
                </p>

                <p className="text-[10px] font-mono text-steel-400 mt-1">
                  {WARNING_COOLDOWN_S}s
                </p>
              </div>

            </div>

            {/* Speed */}
            <SpeedControl
              speedKmh={speedKmh}
              onChange={setSpeedKmh}
            />

          </aside>

        </section>

        {/* ===================================================== */}
        {/* SYSTEM STATUS */}
        {/* ===================================================== */}

        <section>

          <StatusPanel
            cameraStatus={cameraStatus}
            connectionStatus={connectionStatus}
            backendStatus={backendStatus}
            latestResult={latestResult}
          />

        </section>

        {/* ===================================================== */}
        {/* HISTORY + CHART */}
        {/* ===================================================== */}

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">

          <DetectionHistory rows={history} />

          <TrendChart rows={history} />

        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-panelborder mt-6">

        <div className="max-w-[1700px] mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">

          <p className="text-[9px] font-mono text-steel-600 tracking-wider">
            ROADGUARD ADAS • ACADEMIC PROTOTYPE
          </p>

          <p className="text-[9px] font-mono text-steel-700 text-center">
            MONOCULAR DISTANCE ESTIMATION • MANUAL SPEED INPUT
          </p>

        </div>

      </footer>

    </div>
  );
}


/* ========================================================= */
/* TELEMETRY CARD                                            */
/* ========================================================= */

function TelemetryCard({
  label,
  value,
  unit,
  accent,
}) {
  return (
    <div
      className="relative overflow-hidden bg-[#0b1119] border border-panelborder rounded-xl px-4 py-3"
    >

      <div
        className="absolute left-0 top-0 bottom-0 w-[2px]"
        style={{ backgroundColor: accent }}
      />

      <p className="text-[8px] font-mono tracking-[0.18em] text-steel-600">
        {label}
      </p>

      <div className="flex items-baseline gap-2 mt-1">

        <span
          className="text-2xl sm:text-3xl font-mono font-black tabular-nums"
          style={{ color: accent }}
        >
          {value}
        </span>

        {unit && (
          <span className="text-[10px] font-mono text-steel-500">
            {unit}
          </span>
        )}

      </div>

    </div>
  );
}