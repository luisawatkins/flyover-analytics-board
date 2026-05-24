import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BoardMetrics } from "../../shared/boardMetrics";

type VolumeChartProps = {
  series: BoardMetrics["volumeSeries"];
  loading: boolean;
};

export const VolumeChart = ({ series, loading }: VolumeChartProps) => {
  const isEmpty = !loading && series.length === 0;

  return (
    <article className="card chart-card" aria-label="14-day peg-in volume trend chart">
      <h2>Volume Trend (14d)</h2>
      {loading ? (
        <p className="chart-placeholder">Loading volume data…</p>
      ) : isEmpty ? (
        <p className="chart-placeholder">No data yet — indexer is catching up</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(120, 145, 172, 0.25)" />
            <XAxis dataKey="day" stroke="#f9d6b0" tick={{ fill: "#f9d6b0", fontSize: 12 }} />
            <YAxis stroke="#f9d6b0" tick={{ fill: "#f9d6b0", fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#121212",
                border: "1px solid rgba(255, 145, 46, 0.5)",
                borderRadius: "10px",
                color: "#fff0df",
              }}
            />
            <Line type="monotone" dataKey="volume" stroke="#ff9118" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </article>
  );
};
