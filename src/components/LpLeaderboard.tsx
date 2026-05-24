import type { BoardMetrics } from "../../shared/boardMetrics";
import { fmt, truncateAddress } from "../lib/format";

type LpLeaderboardProps = {
  rows: BoardMetrics["leaderboard"];
  loading: boolean;
};

export const LpLeaderboard = ({ rows, loading }: LpLeaderboardProps) => {
  const isEmpty = !loading && rows.length === 0;

  return (
    <section className="card table-card">
      <h2>LP Leaderboard</h2>
      {loading ? (
        <p className="chart-placeholder">Loading leaderboard…</p>
      ) : isEmpty ? (
        <p className="chart-placeholder">No data yet — indexer is catching up</p>
      ) : (
        <div className="table-scroll">
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
              {rows.map((row) => (
                <tr key={row.lpAddress}>
                  <td>{truncateAddress(row.lpAddress)}</td>
                  <td>{fmt(row.totalVolume)}</td>
                  <td>{row.quotesCompleted}</td>
                  <td>{fmt(row.successRate)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
