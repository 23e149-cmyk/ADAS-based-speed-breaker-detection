import React from "react";

function StatusPill({ label, ok, unknown }) {
  const color = unknown
    ? "bg-steel-500"
    : ok
      ? "bg-safe"
      : "bg-danger";

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-panel/80 border border-panelborder">
      <span
        className={`h-2 w-2 rounded-full ${color} ${
          !unknown && !ok ? "animate-pulse_danger" : ""
        }`}
      />

      <span className="text-[10px] font-mono font-semibold tracking-wider text-steel-300">
        {label}
      </span>
    </div>
  );
}

export default function Header({ connectionStatus, backendStatus }) {
  const backendOk = connectionStatus === "connected";
  const yoloOk = backendStatus?.yolo_loaded === true;

  return (
    <header className="relative px-5 sm:px-7 py-4 border-b border-panelborder bg-[#080d14]">

      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-info via-cyan-400 to-transparent" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

        {/* Brand */}
        <div className="flex items-center gap-4">

          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-info/10 border border-info/30">
            <span className="text-info text-xl">◈</span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-hud text-xl sm:text-2xl font-bold tracking-widest text-steel-100">
                ROADGUARD
              </h1>

              <span className="px-2 py-0.5 text-[9px] font-mono tracking-wider rounded bg-info/10 border border-info/30 text-info">
                ADAS
              </span>
            </div>

            <p className="text-[10px] text-steel-500 font-mono tracking-wider mt-1">
              INTELLIGENT ROAD HAZARD MONITORING SYSTEM
            </p>
          </div>
        </div>

        {/* System status */}
        <div className="flex flex-wrap items-center gap-2">

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-safe/5 border border-safe/20 mr-1">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-safe opacity-50 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-safe" />
            </span>

            <span className="text-[10px] font-mono font-bold tracking-wider text-safe">
              SYSTEM {backendOk && yoloOk ? "ONLINE" : "CHECK"}
            </span>
          </div>

          <StatusPill
            label={`BACKEND · ${
              backendOk ? "ONLINE" : connectionStatus.toUpperCase()
            }`}
            ok={backendOk}
          />

          <StatusPill
            label={`YOLO · ${yoloOk ? "READY" : "NOT READY"}`}
            ok={yoloOk}
            unknown={!backendOk}
          />

          {backendStatus?.device && (
            <StatusPill
              label={`ACCELERATOR · ${backendStatus.device.toUpperCase()}`}
              ok={true}
            />
          )}
        </div>
      </div>
    </header>
  );
}