import { useMemo } from "react";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BoardMetrics } from "../../shared/boardMetrics";
import { formatTimeTick } from "../lib/format";

type PegInLatencyChartProps = {
  quoteTimes: BoardMetrics["quoteTimes"];
  loading: boolean;
};

export const PegInLatencyChart = ({ quoteTimes, loading }: PegInLatencyChartProps) => {
  const scatterData = useMemo(
    () =>
      quoteTimes.map((row) => ({
        x: row.requestedAt * 1000,
        y: row.deltaSeconds / 60,
      })),
    [quoteTimes],
  );

  const isEmpty = !loading && scatterData.length === 0;

  return (
    <article
      className="card chart-card"
      aria-label="LP delivery to peg-in registration latency scatter chart"
    >
      <h2>LP delivery → peg-in registered (minutes)</h2>
      {loading ? (
        <p className="chart-placeholder">Loading latency data…</p>
      ) : isEmpty ? (
        <p className="chart-placeholder">No data yet — indexer is catching up</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart>
            <CartesianGrid stroke="rgba(120, 145, 172, 0.25)" />
            <XAxis
              dataKey="x"
              type="number"
              domain={["dataMin", "dataMax"]}
              name="Requested at"
              stroke="#f9d6b0"
              tick={{ fill: "#f9d6b0", fontSize: 12 }}
              tickFormatter={(value: number) => formatTimeTick(value / 1000)}
            />
            <YAxis
              dataKey="y"
              name="Minutes"
              stroke="#f9d6b0"
              tick={{ fill: "#f9d6b0", fontSize: 12 }}
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3", stroke: "#ff9118" }}
              contentStyle={{
                backgroundColor: "#121212",
                border: "1px solid rgba(255, 145, 46, 0.5)",
                borderRadius: "10px",
                color: "#fff0df",
              }}
              labelFormatter={(value) => formatTimeTick(Number(value) / 1000)}
            />
            <Scatter data={scatterData} fill="#ff9118" />
          </ScatterChart>
        </ResponsiveContainer>
      )}
    </article>
  );
};
