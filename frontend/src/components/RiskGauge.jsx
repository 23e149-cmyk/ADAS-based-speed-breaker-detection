import React, { useMemo } from "react";
import { RISK_COLORS } from "../config.js";

const CX = 100;
const CY = 100;
const R = 78;

const BANDS = {
  SAFE: [180, 240],
  CAUTION: [240, 300],
  HIGH_RISK: [300, 360],
};

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);

  return `M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`;
}

function needleAngle(riskLevel, ttcS) {
  const [start, end] = BANDS[riskLevel] || BANDS.SAFE;

  if (ttcS == null) {
    return riskLevel === "HIGH_RISK"
      ? end - 4
      : (start + end) / 2;
  }

  const t = Math.max(0, Math.min(1, 1 - ttcS / 10));

  return start + t * (end - start);
}

export default function RiskGauge({
  riskLevel = "SAFE",
  ttcS,
  distanceM,
}) {
  const angle = useMemo(
    () => needleAngle(riskLevel, ttcS),
    [riskLevel, ttcS]
  );

  const needleTip = polarToCartesian(
    CX,
    CY,
    R - 13,
    angle
  );

  const color =
    RISK_COLORS[riskLevel] || RISK_COLORS.SAFE;

  const riskText =
    riskLevel === "HIGH_RISK"
      ? "HIGH RISK"
      : riskLevel;

  return (
    <div className="w-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-[10px] font-mono tracking-[0.2em] text-steel-500">
            THREAT ANALYSIS
          </p>

          <p className="text-sm font-semibold text-steel-100 mt-1">
            Collision Risk
          </p>
        </div>

        <div
          className="h-2.5 w-2.5 rounded-full animate-pulse"
          style={{ backgroundColor: color }}
        />
      </div>

      {/* Gauge */}
      <div
        className="relative rounded-xl p-2 border"
        style={{
          borderColor: `${color}25`,
          background: `linear-gradient(180deg, ${color}08, transparent)`,
        }}
      >
        <svg
          viewBox="0 0 200 120"
          className="w-full"
        >

          {/* Background */}
          <path
            d={describeArc(CX, CY, R, 180, 360)}
            stroke="#1b2430"
            strokeWidth="16"
            fill="none"
            strokeLinecap="round"
          />

          {/* SAFE */}
          <path
            d={describeArc(
              CX,
              CY,
              R,
              BANDS.SAFE[0],
              BANDS.SAFE[1]
            )}
            stroke={RISK_COLORS.SAFE}
            strokeOpacity="0.75"
            strokeWidth="16"
            fill="none"
            strokeLinecap="round"
          />

          {/* CAUTION */}
          <path
            d={describeArc(
              CX,
              CY,
              R,
              BANDS.CAUTION[0],
              BANDS.CAUTION[1]
            )}
            stroke={RISK_COLORS.CAUTION}
            strokeOpacity="0.75"
            strokeWidth="16"
            fill="none"
          />

          {/* HIGH RISK */}
          <path
            d={describeArc(
              CX,
              CY,
              R,
              BANDS.HIGH_RISK[0],
              BANDS.HIGH_RISK[1]
            )}
            stroke={RISK_COLORS.HIGH_RISK}
            strokeOpacity="0.75"
            strokeWidth="16"
            fill="none"
            strokeLinecap="round"
          />

          {/* Tick marks */}
          {[180, 210, 240, 270, 300, 330, 360].map(
            (a) => {
              const outer = polarToCartesian(
                CX,
                CY,
                R - 11,
                a
              );

              const inner = polarToCartesian(
                CX,
                CY,
                R - 17,
                a
              );

              return (
                <line
                  key={a}
                  x1={inner.x}
                  y1={inner.y}
                  x2={outer.x}
                  y2={outer.y}
                  stroke="#64748b"
                  strokeWidth="1"
                />
              );
            }
          )}

          {/* Needle glow */}
          <line
            x1={CX}
            y1={CY}
            x2={needleTip.x}
            y2={needleTip.y}
            stroke={color}
            strokeOpacity="0.25"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Needle */}
          <line
            x1={CX}
            y1={CY}
            x2={needleTip.x}
            y2={needleTip.y}
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Center */}
          <circle
            cx={CX}
            cy={CY}
            r="7"
            fill="#080d14"
            stroke={color}
            strokeWidth="3"
          />

          {/* TTC */}
          <text
            x={CX}
            y={CY - 25}
            textAnchor="middle"
            fontSize="21"
            fontWeight="800"
            fill={color}
            className="font-mono"
          >
            {ttcS != null ? `${ttcS.toFixed(1)}s` : "--"}
          </text>

          <text
            x={CX}
            y={CY - 8}
            textAnchor="middle"
            fontSize="8"
            letterSpacing="1.7"
            fill="#64748b"
            className="font-mono"
          >
            TIME TO HAZARD
          </text>
        </svg>
      </div>

      {/* Risk status */}
      <div
        className="mt-3 flex items-center justify-between px-4 py-3 rounded-xl border"
        style={{
          borderColor: `${color}45`,
          backgroundColor: `${color}0D`,
        }}
      >
        <div>
          <p className="text-[9px] font-mono text-steel-500 tracking-widest">
            CURRENT STATUS
          </p>

          <p
            className="text-lg font-black tracking-wider mt-0.5"
            style={{ color }}
          >
            {riskText}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[9px] font-mono text-steel-500">
            DISTANCE
          </p>

          <p className="text-lg font-bold text-steel-100">
            {distanceM != null
              ? `${distanceM.toFixed(1)} m`
              : "--"}
          </p>
        </div>
      </div>

      {/* Risk scale */}
      <div className="grid grid-cols-3 gap-1 mt-3">
        <div className="h-1 rounded-full bg-safe" />
        <div className="h-1 rounded-full bg-caution" />
        <div className="h-1 rounded-full bg-danger" />
      </div>

      <div className="flex justify-between mt-1 text-[8px] font-mono text-steel-600">
        <span>SAFE</span>
        <span>CAUTION</span>
        <span>HIGH RISK</span>
      </div>
    </div>
  );
}
