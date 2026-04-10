import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  LineChart,
  Line,
} from "recharts";
import "./App.css";

type BoardMetrics = {
  volume24h: number;
  volume7d: number;
  tvl: number;
  leaderboard: Array<{
    lpAddress: string;
    totalVolume: number;
    successRate: number;
    quotesCompleted: number;
  }>;
  quoteTimes: Array<{
    quoteHash: string;
    requestedAt: number;
    deliveredAt: number;
    deltaSeconds: number;
  }>;
  volumeSeries: Array<{
    day: string;
    volume: number;
  }>;
};

const fmt = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);

const truncateAddress = (address: string) =>
  `${address.slice(0, 6)}...${address.slice(-4)}`;

function App() {
  const [data, setData] = useState<BoardMetrics | null>(null);
  const [error, setError] = useState("");

  const quoteScatter = useMemo(
    () =>
      data?.quoteTimes.map((row, idx) => ({
        x: idx + 1,
        y: row.deltaSeconds / 60,
      })) ?? [],
    [data],
  );

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const response = await fetch("/metrics/board");
        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`);
        }
        const json = (await response.json()) as BoardMetrics;
        if (isMounted) {
          setData(json);
          setError("");
        }
      } catch (err) {
        if (isMounted) {
          setError((err as Error).message);
        }
      }
    };

    load();
    const soon = window.setTimeout(load, 1_500);
    const again = window.setTimeout(load, 4_000);
    const interval = setInterval(load, 30_000);
    return () => {
      isMounted = false;
      window.clearTimeout(soon);
      window.clearTimeout(again);
      clearInterval(interval);
    };
  }, []);

  return (
    <main className="board">
      <header className="hero-shell">
        <div className="hero-badge">The Bitcoin DeFi Layer</div>
        <h1 className="hero-title">
          <span className="hero-chip">Flyover</span>
          <span className="hero-strip">Analytics Board</span>
        </h1>
        <p>Do more with Bitcoin bridge intelligence for LPs and researchers.</p>
        <button className="hero-cta" type="button">Get Started</button>
      </header>

      {error ? <p className="error">API error: {error}</p> : null}

      <section className="kpi-grid">
        <article className="card">
          <h2>24h Peg-in Volume</h2>
          <div className="value">{fmt(data?.volume24h ?? 0)} RBTC</div>
        </article>
        <article className="card">
          <h2>7d Peg-in Volume</h2>
          <div className="value">{fmt(data?.volume7d ?? 0)} RBTC</div>
        </article>
        <article className="card">
          <h2>Bridge TVL</h2>
          <div className="value">{fmt(data?.tvl ?? 0)} RBTC</div>
        </article>
      </section>

      <section className="two-col">
        <article className="card chart-card">
          <h2>Volume Trend (14d)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data?.volumeSeries ?? []}>
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
        </article>
        <article className="card chart-card">
          <h2>LP delivery → peg-in registered (minutes)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart>
              <CartesianGrid stroke="rgba(120, 145, 172, 0.25)" />
              <XAxis
                dataKey="x"
                name="Quote #"
                stroke="#f9d6b0"
                tick={{ fill: "#f9d6b0", fontSize: 12 }}
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
              />
              <Scatter data={quoteScatter} fill="#ff9118" />
            </ScatterChart>
          </ResponsiveContainer>
        </article>
      </section>

      <section className="card table-card">
        <h2>LP Leaderboard</h2>
        <table>
          <thead>
            <tr>
              <th>LP Address</th>
              <th>Volume (RBTC)</th>
              <th>Quotes Completed</th>
              <th>Success Rate</th>
            </tr>
          </thead>
          <tbody>
            {(data?.leaderboard ?? []).map((row) => (
              <tr key={row.lpAddress}>
                <td>{truncateAddress(row.lpAddress)}</td>
                <td>{fmt(row.totalVolume)}</td>
                <td>{row.quotesCompleted}</td>
                <td>{fmt(row.successRate)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

export default App;
