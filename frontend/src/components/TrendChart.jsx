import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function TrendChart({ rows }) {
  const data = [...rows]
    .slice(0, 20)
    .reverse()
    .map((row, i) => ({
      idx: i + 1,
      distance:
        row.distance_m != null ? Number(row.distance_m) : null,
      confidence:
        row.confidence != null
          ? Number(row.confidence) * 100
          : null,
    }));

  return (
    <div className="bg-[#0b1119] border border-panelborder rounded-xl p-4">

      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[9px] font-mono tracking-[0.2em] text-steel-500">
            TELEMETRY ANALYSIS
          </p>

          <h3 className="text-sm font-semibold text-steel-100 mt-1">
            Detection Trend
          </h3>
        </div>

        <div className="flex items-center gap-4 text-[9px] font-mono">
          <span className="flex items-center gap-1.5 text-info">
            <span className="w-2 h-2 rounded-full bg-info" />
            DISTANCE
          </span>

          <span className="flex items-center gap-1.5 text-caution">
            <span className="w-2 h-2 rounded-full bg-caution" />
            CONFIDENCE
          </span>
        </div>
      </div>

      {data.length < 2 ? (
        <div className="h-[180px] flex flex-col items-center justify-center">
          <div className="text-2xl text-steel-700 mb-2">
            ◌
          </div>

          <p className="text-xs font-mono text-steel-500">
            WAITING FOR TELEMETRY
          </p>

          <p className="text-[9px] text-steel-700 mt-1">
            More detections are required to generate a trend
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={190}>
          <LineChart
            data={data}
            margin={{
              top: 5,
              right: 5,
              left: -20,
              bottom: 0,
            }}
          >
            <CartesianGrid
              stroke="#1b2430"
              strokeDasharray="3 3"
              vertical={false}
            />

            <XAxis
              dataKey="idx"
              tick={false}
              axisLine={{ stroke: "#1b2430" }}
              tickLine={false}
            />

            <YAxis
              yAxisId="left"
              stroke="#475569"
              tick={{
                fontSize: 9,
                fill: "#64748b",
              }}
              axisLine={false}
              tickLine={false}
              width={35}
            />

            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              stroke="#475569"
              tick={{
                fontSize: 9,
                fill: "#64748b",
              }}
              axisLine={false}
              tickLine={false}
              width={35}
            />

            <Tooltip
              contentStyle={{
                background: "#080d14",
                border: "1px solid #263241",
                borderRadius: "8px",
                fontSize: "10px",
                fontFamily: "monospace",
              }}
              labelFormatter={(value) =>
                `EVENT ${value}`
              }
              formatter={(value, name) => {
                if (name === "Distance") {
                  return [`${Number(value).toFixed(1)} m`, name];
                }

                return [
                  `${Number(value).toFixed(0)}%`,
                  name,
                ];
              }}
            />

            <Line
              yAxisId="left"
              type="monotone"
              dataKey="distance"
              stroke="#3DDAFF"
              strokeWidth={2.5}
              dot={{
                r: 2,
                fill: "#3DDAFF",
              }}
              activeDot={{
                r: 4,
              }}
              name="Distance"
              connectNulls
            />

            <Line
              yAxisId="right"
              type="monotone"
              dataKey="confidence"
              stroke="#FFB020"
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 4,
              }}
              name="Confidence"
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      <div className="flex justify-between mt-2 text-[8px] font-mono text-steel-700">
        <span>OLDER</span>
        <span>RECENT</span>
      </div>
    </div>
  );
}