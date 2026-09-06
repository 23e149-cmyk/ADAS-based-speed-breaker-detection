import React from "react";
import { RISK_COLORS } from "../config.js";

function RiskBadge({ level }) {
  const color = RISK_COLORS[level] || RISK_COLORS.SAFE;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-mono font-bold tracking-wider"
      style={{
        color,
        backgroundColor: `${color}10`,
        border: `1px solid ${color}35`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {level?.replace("_", " ") || "SAFE"}
    </span>
  );
}

export default function DetectionHistory({ rows }) {
  return (
    <div className="bg-[#0b1119] border border-panelborder rounded-xl overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-panelborder">
        <div>
          <p className="text-[9px] font-mono tracking-[0.2em] text-steel-500">
            EVENT MONITOR
          </p>

          <h3 className="text-sm font-semibold text-steel-100 mt-1">
            Detection History
          </h3>
        </div>

        <div className="px-2 py-1 rounded-md bg-info/5 border border-info/15">
          <span className="text-[9px] font-mono text-info">
            {rows.length} EVENTS
          </span>
        </div>
      </div>

      <div className="overflow-x-auto max-h-72 overflow-y-auto">

        <table className="w-full text-sm">

          <thead className="sticky top-0 bg-[#0b1119] z-10">
            <tr className="text-left text-[8px] text-steel-600 font-mono tracking-widest border-b border-panelborder">

              <th className="px-4 py-3">TIME</th>
              <th className="px-4 py-3">CONFIDENCE</th>
              <th className="px-4 py-3">DISTANCE</th>
              <th className="px-4 py-3">SPEED</th>
              <th className="px-4 py-3">TTC</th>
              <th className="px-4 py-3">STATUS</th>

            </tr>
          </thead>

          <tbody>

            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center"
                >
                  <div className="flex flex-col items-center">

                    <div className="w-10 h-10 rounded-full bg-info/5 border border-info/10 flex items-center justify-center text-info mb-3">
                      ◌
                    </div>

                    <p className="text-xs font-mono text-steel-400">
                      NO HAZARDS DETECTED
                    </p>

                    <p className="text-[9px] text-steel-600 mt-1">
                      Events will appear here in real time
                    </p>

                  </div>
                </td>
              </tr>
            )}

            {rows.map((row, i) => {

              const confidence =
                row.confidence != null
                  ? `${(row.confidence * 100).toFixed(0)}%`
                  : "--";

              const distance =
                row.distance_m != null
                  ? `${Number(row.distance_m).toFixed(1)} m`
                  : "--";

              const speed =
                row.speed_kmh != null
                  ? `${Number(row.speed_kmh).toFixed(0)}`
                  : "--";

              const ttc =
                row.ttc_s != null
                  ? `${Number(row.ttc_s).toFixed(1)} s`
                  : "--";

              return (
                <tr
                  key={row.id ?? i}
                  className="border-b border-panelborder/50 font-mono text-[10px] text-steel-300 hover:bg-white/[0.02] transition"
                >

                  <td className="px-4 py-3 whitespace-nowrap text-steel-500">
                    {new Date(row.timestamp).toLocaleTimeString()}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-14 h-1 rounded-full bg-steel-900 overflow-hidden">
                        <div
                          className="h-full bg-info"
                          style={{
                            width: `${(row.confidence || 0) * 100}%`,
                          }}
                        />
                      </div>

                      <span>{confidence}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-steel-200 font-semibold">
                    {distance}
                  </td>

                  <td className="px-4 py-3">
                    {speed}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={
                        row.ttc_s != null && row.ttc_s < 3
                          ? "text-danger font-bold"
                          : "text-steel-300"
                      }
                    >
                      {ttc}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <RiskBadge level={row.risk_level} />
                  </td>

                </tr>
              );
            })}

          </tbody>
        </table>
      </div>
    </div>
  );
}