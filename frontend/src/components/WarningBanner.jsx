import React from "react";

export default function WarningBanner({ visible }) {
  if (!visible) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-50 flex justify-center pointer-events-none"
    >
      <div className="mt-4 mx-4 min-w-[320px] max-w-xl px-5 py-4 rounded-xl bg-[#160b0b]/95 backdrop-blur-md border border-danger shadow-glow_danger animate-pulse_danger">

        <div className="flex items-center gap-4">

          {/* Warning icon */}
          <div className="flex-shrink-0 w-11 h-11 rounded-full bg-danger/15 border border-danger/40 flex items-center justify-center">
            <span className="text-danger text-xl font-black">
              !
            </span>
          </div>

          <div className="flex-1">

            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-danger animate-pulse" />

              <p className="text-[9px] font-mono font-bold tracking-[0.2em] text-danger">
                ADAS EMERGENCY ALERT
              </p>
            </div>

            <p className="font-hud font-black tracking-wider text-white text-base sm:text-lg mt-1">
              SPEED BREAKER AHEAD
            </p>

            <p className="text-[10px] font-mono text-red-300 mt-1">
              REDUCE VEHICLE SPEED
            </p>

          </div>

          {/* Alert indicator */}
          <div className="hidden sm:flex flex-col items-center">
            <span className="text-[8px] font-mono text-danger">
              WARNING
            </span>

            <span className="text-[9px] font-mono text-red-300 mt-1">
              ACTIVE
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}