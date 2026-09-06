import React from "react";

export default function SpeedControl({ speedKmh, onChange }) {
  return (
    <div className="bg-[#0b1119] border border-panelborder rounded-xl p-4">

      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[9px] font-mono tracking-[0.2em] text-steel-500">
            VEHICLE TELEMETRY
          </p>
          <h3 className="text-sm font-semibold text-steel-100 mt-1">
            Vehicle Speed
          </h3>
        </div>

        <span className="px-2 py-1 rounded-md bg-caution/5 border border-caution/20 text-[8px] font-mono text-caution">
          MANUAL INPUT
        </span>
      </div>

      <div className="flex items-end justify-between">

        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-mono font-black text-white tabular-nums">
            {speedKmh.toFixed(0)}
          </span>

          <span className="text-sm font-mono text-steel-500">
            km/h
          </span>
        </div>

        <div className="text-right">
          <p className="text-[8px] font-mono text-steel-600">
            MAX
          </p>
          <p className="text-xs font-mono text-steel-400">
            140 km/h
          </p>
        </div>
      </div>

      {/* Speed bar */}
      <div className="mt-5 relative">
        <div className="h-2 bg-steel-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-info rounded-full transition-all duration-200"
            style={{
              width: `${Math.min((speedKmh / 140) * 100, 100)}%`,
            }}
          />
        </div>

        <input
          type="range"
          min={0}
          max={140}
          step={1}
          value={speedKmh}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          aria-label="Vehicle speed slider"
        />
      </div>

      <div className="flex justify-between mt-2 text-[8px] font-mono text-steel-600">
        <span>0</span>
        <span>40</span>
        <span>80</span>
        <span>120</span>
        <span>140</span>
      </div>

      {/* Exact input */}
      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-panelborder">

        <input
          type="number"
          min={0}
          max={300}
          value={speedKmh}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-20 bg-[#070b11] border border-panelborder rounded-lg px-2 py-2 text-center font-mono text-sm text-white focus:outline-none focus:border-info"
          aria-label="Vehicle speed exact value"
        />

        <div>
          <p className="text-[9px] font-mono text-steel-400">
            TEST MODE
          </p>
          <p className="text-[8px] text-steel-600 mt-0.5">
            Used to evaluate TTC & risk response
          </p>
        </div>
      </div>

    </div>
  );
}